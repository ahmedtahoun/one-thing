/**
 * How the panel writes numbers and times, as the prototype does
 * (`admin-logic.js`: `day`, `rel`, `toLocaleString`).
 *
 * Every date is written in one time zone, NEXT_PUBLIC_ADMIN_TIME_ZONE
 * (default Asia/Riyadh, where the team is), on the server and in the browser
 * alike. Otherwise a page rendered on a UTC server and hydrated in Riyadh
 * would disagree with itself, and "Today" would turn over at 3 am.
 */

export const TIME_ZONE = process.env.NEXT_PUBLIC_ADMIN_TIME_ZONE || 'Asia/Riyadh';

const parts = (d: Date) => {
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d);
  const get = (type: string) => Number(p.find((x) => x.type === type)?.value);
  return { y: get('year'), m: get('month'), d: get('day'), h: get('hour'), min: get('minute') };
};

/** The instant at wall-clock time y-m-d h:min in the panel's zone (`m` from 0). */
export function zoned(y: number, m: number, d: number, h = 0, min = 0): Date {
  const guess = Date.UTC(y, m, d, h, min);
  const p = parts(new Date(guess));
  return new Date(guess - (Date.UTC(p.y, p.m - 1, p.d, p.h, p.min) - guess));
}

/** The calendar day an instant falls on, in the panel's zone, as a day number. */
const dayNumber = (d: Date) => {
  const { y, m, d: dd } = parts(d);
  return Date.UTC(y, m - 1, dd) / 86_400_000;
};

/** Whole calendar days from `iso` back to `now`; negative for the future. */
export function daysAgo(iso: string, now: Date): number {
  return dayNumber(now) - dayNumber(new Date(iso));
}

/** YYYY-MM-DD in the panel's zone. */
export function dateKey(d: Date): string {
  const { y, m, d: dd } = parts(d);
  return `${y}-${String(m).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

const fmt = (d: Date, options: Intl.DateTimeFormatOptions) => d.toLocaleDateString('en-GB', { timeZone: TIME_ZONE, ...options });

/** "20 Sept", with the year once it is more than 280 days back. */
export function day(iso: string, now: Date): string {
  return fmt(new Date(iso), { day: 'numeric', month: 'short', year: daysAgo(iso, now) > 280 ? 'numeric' : undefined });
}

/** "Today", "Yesterday", "3 days ago", "2 wk ago", "4 mo ago". */
export function rel(iso: string | null, now: Date): string {
  if (!iso) return '—';
  const n = daysAgo(iso, now);
  if (n <= 0) return 'Today';
  if (n === 1) return 'Yesterday';
  if (n < 7) return `${n} days ago`;
  if (n < 30) return `${Math.floor(n / 7)} wk ago`;
  return `${Math.floor(n / 30)} mo ago`;
}

/** "14:20". */
export function clock(iso: string): string {
  const { h, min } = parts(new Date(iso));
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

/** "10 Oct 09:42", the audit log's form. */
export function stamp(iso: string): string {
  const d = new Date(iso);
  return `${String(parts(d).d).padStart(2, '0')} ${fmt(d, { month: 'short' })} ${clock(iso)}`;
}

/** "Mon", for a YYYY-MM-DD key. */
export function weekday(key: string): string {
  return new Date(key + 'T12:00:00Z').toLocaleDateString('en-GB', { timeZone: 'UTC', weekday: 'short' });
}

/** "Friday, 10 October 2026", the Overview's heading line. */
export function longDate(now: Date): string {
  return `${fmt(now, { weekday: 'long' })}, ${parts(now).d} ${fmt(now, { month: 'long' })} ${parts(now).y}`;
}

/** "2,418". */
export const count = (n: number) => n.toLocaleString('en-US');

/** Up to two initials: "Khalid Al-Mansouri" → "KA". */
export const initials = (name: string) =>
  name
    .split(' ')
    .map((w) => w[0] ?? '')
    .slice(0, 2)
    .join('');
