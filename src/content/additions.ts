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
  /** The Assistant saving a person from a sentence or a voice note. */
  contact: {
    chip: string;
    askName: string;
    askDetail: string;
    ready: string;
    save: string;
    nameOnly: string;
    cancel: string;
    saved: string;
    updated: string;
    dropped: string;
    duplicate: string;
    update: string;
    saveNew: string;
    guessed: string;
    name: string;
    phone: string;
    email: string;
    role: string;
    badPhone: string;
    badEmail: string;
    needName: string;
  };
  small: { hello: string; help: string; thanks: string; notFound: string; noPhone: string; noEmail: string };
  /** The nudges that build the habit: each morning, and after a quiet spell. */
  nudge: { morningTitle: string; morningAsk: string; comebackTitle: string; comebackBody: string };
  /** Today: the notifications-off prompt and the streak line. */
  habit: {
    nudgesOff: string;
    nudgesTurnOn: string;
    streak: string;
    streakKeep: string;
    streakFresh: string;
  };
  listening: string;
  micStart: string;
  micStop: string;
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
    /** The Assistant saving a person: asks for what is missing, one thing at a time. */
    contact: {
      chip: 'Save a contact',
      askName: 'Sure. What’s their name?',
      askDetail: 'Got it, {n}. What’s their number or email?',
      ready: 'Here’s what I have. Save this contact?',
      save: 'Save contact',
      nameOnly: 'Save name only',
      cancel: 'Cancel',
      saved: 'Saved {n} to People.',
      updated: 'Updated {n}.',
      dropped: 'Okay, I won’t save it.',
      duplicate: '{n} is already in People. Add these details to them?',
      update: 'Update {n}',
      saveNew: 'Save as new',
      guessed: 'I wrote the email the way I heard it. Please check the spelling.',
      name: 'Name',
      phone: 'Number',
      email: 'Email',
      role: 'Company or role',
      badPhone: 'A number needs at least 7 digits.',
      badEmail: 'That email doesn’t look right.',
      needName: 'Add a name first.',
    },
    small: {
      hello: 'Hi{n}! Tell me what to remember — or say “save a contact” and speak their details.',
      help: 'I can turn a sentence into a task, save a contact from what you say (name, number, email), lay out your day, and tell you who’s waiting on you. Try “Call Sara tomorrow at 10” or “Save a contact”. Tap the mic and just talk.',
      thanks: 'Anytime.',
      notFound: 'I couldn’t find that person in People.',
      noPhone: 'I don’t have a number for {n} yet.',
      noEmail: 'I don’t have an email for {n} yet.',
    },
    nudge: {
      morningTitle: 'Your one thing today',
      morningAsk: 'What’s the one thing that would make today a good day?',
      comebackTitle: 'Still here when you are',
      comebackBody: 'One small thing is enough. Open it and name just one.',
    },
    habit: {
      nudgesOff: 'Reminders are off, so nothing will nudge you.',
      nudgesTurnOn: 'Turn on',
      streak: '{n}-day streak',
      streakKeep: 'Finish one task today to keep your {n}-day streak.',
      streakFresh: 'Fresh start. One finished task today begins a new streak.',
    },
    listening: 'Listening…',
    micStart: 'Speak',
    micStop: 'Stop listening',
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
    contact: {
      chip: 'احفظ جهة اتصال',
      askName: 'تمام. ما اسمه؟',
      askDetail: 'تمام، {n}. ما رقمه أو إيميله؟',
      ready: 'هذه البيانات اللي عندي. أحفظ الجهة؟',
      save: 'حفظ الجهة',
      nameOnly: 'احفظ الاسم فقط',
      cancel: 'إلغاء',
      saved: 'تم حفظ {n} في الأشخاص.',
      updated: 'تم تحديث {n}.',
      dropped: 'تمام، ما راح أحفظها.',
      duplicate: '{n} موجود في الأشخاص. أضيف له هذه البيانات؟',
      update: 'حدّث {n}',
      saveNew: 'احفظ كجديد',
      guessed: 'كتبت الإيميل زي ما سمعته. تأكد من الإملاء.',
      name: 'الاسم',
      phone: 'الرقم',
      email: 'الإيميل',
      role: 'الشركة أو الدور',
      badPhone: 'الرقم لازم يكون 7 أرقام على الأقل.',
      badEmail: 'الإيميل مو صحيح.',
      needName: 'أضف الاسم أولًا.',
    },
    small: {
      hello: 'أهلًا{n}! قل لي وش أذكّرك فيه — أو قل «احفظ جهة اتصال» وقل بياناتها.',
      help: 'أقدر أحوّل جملتك إلى مهمة، وأحفظ جهة اتصال من كلامك (الاسم والرقم والإيميل)، وأرتّب يومك، وأقول لك مين ينتظر ردك. جرّب «كلم سارة بكرة العصر» أو «احفظ جهة اتصال». اضغط على الميكروفون وتكلم.',
      thanks: 'العفو.',
      notFound: 'ما لقيت هذا الشخص في الأشخاص.',
      noPhone: 'ما عندي رقم لـ{n} بعد.',
      noEmail: 'ما عندي إيميل لـ{n} بعد.',
    },
    nudge: {
      morningTitle: 'الشي الواحد اليوم',
      morningAsk: 'وش الشي الواحد اللي لو خلّصته اليوم، يومك ناجح؟',
      comebackTitle: 'أنا هنا وقت ما ترجع',
      comebackBody: 'شي صغير واحد يكفي. افتح التطبيق وسمّي شي واحد بس.',
    },
    habit: {
      nudgesOff: 'التذكيرات مقفلة، فما راح يوصلك أي تنبيه.',
      nudgesTurnOn: 'شغّلها',
      streak: 'سلسلة {n} يوم',
      streakKeep: 'خلّص مهمة وحدة اليوم عشان تحافظ على سلسلة {n} يوم.',
      streakFresh: 'بداية جديدة. مهمة وحدة تخلّصها اليوم تبدأ سلسلة جديدة.',
    },
    listening: 'أسمعك…',
    micStart: 'تحدّث',
    micStop: 'أوقف الاستماع',
  },
};

export const added = (lang: Lang): Added => ADDED[lang];
