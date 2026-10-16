/**
 * The time on the right of a row, the way a chat list says it: the clock for
 * today (12-hour, with AM or PM), "Yesterday", the weekday for the past week, then the date. Clock and
 * date are in Western digits, as everywhere else in the app.
 */
import type { Lang } from '@/content/strings';
import { clockText } from '@/lib/clock-format';

const pad = (n: number): string => String(n).padStart(2, '0');
const dayStart = (d: Date): number => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export function chatTime(iso: string | undefined, now: Date, lang: Lang): string {
  const at = iso ? new Date(iso) : null;
  if (!at || Number.isNaN(at.getTime())) return '';
  const days = Math.round((dayStart(now) - dayStart(at)) / 86400000);
  if (days < 0) return `${pad(at.getDate())}/${pad(at.getMonth() + 1)}/${at.getFullYear()}`;
  if (days === 0) return clockText(at.getHours(), at.getMinutes(), lang);
  if (days === 1) return lang === 'ar' ? 'أمس' : 'Yesterday';
  if (days < 7) return at.toLocaleDateString(lang === 'ar' ? 'ar' : 'en-GB', { weekday: 'long' });
  return `${pad(at.getDate())}/${pad(at.getMonth() + 1)}/${at.getFullYear()}`;
}
