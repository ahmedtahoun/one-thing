/**
 * How a time of day is written for the person: the 12-hour clock with AM or
 * PM — "9:30 AM", "5:45 PM" — and, in Arabic, ص and م. Times are still stored
 * and compared as 24-hour "HH:MM" (see `timeLabel`); this is only what is
 * shown.
 *
 * Pure functions read the language from a module setting that the language
 * provider keeps in step, so a deep label builder does not need it passed down.
 */
import type { Lang } from '@/content/strings';

import { ltr } from './bidi';

let current: Lang = 'en';

/** Called by the language provider whenever the language changes. */
export function setClockLang(lang: Lang): void {
  current = lang;
}

/**
 * Hours 0–23 and minutes as "9:30 AM". In Arabic the digits are isolated so
 * they keep their order inside a sentence, with ص (صباحًا) or م (مساءً) after.
 */
export function clockText(hour: number, minute: number, lang: Lang = current): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const time = `${h12}:${String(minute).padStart(2, '0')}`;
  if (lang === 'ar') return `${ltr(time)} ${hour < 12 ? 'ص' : 'م'}`;
  return `${time} ${hour < 12 ? 'AM' : 'PM'}`;
}

/** An ISO instant's time of day, on the 12-hour clock, or '' for none. */
export function clockOf(iso: string | null | undefined, lang: Lang = current): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : clockText(d.getHours(), d.getMinutes(), lang);
}

/** A 24-hour "17:45" on the 12-hour clock; the text as given when it is not a time. */
export function clockFromHHMM(hhmm: string, lang: Lang = current): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!match) return hhmm;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour > 23 || minute > 59 ? hhmm : clockText(hour, minute, lang);
}
