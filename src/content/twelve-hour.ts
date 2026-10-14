/**
 * Two small corrections to the generated copy, made here because the file it
 * comes from says not to hand-edit it.
 *
 * 1. The generated copy writes a few fixed times on the 24-hour clock — quiet
 * hours, "Morning of · 08:00", the morning reminder's short label. The app
 * shows the 12-hour clock, so those lines are rewritten once, here.
 *
 * 2. "Slipped" is jargon for what is simply overdue.
 */
import { clockFromHHMM } from '@/lib/clock-format';

import type { Copy, Lang } from './strings';

const TIME = /\b\d{1,2}:\d{2}\b/g;
const rewrite = (text: string, lang: Lang): string => text.replace(TIME, (hhmm) => clockFromHHMM(hhmm, lang));

const OVERDUE: Record<Lang, string> = { en: 'Overdue', ar: 'متأخرة' };

export function twelveHour(copy: Copy, lang: Lang): Copy {
  return {
    ...copy,
    slipped: OVERDUE[lang],
    set_quietV: rewrite(copy.set_quietV, lang),
    remTiny: { ...copy.remTiny, morning: rewrite(copy.remTiny.morning, lang) },
    remShort: { ...copy.remShort, morning: rewrite(copy.remShort.morning, lang) },
    remOpts: copy.remOpts.map(([key, label]) => [key, rewrite(label ?? '', lang)]) as unknown as Copy['remOpts'],
  };
}
