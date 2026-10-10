/**
 * The app's objects as database rows, and back.
 *
 * Every comparison the sync makes happens on rows, never on the app's
 * objects, so the two directions only have to agree on rows: an object that
 * goes out and comes back must make the same row (`rows.test.ts` holds them to
 * that). Rows carry every column, absent values as null, and no user_id — the
 * engine adds that on the way out and the reader drops it on the way in.
 */
import type {
  Channel,
  Contact,
  FollowUp,
  HistoryEntry,
  HistoryKind,
  OneThing,
  Prefs,
  RemindOffset,
  Task,
  TaskStatus,
  CreatedVia,
} from '../model-types';
import type { TaskType } from '@/design/tokens';

export type TaskRow = {
  id: string;
  type: TaskType;
  title: string;
  who: string | null;
  /** Not a column: task_contact, folded in so a task compares as one row. */
  contact_ids: string[];
  due_at: string | null;
  remind: RemindOffset | null;
  remind_at: string | null;
  status: TaskStatus;
  snoozed_until: string | null;
  notes: string | null;
  goal: string | null;
  points: string[];
  draft_subject: string | null;
  draft_body: string | null;
  link: string | null;
  location: string | null;
  platform: string | null;
  duration_min: number | null;
  host: string | null;
  lesson: string | null;
  study_days: number[];
  progress_done: number | null;
  progress_total: number | null;
  created_via: CreatedVia;
  created_at: string;
  sent_confirmed_at: string | null;
};

export type ContactRow = {
  id: string;
  name: string;
  role_company: string | null;
  dial: string | null;
  phone: string | null;
  email: string | null;
  preferred_channel: Channel | null;
  remember_note: string | null;
  last_label: string | null;
  touched_at: string | null;
  created_at: string;
};

export type HistoryRow = {
  id: string;
  contact_id: string;
  kind: HistoryKind;
  text: string;
  at: string;
};

export type FollowUpRow = {
  id: string;
  contact_id: string | null;
  task_id: string | null;
  channel: Channel;
  who: string;
  what: string;
  status: FollowUp['status'];
  since: string;
  next_at: string | null;
  last_action: 'nudged' | 'closed' | null;
  last_action_at: string | null;
  created_at: string | null;
};

export type OneThingRow = {
  date: string;
  title: string;
  done: boolean;
  focus_minutes: number | null;
};

export type SettingsRow = {
  nudge_style: Prefs['nudgeStyle'];
  focus_minutes: Prefs['focusMinutes'];
  quiet_hours_start: string;
  quiet_hours_end: string;
  channel_whatsapp: boolean;
  channel_email: boolean;
  channel_call: boolean;
  notif_sound: boolean;
  notif_vibration: boolean;
};

/** The app_user columns a user may write (0002_sync.sql grants exactly these). */
export type ProfileRow = {
  name: string;
  first_name: string;
  job_title: string | null;
  email: string | null;
  language: 'en' | 'ar';
  platform: 'ios' | 'android' | null;
};

/** Settings without the marketing choice, which travels as consent rows. */
export type SyncedPrefs = Omit<Prefs, 'marketing'>;

export type Profile = {
  name: string;
  firstName: string;
  jobTitle?: string;
  email?: string;
  language: 'en' | 'ar';
  platform: 'ios' | 'android' | null;
  /** "1.0.0 (iOS 19.1)", for the admin panel's Troubleshoot checks. */
  appVersion?: string | null;
  /** Whether the OS will deliver notifications; null where it cannot be asked. */
  notificationsAllowed?: boolean | null;
};

// ------------------------------------------------------------- columns ----

/**
 * The columns read back per table. Anything else the server returns —
 * user_id, columns a later migration adds — is dropped, so a row compares
 * equal to the one the app would make.
 */
export const COLUMNS = {
  task: [
    'id', 'type', 'title', 'who', 'due_at', 'remind', 'remind_at', 'status', 'snoozed_until', 'notes',
    'goal', 'points', 'draft_subject', 'draft_body', 'link', 'location', 'platform', 'duration_min',
    'host', 'lesson', 'study_days', 'progress_done', 'progress_total', 'created_via', 'created_at',
    'sent_confirmed_at',
  ],
  contact: [
    'id', 'name', 'role_company', 'dial', 'phone', 'email', 'preferred_channel', 'remember_note',
    'last_label', 'touched_at', 'created_at',
  ],
  history: ['id', 'contact_id', 'kind', 'text', 'at'],
  follow_up: [
    'id', 'contact_id', 'task_id', 'channel', 'who', 'what', 'status', 'since', 'next_at', 'last_action',
    'last_action_at', 'created_at',
  ],
  one_thing: ['date', 'title', 'done', 'focus_minutes'],
  settings: [
    'nudge_style', 'focus_minutes', 'quiet_hours_start', 'quiet_hours_end', 'channel_whatsapp',
    'channel_email', 'channel_call', 'notif_sound', 'notif_vibration',
  ],
  app_user: ['name', 'first_name', 'job_title', 'email', 'language', 'platform'],
} as const;

export type Table = keyof typeof COLUMNS;

// ----------------------------------------------------------- reading in ----

/** Postgres writes `+00:00` and microseconds; the app writes `Z` and millis. */
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/;

function normaliseValue(value: unknown): unknown {
  if (typeof value === 'string' && TIMESTAMP.test(value)) {
    // Postgres's own text form is "2026-10-10 08:00:00+00", which
    // Date.parse refuses; PostgREST's JSON is already ISO.
    const time = Date.parse(value.replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00'));
    return Number.isNaN(time) ? value : new Date(time).toISOString();
  }
  return value === undefined ? null : value;
}

/**
 * A row as the server sent it, reduced to the columns above with times in
 * the app's own format. `time` columns come back as "22:00:00" and go in as
 * "22:00".
 */
export function fromServer<T>(table: Table, raw: Record<string, unknown>): T {
  const row: Record<string, unknown> = {};
  for (const column of COLUMNS[table]) {
    let value = normaliseValue(raw[column]);
    if (table === 'settings' && (column === 'quiet_hours_start' || column === 'quiet_hours_end') && typeof value === 'string') {
      value = value.slice(0, 5);
    }
    row[column] = value;
  }
  return row as T;
}

// ------------------------------------------------------------- mapping ----

const orNull = <T,>(value: T | undefined | null): T | null => (value === undefined ? null : value);
const orUndefined = <T,>(value: T | null): T | undefined => (value === null ? undefined : value);

/** Instants compare as instants: "…00Z" and "…00.000Z" are the same moment. */
const instant = (iso: string | null | undefined): string | null =>
  iso === null || iso === undefined ? null : normaliseValue(iso) as string;

export function taskToRow(task: Task): TaskRow {
  return {
    id: task.id,
    type: task.type,
    title: task.title,
    who: orNull(task.who),
    contact_ids: [...task.contactIds].sort(),
    due_at: instant(task.dueAt),
    remind: task.remind,
    remind_at: instant(task.remindAt),
    status: task.status,
    snoozed_until: instant(task.snoozedUntil),
    notes: orNull(task.notes),
    goal: orNull(task.goal),
    points: task.points ?? [],
    draft_subject: orNull(task.draft?.subject),
    draft_body: orNull(task.draft?.body),
    link: orNull(task.link),
    location: orNull(task.location),
    platform: orNull(task.platform),
    duration_min: orNull(task.durationMin),
    host: orNull(task.host),
    lesson: orNull(task.lesson),
    study_days: task.studyDays ?? [],
    progress_done: task.progress?.done ?? null,
    progress_total: task.progress?.total ?? null,
    created_via: task.createdVia,
    created_at: instant(task.createdAt) as string,
    sent_confirmed_at: instant(task.sentConfirmedAt),
  };
}

export function taskFromRow(row: TaskRow): Task {
  const task: Task = {
    id: row.id,
    type: row.type,
    title: row.title,
    contactIds: row.contact_ids,
    dueAt: row.due_at,
    remind: row.remind,
    status: row.status,
    points: row.points,
    createdVia: row.created_via,
    createdAt: row.created_at,
  };
  if (row.who !== null) task.who = row.who;
  if (row.remind_at !== null) task.remindAt = row.remind_at;
  if (row.snoozed_until !== null) task.snoozedUntil = row.snoozed_until;
  if (row.notes !== null) task.notes = row.notes;
  if (row.goal !== null) task.goal = row.goal;
  if (row.draft_body !== null || row.draft_subject !== null) {
    task.draft = { body: row.draft_body ?? '' };
    if (row.draft_subject !== null) task.draft.subject = row.draft_subject;
  }
  if (row.link !== null) task.link = row.link;
  if (row.location !== null) task.location = row.location;
  if (row.platform !== null) task.platform = row.platform;
  if (row.duration_min !== null) task.durationMin = row.duration_min;
  if (row.host !== null) task.host = row.host;
  if (row.lesson !== null) task.lesson = row.lesson;
  if (row.study_days.length > 0) task.studyDays = row.study_days;
  if (row.progress_done !== null && row.progress_total !== null) {
    task.progress = { done: row.progress_done, total: row.progress_total };
  }
  if (row.sent_confirmed_at !== null) task.sentConfirmedAt = row.sent_confirmed_at;
  return task;
}

export function contactToRow(contact: Contact): ContactRow {
  return {
    id: contact.id,
    name: contact.name,
    role_company: orNull(contact.role),
    dial: orNull(contact.dial),
    phone: orNull(contact.phone),
    email: orNull(contact.email),
    preferred_channel: orNull(contact.preferredChannel),
    remember_note: orNull(contact.rememberNote),
    last_label: orNull(contact.lastLabel),
    touched_at: instant(contact.touchedAt),
    created_at: instant(contact.createdAt) as string,
  };
}

export function contactFromRow(row: ContactRow): Contact {
  const contact: Contact = { id: row.id, name: row.name, createdAt: row.created_at };
  if (row.role_company !== null) contact.role = row.role_company;
  if (row.dial !== null) contact.dial = row.dial;
  if (row.phone !== null) contact.phone = row.phone;
  if (row.email !== null) contact.email = row.email;
  if (row.preferred_channel !== null) contact.preferredChannel = row.preferred_channel;
  if (row.remember_note !== null) contact.rememberNote = row.remember_note;
  if (row.last_label !== null) contact.lastLabel = row.last_label;
  if (row.touched_at !== null) contact.touchedAt = row.touched_at;
  return contact;
}

export function historyToRow(entry: HistoryEntry): HistoryRow {
  return { id: entry.id, contact_id: entry.contactId, kind: entry.kind, text: entry.text, at: instant(entry.at) as string };
}

export function historyFromRow(row: HistoryRow): HistoryEntry {
  return { id: row.id, contactId: row.contact_id, kind: row.kind, text: row.text, at: row.at };
}

export function followUpToRow(followUp: FollowUp): FollowUpRow {
  return {
    id: followUp.id,
    contact_id: orNull(followUp.contactId),
    task_id: orNull(followUp.taskId),
    channel: followUp.channel,
    who: followUp.who,
    what: followUp.what,
    status: followUp.status,
    since: followUp.since,
    next_at: instant(followUp.nextAt),
    last_action: orNull(followUp.lastAction),
    last_action_at: instant(followUp.lastActionAt),
    created_at: instant(followUp.createdAt),
  };
}

export function followUpFromRow(row: FollowUpRow): FollowUp {
  const followUp: FollowUp = {
    id: row.id,
    contactId: row.contact_id,
    taskId: row.task_id,
    channel: row.channel,
    who: row.who,
    what: row.what,
    status: row.status,
    since: row.since,
    nextAt: row.next_at,
    lastAction: row.last_action,
  };
  if (row.last_action_at !== null) followUp.lastActionAt = row.last_action_at;
  if (row.created_at !== null) followUp.createdAt = row.created_at;
  return followUp;
}

export function oneThingToRow(oneThing: OneThing): OneThingRow {
  return { date: oneThing.date, title: oneThing.title, done: oneThing.done, focus_minutes: oneThing.focusMinutes };
}

export function oneThingFromRow(row: OneThingRow, fallbackMinutes: number): OneThing {
  return { date: row.date, title: row.title, done: row.done, focusMinutes: row.focus_minutes ?? fallbackMinutes };
}

export function prefsToRow(prefs: SyncedPrefs): SettingsRow {
  return {
    nudge_style: prefs.nudgeStyle,
    focus_minutes: prefs.focusMinutes,
    quiet_hours_start: prefs.quietHours.start,
    quiet_hours_end: prefs.quietHours.end,
    channel_whatsapp: prefs.channels.whatsapp,
    channel_email: prefs.channels.email,
    channel_call: prefs.channels.call,
    notif_sound: prefs.sound,
    notif_vibration: prefs.vibration,
  };
}

export function prefsFromRow(row: SettingsRow): SyncedPrefs {
  return {
    nudgeStyle: row.nudge_style,
    focusMinutes: row.focus_minutes,
    quietHours: { start: row.quiet_hours_start, end: row.quiet_hours_end },
    channels: { whatsapp: row.channel_whatsapp, email: row.channel_email, call: row.channel_call },
    sound: row.notif_sound,
    vibration: row.notif_vibration,
  };
}

export function profileToRow(profile: Profile): ProfileRow {
  return {
    name: profile.name,
    first_name: profile.firstName,
    job_title: orNull(profile.jobTitle),
    email: orNull(profile.email),
    language: profile.language,
    platform: profile.platform,
  };
}

export function profileFromRow(row: ProfileRow): Omit<Profile, 'language' | 'platform' | 'appVersion' | 'notificationsAllowed'> {
  return {
    name: row.name,
    firstName: row.first_name,
    jobTitle: orUndefined(row.job_title),
    email: orUndefined(row.email),
  };
}
