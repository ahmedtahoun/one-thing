/**
 * Copy for features the product owner asked for after the handoff, in both
 * languages. Not generated, because the handoff never had it: every line
 * here is listed in BUILD-REVIEW.md with the request it came from, so it can
 * be reworded without hunting through screens.
 */
import type { Lang } from './strings';

export type Added = { importC: string; fillFromPhone: string };

const ADDED: Record<Lang, Added> = {
  en: {
    /** People, beside "New" — §2.39. */
    importC: 'Import',
    /** New contact, above the name — §2.39. */
    fillFromPhone: 'Fill from phone',
  },
  ar: {
    importC: 'استيراد',
    fillFromPhone: 'تعبئة من جهات الاتصال',
  },
};

export const added = (lang: Lang): Added => ADDED[lang];
