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
