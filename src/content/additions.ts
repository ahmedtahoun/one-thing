/**
 * Copy for features the product owner asked for after the handoff, in both
 * languages. Not generated, because the handoff never had it: every line
 * here is listed in BUILD-REVIEW.md with the request it came from, so it can
 * be reworded without hunting through screens.
 */
import type { Lang } from './strings';

export type Added = {
  importC: string;
  fillFromPhone: string;
  restored: string;
  storeFailed: string;
  pickWho: { whatsapp: string; email: string; call: string };
  pickCancel: string;
  ask: {
    ambiguous: string;
    confirm: string;
    narrow: string;
    unknown: string;
    whenMissing: string;
    whenPast: string;
    unreadable: string;
    added: string;
    addPerson: string;
    someoneElse: string;
    noOne: string;
    tomorrowAt: string;
    keepTime: string;
  };
  shrinkShort: string;
  rateApp: string;
  rateUnavailable: string;
  helpFeedback: string;
  helpSubject: string;
  helpBody: string;
  helpNoMail: string;
  micOff: string;
  micFailed: string;
  customTime: string;
  customTimeBad: string;
  customTimePast: string;
};

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
    /** People when Today's Call / Email / WhatsApp tile sent you there. */
    pickWho: { whatsapp: 'Who do you want to message?', email: 'Who do you want to email?', call: 'Who do you want to call?' },
    pickCancel: 'Cancel',
    /** The Assistant and Quick capture asking before they propose a task. */
    ask: {
      ambiguous: 'Which {n} do you mean?',
      confirm: 'Did you mean {n}?',
      narrow: 'Showing {a} of {b}. Type a last name to narrow it down.',
      unknown: 'I don’t have {n} in People yet.',
      whenMissing: 'When should I set this for?',
      whenPast: '{t} has already passed today. When instead?',
      unreadable: 'I couldn’t read that. Tap one of the options, or try again.',
      added: 'Added {n} to People. You can add their number when you message them.',
      addPerson: 'Add {n}',
      someoneElse: 'Someone else',
      noOne: 'No one',
      tomorrowAt: 'Tomorrow {t}',
      keepTime: 'Keep {t}',
    },
    /** Today's One Thing card, beside Lock In. */
    shrinkShort: 'Shrink it',
    /** Settings rows after Support us. */
    rateApp: 'Rate The One Thing',
    rateUnavailable: 'The review prompt isn’t available right now. Please try again later.',
    helpFeedback: 'Help & feedback',
    helpSubject: 'The One Thing — help & feedback',
    helpBody: 'Tell us what happened or what you’d like us to change:',
    helpNoMail: 'Couldn’t open Mail. Write to {email}.',
    /** The microphone or speech permission was refused. */
    micOff: 'Microphone access is off. Turn it on in Settings, or type it instead.',
    micFailed: 'Couldn’t hear that. Try again, or type it instead.',
    /** Reschedule: a time that is not one of the half-hour chips. */
    customTime: 'Or type a time',
    customTimeBad: 'Use 24-hour time, like 17:45.',
    customTimePast: 'That time has already passed — pick a later one.',
  },
  ar: {
    importC: 'استيراد',
    fillFromPhone: 'تعبئة من جهات الاتصال',
    restored: 'رجّعنا مشترياتك.',
    storeFailed: 'المتجر ما قدر يكمّل الشراء. جرّب مرة ثانية.',
    pickWho: { whatsapp: 'مين تبي ترسل له؟', email: 'مين تبي تكتب له إيميل؟', call: 'مين تبي تتصل فيه؟' },
    pickCancel: 'إلغاء',
    ask: {
      ambiguous: 'أي {n} تقصد؟',
      confirm: 'تقصد {n}؟',
      narrow: 'عرضت {a} من {b}. اكتب اسم العيلة عشان نحدد.',
      unknown: 'ما عندي {n} في الأشخاص.',
      whenMissing: 'متى أحط هذا؟',
      whenPast: '{t} فات اليوم. متى بدالها؟',
      unreadable: 'ما فهمت. اختر من الخيارات، أو جرّب مرة ثانية.',
      added: 'ضفت {n} للأشخاص. تقدر تضيف رقمه وقت ما تراسله.',
      addPerson: 'أضف {n}',
      someoneElse: 'شخص ثاني',
      noOne: 'ولا أحد',
      tomorrowAt: 'بكرة {t}',
      keepTime: 'خلّها {t}',
    },
    shrinkShort: 'صغّرها',
    rateApp: 'قيّم The One Thing',
    rateUnavailable: 'نافذة التقييم مو متاحة الحين. جرّب بعدين.',
    helpFeedback: 'المساعدة والملاحظات',
    helpSubject: 'The One Thing — مساعدة وملاحظات',
    helpBody: 'قل لنا وش صار أو وش تبينا نغيّر:',
    helpNoMail: 'ما قدرنا نفتح البريد. راسلنا على {email}.',
    micOff: 'الميكروفون مقفل. شغّله من الإعدادات، أو اكتب بدالها.',
    micFailed: 'ما قدرت أسمع. جرّب مرة ثانية، أو اكتب بدالها.',
    customTime: 'أو اكتب وقت',
    customTimeBad: 'اكتب الوقت بنظام 24 ساعة، مثل 17:45.',
    customTimePast: 'هذا الوقت فات — اختر وقت أبعد.',
  },
};

export const added = (lang: Lang): Added => ADDED[lang];
