/**
 * The app's domain types, following DATA_MODEL.md § Entities.
 *
 * Times are ISO strings rather than Date objects so state serialises straight
 * to storage and to the backend. The prototype stores a bare "HH:MM" because
 * it only ever shows one day; the real app needs a full instant, since
 * Overdue, snoozing and reminders all compare against now.
 */
import type { TaskType } from '@/design/tokens';

export type TaskStatus = 'open' | 'done' | 'snoozed' | 'cancelled';

/**
 * DATA_MODEL.md lists `(at|10|60|custom|null)`, but three more are used
 * elsewhere in the handoff: the event form offers "Day before" (EVX.rems), and
 * the seed tasks carry `30` and `morning`. All five are here —
 * BUILD-REVIEW.md §2.5.
 */
export type RemindOffset =
  | 'at'
  | 'min_10'
  | 'min_30'
  | 'hour_1'
  | 'day_before'
  | 'morning'
  | 'custom';

export type CreatedVia = 'quick' | 'capture' | 'dump' | 'assistant' | 'event_form' | 'followup';

export type Task = {
  id: string;
  type: TaskType;
  title: string;
  /** Who it is with, as shown under the title. */
  who?: string;
  contactIds: string[];
  /** ISO instant. Null for a task with no time yet. */
  dueAt: string | null;
  remind: RemindOffset | null;
  remindAt?: string | null;
  status: TaskStatus;
  snoozedUntil?: string | null;
  notes?: string;
  goal?: string;
  points: string[];
  draft?: { subject?: string; body: string };
  link?: string;
  location?: string;
  platform?: string;
  durationMin?: number;
  host?: string;
  lesson?: string;
  studyDays?: number[];
  progress?: { done: number; total: number };
  createdVia: CreatedVia;
  createdAt: string;
  sentConfirmedAt?: string | null;
};

export type OneThing = {
  /** YYYY-MM-DD. */
  date: string;
  title: string;
  done: boolean;
  focusMinutes: number;
};

/** Local date key, in the device's own time zone. */
export function dateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Derived, never stored: DATA_MODEL § Key rules. */
export function isOverdue(task: Task, now: Date = new Date()): boolean {
  return task.status === 'open' && task.dueAt !== null && new Date(task.dueAt) < now;
}

/** True when the task falls on the given day. */
export function isOnDay(task: Task, day: string): boolean {
  return task.dueAt !== null && dateKey(new Date(task.dueAt)) === day;
}

/** "09:20", always in Western digits and LTR, as the design shows times. */
export function timeLabel(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Minutes from `now` until the task is due; negative once it has passed. */
export function minutesUntil(task: Task, now: Date = new Date()): number | null {
  if (!task.dueAt) return null;
  return Math.round((new Date(task.dueAt).getTime() - now.getTime()) / 60000);
}

/** The three channels a message can go out on. DATA_MODEL § Settings.channels. */
export type Channel = 'whatsapp' | 'email' | 'call';

/** DATA_MODEL.md § Entities → Contact. */
export type Contact = {
  id: string;
  name: string;
  /** "Company or role" on the contact form; shown under the name. */
  role?: string;
  /** Dial code, e.g. "+966". */
  dial?: string;
  phone?: string;
  email?: string;
  /** Where they are: a street address or a place name, opened in Maps from their profile. */
  address?: string;
  /** A second way to reach them: the number (with its own code, which may differ) and the email. */
  dial2?: string;
  phone2?: string;
  email2?: string;
  /** Their labels: Client, Lead, Supplier. A label with people on it is a chip on People. */
  labels?: string[];
  preferredChannel?: Channel;
  /** "Remember for next time" on the contact profile. */
  rememberNote?: string;
  /**
   * The last-interaction line under a contact on People ("Emailed · Sunday").
   * Held as text until History is wired in, when it is derived from the
   * latest History row instead.
   */
  lastLabel?: string;
  /**
   * When a message last went out to them, which is what moves a contact to
   * the top of People. Every device orders by this (or createdAt) after a
   * sync, so the list reads the same everywhere.
   */
  touchedAt?: string;
  createdAt: string;
};

export type HistoryKind = 'note' | 'call' | 'meeting' | 'visit' | 'email' | 'whatsapp' | 'followup_closed';

/** DATA_MODEL.md § Entities → History: one dated moment with a contact. */
export type HistoryEntry = {
  id: string;
  contactId: string;
  kind: HistoryKind;
  text: string;
  at: string;
};

export type FollowUpStatus = 'due' | 'waiting' | 'done';

/** DATA_MODEL.md § Entities → FollowUp. */
export type FollowUp = {
  id: string;
  contactId?: string | null;
  taskId?: string | null;
  channel: Channel;
  /** "Noura · Designer" — the name, then the role, as the card's source text. */
  who: string;
  what: string;
  status: FollowUpStatus;
  /** The card's footer line: "Sent Sunday · follow up Tue". */
  since: string;
  /** When a waiting follow-up becomes due. Null when not yet scheduled. */
  nextAt?: string | null;
  /**
   * What the user last did on the card. It replaces `since` in the footer,
   * and is stored as a kind rather than text so it follows the language.
   */
  lastAction?: 'nudged' | 'closed' | null;
  lastActionAt?: string | null;
  /** Follow-ups list newest first; this keeps that order across devices. */
  createdAt?: string;
};

/**
 * DATA_MODEL § Key rules: a follow-up is `waiting` until `next_at`, then
 * `due`. Derived at read time, so nothing has to run at that moment.
 */
export function followUpStatus(f: FollowUp, now: Date = new Date()): FollowUpStatus {
  if (f.status === 'waiting' && f.nextAt && new Date(f.nextAt) <= now) return 'due';
  return f.status;
}

/** "Noura · Designer" → "Noura". */
export function displayName(who: string): string {
  return who.split(' ·')[0] ?? who;
}

/**
 * Up to two initials, uppercased: "Al Noor Packaging" → "AN".
 *
 * An Arabic name gets one letter. Two Arabic letters side by side join into
 * a word — "محمد السعدي" drew "ما", "what" — and "ال" is the article, not
 * part of the name, so "النور للتغليف" drew "ال". One letter of the name
 * itself is what WhatsApp shows too: "م", "ن".
 */
export function initials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  const first = words[0] ?? '';
  if (/^[\u0600-\u06FF]/.test(first)) return first.replace(/^ال(?=[\u0621-\u064A]{2})/, '').charAt(0);
  return words
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export type NudgeStyle = 'gentle' | 'firm' | 'quiet';

/** DATA_MODEL.md § Entities → Settings, plus the marketing choice. */
export type Prefs = {
  nudgeStyle: NudgeStyle;
  focusMinutes: 25 | 45 | 90;
  quietHours: { start: string; end: string };
  channels: Record<Channel, boolean>;
  sound: boolean;
  vibration: boolean;
  /** Mirrors the latest marketing consent row, for the Settings toggle. */
  marketing: boolean;
};
