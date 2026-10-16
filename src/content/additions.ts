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
  /**
   * The "Who?" sheet's second line, its pills and its short ages. The order
   * the rows come in is `src/features/today/pick-order.ts`.
   */
  pick: {
    owed: string;
    owedWhat: string;
    overdue: string;
    waiting: string;
    did: { call: string; email: string; whatsapp: string; meeting: string; visit: string; note: string; followup_closed: string };
    cold: string;
    never: string;
    today: string;
    yesterday: string;
    days: string;
    weeks: string;
  };
  /**
   * The two plan badges the handoff never had. "Pro" and "Free" are still
   * `SETX.st.pro` / `.free`, which the handoff did supply.
   */
  plan: { plus: string; trial: string };
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
    search: string;
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
    positionPh: string;
    companyPh: string;
    addNumber2: string;
    addEmail2: string;
    phone2Ph: string;
    email2Ph: string;
    labelsTitle: string;
    labelPh: string;
    labelAdd: string;
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
    /** Files are attached but the channel or the send path will not carry them. */
    filesNotOnWhatsApp: string;
    filesNeedComposer: string;
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
    replied: string;
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
    fromPeople: string;
    fromPhone: string;
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
    scanMany: string;
    scanManySub: string;
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
    locked: string;
    failed: string;
    found: string;
    ready: string;
    selectAll: string;
    clear: string;
    already: string;
    repeat: string;
    sameBy: { phone: string; email: string; name: string };
    repeats: string;
    noReach: string;
    testAccount: string;
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
  /** Scan a stack of cards in one go — §2.67. */
  many: {
    title: string;
    permission: string;
    allow: string;
    cameraOff: string;
    unsupported: string;
    counter: string;
    shutter: string;
    close: string;
    review: string;
    hint: string;
    reviewTitle: string;
    keepScanning: string;
    reading: string;
    ready: string;
    partial: string;
    unreadable: string;
    sumReady: string;
    sumPartial: string;
    sumNone: string;
    inBatch: string;
    inPeople: string;
    selectAll: string;
    clearAll: string;
    labelTitle: string;
    labelPh: string;
    save: string;
    saveOne: string;
    savedN: string;
    capped: string;
    empty: string;
    remove: string;
    read: string;
    fix: string;
    nothing: string;
  };
  /** Smart lists: a saved rule, re-read every time — §2.71. */
  smart: {
    entry: string;
    entrySub: string;
    title: string;
    none: string;
    noneBody: string;
    add: string;
    nameLabel: string;
    namePh: string;
    rule: string;
    and: string;
    daysN: string;
    save: string;
    remove: string;
    holdsN: string;
    holdsOne: string;
    holdsNone: string;
    needName: string;
    needRule: string;
    capped: string;
    taggedTitle: string;
    cFavourite: string;
    cQuiet: string;
    cWaiting: string;
    cNever: string;
    cNoPhone: string;
    cNoEmail: string;
  };
  /** Weekly recap: the week read off what the app recorded — §2.70. */
  recap: {
    entry: string;
    entrySub: string;
    title: string;
    empty: string;
    emptyBody: string;
    daysN: string;
    dayOne: string;
    streakN: string;
    sentN: string;
    sentOne: string;
    calls: string;
    messages: string;
    emails: string;
    meetings: string;
    notes: string;
    reached: string;
    reachedOne: string;
    timesN: string;
    timesOne: string;
    closedN: string;
    closedOne: string;
    waitingN: string;
    waitingOne: string;
    carrying: string;
    carryingOne: string;
    nothingSent: string;
    allClear: string;
  };
  /** Questions answered from the app's own data — §2.68. */
  qa: {
    call: string;
    whatsapp: string;
    email: string;
    profile: string;
    replied: string;
    cantOpen: string;
    noPhone: string;
    noEmail: string;
    works: string;
    noWork: string;
    which: string;
    nobody: string;
    lastWith: string;
    noHistory: string;
    todayN: string;
    tomorrowN: string;
    weekN: string;
    lateN: string;
    noneToday: string;
    noneTomorrow: string;
    noneWeek: string;
    noneLate: string;
    waitingN: string;
    noneWaiting: string;
    quietN: string;
    noneQuiet: string;
    quietDays: string;
    labelN: string;
    favN: string;
    allN: string;
    nonePeople: string;
    more: string;
    /** A question the Assistant cannot answer — it offers examples instead of saving a task. */
    outOfScope: string;
    egTask: string;
    egLate: string;
    egImport: string;
  };
  /** The paperclip: a card or a file, from the Assistant — §2.68. */
  clip: {
    open: string;
    title: string;
    scan: string;
    scanSub: string;
    photo: string;
    photoSub: string;
    file: string;
    fileSub: string;
    reading: string;
    found: string;
    foundSheets: string;
    already: string;
    skipped: string;
    addAll: string;
    review: string;
    addedN: string;
    nothing: string;
  };
  /** Attachments and the choice of mail app. */
  attach: {
    button: string;
    /** Spoken label on a file chip: compose used a hard-coded English "Remove". */
    remove: string;
    onlyComposer: string;
    chooseApp: string;
    defaultApp: string;
    share: string;
    shareSub: string;
    shared: string;
    /** Android with nothing attached, and wherever a file was dropped. */
    shareSubNoFile: string;
    sharedNoFiles: string;
    /**
     * Android with something attached: `expo-sharing` carries one file and
     * no text, so the message goes on the clipboard and the address is read
     * out instead of copied — `src/features/compose/share-plan.ts`.
     */
    shareSubFile: string;
    sharedFile: string;
    sharedFileMore: string;
    note: string;
  };
  /** Today's tasks on the Lock Screen (iPhone). */
  bar: {
    heading: string;
    next: string;
    late: string;
    allDone: string;
    toggle: string;
    toggleSub: string;
  };
  /** The person's own saved messages. */
  saved: {
    title: string;
    hint: string;
    empty: string;
    add: string;
    titlePh: string;
    subjectPh: string;
    bodyPh: string;
    chase: string;
    chaseHint: string;
    save: string;
    remove: string;
    saveAs: string;
    saved: string;
    nameIt: string;
    done: string;
  };
  /** What follows a send: marked sent, a chase if there is one, undo. */
  sent: {
    pending: string;
    iSent: string;
    cancel: string;
    plain: string;
    /** Sent on Free, where the chase does not start on its own. */
    plainFree: string;
    withChase: string;
    change: string;
    undo: string;
    none: string;
    replied: string;
    chaseTitle: string;
    chaseHint: string;
    chaseOptions: { auto: string; off: string; d1: string; d2: string; d3: string; d7: string };
  };
  /** "Send later": a reminder at the chosen time, with the draft waiting. */
  later: {
    button: string;
    title: string;
    hour: string;
    evening: string;
    tomorrow: string;
    pick: string;
    toast: string;
  };
  /** A person's page: the history like a chat thread, a box to write in, the ways to reach them. */
  thread: {
    details: string;
    added: string;
    empty: string;
    remindAlso: string;
    waiting: string;
    openWith: string;
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
    pick: {
      owed: 'Waiting on a reply',
      owedWhat: 'Waiting on a reply — {what}',
      overdue: 'Overdue',
      waiting: 'Waiting',
      // No "he" or "she": the app is never told which, and guessing from a
      // name is how you get it wrong about somebody every day.
      did: {
        call: 'You called',
        email: 'You emailed',
        whatsapp: 'You messaged',
        meeting: 'You met',
        visit: 'You visited',
        note: 'You were in touch',
        followup_closed: 'You closed a follow-up',
      },
      cold: 'Nothing lately',
      never: 'Never reached',
      today: 'Today',
      yesterday: 'Yesterday',
      days: '{n}d',
      weeks: '{n}w',
    },
    // Not translated in either language: the app already writes Pro in Latin
    // inside Arabic copy ("جرّب Pro مجاناً ٧ أيام"), so a transliterated
    // "برو" on the badge would be the only place it is spelled out.
    plan: { plus: 'Pro+', trial: 'Trial' },
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
      search: 'Search',
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
      positionPh: 'Position, e.g. Purchasing Manager',
      companyPh: 'Company',
      addNumber2: 'Add another number',
      addEmail2: 'Add another email',
      phone2Ph: 'Second number (add +code if it differs)',
      email2Ph: 'Second email',
      labelsTitle: 'Labels',
      labelPh: 'New label, e.g. Client',
      labelAdd: 'Add',
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
      filesNotOnWhatsApp: '{n} attached — WhatsApp can’t carry files. Switch to Email, or send them another way.',
      filesNeedComposer: '{n} attached — there’s no mail account on this phone, so they can’t go. Add one in Settings, or send them another way.',
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
    attach: {
      button: 'Attach a file',
      remove: 'Remove',
      onlyComposer: 'Attachments only go with “Send email”, in the Mail composer.',
      chooseApp: 'Open in another mail app',
      defaultApp: 'Default mail app',
      share: 'Zoho, Spark or another app',
      shareSub: 'Takes the subject, the message and a file. Pick the app, then paste the address.',
      shared: '{to} is copied. Paste it into “To”.',
      shareSubNoFile: 'Takes the subject and the message. Pick the app, then paste the address.',
      sharedNoFiles: '{to} is copied. Paste it into “To” — attachments need “Send email”.',
      shareSubFile: 'Takes the subject and the file. Your message is copied to paste.',
      sharedFile: 'The file went. Your message is copied — paste it, and send to {to}.',
      sharedFileMore: 'One file went. Your message is copied — paste it, and send to {to}. The other {n} need “Send email”.',
      note: 'Zoho opens a mail link empty, so use “Zoho, Spark or another app”. Or add your Zoho account to iPhone Mail and use “Send email”, which keeps everything.',
    },
    bar: {
      heading: 'Today · {done} of {total} done',
      next: 'Next: {title}',
      late: 'Late: {title}',
      allDone: 'All done for today',
      toggle: 'Today on the Lock Screen',
      toggleSub: 'A bar with today’s tasks, readable without unlocking the phone. Each one turns red when its time passes and it isn’t done.',
    },
    saved: {
      title: 'Saved messages',
      hint: 'Your own words, ready to use again. Write {name} where their name goes. Nothing is sent for you.',
      empty: 'Nothing yet. Add the message you write most.',
      add: 'New message',
      titlePh: 'Name, e.g. Follow-up',
      subjectPh: 'Subject (for email)',
      bodyPh: 'Hi {name}, just checking you saw my message…',
      chase: 'Use for follow-ups',
      chaseHint: 'When a follow-up is due, this is the message that’s ready.',
      save: 'Save',
      remove: 'Delete',
      saveAs: 'Save as a message',
      saved: 'Saved to your messages.',
      nameIt: 'Name this message',
      done: 'Done',
    },
    sent: {
      pending: 'Opened. I’ll mark it sent when you’re back.',
      iSent: 'I sent it',
      cancel: 'Not yet',
      plain: 'Sent',
      plainFree: 'Sent. Pro follows up for you.',
      withChase: 'Sent. No reply {w}? I’ll remind you.',
      change: 'Change',
      undo: 'Undo',
      none: 'No follow-up',
      replied: 'Replied',
      chaseTitle: 'If there’s no reply',
      chaseHint: 'After you send, I remind you to check back. Close it with one tap when they reply.',
      chaseOptions: { auto: 'Auto', off: 'Off', d1: '1 day', d2: '2 days', d3: '3 days', d7: '1 week' },
    },
    later: {
      button: 'Send later',
      title: 'When should I remind you to send it?',
      hour: 'In 1 hour',
      evening: 'This evening',
      tomorrow: 'Tomorrow morning',
      pick: 'Pick a time',
      toast: 'Okay. I’ll remind you {w}, with the draft ready.',
    },
    thread: {
      details: 'Details',
      added: 'Added to People',
      empty: 'Nothing yet. Write the first note below.',
      remindAlso: 'Also remind me {w}',
      waiting: 'Waiting for a reply',
      openWith: 'Open with {n}',
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
      replied: 'Replied',
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
      fromPeople: 'Pick from People',
      fromPhone: 'Choose from your phone contacts',
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
      scanMany: 'Scan many cards',
      scanManySub: 'A stack, one after another',
      file: 'Import from a file',
      fileSub: 'CSV, Excel or vCard',
      phone: 'From your phone contacts',
      phoneSub: 'Pick one from your phone',
    },
    importer: {
      title: 'Import contacts',
      intro: 'Choose a spreadsheet or contacts file. I’ll match the columns and show you everyone before anything is saved.',
      formats: 'CSV, Excel (.xlsx), PDF or vCard (.vcf)',
      choose: 'Choose a file',
      reading: 'Reading your file…',
      oldExcel: 'That’s an old Excel file (.xls). Save it as .xlsx or CSV and try again.',
      unknown: 'I can read CSV, Excel (.xlsx), PDF and vCard (.vcf) files.',
      empty: 'I couldn’t find any contacts in that file. A scanned PDF is a picture, so try the original sheet or an export.',
      locked: 'That PDF is password-protected. Remove the password and try again.',
      failed: 'I couldn’t open that file.',
      found: '{n} found',
      ready: '{n} ready',
      selectAll: 'Select all',
      clear: 'Clear',
      already: 'Already in People · {n}',
      repeat: 'Repeat of {n} above',
      sameBy: { phone: 'same number', email: 'same email', name: 'same name' },
      noReach: '{n} left out: no number or email to reach them on.',
      repeats: '{n} look like repeats and start unticked. Tick one to import it anyway.',
      testAccount: 'Test account',
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
    many: {
      title: 'Scan many',
      permission: 'Scanning a stack needs the camera. Nothing leaves your phone — the cards are read on it.',
      allow: 'Allow the camera',
      cameraOff: 'Camera access is off. Turn it on in Settings.',
      unsupported: 'Reading cards needs the phone app.',
      counter: 'Scanned: {n}',
      shutter: 'Take a photo',
      close: 'Stop scanning',
      review: 'Review ({n})',
      hint: 'Keep going. Each card is read while you take the next.',
      reviewTitle: 'Check the cards',
      keepScanning: 'Keep scanning',
      reading: 'Reading {n}…',
      ready: 'Ready',
      partial: 'Needs a field',
      unreadable: 'Couldn’t read',
      sumReady: '{n} ready',
      sumPartial: '{n} need a field',
      sumNone: '{n} couldn’t be read',
      inBatch: 'Scanned twice',
      inPeople: 'Already in People',
      selectAll: 'Select all',
      clearAll: 'Clear',
      labelTitle: 'Label them all',
      labelPh: 'Conference 2026',
      save: 'Save {n} contacts',
      saveOne: 'Save 1 contact',
      savedN: '{n} saved to People.',
      capped: 'Free saves {n} cards at a time. Pro+ lifts it.',
      empty: 'No cards yet.',
      remove: 'Remove this card',
      read: 'What was read',
      fix: 'Fix the fields',
      nothing: 'Nothing was read from this one. Type the name in, or remove it.',
    },
    smart: {
      entry: 'Smart lists',
      entrySub: 'Groups that keep themselves up to date',
      title: 'Smart lists',
      none: 'No smart lists yet.',
      noneBody: 'Make one and it becomes a chip on People, always current.',
      add: 'New smart list',
      nameLabel: 'Name',
      namePh: 'Quiet clients',
      rule: 'Who it holds',
      and: 'and',
      daysN: '{n} days',
      save: 'Save',
      remove: 'Delete this list',
      holdsN: '{n} people',
      holdsOne: '1 person',
      holdsNone: 'Nobody, as things stand',
      needName: 'Give it a name.',
      needRule: 'Pick at least one thing it holds.',
      capped: 'Free keeps {n} smart list. Pro+ keeps as many as you like.',
      taggedTitle: 'Tagged',
      cFavourite: 'A favourite',
      cQuiet: 'No word for',
      cWaiting: 'Owes me a reply',
      cNever: 'Never written to',
      cNoPhone: 'No number',
      cNoEmail: 'No email',
    },
    recap: {
      entry: 'Your week',
      entrySub: 'What moved in the last seven days',
      title: 'Your week',
      empty: 'Nothing to show yet.',
      emptyBody: 'Finish a task or send a message and this fills in.',
      daysN: 'You finished something on {n} of 7 days',
      dayOne: 'You finished something on 1 of 7 days',
      streakN: '{n}-day streak',
      sentN: '{n} things went out',
      sentOne: '1 thing went out',
      calls: 'calls',
      messages: 'messages',
      emails: 'emails',
      meetings: 'meetings',
      notes: 'notes',
      reached: 'You reached {n} people',
      reachedOne: 'You reached 1 person',
      timesN: '{n} times',
      timesOne: 'once',
      closedN: '{n} follow-ups closed',
      closedOne: '1 follow-up closed',
      waitingN: '{n} still waiting on a reply',
      waitingOne: '1 still waiting on a reply',
      carrying: '{n} carrying into next week',
      carryingOne: '1 carrying into next week',
      nothingSent: 'Nothing went out this week.',
      allClear: 'Nothing is carrying over. You start next week clear.',
    },
    qa: {
      call: 'Call',
      whatsapp: 'WhatsApp',
      email: 'Email',
      profile: 'Open profile',
      replied: 'Replied',
      cantOpen: 'I couldn’t open that on this phone.',
      noPhone: 'I don’t have a number for {n}.',
      noEmail: 'I don’t have an email for {n}.',
      works: '{n} · {w}',
      noWork: 'I don’t have a company for {n}.',
      which: 'Which {n}?',
      nobody: 'They’re not in People yet.',
      lastWith: 'Last with {n}',
      noHistory: 'Nothing logged with {n} yet.',
      todayN: '{n} today',
      tomorrowN: '{n} tomorrow',
      weekN: '{n} this week',
      lateN: '{n} late',
      noneToday: 'Nothing due today.',
      noneTomorrow: 'Nothing due tomorrow.',
      noneWeek: 'Nothing due this week.',
      noneLate: 'Nothing late. You’re clear.',
      waitingN: '{n} waiting on you',
      noneWaiting: 'Nobody’s waiting on a reply.',
      quietN: '{n} you haven’t reached in a while',
      noneQuiet: 'Everyone you keep in touch with is up to date.',
      quietDays: '{n} days',
      labelN: '{n} tagged {w}',
      favN: '{n} favourites',
      allN: '{n} in People',
      nonePeople: 'Nobody yet.',
      more: '+{n} more',
      outOfScope: 'I’m best with your people and your follow-ups.',
      egTask: 'Remind me to call Sara at 4',
      egLate: 'What’s late?',
      egImport: 'Import a file',
    },
    clip: {
      open: 'Add a card or a file',
      title: 'Add people',
      scan: 'Scan a business card',
      scanSub: 'Use the camera',
      photo: 'Card from photos',
      photoSub: 'A photo you already took',
      file: 'Excel, CSV, PDF or contacts file',
      fileSub: 'Read on your phone, never uploaded',
      reading: 'Reading it on your phone…',
      found: 'Found {n} people',
      foundSheets: 'Found {n} people in {s} sheets',
      already: '{n} already saved',
      skipped: '{n} skipped',
      addAll: 'Add all',
      review: 'Review',
      addedN: 'Added {n} people.',
      nothing: 'I couldn’t find anyone in that file.',
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
    pick: {
      owed: 'بانتظار الرد',
      owedWhat: 'بانتظار الرد — {what}',
      overdue: 'متأخر',
      waiting: 'بالانتظار',
      did: {
        call: 'اتصلت',
        email: 'أرسلت إيميل',
        whatsapp: 'راسلت',
        meeting: 'اجتمعت',
        visit: 'زرت',
        note: 'كان بينكم تواصل',
        followup_closed: 'أقفلت المتابعة',
      },
      cold: 'ما في شيء مؤخرًا',
      never: 'ما تواصلت معه',
      today: 'اليوم',
      yesterday: 'أمس',
      days: '{n} ي',
      weeks: '{n} أ',
    },
    plan: { plus: 'Pro+', trial: 'تجربة' },
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
      search: 'ابحث',
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
      positionPh: 'المنصب، مثلًا: مدير مشتريات',
      companyPh: 'الشركة',
      addNumber2: 'أضف رقم ثاني',
      addEmail2: 'أضف إيميل ثاني',
      phone2Ph: 'الرقم الثاني (أضف +الرمز لو يختلف)',
      email2Ph: 'الإيميل الثاني',
      labelsTitle: 'التصنيفات',
      labelPh: 'تصنيف جديد، مثلًا: عميل',
      labelAdd: 'أضف',
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
      filesNotOnWhatsApp: '{n} ملف مرفق — واتساب ما يقدر يرسل ملفات. حوّل للإيميل، أو أرسلها بطريقة ثانية.',
      filesNeedComposer: '{n} ملف مرفق — ما في حساب بريد على الجوال، فما راح توصل. ضيف حساب من الإعدادات، أو أرسلها بطريقة ثانية.',
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
    attach: {
      button: 'أرفق ملف',
      remove: 'احذف',
      onlyComposer: 'المرفقات تروح فقط مع «أرسل الإيميل»، في نافذة البريد.',
      chooseApp: 'افتحه في تطبيق بريد ثاني',
      defaultApp: 'تطبيق البريد الافتراضي',
      share: 'Zoho أو Spark أو تطبيق ثاني',
      shareSub: 'ينقل العنوان والرسالة وملف. اختر التطبيق، ثم الصق الإيميل.',
      shared: 'نسخنا {to}. الصقه في خانة «إلى».',
      shareSubNoFile: 'يأخذ العنوان والرسالة. اختر التطبيق، بعدين الصق الإيميل.',
      sharedNoFiles: '{to} اننسخ. الصقه في «إلى» — المرفقات تحتاج «إرسال إيميل».',
      shareSubFile: 'ينقل العنوان والملف. ورسالتك منسوخة عشان تلصقها.',
      sharedFile: 'الملف راح. رسالتك منسوخة — الصقها، وأرسلها لـ {to}.',
      sharedFileMore: 'ملف واحد راح. رسالتك منسوخة — الصقها، وأرسلها لـ {to}. و{n} الباقية تحتاج «أرسل الإيميل».',
      note: 'Zoho يفتح رابط البريد فاضي، فاستخدم «Zoho أو Spark أو تطبيق ثاني». أو أضف حساب Zoho لتطبيق البريد في الآيفون واستخدم «أرسل الإيميل»، وكل شي يوصل.',
    },
    bar: {
      heading: 'اليوم · {done} من {total} خلصت',
      next: 'التالي: {title}',
      late: 'متأخر: {title}',
      allDone: 'خلصت كل مهام اليوم',
      toggle: 'مهام اليوم على شاشة القفل',
      toggleSub: 'شريط فيه مهام اليوم، يُقرأ بدون ما تفتح قفل الجوال. وكل مهمة تصير حمراء إذا جا وقتها وما خلصت.',
    },
    saved: {
      title: 'الرسائل المحفوظة',
      hint: 'كلامك أنت، جاهز تستخدمه مرة ثانية. اكتب {الاسم} مكان اسم الشخص. ما يُرسل شي عنك.',
      empty: 'ما فيه شي للحين. أضف الرسالة اللي تكتبها كثير.',
      add: 'رسالة جديدة',
      titlePh: 'اسم، مثلًا: متابعة',
      subjectPh: 'العنوان (للإيميل)',
      bodyPh: 'أهلًا {الاسم}، بس أتأكد إنك شفت رسالتي…',
      chase: 'استخدمها للمتابعة',
      chaseHint: 'لما يحين وقت المتابعة، هذي الرسالة تكون جاهزة.',
      save: 'احفظ',
      remove: 'احذف',
      saveAs: 'احفظها كرسالة',
      saved: 'انحفظت في رسائلك.',
      nameIt: 'سمّ هذي الرسالة',
      done: 'تم',
    },
    sent: {
      pending: 'انفتحت. بعلّمها مرسلة لما ترجع.',
      iSent: 'أرسلتها',
      cancel: 'مو الحين',
      plain: 'أُرسلت',
      plainFree: 'أُرسلت. برو يتابع عنك تلقائيًا.',
      withChase: 'أُرسلت. ما رد {w}؟ بذكّرك.',
      change: 'غيّر',
      undo: 'تراجع',
      none: 'بدون متابعة',
      replied: 'رد',
      chaseTitle: 'إذا ما فيه رد',
      chaseHint: 'بعد ما ترسل، أذكّرك ترجع تتابع. وتقفلها بضغطة لما يردون.',
      chaseOptions: { auto: 'تلقائي', off: 'مغلق', d1: 'يوم', d2: 'يومين', d3: '3 أيام', d7: 'أسبوع' },
    },
    later: {
      button: 'أرسلها لاحقًا',
      title: 'متى أذكّرك ترسلها؟',
      hour: 'بعد ساعة',
      evening: 'هذا المساء',
      tomorrow: 'بكرة الصبح',
      pick: 'اختر وقت',
      toast: 'تمام. بذكّرك {w}، والمسودة جاهزة.',
    },
    thread: {
      details: 'التفاصيل',
      added: 'انضاف للأشخاص',
      empty: 'ما فيه شي للحين. اكتب أول ملاحظة تحت.',
      remindAlso: 'ذكّرني كمان {w}',
      waiting: 'بانتظار الرد',
      openWith: 'المفتوح مع {n}',
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
      replied: 'رد',
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
      fromPeople: 'اختر من الأشخاص',
      fromPhone: 'اختر من جهات اتصال الجوال',
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
      scanMany: 'امسح بطاقات كثيرة',
      scanManySub: 'كومة بطاقات، واحدة ورا الثانية',
      file: 'استيراد من ملف',
      fileSub: 'CSV أو Excel أو vCard',
      phone: 'من جهات اتصال جوالك',
      phoneSub: 'اختر وحدة من جوالك',
    },
    importer: {
      title: 'استيراد جهات الاتصال',
      intro: 'اختر ملف جدول أو جهات اتصال. أطابق الأعمدة وأعرض لك الكل قبل ما يُحفظ شي.',
      formats: 'CSV أو Excel (.xlsx) أو PDF أو vCard (.vcf)',
      choose: 'اختر ملف',
      reading: 'أقرأ ملفك…',
      oldExcel: 'هذا ملف Excel قديم (.xls). احفظه بصيغة .xlsx أو CSV وجرّب مرة ثانية.',
      unknown: 'أقدر أقرأ ملفات CSV وExcel (.xlsx) وPDF وvCard (.vcf).',
      empty: 'ما لقيت أي جهة اتصال في هذا الملف. ملف PDF الممسوح ضوئيًا صورة، فجرّب الملف الأصلي أو تصدير منه.',
      locked: 'ملف PDF هذا محمي بكلمة مرور. أزلها وجرّب مرة ثانية.',
      failed: 'ما قدرت أفتح هذا الملف.',
      found: '{n} موجود',
      ready: '{n} جاهز',
      selectAll: 'اختر الكل',
      clear: 'مسح',
      already: 'موجود في الأشخاص · {n}',
      repeat: 'مكرر من {n} فوق',
      sameBy: { phone: 'نفس الرقم', email: 'نفس الإيميل', name: 'نفس الاسم' },
      noReach: 'استبعدنا {n}: ما فيه رقم ولا إيميل للتواصل.',
      repeats: '{n} يبدون مكررين وما انحطّت عليهم علامة. علّم أي واحد لو تبي تستورده.',
      testAccount: 'حساب تجريبي',
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
    many: {
      title: 'مسح بطاقات',
      permission: 'مسح كومة بطاقات يحتاج الكاميرا. ما يطلع شيء من جوالك — البطاقات تنقرأ عليه.',
      allow: 'اسمح بالكاميرا',
      cameraOff: 'الكاميرا مقفلة. شغّلها من الإعدادات.',
      unsupported: 'قراءة البطاقات تحتاج تطبيق الجوال.',
      counter: 'انمسح: {n}',
      shutter: 'التقط صورة',
      close: 'أوقف المسح',
      review: 'راجع ({n})',
      hint: 'كمّل. كل بطاقة تنقرأ وأنت تصوّر اللي بعدها.',
      reviewTitle: 'راجع البطاقات',
      keepScanning: 'كمّل المسح',
      reading: 'أقرأ {n}…',
      ready: 'جاهزة',
      partial: 'ناقصها بيانات',
      unreadable: 'ما انقرأت',
      sumReady: '{n} جاهزة',
      sumPartial: '{n} ناقصها بيانات',
      sumNone: '{n} ما انقرأت',
      inBatch: 'انمسحت مرتين',
      inPeople: 'موجود في الأشخاص',
      selectAll: 'اختر الكل',
      clearAll: 'ألغِ الاختيار',
      labelTitle: 'ضع تصنيفًا للكل',
      labelPh: 'مؤتمر 2026',
      save: 'احفظ {n} جهات',
      saveOne: 'احفظ جهة واحدة',
      savedN: 'تم حفظ {n} في الأشخاص.',
      capped: 'المجاني يحفظ {n} بطاقات في المرة. برو+ يرفع الحد.',
      empty: 'ما فيه بطاقات بعد.',
      remove: 'احذف هذه البطاقة',
      read: 'اللي انقرأ',
      fix: 'عدّل البيانات',
      nothing: 'ما انقرأ شيء من هذي. اكتب الاسم، أو احذفها.',
    },
    smart: {
      entry: 'قوائم ذكية',
      entrySub: 'مجموعات تحدّث نفسها',
      title: 'قوائم ذكية',
      none: 'ما فيه قوائم ذكية بعد.',
      noneBody: 'اعمل واحدة وتطلع شريحة في الأشخاص، محدّثة دايم.',
      add: 'قائمة ذكية جديدة',
      nameLabel: 'الاسم',
      namePh: 'عملاء ساكتين',
      rule: 'مين تضم',
      and: 'و',
      daysN: '{n} يوم',
      save: 'حفظ',
      remove: 'احذف هذه القائمة',
      holdsN: '{n} أشخاص',
      holdsOne: 'شخص واحد',
      holdsNone: 'ما فيه أحد، بالوضع الحالي',
      needName: 'سمّها أولًا.',
      needRule: 'اختر شيئًا واحدًا على الأقل تضمّه.',
      capped: 'المجاني يحفظ {n} قائمة ذكية. برو+ يحفظ اللي تبي.',
      taggedTitle: 'التصنيف',
      cFavourite: 'من المفضلة',
      cQuiet: 'ما وصله شيء من',
      cWaiting: 'يدين لي برد',
      cNever: 'ما كتبت له أبدًا',
      cNoPhone: 'بدون رقم',
      cNoEmail: 'بدون إيميل',
    },
    recap: {
      entry: 'أسبوعك',
      entrySub: 'اللي صار في آخر سبعة أيام',
      title: 'أسبوعك',
      empty: 'ما فيه شيء نعرضه بعد.',
      emptyBody: 'خلّص مهمة أو ابعت رسالة ويتعبّى هذا.',
      daysN: 'خلّصت شيء في {n} من ٧ أيام',
      dayOne: 'خلّصت شيء في يوم واحد من ٧',
      streakN: '{n} يوم متواصل',
      sentN: 'طلع {n} شيء',
      sentOne: 'طلع شيء واحد',
      calls: 'اتصالات',
      messages: 'رسائل',
      emails: 'إيميلات',
      meetings: 'اجتماعات',
      notes: 'ملاحظات',
      reached: 'وصلت {n} أشخاص',
      reachedOne: 'وصلت شخص واحد',
      timesN: '{n} مرات',
      timesOne: 'مرة واحدة',
      closedN: 'أقفلت {n} متابعات',
      closedOne: 'أقفلت متابعة واحدة',
      waitingN: '{n} لسه مستنيين ردك',
      waitingOne: 'واحد لسه مستني ردك',
      carrying: '{n} ينقلون للأسبوع الجاي',
      carryingOne: 'واحد ينقل للأسبوع الجاي',
      nothingSent: 'ما طلع شيء هذا الأسبوع.',
      allClear: 'ما فيه شيء ينقل. تبدأ الأسبوع الجاي صافي.',
    },
    qa: {
      call: 'اتصال',
      whatsapp: 'واتساب',
      email: 'إيميل',
      profile: 'افتح الملف',
      replied: 'رد',
      cantOpen: 'ما قدرت أفتحه على هذا الجوال.',
      noPhone: 'ما عندي رقم لـ{n}.',
      noEmail: 'ما عندي إيميل لـ{n}.',
      works: '{n} · {w}',
      noWork: 'ما عندي شركة لـ{n}.',
      which: 'أي {n}؟',
      nobody: 'ما هو في الأشخاص بعد.',
      lastWith: 'آخر شيء مع {n}',
      noHistory: 'ما فيه شيء مسجّل مع {n} بعد.',
      todayN: '{n} اليوم',
      tomorrowN: '{n} بكرة',
      weekN: '{n} هذا الأسبوع',
      lateN: '{n} متأخرة',
      noneToday: 'ما فيه شيء اليوم.',
      noneTomorrow: 'ما فيه شيء بكرة.',
      noneWeek: 'ما فيه شيء هذا الأسبوع.',
      noneLate: 'ما فيه شيء متأخر. تمام.',
      waitingN: '{n} مستنيينك',
      noneWaiting: 'ما فيه أحد مستني ردك.',
      quietN: '{n} ما كلمتهم من فترة',
      noneQuiet: 'كل اللي تتابعهم على تواصل.',
      quietDays: '{n} يوم',
      labelN: '{n} مصنّفين {w}',
      favN: '{n} في المفضلة',
      allN: '{n} في الأشخاص',
      nonePeople: 'ما فيه أحد بعد.',
      more: '+{n} غيرهم',
      outOfScope: 'أنا أفيدك أكثر في أشخاصك ومتابعاتك.',
      egTask: 'فكرني أكلم سارة الساعة ٤',
      egLate: 'وش المتأخر؟',
      egImport: 'استورد ملف',
    },
    clip: {
      open: 'أضف كرت أو ملف',
      title: 'أضف أشخاص',
      scan: 'امسح بطاقة عمل',
      scanSub: 'بالكاميرا',
      photo: 'كرت من الصور',
      photoSub: 'صورة عندك من قبل',
      file: 'ملف إكسل، CSV، PDF أو جهات',
      fileSub: 'يُقرأ على جوالك، وما يُرفع',
      reading: 'أقرأه على جوالك…',
      found: 'لقيت {n} شخص',
      foundSheets: 'لقيت {n} شخص في {s} شيتات',
      already: '{n} محفوظين من قبل',
      skipped: '{n} تجاهلناهم',
      addAll: 'أضف الكل',
      review: 'راجع',
      addedN: 'أضفنا {n} شخص.',
      nothing: 'ما لقيت أحد في هذا الملف.',
    },
    listening: 'أسمعك…',
    micStart: 'تحدّث',
    micStop: 'أوقف الاستماع',
  },
};

export const added = (lang: Lang): Added => ADDED[lang];
