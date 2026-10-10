/**
 * How a proposal's "When" and "Who" read on the three free-text screens.
 */
import type { Copy } from '@/content/strings';
import { dateKey, timeLabel } from '@/lib/model-types';
import { dayLabel } from '@/lib/task-labels';

/** "Today · 17:00", "Tomorrow · 10:00", "Mon 13 · 09:00" — the prototype's `day + ' · ' + time`. */
export function whenText(iso: string, t: Copy, now: Date = new Date()): string {
  const day = dateKey(new Date(iso));
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const label = day === dateKey(now) ? t.today : day === dateKey(tomorrow) ? t.tmw : dayLabel(iso, t);
  return `${label} · ${timeLabel(iso)}`;
}

/** The prototype shows an em dash when nobody was caught. A mark, not copy. */
export const NOBODY = '—';
