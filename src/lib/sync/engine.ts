/**
 * One sync: read everything the server holds for this user, merge it with
 * the device, push what the device has that the server does not, and say
 * what the device should now hold.
 *
 * Pure apart from the `Remote` it is handed, so it runs the same under the
 * app (Supabase), the unit tests (an in-memory server) and the database test
 * (a real Postgres with the real row-level security). Nothing here imports
 * React Native.
 *
 * Whole tables are read each time rather than changes since a cursor: the
 * schema keeps no edit times, and one person's tasks and contacts are small
 * enough that reading them all is cheaper than the bookkeeping. Deletions
 * fall out of the comparison with the base for free, which a cursor would
 * need tombstones for. BUILD-REVIEW.md §2.36.
 */
import type { QueuedFocus, QueuedReview } from '../activity';
import type { QueuedEvent } from '../analytics/events';
import type { QueuedPhrasing } from '../analytics/phrasings';
import type { ConsentRecord } from '../consent';
import type { QueuedPrivacyRequest } from '../privacy-request';
import type { Contact, FollowUp, HistoryEntry, OneThing, Task } from '../model-types';
import type { Plan } from '@/policy/entitlements';
import { applyDelta, reconcile, reconcileOne, sameRow } from './reconcile';
import {
  contactFromRow,
  contactToRow,
  followUpFromRow,
  followUpToRow,
  fromServer,
  historyFromRow,
  historyToRow,
  oneThingFromRow,
  oneThingToRow,
  prefsFromRow,
  prefsToRow,
  profileFromRow,
  taskFromRow,
  taskToRow,
  type ContactRow,
  type FollowUpRow,
  type HistoryRow,
  type OneThingRow,
  type Profile,
  type SettingsRow,
  type SyncedPrefs,
  type TaskRow,
} from './rows';

type Raw = Record<string, unknown>;

/** What the engine needs from a server. `remote.ts` has the Supabase one. */
export interface Remote {
  /** Every row of a table this user can see — row-level security does the filtering. */
  select(table: string): Promise<Raw[]>;
  upsert(table: string, rows: Raw[], onConflict: string): Promise<void>;
  insert(table: string, rows: Raw[]): Promise<void>;
  update(table: string, match: Raw, patch: Raw): Promise<void>;
  remove(table: string, column: string, values: string[]): Promise<void>;
  /**
   * Calls a database function as this user. Only one thing uses it:
   * `forget_my_transcripts`, which somebody asks for by turning off "Help
   * improve Sanad" — see `forgetTranscripts` below (BUILD-REVIEW §2.115).
   */
  call(fn: string): Promise<void>;
}

/** The name fields the user edits; compared and merged like any other row. */
type NameRow = { name: string; first_name: string; job_title: string | null; email: string | null };

/** What the server held when this device last finished a sync. */
export type Base = {
  task: TaskRow[];
  contact: ContactRow[];
  history: HistoryRow[];
  follow_up: FollowUpRow[];
  one_thing: OneThingRow[];
  settings: SettingsRow | null;
  app_user: NameRow | null;
  /** What this device last said about itself. */
  device: DeviceRow | null;
  /** The last day this device reported the user as active (YYYY-MM-DD). */
  seenOn?: string | null;
};

type DeviceRow = {
  language: 'en' | 'ar';
  platform: 'ios' | 'android' | null;
  app_version: string | null;
  notifications_allowed: boolean | null;
};

export const EMPTY_BASE: Base = {
  task: [],
  contact: [],
  history: [],
  follow_up: [],
  one_thing: [],
  settings: null,
  app_user: null,
  device: null,
};

export type LocalState = {
  tasks: Task[];
  contacts: Contact[];
  history: HistoryEntry[];
  followUps: FollowUp[];
  oneThing: OneThing | null;
  prefs: SyncedPrefs;
  profile: Profile;
  authProvider: 'apple' | 'google';
};

export type SyncResult = {
  base: Base;
  /** What each list should become. Unchanged rows keep the device's own object. */
  tasks: Task[];
  contacts: Contact[];
  history: HistoryEntry[];
  followUps: FollowUp[];
  /** Today's One Thing as merged, or null when neither side has one. */
  oneThing: OneThing | null;
  prefs: SyncedPrefs;
  name: Omit<Profile, 'language' | 'platform'>;
  /** Written only by the store webhooks, so always the server's word. */
  plan: Plan | null;
  /** The latest marketing consent on record, if there is one. */
  marketing: boolean | null;
  /** How many queued consent rows went out. */
  consentSent: number;
  /** How many queued analytics events went out. */
  eventsSent: number;
  /** How many queued Assistant phrasings went out. */
  phrasingsSent: number;
  /** Whether the request to forget what was said has now been carried out. */
  forgotTranscripts: boolean;
  /** How many queued privacy requests went out. */
  privacySent: number;
  /** How many queued focus sessions and closed reviews went out. */
  focusSent: number;
  reviewsSent: number;
  /** Rows pushed and deleted, for the log and the tests. */
  pushed: number;
  deleted: number;
};

/** Upserts go out in chunks so one request never carries a whole history. */
const CHUNK = 500;

function chunks<T>(list: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += CHUNK) out.push(list.slice(i, i + CHUNK));
  return out;
}

const byId = (row: { id: string }) => row.id;

/**
 * Objects for the merged rows, reusing the device's own object wherever the
 * row did not change — `applyDelta` relies on that identity to tell what the
 * sync changed from what the user changed while it ran.
 */
function objectsFor<T extends { id: string }, R extends { id: string }>(
  merged: R[],
  local: T[],
  toRow: (item: T) => R,
  fromRow: (row: R) => T
): T[] {
  const mine = new Map(local.map((item) => [item.id, item]));
  return merged.map((row) => {
    const own = mine.get(row.id);
    return own && sameRow(toRow(own), row) ? own : fromRow(row);
  });
}

/** Swaps a row in `merged`, and makes sure the fixed version is what goes out. */
function replaceRow<R extends { id: string }>(result: { merged: R[]; upsert: R[] }, fixed: R) {
  result.merged = result.merged.map((row) => (row.id === fixed.id ? fixed : row));
  result.upsert = [...result.upsert.filter((row) => row.id !== fixed.id), fixed];
}

export async function syncOnce(options: {
  remote: Remote;
  userId: string;
  local: LocalState;
  base: Base;
  /** Consent rows recorded on this device and not yet on the server. */
  consent: ConsentRecord[];
  /** Analytics events recorded on this device and not yet on the server. */
  events: QueuedEvent[];
  /** Redacted Assistant phrasings not yet on the server (../analytics/phrasings.ts). */
  phrasings: QueuedPhrasing[];
  /**
   * True when somebody has turned "Help improve Sanad" off and the words
   * already sent have not been deleted yet. Consent withdrawn is a request
   * to forget, not only to stop.
   */
  forgetTranscripts: boolean;
  /** Export requests recorded on this device and not yet on the server. */
  privacyRequests: QueuedPrivacyRequest[];
  /** Focus sessions and closed evening reviews not yet on the server. */
  focus: QueuedFocus[];
  reviews: QueuedReview[];
  /** Today's date key, YYYY-MM-DD, in the device's time zone. */
  today: string;
}): Promise<SyncResult> {
  const { remote, userId, local, base, consent, events, phrasings, forgetTranscripts, privacyRequests, focus, reviews, today } = options;
  const withUser = <R extends object>(row: R) => ({ ...row, user_id: userId });

  // ---------------------------------------------------------------- read ----
  const [rawUser, rawTasks, rawLinks, rawContacts, rawHistory, rawFollowUps, rawOneThing, rawSettings, rawConsent] =
    await Promise.all([
      remote.select('app_user'),
      remote.select('task'),
      remote.select('task_contact'),
      remote.select('contact'),
      remote.select('history'),
      remote.select('follow_up'),
      remote.select('one_thing'),
      remote.select('settings'),
      remote.select('consent'),
    ]);

  const linksByTask = new Map<string, string[]>();
  for (const link of rawLinks) {
    const taskId = String(link.task_id);
    linksByTask.set(taskId, [...(linksByTask.get(taskId) ?? []), String(link.contact_id)]);
  }
  const remoteTasks = rawTasks.map((raw) => ({
    ...fromServer<Omit<TaskRow, 'contact_ids'>>('task', raw),
    contact_ids: (linksByTask.get(String(raw.id)) ?? []).sort(),
  })) as TaskRow[];
  const remoteContacts = rawContacts.map((raw) => fromServer<ContactRow>('contact', raw));
  const remoteHistory = rawHistory.map((raw) => fromServer<HistoryRow>('history', raw));
  const remoteFollowUps = rawFollowUps.map((raw) => fromServer<FollowUpRow>('follow_up', raw));
  const remoteToday = rawOneThing.map((raw) => fromServer<OneThingRow>('one_thing', raw)).filter((r) => r.date === today);
  const remoteSettings = rawSettings[0] ? fromServer<SettingsRow>('settings', rawSettings[0]) : null;
  const remoteUser = rawUser[0] ?? null;

  // --------------------------------------------------------------- merge ----
  const localTasks = local.tasks.map(taskToRow);
  const localContacts = local.contacts.map(contactToRow);
  const localHistory = local.history.map(historyToRow);
  const localFollowUps = local.followUps.map(followUpToRow);

  const contacts = reconcile(localContacts, base.contact, remoteContacts, byId);
  const tasks = reconcile(localTasks, base.task, remoteTasks, byId);
  const history = reconcile(localHistory, base.history, remoteHistory, byId);
  const followUps = reconcile(localFollowUps, base.follow_up, remoteFollowUps, byId);

  // What one side removed, the other may still point at. The server's
  // foreign keys would refuse those rows, so they are made to agree first —
  // the same way the database itself resolves them: history goes with its
  // contact; a task or follow-up just loses the link.
  const contactIds = new Set(contacts.merged.map(byId));
  const taskIds = new Set(tasks.merged.map(byId));
  history.merged = history.merged.filter((row) => contactIds.has(row.contact_id));
  history.upsert = history.upsert.filter((row) => contactIds.has(row.contact_id));
  for (const row of tasks.merged) {
    const kept = row.contact_ids.filter((id) => contactIds.has(id));
    if (kept.length !== row.contact_ids.length) replaceRow(tasks, { ...row, contact_ids: kept });
  }
  for (const row of followUps.merged) {
    const contactGone = row.contact_id !== null && !contactIds.has(row.contact_id);
    const taskGone = row.task_id !== null && !taskIds.has(row.task_id);
    if (contactGone || taskGone) {
      replaceRow(followUps, {
        ...row,
        contact_id: contactGone ? null : row.contact_id,
        task_id: taskGone ? null : row.task_id,
      });
    }
  }

  // Only today's One Thing is on the device, so only today's is compared;
  // earlier days stay on the server as the record of them.
  const localToday = local.oneThing && local.oneThing.date === today ? [oneThingToRow(local.oneThing)] : [];
  const oneThing = reconcile(
    localToday,
    base.one_thing.filter((r) => r.date === today),
    remoteToday,
    (r) => r.date
  );

  const settings = reconcileOne(prefsToRow(local.prefs), base.settings, remoteSettings);

  const localName: NameRow = {
    name: local.profile.name,
    first_name: local.profile.firstName,
    job_title: local.profile.jobTitle ?? null,
    email: local.profile.email ?? null,
  };
  const remoteName = remoteUser ? (fromServer('app_user', remoteUser) as NameRow) : null;
  const name = reconcileOne(localName, base.app_user, remoteName);

  // ---------------------------------------------------------------- push ----
  let pushed = 0;
  let deleted = 0;

  // The user's own row first: every other table points at it.
  const device: DeviceRow = {
    language: local.profile.language,
    platform: local.profile.platform,
    app_version: local.profile.appVersion ?? null,
    notifications_allowed: local.profile.notificationsAllowed ?? null,
  };
  // Once a day at most: the admin panel's Last active, and the active_day
  // row its Active users and Retention are counted from. A day, not a time.
  const firstToday = base.seenOn !== today;
  const seen: Raw = firstToday ? { last_seen_at: new Date().toISOString() } : {};
  if (!remoteUser) {
    await remote.insert('app_user', [{ id: userId, auth_provider: local.authProvider, ...name.merged, ...device, ...seen }]);
    pushed++;
  } else {
    const patch: Raw = name.push ? { ...name.merged, ...seen } : { ...seen };
    // The language, platform, app version and notification permission
    // belong to the device, not the account: they go up when they change
    // here, so the server follows the device used last, and are never
    // pulled down over this device's own.
    if (!sameRow(device, base.device)) Object.assign(patch, device);
    if (Object.keys(patch).length > 0) {
      await remote.update('app_user', { id: userId }, patch);
      pushed++;
    }
  }

  if (firstToday) await remote.upsert('active_day', [{ user_id: userId, day: today }], 'user_id,day');

  if (consent.length > 0) {
    await remote.insert(
      'consent',
      consent.map((r) => ({ user_id: userId, kind: r.kind, granted: r.granted, version: r.version, granted_at: r.at, source: r.source }))
    );
  }

  // Append-only, like consent: these are facts, not state to reconcile. They
  // go out in the same chunks as everything else so one request never carries
  // a month of a device that was offline.
  for (const part of chunks(events)) {
    await remote.insert(
      'analytics_event',
      part.map((e) => ({ user_id: userId, name: e.name, props: e.props, at: e.at, platform: local.profile.platform }))
    );
  }
  /*
   * Before anything is sent, not after: a sync that forgot halfway through
   * must not have added more words to a pile somebody asked us to empty.
   * The consent row saying so went out with `consent` just above, so the
   * order here is: say they withdrew, then act on it.
   */
  if (forgetTranscripts) await remote.call('forget_my_transcripts');

  // Append-only like the events above, and redacted before they were queued:
  // what goes out is "{name}" and "{phone}", never what anybody typed
  // (../parse/redact.ts, supabase/migrations/0014_phrasings.sql).
  for (const part of chunks(phrasings)) {
    await remote.insert(
      'assistant_phrasing',
      part.map((p) => ({ user_id: userId, text: p.text, verdict: p.verdict, source: p.source, lang: p.lang, dialect: p.dialect, at: p.at, platform: local.profile.platform }))
    );
    /*
     * And the words themselves, where somebody offered them. A separate
     * table rather than a column, because the two have different lives: the
     * shape outlives the account and this does not, and only this one is
     * deleted when the switch goes off (0015_transcripts.sql).
     *
     * The insert is refused by the database if consent has since been
     * withdrawn, which is the point of checking it there as well as here: a
     * queue written while the switch was on must not outlive it.
     */
    const offered = part.filter((p) => typeof p.raw === 'string' && p.raw.length > 0);
    if (offered.length > 0) {
      await remote.insert(
        'assistant_transcript',
        offered.map((p) => ({ user_id: userId, text: p.raw, verdict: p.verdict, source: p.source, lang: p.lang, dialect: p.dialect, at: p.at, platform: local.profile.platform }))
      );
    }
  }
  if (privacyRequests.length > 0) {
    await remote.insert(
      'privacy_request',
      privacyRequests.map((r) => ({ user_id: userId, type: r.kind, source: 'app', requested_at: r.at }))
    );
  }

  for (const part of chunks(contacts.upsert)) await remote.upsert('contact', part.map(withUser), 'id');
  for (const part of chunks(tasks.upsert)) {
    await remote.upsert('task', part.map(({ contact_ids: _links, ...row }) => withUser(row)), 'id');
    // A task's people are replaced wholesale whenever the task goes out.
    await remote.remove('task_contact', 'task_id', part.map(byId));
    const links = part.flatMap((row) => row.contact_ids.map((contact_id) => ({ task_id: row.id, contact_id })));
    if (links.length > 0) await remote.insert('task_contact', links);
  }
  for (const part of chunks(history.upsert)) await remote.upsert('history', part.map(withUser), 'id');
  for (const part of chunks(followUps.upsert)) await remote.upsert('follow_up', part.map(withUser), 'id');
  if (oneThing.upsert.length > 0) await remote.upsert('one_thing', oneThing.upsert.map(withUser), 'user_id,date');
  if (settings.push) await remote.upsert('settings', [withUser(settings.merged)], 'user_id');
  // Facts again, but sent after the tasks a review's answers point at.
  // Upserts by key rather than inserts, so a sync that fails after sending
  // them and sends them again writes nothing twice.
  for (const part of chunks(focus)) {
    await remote.upsert(
      'focus_session',
      part.map((f) => ({ id: f.id, user_id: userId, started_at: f.startedAt, planned_min: f.plannedMin, ended_at: f.endedAt, completed: f.completed })),
      'id'
    );
  }
  if (reviews.length > 0) {
    await remote.upsert(
      'review',
      reviews.map((r) => ({ user_id: userId, date: r.date, one_thing_done: r.oneThingDone, closed_at: r.closedAt })),
      'user_id,date'
    );
    // An answer about a task the server no longer has would fail its foreign
    // key and with it the whole sync; the task's deletion took the answer's
    // meaning with it.
    const present = new Set(tasks.merged.map(byId));
    const items = reviews.flatMap((r) =>
      r.items.filter((i) => present.has(i.taskId)).map((i) => ({ user_id: userId, date: r.date, task_id: i.taskId, decision: i.decision }))
    );
    for (const part of chunks(items)) await remote.upsert('review_item', part, 'user_id,date,task_id');
  }

  pushed += contacts.upsert.length + tasks.upsert.length + history.upsert.length + followUps.upsert.length;
  pushed += oneThing.upsert.length + (settings.push ? 1 : 0);

  // Deletions last, children before parents.
  for (const [table, ids] of [
    ['follow_up', followUps.remove],
    ['history', history.remove],
    ['task', tasks.remove],
    ['contact', contacts.remove],
  ] as const) {
    for (const part of chunks(ids)) await remote.remove(table, 'id', part);
    deleted += ids.length;
  }
  // A One Thing is never deleted: an emptied day keeps its record.

  // ------------------------------------------------------------- result ----
  const marketingRows = [
    ...rawConsent
      .filter((r) => r.kind === 'marketing')
      .map((r) => ({ granted: Boolean(r.granted), at: new Date(String(r.granted_at)).getTime() })),
    ...consent.filter((r) => r.kind === 'marketing').map((r) => ({ granted: r.granted, at: new Date(r.at).getTime() })),
  ].sort((a, b) => b.at - a.at);

  const todayRow = oneThing.merged[0] ?? null;

  return {
    base: {
      task: tasks.merged,
      contact: contacts.merged,
      history: history.merged,
      follow_up: followUps.merged,
      one_thing: oneThing.merged,
      settings: settings.merged,
      app_user: name.merged,
      device,
      seenOn: today,
    },
    tasks: objectsFor(tasks.merged, local.tasks, taskToRow, taskFromRow),
    contacts: objectsFor(contacts.merged, local.contacts, contactToRow, contactFromRow),
    history: objectsFor(history.merged, local.history, historyToRow, historyFromRow),
    followUps: objectsFor(followUps.merged, local.followUps, followUpToRow, followUpFromRow),
    oneThing:
      todayRow === null
        ? null
        : local.oneThing && sameRow(oneThingToRow(local.oneThing), todayRow)
          ? local.oneThing
          : oneThingFromRow(todayRow, local.prefs.focusMinutes),
    prefs: prefsFromRow(settings.merged),
    name: profileFromRow({ ...name.merged, language: device.language, platform: device.platform }),
    plan: remoteUser ? ((remoteUser.plan as Plan | undefined) ?? 'free') : 'free',
    marketing: marketingRows[0]?.granted ?? null,
    consentSent: consent.length,
    eventsSent: events.length,
    phrasingsSent: phrasings.length,
    forgotTranscripts: forgetTranscripts,
    privacySent: privacyRequests.length,
    focusSent: focus.length,
    reviewsSent: reviews.length,
    pushed,
    deleted,
  };
}

/** Re-exported for the provider, which applies a result to live stores. */
export { applyDelta };

/**
 * The order each list is kept in once a sync has added to it, so every
 * device shows the same order: tasks oldest first (screens sort them by time
 * anyway), contacts most recently contacted first, history and follow-ups
 * newest first. Stable, so rows with no time keep their place.
 */
const desc = (a: string | undefined, b: string | undefined) => (b ?? '').localeCompare(a ?? '');
export const ORDER = {
  tasks: (list: Task[]) => [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  contacts: (list: Contact[]) => [...list].sort((a, b) => desc(a.touchedAt ?? a.createdAt, b.touchedAt ?? b.createdAt)),
  history: (list: HistoryEntry[]) => [...list].sort((a, b) => desc(a.at, b.at)),
  followUps: (list: FollowUp[]) => [...list].sort((a, b) => desc(a.createdAt, b.createdAt)),
};
