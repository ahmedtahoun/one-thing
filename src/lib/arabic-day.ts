/**
 * Arabic day words in a sentence. A day label is built bare — "اليوم",
 * "بكرة", "أربعاء 21" — which reads well in a list but not after a
 * preposition: "to today" is لليوم (the alif of ال is dropped after ل), "to
 * Friday" is للجمعة, and "on Friday" needs the article: الجمعة.
 *
 * Pure; used only in Arabic.
 */

const firstWord = (label: string): string => label.trim().split(/\s+/)[0] ?? '';

/** "أربعاء 21" → "الأربعاء 21": a weekday gets its article; anything else is left alone. */
export function onDay(label: string, weekdays: readonly string[]): string {
  return weekdays.includes(firstWord(label)) ? `ال${label.trim()}` : label;
}

/** After ل: "اليوم" → "لليوم", "أربعاء 21" → "للأربعاء 21", "بكرة" → "لبكرة". */
export function toDay(label: string, weekdays: readonly string[]): string {
  const day = onDay(label, weekdays).trim();
  return day.startsWith('ال') ? `لل${day.slice(2)}` : `ل${day}`;
}
