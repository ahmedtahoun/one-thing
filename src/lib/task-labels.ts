/**
 * The day labels a task row and the reminder sheet show.
 *
 * The prototype hand-writes these into its seed data ("Tmw 10:00",
 * "Mon 13 · 10:00") and reads them back with string splits, which only works
 * for one frozen day. They are generated here instead, from the handoff's own
 * `wk` array and the "Tmw " prefix, so the labels stay right on any date.
 *
 * Note the two separators are the prototype's, not a typo: tomorrow is a space
 * and a later day is " · ".
 */
import { clockOf } from './clock-format';
import type { InlineCopy } from '@/content/inline-copy';
import type { Copy } from '@/content/strings';
import { dateKey, type Task } from './model-types';

/** "Mon 13" — weekday from `wk`, then the day of the month. */
export function dayLabel(iso: string, t: Copy): string {
  const d = new Date(iso);
  return `${t.wk[d.getDay()]} ${d.getDate()}`;
}

/**
 * "" today, "Tmw 10:00" tomorrow, "Mon 13 · 10:00" after that — the
 * prototype's `when` string, rebuilt.
 */
export function whenLabel(task: Task, t: Copy, inline: InlineCopy, now: Date = new Date()): string {
  if (!task.dueAt) return '';
  const day = dateKey(new Date(task.dueAt));
  const today = dateKey(now);
  if (day === today) return '';

  const time = clockOf(task.dueAt);
  const tomorrow = dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  if (day === tomorrow) return `${inline.tmwPrefix}${time}`;
  return `${dayLabel(task.dueAt, t)} · ${time}`;
}
