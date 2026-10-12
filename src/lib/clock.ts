/**
 * Typed times for the pickers, and the first sensible time to offer.
 *
 * Times are 24-hour "HH:MM" strings everywhere in the app (`timeLabel`), so
 * they compare correctly as text.
 */

const ARABIC_INDIC = '٠١٢٣٤٥٦٧٨٩';

/** "17:45", "7:05", "1745", "17.45" and "9" (an hour on its own) → "HH:MM", or null. */
export function parseClock(text: string): string | null {
  const ascii = text.trim().replace(/[٠-٩]/g, (d) => String(ARABIC_INDIC.indexOf(d)));
  const match = /^(\d{1,2})(?:[:.](\d{2})|(\d{2}))?$/.exec(ascii);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2] ?? match[3] ?? '0');
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
