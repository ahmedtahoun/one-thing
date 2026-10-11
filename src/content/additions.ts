/**
 * Copy for features the product owner asked for after the handoff, in both
 * languages. Not generated, because the handoff never had it: every line
 * here is listed in BUILD-REVIEW.md with the request it came from, so it can
 * be reworded without hunting through screens.
 */
import type { Lang } from './strings';

export type Added = { importC: string; fillFromPhone: string; restored: string; storeFailed: string };

const ADDED: Record<Lang, Added> = {
  en: {
    /** People, beside "New" — §2.46. */
    importC: 'Import',
    /** New contact, above the name — §2.46. */
    fillFromPhone: 'Fill from phone',
    /** Restore found a subscription — §2.50. The handoff has only "none found". */
    restored: 'Purchases restored.',
    /** The store refused a purchase for a reason other than Cancel — §2.50. */
    storeFailed: 'The store couldn’t complete the purchase. Please try again.',
  },
  ar: {
    importC: 'استيراد',
    fillFromPhone: 'تعبئة من جهات الاتصال',
    restored: 'رجّعنا مشترياتك.',
    storeFailed: 'المتجر ما قدر يكمّل الشراء. جرّب مرة ثانية.',
  },
};

export const added = (lang: Lang): Added => ADDED[lang];
