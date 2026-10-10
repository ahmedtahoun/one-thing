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
import type { ConsentRecord } from '../consent';
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
  /** The language and platform this device last sent. */
  device: DeviceRow | null;
};

type DeviceRow = { language: 'en' | 'ar'; platform: 'ios' | 'android' | null };

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
  /** Today's date key, YYYY-MM-DD, in the device's time zone. */
  today: string;
}): Promise<SyncResult> {
  const { remote, userId, local, base, consent, today } = options;
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
  const device: DeviceRow = { language: local.profile.language, platform: local.profile.platform };
  if (!remoteUser) {
    await remote.insert('app_user', [{ id: userId, auth_provider: local.authProvider, ...name.merged, ...device }]);
    pushed++;
  } else {
    const patch: Raw = name.push ? { ...name.merged } : {};
    // The language and platform belong to the device, not the account: they
    // go up when they change here, so server-sent mail and notifications
    // follow the device used last, and are never pulled down over this
    // device's own choice.
    if (!sameRow(device, base.device)) Object.assign(patch, device);
    if (Object.keys(patch).length > 0) {
      await remote.update('app_user', { id: userId }, patch);
      pushed++;
    }
  }

  if (consent.length > 0) {
    await remote.insert(
      'consent',
      consent.map((r) => ({ user_id: userId, kind: r.kind, granted: r.granted, version: r.version, granted_at: r.at, source: r.source }))
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
