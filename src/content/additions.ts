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
    address: string;
    openMap: string;
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
  /** Sending one message to many people, one press of send at a time. */
  bulk: {
    entry: string;
    title: string;
    whatsapp: string;
    email: string;
    subject: string;
    message: string;
    messagePh: string;
    insertName: string;
    waNote: string;
    bccNote: string;
    personalNote: string;
    recipients: string;
    selectAll: string;
    clear: string;
    selected: string;
    noNumber: string;
    noEmail: string;
    start: string;
    needMessage: string;
    needPeople: string;
    limit: string;
    progress: string;
    openWa: string;
    openMail: string;
    openBcc: string;
    next: string;
    skip: string;
    stop: string;
    done: string;
    doneBody: string;
    back: string;
    after: string;
    opened: string;
    goBack: string;
    emailStart: string;
    emailEnd: string;
  };
  /** The chips on People, and the favorites that go with them. */
  filters: {
    all: string;
    waiting: string;
    favorites: string;
    recent: string;
    favAdded: string;
    favRemoved: string;
    favHint: string;
    waitingNone: string;
    recentNone: string;
    favorite: string;
    followups: string;
  };
  /** The People screen itself: the search, its empty states, the ⋯ menu. */
  peopleScreen: {
    searchAll: string;
    searchFavorites: string;
    searchRecent: string;
    favTitle: string;
    favBody: string;
    favLink: string;
    noneTitle: string;
    noneBody: string;
    noneLink: string;
    more: string;
  };
  /** The Next tab: what needs doing now, with the reason on each card. */
  next: {
    agenda: string;
    seeAll: string;
    tab: string;
    title: string;
    all: string;
    lateMin: string;
    lateHour: string;
    lateDay: string;
    lateDays: string;
    today: string;
    reply0: string;
    reply1: string;
    reply: string;
    quiet: string;
    later: string;
    nudge: string;
    open: string;
    message: string;
    done: string;
    doneShort: string;
    alsoMore: string;
    more: string;
    less: string;
    emptyTitle: string;
    emptyBody: string;
    emptyAdd: string;
    firstTitle: string;
    firstBody: string;
    toastLater: string;
    toastQuiet: string;
    add: string;
  };
  /** Small lines on Today. */
  today: { pickEmpty: string; pickAdd: string; setOne: string; tryIt: string; open: string; me: string; home: string; add: string; darkMode: string; lightMode: string };
  /** The picture on a person: where it comes from. */
  photo: {
    title: string;
    take: string;
    choose: string;
    remove: string;
    denied: string;
    hint: string;
  };
  /** Compose and the event form, kept short: the recipient is shown, not asked for again. */
  lock: {
    to: string;
    change: string;
    moreOptions: string;
    fewerOptions: string;
  };
  /** Promises and waiting, said out loud: the tags on the card and what is said after saving. */
  loop: {
    promise: string;
    waiting: string;
    checkIn: string;
    waitSince: string;
    savedWait: string;
    sentYes: string;
    sentOther: string;
    chipPromise: string;
    chipWait: string;
    hint: string;
  };
  /** How often someone should hear from you, set on their profile. */
  rhythm: {
    title: string;
    hint: string;
    /** One label for each of the rhythms, in order: off, weekly, every 2 weeks, monthly, quarterly. */
    options: readonly string[];
  };
  /** The one-tap first drafts offered above the message box. */
  drafts: {
    label: string;
    chase: string;
    checkin: string;
    thanks: string;
    reschedule: string;
    replaced: string;
  };
  /** The one "Add" button on People, and what it offers. */
  addPeople: {
    button: string;
    title: string;
    newContact: string;
    newSub: string;
    scan: string;
    scanSub: string;
    file: string;
    fileSub: string;
    phone: string;
    phoneSub: string;
  };
  /** Importing a spreadsheet or contacts file. */
  importer: {
    title: string;
    intro: string;
    formats: string;
    choose: string;
    reading: string;
    oldExcel: string;
    unknown: string;
    empty: string;
    failed: string;
    found: string;
    ready: string;
    selectAll: string;
    clear: string;
    already: string;
    noName: string;
    skippedEmail: string;
    skippedPhone: string;
    importN: string;
    doneTitle: string;
    doneBody: string;
    back: string;
    another: string;
  };
  /** Scanning a business card. */
  scan: {
    title: string;
    intro: string;
    take: string;
    choose: string;
    reading: string;
    unsupported: string;
    androidNote: string;
    nothing: string;
    cameraOff: string;
    name: string;
    role: string;
    phone: string;
    email: string;
    save: string;
    another: string;
    read: string;
    saved: string;
    exists: string;
    update: string;
    saveNew: string;
    needName: string;
  };
  /** The sheet that opens when a person is tapped on People. */
  menu: {
    addNumber: string;
    addEmail: string;
    usual: string;
    meeting: string;
    meetingSub: string;
    profile: string;
    profileSub: string;
    favAdd: string;
    favRemove: string;
    close: string;
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
    customTimeBad: 'Type a time like 5:45 PM.',
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
      address: 'Address or location',
      openMap: 'Open in Maps',
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
    bulk: {
      entry: 'Send to many',
      title: 'Send to many',
      whatsapp: 'WhatsApp',
      email: 'Email',
      subject: 'Subject',
      message: 'Message',
      messagePh: 'Write your message…',
      insertName: 'Insert {name}',
      waNote: 'WhatsApp opens one chat at a time. You press send in each and the next one is ready when you come back.',
      bccNote: 'Goes as one email. Nobody can see the other recipients.',
      personalNote: 'Each person gets their own email, addressed by name. It moves on by itself once you send.',
      recipients: 'Who gets it',
      selectAll: 'Select all',
      clear: 'Clear',
      selected: '{n} selected',
      noNumber: 'No number',
      noEmail: 'No email',
      start: 'Start · {n} people',
      needMessage: 'Write a message first.',
      needPeople: 'Pick at least one person.',
      limit: 'Up to {n} people at a time.',
      progress: '{i} of {n}',
      openWa: 'Open WhatsApp for {n}',
      openMail: 'Open email for {n}',
      openBcc: 'Open email to {n} people',
      next: 'Next',
      skip: 'Skip',
      stop: 'Stop',
      done: 'All done',
      doneBody: '{n} opened. Nothing was sent for you.',
      back: 'Back to People',
      after: 'Opened. Send it there, then tap Next.',
      opened: 'Opened for {n}.',
      goBack: 'Didn’t send? Go back',
      emailStart: 'Dear {name},',
      emailEnd: 'Kind regards,',
    },
    filters: {
      all: 'All',
      waiting: 'Waiting',
      favorites: 'Favorites',
      recent: 'Recent',
      favAdded: '{n} added to Favorites',
      favRemoved: '{n} removed from Favorites',
      favHint: 'Press and hold a person to add them here.',
      waitingNone: 'Nobody owes you a reply.',
      recentNone: 'Nobody in the last 7 days.',
      favorite: 'Favorite',
      followups: 'Follow-ups',
    },
    menu: {
      addNumber: 'Add a number',
      addEmail: 'Add an email',
      usual: 'Usual',
      meeting: 'Schedule a meeting',
      meetingSub: 'Pick a time together',
      profile: 'Open profile',
      profileSub: 'History and notes',
      favAdd: 'Add to Favorites',
      favRemove: 'Remove from Favorites',
      close: 'Close',
    },
    peopleScreen: {
      searchAll: 'Search people',
      searchFavorites: 'Search favorites',
      searchRecent: 'Search recent',
      favTitle: 'Add to your Favorites',
      favBody: 'Press and hold a person to add them. Favorites come first when you pick someone to message.',
      favLink: 'Choose people',
      noneTitle: 'No one here yet',
      noneBody: 'Add a person, scan a business card, or import a file.',
      noneLink: 'Add people',
      more: 'More',
    },
    next: {
      agenda: 'Agenda',
      seeAll: 'All tasks',
      tab: 'Next',
      title: 'Next',
      all: 'All tasks',
      lateMin: '{n} min late',
      lateHour: '{n} h late',
      lateDay: '1 day late',
      lateDays: '{n} days late',
      today: 'Today at {t}',
      reply0: 'Time to follow up',
      reply1: 'Waiting 1 day for a reply',
      reply: 'Waiting {n} days for a reply',
      quiet: 'No contact for {n} days',
      later: 'Later',
      nudge: 'Nudge',
      open: 'Open',
      message: 'Message',
      done: 'Mark done',
      doneShort: 'Done',
      alsoMore: '+{n} more',
      more: 'Show {n} more',
      less: 'Show less',
      emptyTitle: 'You are clear',
      emptyBody: 'Nothing needs you right now. Add a task, or say it with the mic.',
      emptyAdd: 'Add a task',
      firstTitle: 'What to do next shows up here',
      firstBody: 'Add your people and tasks. I will bring up what is late, who owes you a reply, and who you have not spoken to in a while.',
      toastLater: 'Moved to tomorrow morning',
      toastQuiet: 'Back in a week',
      add: 'Add',
    },
    photo: {
      title: 'Picture',
      take: 'Take a photo',
      choose: 'Choose from photos',
      remove: 'Remove picture',
      denied: 'The camera is off. Turn it on in Settings, or choose a photo instead.',
      hint: 'Add a picture',
    },
    lock: {
      to: 'To',
      change: 'Change',
      moreOptions: 'More options',
      fewerOptions: 'Fewer options',
    },
    loop: {
      promise: 'Promise',
      waiting: 'Waiting for a reply',
      checkIn: 'Check in',
      waitSince: 'Waiting · check in {w}',
      savedWait: 'Waiting on {n}. I will bring it back {w}.',
      sentYes: 'Sent · follow up {w}',
      sentOther: 'Or follow up',
      chipPromise: 'I told Sara I’d send the proposal Thursday',
      chipWait: 'Waiting for Omar to reply about the contract',
      hint: 'Try: “I told Sara I’d send the proposal Thursday” or “Waiting for Omar to reply”.',
    },
    rhythm: {
      title: 'Keep in touch',
      hint: 'I will bring them up on Today when it has been that long.',
      options: ['Off', 'Weekly', 'Every 2 weeks', 'Monthly', 'Quarterly'],
    },
    drafts: {
      label: 'Start from',
      chase: 'Follow up',
      checkin: 'Check in',
      thanks: 'Thank you',
      reschedule: 'New time',
      replaced: 'Draft replaced',
    },
    today: { pickEmpty: 'No one saved with this yet.', pickAdd: 'Add someone', setOne: 'Set your One Thing', tryIt: 'Try saying it', open: 'Open', me: 'Me', home: 'Home', add: 'Add', darkMode: 'Dark mode', lightMode: 'Light mode' },
    addPeople: {
      button: 'Add',
      title: 'Add people',
      newContact: 'New contact',
      newSub: 'Type it in',
      scan: 'Scan a business card',
      scanSub: 'Take a photo of a card',
      file: 'Import from a file',
      fileSub: 'CSV, Excel or vCard',
      phone: 'From your phone contacts',
      phoneSub: 'Pick one from your phone',
    },
    importer: {
      title: 'Import contacts',
      intro: 'Choose a spreadsheet or contacts file. I’ll match the columns and show you everyone before anything is saved.',
      formats: 'CSV, Excel (.xlsx) or vCard (.vcf)',
      choose: 'Choose a file',
      reading: 'Reading your file…',
      oldExcel: 'That’s an old Excel file (.xls). Save it as .xlsx or CSV and try again.',
      unknown: 'I can read CSV, Excel (.xlsx) and vCard (.vcf) files.',
      empty: 'I couldn’t find any contacts in that file.',
      failed: 'I couldn’t open that file.',
      found: '{n} found',
      ready: '{n} ready',
      selectAll: 'Select all',
      clear: 'Clear',
      already: 'Already in People · {n}',
      noName: 'No name, can’t import',
      skippedEmail: 'email skipped',
      skippedPhone: 'number skipped',
      importN: 'Import {n}',
      doneTitle: 'Imported',
      doneBody: '{n} added to People.',
      back: 'Back to People',
      another: 'Import another file',
    },
    scan: {
      title: 'Scan a business card',
      intro: 'Take a photo of a card. It’s read on your phone and the details are filled in. You check them before saving.',
      take: 'Take a photo',
      choose: 'Choose a photo',
      reading: 'Reading the card…',
      unsupported: 'Reading cards needs the phone app. Fill the details in by hand.',
      androidNote: 'On Android, cards in Latin letters are read. For Arabic cards, fill the details in by hand.',
      nothing: 'I couldn’t read any text. Try a clearer photo, or type it in.',
      cameraOff: 'Camera access is off. Turn it on in Settings, or choose a photo instead.',
      name: 'Name',
      role: 'Company or role',
      phone: 'Number',
      email: 'Email',
      save: 'Save contact',
      another: 'Try another photo',
      read: 'What was read',
      saved: 'Saved {n} to People.',
      exists: '{n} is already in People.',
      update: 'Update {n}',
      saveNew: 'Save as new',
      needName: 'Add a name first.',
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
    customTimeBad: 'اكتب الوقت مثل 5:45 م.',
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
      address: 'العنوان أو الموقع',
      openMap: 'افتح في الخرائط',
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
    bulk: {
      entry: 'أرسل لعدة أشخاص',
      title: 'أرسل لعدة أشخاص',
      whatsapp: 'واتساب',
      email: 'إيميل',
      subject: 'العنوان',
      message: 'الرسالة',
      messagePh: 'اكتب رسالتك…',
      insertName: 'أدرج {الاسم}',
      waNote: 'واتساب يفتح محادثة وحدة كل مرة. تضغط إرسال وترجع، والتالي يكون جاهز.',
      bccNote: 'تروح إيميل واحد. ما أحد يشوف باقي المستلمين.',
      personalNote: 'كل شخص ياخذ إيميل خاص فيه باسمه. وينتقل للي بعده تلقائيًا بعد ما ترسل.',
      recipients: 'لمين تروح',
      selectAll: 'اختر الكل',
      clear: 'مسح',
      selected: '{n} مختار',
      noNumber: 'بدون رقم',
      noEmail: 'بدون إيميل',
      start: 'ابدأ · {n} أشخاص',
      needMessage: 'اكتب الرسالة أولًا.',
      needPeople: 'اختر شخص واحد على الأقل.',
      limit: 'حتى {n} شخص في المرة.',
      progress: '{i} من {n}',
      openWa: 'افتح واتساب لـ{n}',
      openMail: 'افتح الإيميل لـ{n}',
      openBcc: 'افتح الإيميل لـ{n} أشخاص',
      next: 'التالي',
      skip: 'تخطّ',
      stop: 'أوقف',
      done: 'خلصنا',
      doneBody: 'فتحنا {n}. وما أُرسل شي عنك.',
      back: 'رجوع للأشخاص',
      after: 'انفتح. أرسلها هناك، ثم اضغط التالي.',
      opened: 'انفتحت لـ{n}.',
      goBack: 'ما أرسلت؟ ارجع',
      emailStart: 'السلام عليكم {الاسم}،',
      emailEnd: 'مع خالص التحية،',
    },
    filters: {
      all: 'الكل',
      waiting: 'ينتظرون',
      favorites: 'المفضلة',
      recent: 'الأخيرة',
      favAdded: 'ضفنا {n} للمفضلة',
      favRemoved: 'شلنا {n} من المفضلة',
      favHint: 'اضغط مطولًا على أي شخص عشان تضيفه هنا.',
      waitingNone: 'ما أحد ينتظر منك ردًا.',
      recentNone: 'ما فيه أحد آخر ٧ أيام.',
      favorite: 'مفضّل',
      followups: 'المتابعات',
    },
    menu: {
      addNumber: 'أضف رقم',
      addEmail: 'أضف إيميل',
      usual: 'المعتاد',
      meeting: 'حدّد موعد',
      meetingSub: 'اختاروا وقت مع بعض',
      profile: 'افتح الملف',
      profileSub: 'السجل والملاحظات',
      favAdd: 'أضف للمفضلة',
      favRemove: 'شلها من المفضلة',
      close: 'إغلاق',
    },
    peopleScreen: {
      searchAll: 'ابحث في الأشخاص',
      searchFavorites: 'ابحث في المفضلة',
      searchRecent: 'ابحث في الأخيرة',
      favTitle: 'أضف إلى المفضلة',
      favBody: 'اضغط مطولًا على أي شخص عشان تضيفه. المفضلة تطلع أولًا لما تختار شخص تراسله.',
      favLink: 'اختر أشخاص',
      noneTitle: 'ما فيه أحد هنا بعد',
      noneBody: 'أضف شخص، أو امسح بطاقة عمل، أو استورد ملف.',
      noneLink: 'أضف أشخاص',
      more: 'المزيد',
    },
    next: {
      agenda: 'الأجندة',
      seeAll: 'كل المهام',
      tab: 'التالي',
      title: 'التالي',
      all: 'كل المهام',
      lateMin: 'متأخر {n} دقيقة',
      lateHour: 'متأخر {n} ساعة',
      lateDay: 'متأخر يوم',
      lateDays: 'متأخر {n} أيام',
      today: 'اليوم الساعة {t}',
      reply0: 'وقت المتابعة',
      reply1: 'تنتظر الرد من يوم',
      reply: 'تنتظر الرد من {n} أيام',
      quiet: 'ما تواصلتم من {n} يوم',
      later: 'لاحقًا',
      nudge: 'ذكّره',
      open: 'افتح',
      message: 'راسله',
      done: 'تم',
      doneShort: 'تم',
      alsoMore: '+{n} أخرى',
      more: 'أظهر {n} إضافية',
      less: 'أقل',
      emptyTitle: 'ما عليك شي',
      emptyBody: 'ما فيه شي يحتاجك الحين. أضف مهمة، أو قلها بالمايك.',
      emptyAdd: 'أضف مهمة',
      firstTitle: 'هنا يطلع لك وش تسوي بعدين',
      firstBody: 'أضف أشخاصك ومهامك. أطلع لك المتأخر، ومن ينتظر ردك، ومن ما كلمته من فترة.',
      toastLater: 'انتقلت لبكرة الصبح',
      toastQuiet: 'ترجع بعد أسبوع',
      add: 'أضف',
    },
    photo: {
      title: 'الصورة',
      take: 'التقط صورة',
      choose: 'اختر من الصور',
      remove: 'احذف الصورة',
      denied: 'الكاميرا مقفلة. شغّلها من الإعدادات، أو اختر صورة بدالها.',
      hint: 'أضف صورة',
    },
    lock: {
      to: 'إلى',
      change: 'تغيير',
      moreOptions: 'خيارات أكثر',
      fewerOptions: 'خيارات أقل',
    },
    loop: {
      promise: 'وعد',
      waiting: 'ننتظر الرد',
      checkIn: 'تابع',
      waitSince: 'ننتظر · تابع {w}',
      savedWait: 'تمام، ننتظر {n}. أرجّعها لك {w}.',
      sentYes: 'أُرسلت · تابع {w}',
      sentOther: 'أو تابع',
      chipPromise: 'وعدت سارة اني ارسل لها العرض الخميس',
      chipWait: 'مستني رد عمر على العقد',
      hint: 'جرّب: «وعدت سارة اني ارسل لها العرض الخميس» أو «مستني رد عمر».',
    },
    rhythm: {
      title: 'خلّك على تواصل',
      hint: 'أطلعه لك في اليوم لما تمر هالمدة بدون تواصل.',
      options: ['بدون', 'كل أسبوع', 'كل أسبوعين', 'كل شهر', 'كل 3 أشهر'],
    },
    drafts: {
      label: 'ابدأ من',
      chase: 'متابعة',
      checkin: 'اطمئنان',
      thanks: 'شكر',
      reschedule: 'وقت جديد',
      replaced: 'تغيّرت المسودة',
    },
    today: { pickEmpty: 'ما عندك أحد محفوظ بهذا.', pickAdd: 'أضف شخص', setOne: 'حدّد شيئك الواحد', tryIt: 'جرّب تقولها', open: 'المفتوحة', me: 'أنا', home: 'الرئيسية', add: 'إضافة', darkMode: 'الوضع الداكن', lightMode: 'الوضع الفاتح' },
    addPeople: {
      button: 'إضافة',
      title: 'أضف أشخاص',
      newContact: 'جهة اتصال جديدة',
      newSub: 'اكتبها بنفسك',
      scan: 'امسح بطاقة عمل',
      scanSub: 'صوّر البطاقة',
      file: 'استيراد من ملف',
      fileSub: 'CSV أو Excel أو vCard',
      phone: 'من جهات اتصال جوالك',
      phoneSub: 'اختر وحدة من جوالك',
    },
    importer: {
      title: 'استيراد جهات الاتصال',
      intro: 'اختر ملف جدول أو جهات اتصال. أطابق الأعمدة وأعرض لك الكل قبل ما يُحفظ شي.',
      formats: 'CSV أو Excel (.xlsx) أو vCard (.vcf)',
      choose: 'اختر ملف',
      reading: 'أقرأ ملفك…',
      oldExcel: 'هذا ملف Excel قديم (.xls). احفظه بصيغة .xlsx أو CSV وجرّب مرة ثانية.',
      unknown: 'أقدر أقرأ ملفات CSV وExcel (.xlsx) وvCard (.vcf).',
      empty: 'ما لقيت أي جهة اتصال في هذا الملف.',
      failed: 'ما قدرت أفتح هذا الملف.',
      found: '{n} موجود',
      ready: '{n} جاهز',
      selectAll: 'اختر الكل',
      clear: 'مسح',
      already: 'موجود في الأشخاص · {n}',
      noName: 'بدون اسم، ما ينفع',
      skippedEmail: 'تجاهلنا الإيميل',
      skippedPhone: 'تجاهلنا الرقم',
      importN: 'استورد {n}',
      doneTitle: 'تم الاستيراد',
      doneBody: 'انضاف {n} للأشخاص.',
      back: 'رجوع للأشخاص',
      another: 'استورد ملف ثاني',
    },
    scan: {
      title: 'امسح بطاقة عمل',
      intro: 'صوّر البطاقة. تنقرأ على جوالك وتتعبّى البيانات، وأنت تراجعها قبل الحفظ.',
      take: 'التقط صورة',
      choose: 'اختر صورة',
      reading: 'أقرأ البطاقة…',
      unsupported: 'قراءة البطاقات تحتاج تطبيق الجوال. عبّي البيانات بنفسك.',
      androidNote: 'على أندرويد تنقرأ البطاقات بالأحرف اللاتينية. للبطاقات العربية، عبّي البيانات بنفسك.',
      nothing: 'ما قدرت أقرأ أي نص. جرّب صورة أوضح، أو اكتبها.',
      cameraOff: 'الكاميرا مقفلة. شغّلها من الإعدادات، أو اختر صورة بدالها.',
      name: 'الاسم',
      role: 'الشركة أو الدور',
      phone: 'الرقم',
      email: 'الإيميل',
      save: 'حفظ الجهة',
      another: 'جرّب صورة ثانية',
      read: 'اللي انقرأ',
      saved: 'تم حفظ {n} في الأشخاص.',
      exists: '{n} موجود في الأشخاص.',
      update: 'حدّث {n}',
      saveNew: 'احفظ كجديد',
      needName: 'أضف الاسم أولًا.',
    },
    listening: 'أسمعك…',
    micStart: 'تحدّث',
    micStop: 'أوقف الاستماع',
  },
};

export const added = (lang: Lang): Added => ADDED[lang];
