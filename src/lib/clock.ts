/**
 * Typed times for the pickers, and the first sensible time to offer.
 *
 * Times are stored as 24-hour "HH:MM" strings (`timeLabel`), so they compare
 * correctly as text; what is shown is on the 12-hour clock (`clock-format.ts`).
 */

const ARABIC_INDIC = '٠١٢٣٤٥٦٧٨٩';

/**
 * What a person types into a time box, as "HH:MM": "5:45 pm", "5pm", "5:45 م",
 * "9 AM", and also 24-hour "17:45", "7:05", "1745", "17.45" or "9" (an hour on
 * its own). With AM or PM (ص / م) the hour is 1–12; "12 AM" is midnight.
 */
export function parseClock(text: string): string | null {
  const ascii = text.trim().replace(/[٠-٩]/g, (d) => String(ARABIC_INDIC.indexOf(d)));
  const match = /^(\d{1,2})(?:[:.](\d{2})|(\d{2}))?\s*(a\.?m\.?|p\.?m\.?|ص|م)?$/i.exec(ascii);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] ?? match[3] ?? '0');
  const meridiem = match[4]?.toLowerCase();
  if (meridiem) {
    if (hour < 1 || hour > 12) return null;
    const pm = meridiem.startsWith('p') || meridiem === 'م';
    hour = (hour % 12) + (pm ? 12 : 0);
  }
  if (hour > 23 || minute > 59) return null;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/** The first half-hour chip (08:00–21:30) strictly after `now`, or 09:00 tomorrow once they run out. */
export function nextSlot(now: string): { time: string; dayOffset: 0 | 1 } {
  if (now < '08:00') return { time: '08:00', dayOffset: 0 };
  const [h = 0, m = 0] = now.split(':').map(Number);
  const next = m < 30 ? [h, 30] : [h + 1, 0];
  const time = `${String(next[0]).padStart(2, '0')}:${String(next[1]).padStart(2, '0')}`;
  return time > '21:30' ? { time: '09:00', dayOffset: 1 } : { time, dayOffset: 0 };
}
