/**
 * The streak: how many days in a row at least one task was finished.
 *
 * Built to encourage, not to punish. Today not being done yet does not break
 * a streak that reached yesterday — it only means today is still open — and a
 * lapse is "a fresh start", never a counter that shames. One task is enough
 * to keep it alive.
 */
import { dateKey } from './model-types';

export type Streak = {
  /** Consecutive days ending today, or yesterday while today is still open. */
  current: number;
  /** Whether something was finished today. */
  doneToday: boolean;
  /** Days with a win at all, so a lapse can be told from a first day. */
  total: number;
};

const dayBefore = (key: string): string => {
  const [y = 0, m = 1, d = 1] = key.split('-').map(Number);
  return dateKey(new Date(y, m - 1, d - 1));
};

export function streakOf(days: readonly string[], now: Date = new Date()): Streak {
  const won = new Set(days);
  const today = dateKey(now);
  const doneToday = won.has(today);
  let cursor = doneToday ? today : dayBefore(today);
  let current = 0;
  while (won.has(cursor)) {
    current++;
    cursor = dayBefore(cursor);
  }
  return { current, doneToday, total: won.size };
}
