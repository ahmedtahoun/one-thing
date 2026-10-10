/**
 * Reminder offsets: the bridge between the app's `RemindOffset` enum and the
 * handoff's copy, plus the instant a reminder actually fires.
 *
 * The handoff keys its reminder labels by the raw offset — `remTiny['10']`,
 * `remOpts` as `[['at', 'At the time'], ['10', '10 minutes before'], …]` — so
 * the two have to be mapped rather than shared. Doing it here keeps the
 * mapping in one place and out of the screens.
 */
import type { Copy } from '@/content/strings';
import type { RemindOffset, Task } from './model-types';

/** The keys the handoff's `remTiny` / `remShort` / `remOpts` use. */
export type RemindKey = 'at' | '10' | '30' | '60' | 'morning';

/** The five offsets the reminder sheet offers, in the handoff's own order. */
export const SHEET_OFFSETS: RemindOffset[] = ['at', 'min_10', 'min_30', 'hour_1', 'morning'];

const KEY: Partial<Record<RemindOffset, RemindKey>> = {
  at: 'at',
  min_10: '10',
  min_30: '30',
  hour_1: '60',
  morning: 'morning',
};

/** Minutes before the task's own time. `morning` is absolute, so it is absent. */
const MINUTES_BEFORE: Partial<Record<RemindOffset, number>> = {
  at: 0,
  min_10: 10,
  min_30: 30,
  hour_1: 60,
};

/**
 * The hour "Morning of" means. Settings puts quiet hours at 22:00–08:00 and
 * the labels themselves read "Morning of · 08:00" / "8:00", so a morning
 * reminder is quiet-hours-end.
 */
const MORNING_HOUR = 8;

/** The copy key for an offset, or null when the handoff has no label for it. */
export function remindKey(offset: RemindOffset | null): RemindKey | null {
  return offset ? KEY[offset] ?? null : null;
}

/**
 * The tiny label in a task row's time column: "−10m", "on time", "8:00".
 *
 * `custom` and `day_before` both fall back to "custom", which is what the
 * prototype shows: its event form stores "Day before" as `remind: 'custom'`,
 * so there is no shorter label for it anywhere in the handoff
 * (BUILD-REVIEW.md §2.5).
 */
export function remindTinyLabel(t: Copy, offset: RemindOffset | null): string {
  if (!offset) return '';
  const key = remindKey(offset);
  return key ? t.remTiny[key] : t.remTinyC;
}

/** The sheet's own wording: "10 minutes before", "Morning of · 08:00". */
export function remindOptionLabel(t: Copy, offset: RemindOffset): string {
  const key = remindKey(offset);
  const found = t.remOpts.find(([k]) => k === key);
  return found?.[1] ?? t.remTinyC;
}

/** The shorter wording a toast uses: "10m before", "On time". */
export function remindShortLabel(t: Copy, offset: RemindOffset): string {
  const key = remindKey(offset);
  return key ? t.remShort[key] : t.remTinyC;
}

/**
 * When the reminder for a task fires, as an ISO instant.
 *
 * Returns null for a task with no time, and for `custom` — a custom reminder
 * carries its own instant, set on the date-and-time screen. `day_before` has
 * no stated time in the handoff, so it takes the same 08:00 as `morning`;
 * BUILD-REVIEW.md §2.5 flags it.
 */
export function remindAt(task: Task, offset: RemindOffset | null = task.remind): string | null {
  if (!offset || !task.dueAt) return null;

  const before = MINUTES_BEFORE[offset];
  if (before !== undefined) return new Date(new Date(task.dueAt).getTime() - before * 60000).toISOString();

  if (offset === 'morning' || offset === 'day_before') {
    const at = new Date(task.dueAt);
    if (offset === 'day_before') at.setDate(at.getDate() - 1);
    at.setHours(MORNING_HOUR, 0, 0, 0);
    return at.toISOString();
  }
  return null;
}
