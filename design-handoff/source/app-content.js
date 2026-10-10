// Extracted verbatim from The One Thing v5.dc.html — copy, icons, colours, seed data.
// Use as the single source of truth for strings (EN + AR), icon paths and type colours.
// NOTE: references `React` only for BRAND_IC (Apple/Google marks); swap for your platform's SVG component.

const P = {
  phone: [['path', 'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z']],
  mail: [['rect', { x: 2, y: 4, width: 20, height: 16, rx: 2 }], ['path', 'm22 7-10 6L2 7']],
  msg: [['path', 'M7.9 20A9 9 0 1 0 4 16.1L2 22z']],
  bell: [['path', 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9'], ['path', 'M10.3 21a1.94 1.94 0 0 0 3.4 0']],
  mic: [['rect', { x: 9, y: 2, width: 6, height: 12, rx: 3 }], ['path', 'M19 10v2a7 7 0 0 1-14 0v-2'], ['path', 'M12 19v3']],
  check: [['path', 'M20 6 9 17l-5-5']],
  arrow: [['path', 'M5 12h14'], ['path', 'm12 5 7 7-7 7']],
  back: [['path', 'm15 18-6-6 6-6']],
  target: [['circle', { cx: 12, cy: 12, r: 10 }], ['circle', { cx: 12, cy: 12, r: 6 }], ['circle', { cx: 12, cy: 12, r: 2 }]],
  clock: [['circle', { cx: 12, cy: 12, r: 10 }], ['path', 'M12 6v6l4 2']],
  send: [['path', 'm22 2-7 20-4-9-9-4z'], ['path', 'M22 2 11 13']],
  x: [['path', 'M18 6 6 18'], ['path', 'm6 6 12 12']],
  plus: [['path', 'M12 5v14'], ['path', 'M5 12h14']],
  home: [['path', 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z']],
  users: [['circle', { cx: 9, cy: 8, r: 4 }], ['path', 'M2 21a7 7 0 0 1 14 0'], ['path', 'M16 3.5a4 4 0 0 1 0 9'], ['path', 'M22 21a7 7 0 0 0-4-6.3']],
  loop: [['path', 'M17 2l4 4-4 4'], ['path', 'M3 11V9a3 3 0 0 1 3-3h15'], ['path', 'M7 22l-4-4 4-4'], ['path', 'M21 13v2a3 3 0 0 1-3 3H3']],
  list: [['path', 'M8 6h13'], ['path', 'M8 12h13'], ['path', 'M8 18h13'], ['path', 'M3.5 6h.01'], ['path', 'M3.5 12h.01'], ['path', 'M3.5 18h.01']],
  search: [['circle', { cx: 11, cy: 11, r: 7 }], ['path', 'm21 21-4.3-4.3']],
  moon: [['path', 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z']],
  chev: [['path', 'm6 9 6 6 6-6']],
  lock: [['rect', { x: 4, y: 11, width: 16, height: 10, rx: 2 }], ['path', 'M8 11V7a4 4 0 0 1 8 0v4']],
  globe: [['circle', { cx: 12, cy: 12, r: 9 }], ['path', 'M3 12h18'], ['path', 'M12 3a14 14 0 0 1 0 18'], ['path', 'M12 3a14 14 0 0 0 0 18']],
  note: [['path', 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z'], ['path', 'M14 3v6h6'], ['path', 'M8 13h8'], ['path', 'M8 17h5']],
  bulb: [['path', 'M9 18h6'], ['path', 'M10 22h4'], ['path', 'M12 2a7 7 0 0 0-4 12.7V16h8v-1.3A7 7 0 0 0 12 2z']],
  chevR: [['path', 'm9 6 6 6-6 6']],
  coffee: [['path', 'M17 8h1a4 4 0 0 1 0 8h-1'], ['path', 'M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z'], ['path', 'M6 2v2'], ['path', 'M10 2v2'], ['path', 'M14 2v2']],
  trash: [['path', 'M3 6h18'], ['path', 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6'], ['path', 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2']],
  star: [['path', 'm12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.2-6.2 3.2L7 14.2 2 9.3l6.9-1z']],
  pin: [['path', 'M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0'], ['circle', { cx: 12, cy: 10, r: 3 }]],
  video: [['rect', { x: 2, y: 6, width: 14, height: 12, rx: 2 }], ['path', 'm16 10 6-3v10l-6-3']],
  screen: [['rect', { x: 2, y: 3, width: 20, height: 13, rx: 2 }], ['path', 'M12 16v5'], ['path', 'M8 21h8']],
  book: [['path', 'M2 4h7a3 3 0 0 1 3 3v14a2 2 0 0 0-2-2H2z'], ['path', 'M22 4h-7a3 3 0 0 0-3 3v14a2 2 0 0 1 2-2h8z']],
  spark: [['path', 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6']],
};
const TYPE_ICON = { call: 'phone', email: 'mail', whatsapp: 'msg', reminder: 'bell', visit: 'pin', meeting: 'video', webinar: 'screen', course: 'book' };
const TYPE_COL = {
  call: { fg: 'oklch(0.6 0.15 50)', bg: 'oklch(0.95 0.035 50)' },
  email: { fg: 'oklch(0.55 0.15 255)', bg: 'oklch(0.95 0.035 255)' },
  whatsapp: { fg: 'oklch(0.58 0.15 150)', bg: 'oklch(0.95 0.035 150)' },
  reminder: { fg: 'oklch(0.55 0.15 300)', bg: 'oklch(0.95 0.035 300)' },
  visit: { fg: 'oklch(0.55 0.13 85)', bg: 'oklch(0.95 0.04 90)' },
  meeting: { fg: 'oklch(0.55 0.12 200)', bg: 'oklch(0.95 0.035 200)' },
  webinar: { fg: 'oklch(0.55 0.15 350)', bg: 'oklch(0.95 0.035 350)' },
  course: { fg: 'oklch(0.55 0.12 120)', bg: 'oklch(0.95 0.035 120)' },
};

const C = {
  en: {
    ob1_k: 'THE ONE THING', ob1_t: 'Your day, under control.', ob1_s: 'One thing that matters. Every small promise kept — calls, messages, follow-ups.',
    ob2_t: 'How should I nudge you?', ob2_s: 'Gentle by default. Change it any time.',
    nudges: [['gentle', 'Gentle', 'A soft tap, once. Snooze anytime.'], ['firm', 'Firm', 'I come back until it’s handled.'], ['quiet', 'Quiet', 'Badge only. No sound.']],
    ob3_t: 'Where do your promises live?', ob3_s: 'I write the draft. You send it from the app you already use.',
    chans: [['whatsapp', 'WhatsApp'], ['email', 'Mail'], ['call', 'Phone calls']],
    cont: 'Continue', start: 'Let’s start', skip: 'Skip',
    pr_k: 'GOOD MORNING, KHALID', pr_q: 'If you finish one thing today, which one makes it a good day?', pr_ph: 'Type it, or pick one below', pr_sugg: 'From your week', pr_len: 'Focus session', min: 'min', pr_cta: 'Make it my One Thing', pr_note: 'Everything else is safe. I’ll remind you when it’s time.',
    date: 'Thursday, 9 October', h_k: 'YOUR ONE THING TODAY', lockin: 'Lock In', doneToday: 'Done today', focusMeta: 'Focus session · {n} min',
    next: 'Small promises', nextNote: 'They won’t compete with your One Thing.', waiting: 'Waiting on others', waitingSub: '{n} people owe you a reply', review: 'Close the day', reviewSub: 'Takes a minute', chatPh: 'Tell me anything — I’ll sort it',
    types: { call: 'Call', email: 'Email', whatsapp: 'WhatsApp', reminder: 'Reminder', visit: 'Visit', meeting: 'Meeting', webinar: 'Webinar', course: 'Course' },
    f_k: 'LOCKED IN', pause: 'Pause', resume: 'Resume', finish: 'I’m done', f_cap: 'Remembered something? Park it.', f_safe: '{n} promises are safe until later', f_left: 'remaining',
    cap_t: 'Say it. Forget it.', cap_s: 'Tap and talk. I’ll catch who, what and when.', listening: 'Listening…', tapStop: 'Tap to stop', cap_sample: 'Remind me tomorrow at 10 to send Mohammed the price quote and follow up.', what: 'What', who: 'Who', when: 'When', via: 'Via', save: 'Save & back to focus', orType: 'or type it', heard: 'I heard',
    c_to: 'To', c_goal: 'Goal', c_points: 'Points to cover', c_draft: 'Draft', openWa: 'Open in WhatsApp', openMail: 'Open in Mail', callNow: 'Call now', copy: 'Copy',
    afterQ: 'Did you send it? If yes, when should I follow up?', fuOpts: ['Tomorrow', 'In 2 days', 'Next week', 'No need'],
    fu_t: 'Follow-ups', fu_s: 'Who owes you a reply — and who you owe.', st: { waiting: 'Waiting for reply', due: 'Needs a nudge', done: 'Closed' }, nudgeBtn: 'Nudge', closeBtn: 'Mark closed',
    now: 'now', nDone: 'Done', nSnooze: 'Snooze 10 min', nLater: 'Later',
    rv_k: 'EVENING REVIEW', rv_t: 'How did today go?', rv_one: 'Your One Thing', yes: 'Done', notYet: 'Not yet', rv_list: 'Promises', tomorrow: 'Tomorrow', kept: 'Kept', rv_close: 'Close the day', rv_end: 'Rest well.', rv_end2: 'Tomorrow starts with one thing.', rv_sum: '{a} of {b} promises kept',
    asst: 'Assistant', ok: 'Looks right', edit: 'Edit', openFu: 'Open follow-ups',
    toastSaved: 'Saved. Back to your One Thing.', toastHand: 'Draft copied — opening {app}…', toastFu: 'Follow-up set · {w}', toastSnooze: 'Snoozed 10 min', toastDone: 'Nice. One less thing.', toastNudge: 'Draft ready for {who}',
    bot0: 'Morning Khalid. Your One Thing is set. Anything rattling around your head? Dump it here — I’ll sort it.',
    chips: ['Remind me tomorrow at 10 to send Mohammed the price quote', 'Arrange my day', 'Who am I waiting on?'],
    botTask: 'Got it. Here’s what I caught:', botSaved: 'Saved. I’ll tap you gently at {t}.', botPlan: 'Here’s a calm order for today. Your One Thing goes first, while your head is fresh.', botFu: 'Three threads are open. Noura is the oldest — 3 days.', today: 'Today', tmw: 'Tomorrow',
  },
  ar: {
    ob1_k: 'ذا ون ثينق', ob1_t: 'يومك تحت السيطرة.', ob1_s: 'شي واحد مهم. وكل التزاماتك الصغيرة محفوظة — مكالمات، رسايل، ومتابعات.',
    ob2_t: 'كيف تبيني أذكّرك؟', ob2_s: 'بهدوء افتراضياً، وتقدر تغيّرها متى ما تبي.',
    nudges: [['gentle', 'بهدوء', 'تنبيه خفيف مرة وحدة، وتقدر تأجّله.'], ['firm', 'بحزم', 'أرجع لك لين تخلّصه.'], ['quiet', 'صامت', 'علامة بس، بدون صوت.']],
    ob3_t: 'وين تتواصل مع الناس؟', ob3_s: 'أنا أكتب المسودة، وأنت ترسلها من التطبيق اللي تستخدمه.',
    chans: [['whatsapp', 'واتساب'], ['email', 'البريد'], ['call', 'المكالمات']],
    cont: 'كمّل', start: 'يلّا نبدأ', skip: 'تخطّي',
    pr_k: 'صباح الخير يا خالد', pr_q: 'لو خلّصت شي واحد بس اليوم، وش اللي بيخلّي يومك ناجح؟', pr_ph: 'اكتبه، أو اختر من تحت', pr_sugg: 'من أسبوعك', pr_len: 'جلسة التركيز', min: 'دقيقة', pr_cta: 'خلّه شغلي الأساسي اليوم', pr_note: 'كل الباقي محفوظ، وبذكّرك فيه بوقته.',
    date: 'الخميس، ٩ أكتوبر', h_k: 'شغلك الأساسي اليوم', lockin: 'ابدأ التركيز', doneToday: 'خلّصته اليوم', focusMeta: 'جلسة تركيز · {n} دقيقة',
    next: 'التزاماتك الصغيرة', nextNote: 'ما راح تزاحم شغلك الأساسي.', waiting: 'تنتظر رد', waitingSub: '{n} أشخاص عليهم رد لك', review: 'سكّر يومك', reviewSub: 'ياخذ دقيقة', chatPh: 'قول لي أي شي، وأنا أرتّبه',
    types: { call: 'اتصال', email: 'إيميل', whatsapp: 'واتساب', reminder: 'تذكير', visit: 'زيارة', meeting: 'اجتماع', webinar: 'ويبينار', course: 'دورة' },
    f_k: 'في وضع التركيز', pause: 'وقّف', resume: 'كمّل', finish: 'خلّصت', f_cap: 'تذكّرت شي؟ سجّله وارجع.', f_safe: '{n} التزامات محفوظة لبعدين', f_left: 'باقي',
    cap_t: 'قلها وانساها.', cap_s: 'اضغط وتكلّم، وأنا ألقط مين ووش ومتى.', listening: 'أسمعك…', tapStop: 'اضغط للإيقاف', cap_sample: 'ذكّرني بكرة الساعة 10 أرسل لمحمد عرض السعر وأتابع معه.', what: 'وش', who: 'مين', when: 'متى', via: 'عن طريق', save: 'احفظ وارجع لشغلك', orType: 'أو اكتبها', heard: 'سمعتك تقول',
    c_to: 'إلى', c_goal: 'الهدف', c_points: 'النقاط', c_draft: 'المسودة', openWa: 'افتح في واتساب', openMail: 'افتح في البريد', callNow: 'اتصل الحين', copy: 'انسخ',
    afterQ: 'أرسلتها؟ أتابع معك بعدين؟', fuOpts: ['بكرة', 'بعد يومين', 'الأسبوع الجاي', 'ما يحتاج'],
    fu_t: 'المتابعات', fu_s: 'مين عليه رد لك — ومين لازم ترد عليه.', st: { waiting: 'ينتظر الرد', due: 'يحتاج متابعة', done: 'تم' }, nudgeBtn: 'تابع', closeBtn: 'سكّرها',
    now: 'الحين', nDone: 'تم', nSnooze: 'أجّل 10 د', nLater: 'بعدين',
    rv_k: 'مراجعة المسا', rv_t: 'كيف كان يومك؟', rv_one: 'شغلك الأساسي', yes: 'خلّصته', notYet: 'لسّا', rv_list: 'الالتزامات', tomorrow: 'لبكرة', kept: 'تم', rv_close: 'سكّر اليوم', rv_end: 'ارتاح.', rv_end2: 'بكرة نبدأ بشي واحد.', rv_sum: '{a} من {b} التزامات تمّت',
    asst: 'المساعد', ok: 'تمام', edit: 'عدّل', openFu: 'افتح المتابعات',
    toastSaved: 'انحفظت. ارجع لشغلك الأساسي.', toastHand: 'نسخت المسودة — نفتح {app}…', toastFu: 'حطّيت متابعة · {w}', toastSnooze: 'أجّلته 10 دقايق', toastDone: 'حلو. شي أقل في بالك.', toastNudge: 'المسودة جاهزة لـ{who}',
    bot0: 'صباح الخير يا خالد. شغلك الأساسي جاهز. في شي شاغل بالك؟ قوله هنا وأنا أرتّبه.',
    chips: ['ذكّرني بكرة الساعة 10 أرسل لمحمد عرض السعر', 'رتّب لي يومي', 'مين أنتظر منه رد؟'],
    botTask: 'وصلت. هذا اللي فهمته:', botSaved: 'انحفظت. بذكّرك بهدوء الساعة {t}.', botPlan: 'هذا ترتيب هادي ليومك. شغلك الأساسي أول، وراسك صافي.', botFu: 'عندك ثلاث متابعات مفتوحة. نورة أقدمها — من 3 أيام.', today: 'اليوم', tmw: 'بكرة',
  },
};

Object.assign(C.en, {
  nLater: 'Reschedule',
  r_t: 'When works better?', r_s: 'No guilt. I’ll bring it back then.', toastMoved: 'Moved to {w}. I’ll remind you then.', resched: 'Reschedule',
  rOpts: [['After my focus session', '10:30', '10:30'], ['In 1 hour', '12:00', '12:00'], ['This evening', '18:00', '18:00'], ['Tomorrow morning', '09:00', 'Tmw 09:00'], ['Monday', '10:00', 'Mon 10:00']],
  d_k: 'BRAIN DUMP', d_t: 'Empty your head.', d_s: 'Type or talk it all out, messy is fine. I’ll split it into separate things.', d_ph: 'call the lawyer, email Sara the deck, buy ink…', d_fill: 'Talk instead', d_sort: 'Sort it for me', d_found: 'I found {n} things', d_hint: 'Tap to drop anything that doesn’t matter.', d_save: 'Save {n} and clear my head', d_edit: 'Edit', toastDump: '{n} things saved. Head’s clearer now.',
  d_sample: 'Call the lawyer about the contract tomorrow at 11, email Sara the deck, buy printer ink, reply to Noura about the logo, book the dentist, pay the supplier invoice by 5',
  dumpCard: 'Head full?', dumpCardSub: 'Brain dump — I’ll sort it',
  s_k: 'TOO MUCH? LET’S SHRINK IT', s_t: 'Just the next tiny step.', s_step: 'Step {a} of {b}', s_mins: 'About 2 minutes', s_tinyPre: 'Only this, for 2 minutes: ', s_sprint: 'Start a 5-min sprint', s_next: 'Done — next step', s_smaller: 'Still too big', s_bigger: 'Show the normal step', s_hold: 'Everything else can wait. I’m holding it.', s_all: 'All steps done. That was the hard part.', stuck: 'I’m stuck', stuckLink: 'Feeling stuck? Shrink it',
});
Object.assign(C.ar, {
  nLater: 'غيّر الموعد',
  r_t: 'متى يناسبك أكثر؟', r_s: 'عادي، بذكّرك فيه بوقته الجديد.', toastMoved: 'نقلته لـ{w}. بذكّرك وقتها.', resched: 'غيّر الموعد',
  rOpts: [['بعد جلسة التركيز', '10:30', '10:30'], ['بعد ساعة', '12:00', '12:00'], ['الليلة', '18:00', '18:00'], ['بكرة الصبح', '09:00', 'بكرة 09:00'], ['يوم الإثنين', '10:00', 'الإثنين 10:00']],
  d_k: 'فضفضة', d_t: 'فضّي راسك.', d_s: 'اكتب أو تكلّم بكل اللي في بالك، حتى لو مخربط. أنا أقسّمه لأشياء منفصلة.', d_ph: 'أتصل بالمحامي، أرسل العرض لسارة، أشتري حبر…', d_fill: 'تكلّم بدال', d_sort: 'رتّبها لي', d_found: 'لقيت {n} أشياء', d_hint: 'اضغط على أي شي ما يهم عشان تشيله.', d_save: 'احفظ {n} وريّح راسك', d_edit: 'عدّل', toastDump: 'حفظت {n} أشياء. راسك أخف الحين.',
  d_sample: 'أتصل بالمحامي بخصوص العقد بكرة الساعة 11، أرسل لسارة العرض بالإيميل، أشتري حبر للطابعة، أرد على نورة بخصوص الشعار، أحجز موعد الأسنان، أدفع فاتورة المورّد قبل الساعة 5',
  dumpCard: 'راسك مليان؟', dumpCardSub: 'فضفض — وأنا أرتّبه',
  s_k: 'كثير عليك؟ نصغّرها', s_t: 'بس الخطوة الصغيرة الجاية.', s_step: 'خطوة {a} من {b}', s_mins: 'تقريباً دقيقتين', s_tinyPre: 'بس هذي، لمدة دقيقتين: ', s_sprint: 'ابدأ 5 دقايق بس', s_next: 'خلّصتها — اللي بعدها', s_smaller: 'لسّا كبيرة', s_bigger: 'رجّع الخطوة العادية', s_hold: 'كل الباقي يقدر ينتظر. أنا ماسكه لك.', s_all: 'خلّصت كل الخطوات. هذا كان الجزء الصعب.', stuck: 'معلّق', stuckLink: 'حاس إنك معلّق؟ صغّرها',
});
const STEPS = {
  'Finish the investor proposal': { en: ['Open the proposal doc', 'Write 3 bullets for the traction section', 'Paste last month’s numbers', 'Fix the ask slide', 'Read it once, out loud', 'Send it to one person for feedback'], ar: ['افتح ملف العرض', 'اكتب 3 نقاط عن النمو', 'الصق أرقام الشهر اللي فات', 'عدّل شريحة المبلغ المطلوب', 'اقراه مرة وحدة بصوت عالي', 'أرسله لشخص واحد ياخذ رأيه'] },
  'Close the supplier deal': { en: ['Find the last quote', 'List your 2 must-haves', 'Write your walk-away price', 'Send one WhatsApp to set a call'], ar: ['دوّر آخر عرض سعر', 'اكتب شرطين ما تتنازل عنهم', 'حدّد أقل سعر تقبله', 'أرسل واتساب واحد تحدد فيه مكالمة'] },
  'Launch the new menu page': { en: ['Open the page draft', 'Add 3 dish photos', 'Check the prices', 'Hit publish'], ar: ['افتح مسودة الصفحة', 'أضف 3 صور أطباق', 'راجع الأسعار', 'اضغط نشر'] },
  _: { en: ['Open the thing you need', 'Do the smallest visible piece', 'Write down what’s next', 'Take one more step'], ar: ['افتح الشي اللي تحتاجه', 'سوّ أصغر جزء تقدر تشوفه', 'اكتب وش الخطوة الجاية', 'خذ خطوة وحدة زيادة'] },
};
Object.assign(C.en, { ev_k: 'EVENING', ev_t: 'Ready to close your day?', empty_t: 'Nothing here yet', empty_s: 'Tell me what’s on your mind — calls, messages, anything. I’ll sort it.', empty_cta: 'Empty your head', f_tap: 'Tap anywhere for controls' });
Object.assign(C.ar, { ev_k: 'المسا', ev_t: 'جاهز تسكّر يومك؟', empty_t: 'ما فيه شي للحين', empty_s: 'قول لي وش في بالك — مكالمات، رسايل، أي شي. وأنا أرتّبه.', empty_cta: 'فضّي راسك', f_tap: 'اضغط بأي مكان عشان تطلع الأزرار' });
Object.assign(C.en, { swipeHint: 'Swipe → done · ← later', nowL: 'Now', relIn: 'in {m}', more: '{n} more later today', less: 'Show less', holdHint: 'Tap the mic for one thing · hold it to empty your head', undo: 'Undo' });
Object.assign(C.ar, { swipeHint: 'اسحب ← تم · → بعدين', nowL: 'الحين', relIn: 'بعد {m}', more: '{n} أشياء ثانية اليوم', less: 'أقل', holdHint: 'اضغط المايك لشي واحد · اضغط مطوّل وفضفض كل اللي في بالك', undo: 'تراجع' });
Object.assign(C.en, { sugK: 'A thought', notNow: 'Not now',
  sug: {
    fresh: ['Fresh start. 2 things slipped yesterday — no big deal. Bring them in quietly?', 'Bring them'],
    overload: ['Today has about 5h of work in 3h of free time. Move “Pay the packaging supplier” to tomorrow morning?', 'Move it'],
    plan: ['I lined up your day: focus first, then Mohammed at 10:00, the lawyer at 11:00, Sara at 15:00. 15-min breaks in between.', 'Use this plan'],
    fu: ['Your email to Sara mentions a call next week. Follow up Tuesday if she doesn’t reply?', 'Yes, remind me'],
  },
  sugToast: { fresh: '2 things added. Clean slate.', overload: 'Moved. Today feels lighter.', plan: 'Day arranged. I’ll nudge you as you go.', fu: 'Follow-up set for Tuesday.' },
  fresh: [['Reply to the landlord', 'reminder'], ['Order business cards', 'reminder']],
});
Object.assign(C.ar, { sugK: 'فكرة', notNow: 'مو الحين',
  sug: {
    fresh: ['بداية جديدة. فيه شيئين ما تمّوا أمس — عادي. أضيفهم بهدوء؟', 'أضفهم'],
    overload: ['اليوم فيه تقريباً 5 ساعات شغل و3 ساعات فاضية بس. أنقل «أدفع لمورّد التغليف» لبكرة الصبح؟', 'انقله'],
    plan: ['رتّبت يومك: التركيز أول، بعدين محمد الساعة 10، المحامي 11، وسارة 3 العصر. مع استراحة ربع ساعة بينهم.', 'اعتمد الترتيب'],
    fu: ['إيميلك لسارة فيه مكالمة الأسبوع الجاي. أذكّرك تتابع معها الثلاثاء لو ما ردّت؟', 'إيه، ذكّرني'],
  },
  sugToast: { fresh: 'أضفتهم. صفحة جديدة.', overload: 'نقلته. يومك أخف الحين.', plan: 'رتّبت يومك. بذكّرك وأنت ماشي.', fu: 'حطّيت متابعة يوم الثلاثاء.' },
  fresh: [['أرد على المؤجر', 'reminder'], ['أطلب كروت شغل', 'reminder']],
});
Object.assign(C.en, { set_t: 'Settings', set_name: 'Khalid Al-Mansouri', set_role: 'Founder · Qahwa House', set_rem: 'Reminder style', set_ch: 'Channels', set_focus: 'Default focus session', set_lang: 'Language', set_quiet: 'Quiet hours', set_quietV: '22:00 – 08:00', set_plan: 'Plan', set_planV: 'Free', set_up: 'Try Founder Pro', set_out: 'Sign out' });
Object.assign(C.ar, { set_t: 'الإعدادات', set_name: 'خالد المنصوري', set_role: 'مؤسس · بيت القهوة', set_rem: 'طريقة التذكير', set_ch: 'القنوات', set_focus: 'مدة التركيز الافتراضية', set_lang: 'اللغة', set_quiet: 'وقت الهدوء', set_quietV: '22:00 – 08:00', set_plan: 'الباقة', set_planV: 'مجانية', set_up: 'جرّب Founder Pro', set_out: 'تسجيل خروج' });
Object.assign(C.en, { c_phone: 'WhatsApp number', c_phonePh: '+966 5X XXX XXXX', c_phoneAsk: 'Add their number once — I’ll remember it.', c_phoneErr: 'Looks short — check the number.', c_emailPh: 'name@company.com', c_emailAsk: 'Add their email once — I’ll remember it.', c_emailErr: 'Check the email address.', c_subject: 'Subject', savedNext: 'Saved for next time', sendWa: 'Send on WhatsApp', sendEmail: 'Send email', openMailApp: 'Open in Mail app instead', toastSentTo: 'Sent to {to}', toastWa: 'Opening WhatsApp with {to}…',
  r_time: 'Time', r_move: 'Move to {d} · {t}', wk: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  rQuick: [['After focus', 0, '10:30'], ['In 1 hour', 0, '12:00'], ['Tonight', 0, '18:00'], ['Tomorrow 9am', 1, '09:00'], ['Monday', 4, '10:00']] });
Object.assign(C.ar, { c_phone: 'رقم الواتساب', c_phonePh: '+966 5X XXX XXXX', c_phoneAsk: 'أضف رقمه مرة وحدة، وأنا أحفظه.', c_phoneErr: 'الرقم ناقص — تأكد منه.', c_emailPh: 'name@company.com', c_emailAsk: 'أضف إيميله مرة وحدة، وأنا أحفظه.', c_emailErr: 'تأكد من الإيميل.', c_subject: 'الموضوع', savedNext: 'انحفظ للمرة الجاية', sendWa: 'أرسل على واتساب', sendEmail: 'أرسل الإيميل', openMailApp: 'أو افتحه في تطبيق البريد', toastSentTo: 'انرسل إلى {to}', toastWa: 'نفتح واتساب مع {to}…',
  r_time: 'الوقت', r_move: 'انقله لـ{d} · {t}', wk: ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'], months: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
  rQuick: [['بعد التركيز', 0, '10:30'], ['بعد ساعة', 0, '12:00'], ['الليلة', 0, '18:00'], ['بكرة 9 الصبح', 1, '09:00'], ['الإثنين', 4, '10:00']] });
Object.assign(C.en, { q_x: { visit: 'Visit', meeting: 'Meeting', webinar: 'Webinar', course: 'Course' } });
Object.assign(C.ar, { q_x: { visit: 'زيارة', meeting: 'اجتماع', webinar: 'ويبينار', course: 'دورة' } });
const BASE = new Date(2026, 9, 9);
const CONTACTS = [
  { en: 'Mohammed Al-Saadi', ar: 'محمد السعدي', role: { en: 'Client', ar: 'عميل' }, email: 'mohammed@alsaadi-trading.com', dial: '+966', phone: '', last: { en: 'Emailed · Sunday', ar: 'إيميل · الأحد' } },
  { en: 'Sara Haddad', ar: 'سارة حداد', role: { en: 'Investor', ar: 'مستثمرة' }, email: 'sara@northwind.vc', dial: '+971', phone: '50 331 2045', last: { en: 'Emailed · 3 days ago', ar: 'إيميل · قبل 3 أيام' } },
  { en: 'Faisal Al-Otaibi', ar: 'فيصل العتيبي', role: { en: 'Lawyer', ar: 'محامي' }, email: 'faisal@otaibilaw.sa', dial: '+966', phone: '55 123 4567', last: { en: 'Called · last week', ar: 'مكالمة · الأسبوع اللي فات' } },
  { en: 'Noura Al-Harbi', ar: 'نورة الحربي', role: { en: 'Designer', ar: 'مصممة' }, email: 'noura@studionoura.com', dial: '+966', phone: '54 880 1123', last: { en: 'WhatsApp · 3 days ago', ar: 'واتساب · قبل 3 أيام' } },
  { en: 'Al Noor Packaging', ar: 'النور للتغليف', role: { en: 'Supplier', ar: 'مورّد' }, email: 'sales@alnoorpack.com', dial: '+966', phone: '11 465 2200', last: { en: 'Called · yesterday', ar: 'مكالمة · أمس' } },
  { en: 'Omar Khalid', ar: 'عمر خالد', role: { en: 'Accountant', ar: 'محاسب' }, email: 'omar@ledgerco.sa', dial: '+966', phone: '56 702 9910', last: { en: 'Emailed · 2 weeks ago', ar: 'إيميل · قبل أسبوعين' } },
  { en: 'Reem Al-Qahtani', ar: 'ريم القحطاني', role: { en: 'Coffee supplier', ar: 'مورّدة البن' }, email: 'reem@qahwabeans.com', dial: '+973', phone: '3300 4512', last: { en: 'WhatsApp · last month', ar: 'واتساب · الشهر اللي فات' } },
  { en: 'Yousef Al-Dosari', ar: 'يوسف الدوسري', role: { en: 'Landlord', ar: 'المؤجر' }, email: '', dial: '+966', phone: '50 900 1188', last: { en: 'Called · last month', ar: 'مكالمة · الشهر اللي فات' } },
];
Object.assign(C.en, { tk_t: 'Tasks', tk_prog: '{a} of {b} done today', upNext: 'UP NEXT', nowW: 'now', unCall: 'Call {n}', unAct: { whatsapp: 'Open WhatsApp draft', email: 'Open email draft', reminder: 'Open', call: 'Call' }, slipped: 'Slipped', moveTmw: 'Move to tomorrow', toastMovedN: '{n} moved to tomorrow. Fresh start.', pMorning: 'This morning', pAfternoon: 'This afternoon', pEvening: 'This evening', doneToday2: 'Done today', show: 'Show', hide: 'Hide', noRemB: '{n} without a reminder ·', remTiny: { at: 'on time', '10': '−10m', '30': '−30m', '60': '−1h', morning: '8:00' }, remTinyC: 'custom' });
Object.assign(C.ar, { tk_t: 'المهام', tk_prog: '{a} من {b} تمّت اليوم', upNext: 'الجاي', nowW: 'الحين', unCall: 'اتصل بـ{n}', unAct: { whatsapp: 'افتح مسودة الواتساب', email: 'افتح مسودة الإيميل', reminder: 'افتح', call: 'اتصل' }, slipped: 'فاتت', moveTmw: 'انقلها لبكرة', toastMovedN: 'نقلت {n} لبكرة. بداية جديدة.', pMorning: 'الصبح', pAfternoon: 'الظهر والعصر', pEvening: 'المسا', doneToday2: 'تمّت اليوم', show: 'عرض', hide: 'إخفاء', noRemB: '{n} بدون تذكير ·', remTiny: { at: 'بوقتها', '10': '−10د', '30': '−30د', '60': '−1س', morning: '8:00' }, remTinyC: 'مخصص' });
Object.assign(C.en, { newC: 'New', newCT: 'New contact', editC: 'Edit contact', cancel: 'Cancel', saveC: 'Save', f_name: 'Name', f_namePh: 'e.g. Ahmed Al-Rashid', f_nameErr: 'Add a name so you can find them later.', f_role: 'Company or role', f_rolePh: 'e.g. Supplier · Qahwa Beans', c_email: 'Email', f_pref: 'Usually reach them by', f_notes: 'Notes for next time', f_notesPh: 'e.g. Prefers mornings. Talk prices in SAR. Ask about his son’s exams.', saveTask: 'Save & start a {ch}', toastC: '{n} saved to People' });
Object.assign(C.ar, { newC: 'جديد', newCT: 'شخص جديد', editC: 'تعديل', cancel: 'إلغاء', saveC: 'حفظ', f_name: 'الاسم', f_namePh: 'مثلاً: أحمد الراشد', f_nameErr: 'اكتب الاسم عشان تلقاه بعدين.', f_role: 'الشركة أو الدور', f_rolePh: 'مثلاً: مورّد · قهوة بينز', c_email: 'الإيميل', f_pref: 'عادةً تتواصل معه عن طريق', f_notes: 'ملاحظات للمرة الجاية', f_notesPh: 'مثلاً: يفضّل الصبح. الأسعار بالريال. اسأله عن اختبارات ولده.', saveTask: 'احفظ وابدأ {ch}', toastC: 'انحفظ {n} في الأشخاص' });
Object.assign(C.en, { tk_sum: '{a} to do · {b} done', later: 'Later', all: 'All', fl: { call: 'Calls', email: 'Emails', whatsapp: 'WhatsApp', reminder: 'Reminders' }, doneF: 'Done', remAll: 'Add reminders to these', toastRemAll: 'Added reminders to {n} tasks · your existing ones weren’t touched', addRem: 'Add', remShort: { at: 'On time', '10': '10m before', '30': '30m before', '60': '1h before', morning: '08:00' }, rem_t: 'Remind me', remOpts: [['at', 'At the time'], ['10', '10 minutes before'], ['30', '30 minutes before'], ['60', '1 hour before'], ['morning', 'Morning of · 08:00']], remNone: 'No reminder', remCustom: 'Pick a date & time', toastRem: 'Reminder · {w}', seeAll: 'See all {n} tasks', r_remT: 'When should I remind you?', r_remApply: 'Remind me {d} · {t}', tk_empty: 'Nothing here. Enjoy the space.' });
Object.assign(C.ar, { tk_sum: '{a} باقية · {b} تمّت', later: 'بعدين', all: 'الكل', fl: { call: 'مكالمات', email: 'إيميلات', whatsapp: 'واتساب', reminder: 'تذكيرات' }, doneF: 'تمّت', remAll: 'ذكّرني فيها كلها بوقتها', toastRemAll: 'حطّيت تذكير لـ{n} مهام', addRem: 'أضف', remShort: { at: 'بوقتها', '10': 'قبل 10د', '30': 'قبل 30د', '60': 'قبل ساعة', morning: '08:00' }, rem_t: 'ذكّرني', remOpts: [['at', 'بنفس الوقت'], ['10', 'قبل 10 دقايق'], ['30', 'قبل نص ساعة'], ['60', 'قبل ساعة'], ['morning', 'الصبح · 08:00']], remNone: 'بدون تذكير', remCustom: 'اختر يوم ووقت', toastRem: 'تذكير · {w}', seeAll: 'شوف كل المهام ({n})', r_remT: 'متى أذكّرك؟', r_remApply: 'ذكّرني {d} · {t}', tk_empty: 'ما فيه شي هنا. استمتع بالهدوء.' });
Object.assign(C.en, { q_k: 'QUICK ACTIONS', q_rem: 'Remind', q_who: { call: 'Call who?', email: 'Email who?', whatsapp: 'WhatsApp who?' }, q_new: 'Someone new', q_noEmail: 'No email yet — add it next', q_noPhone: 'No number yet — add it next', newPerson: 'New contact' });
Object.assign(C.ar, { q_k: 'إجراءات سريعة', q_rem: 'ذكّرني', q_who: { call: 'تتصل بمين؟', email: 'ترسل إيميل لمين؟', whatsapp: 'ترسل واتساب لمين؟' }, q_new: 'شخص جديد', q_noEmail: 'ما عنده إيميل — أضفه بالخطوة الجاية', q_noPhone: 'ما عنده رقم — أضفه بالخطوة الجاية', newPerson: 'شخص جديد' });
Object.assign(C.en, { tabs: ['Today', 'Tasks', 'Follow-ups', 'People'], pp_t: 'People', pp_s: 'Everyone you’ve emailed, called or messaged.', pp_ph: 'Search name, email or number', pp_recent: 'RECENT', pp_res: '{n} RESULTS', pp_none: 'No one matches “{q}”', sugRecent: 'Sent before', sugMatch: 'Matches', newMsg: { whatsapp: 'Message {n}', email: 'Email {n}', call: 'Call {n}' }, justNow: 'Just now' });
Object.assign(C.ar, { tabs: ['اليوم', 'المهام', 'المتابعات', 'الأشخاص'], pp_t: 'الأشخاص', pp_s: 'كل اللي راسلتهم أو كلمتهم قبل.', pp_ph: 'دوّر بالاسم أو الإيميل أو الرقم', pp_recent: 'الأخيرين', pp_res: '{n} نتائج', pp_none: 'ما لقيت أحد يطابق «{q}»', sugRecent: 'أرسلت لهم قبل', sugMatch: 'نتائج', newMsg: { whatsapp: 'رسالة لـ{n}', email: 'إيميل لـ{n}', call: 'اتصال بـ{n}' }, justNow: 'الحين' });
const CCS = (() => { let en, ar; try { en = new Intl.DisplayNames(['en'], { type: 'region' }); ar = new Intl.DisplayNames(['ar'], { type: 'region' }); } catch (e) {}
  return 'SA966 AE971 KW965 QA974 BH973 OM968 EG20 JO962 LB961 IQ964 SY963 PS970 YE967 MA212 DZ213 TN216 LY218 SD249 AF93 AL355 AD376 AO244 AG1268 AR54 AM374 AU61 AT43 AZ994 BS1242 BD880 BB1246 BY375 BE32 BZ501 BJ229 BT975 BO591 BA387 BW267 BR55 BN673 BG359 BF226 BI257 KH855 CM237 CA1 CV238 CF236 TD235 CL56 CN86 CO57 KM269 CG242 CD243 CR506 CI225 HR385 CU53 CY357 CZ420 DK45 DJ253 DM1767 DO1809 EC593 SV503 GQ240 ER291 EE372 SZ268 ET251 FJ679 FI358 FR33 GA241 GM220 GE995 DE49 GH233 GR30 GD1473 GT502 GN224 GW245 GY592 HT509 HN504 HK852 HU36 IS354 IN91 ID62 IR98 IE353 IT39 JM1876 JP81 KZ7 KE254 KI686 KG996 LA856 LV371 LS266 LR231 LI423 LT370 LU352 MO853 MG261 MW265 MY60 MV960 ML223 MT356 MH692 MR222 MU230 MX52 FM691 MD373 MC377 MN976 ME382 MZ258 MM95 NA264 NR674 NP977 NL31 NZ64 NI505 NE227 NG234 KP850 MK389 NO47 PK92 PW680 PA507 PG675 PY595 PE51 PH63 PL48 PT351 PR1787 RO40 RU7 RW250 KN1869 LC1758 VC1784 WS685 SM378 ST239 SN221 RS381 SC248 SL232 SG65 SK421 SI386 SB677 SO252 ZA27 KR82 SS211 ES34 LK94 SR597 SE46 CH41 TW886 TJ992 TZ255 TH66 TL670 TG228 TO676 TT1868 TR90 TM993 TV688 UG256 UA380 GB44 US1 UY598 UZ998 VU678 VA379 VE58 VN84 ZM260 ZW263'.split(' ').map(x => { const iso = x.slice(0, 2), flag = String.fromCodePoint(...[...iso].map(c => 127397 + c.charCodeAt(0))); return [flag, '+' + x.slice(2), en ? en.of(iso) : iso, ar ? ar.of(iso) : iso, iso]; }); })();
const SUG_ORDER = ['fresh', 'overload', 'plan', 'fu'];
const ONE_SUGG = [
  { en: 'Finish the investor proposal', ar: 'أخلّص عرض المستثمرين' },
  { en: 'Close the supplier deal', ar: 'أقفل الاتفاق مع المورّد' },
  { en: 'Launch the new menu page', ar: 'أطلق صفحة المنيو الجديدة' },
];

const TASKS = [
  { id: 't1', type: 'whatsapp', time: '10:00', done: false, en: { title: 'Follow up on price quote', who: 'Mohammed Al-Saadi' }, ar: { title: 'متابعة عرض السعر', who: 'محمد السعدي' },
    goal: { en: 'Confirm he received the quote and get a yes/no by Sunday', ar: 'أتأكد إنه وصله العرض وآخذ رد قبل الأحد' },
    points: { en: ['Quote sent Sunday', 'Offer 5% if paid upfront', 'Delivery in 2 weeks'], ar: ['أرسلت العرض يوم الأحد', 'خصم 5% لو الدفع مقدّم', 'التسليم خلال أسبوعين'] },
    draft: { en: 'Hi Mohammed, hope you’re well. Just checking the price quote reached you. If you pay upfront I can do 5% off, and delivery is two weeks. Let me know by Sunday?', ar: 'هلا محمد، إن شاء الله بخير. حبيت أتطمن إن عرض السعر وصلك. لو الدفع مقدّم أقدر أعطيك خصم 5%، والتسليم خلال أسبوعين. تقدر ترد علي قبل الأحد؟' } },
  { id: 't2', type: 'call', time: '11:00', done: false, en: { title: 'Contract terms', who: 'Faisal · Lawyer' }, ar: { title: 'بنود العقد', who: 'فيصل · المحامي' },
    goal: { en: 'Agree on the termination clause', ar: 'نتفق على بند إنهاء العقد' },
    points: { en: ['Notice period: 30 → 60 days?', 'Who owns the IP', 'Signing date'], ar: ['مدة الإشعار: 30 أو 60 يوم؟', 'ملكية الحقوق', 'موعد التوقيع'] }, draft: { en: '', ar: '' } },
  { id: 't3', type: 'email', time: '15:00', done: false, en: { title: 'Send deck v3', who: 'Sara · Investor' }, ar: { title: 'أرسل العرض النسخة 3', who: 'سارة · مستثمرة' },
    goal: { en: 'Share the updated deck and book a 20-min call', ar: 'أرسل العرض المحدّث وأحجز مكالمة 20 دقيقة' },
    points: { en: ['New traction slide', 'Revised ask: $250k', 'Two time slots next week'], ar: ['شريحة النمو الجديدة', 'المبلغ المطلوب: 250 ألف دولار', 'موعدين الأسبوع الجاي'] },
    draft: { en: 'Hi Sara,\n\nAttached is v3 of the deck — the new traction slide is on page 4 and the ask is now $250k. Would Tuesday 11:00 or Wednesday 14:00 work for a quick 20 minutes?\n\nThanks,\nKhalid', ar: 'هلا سارة،\n\nمرفق النسخة 3 من العرض — شريحة النمو الجديدة في صفحة 4، والمبلغ المطلوب صار 250 ألف دولار. يناسبك الثلاثاء 11 أو الأربعاء 2 لمكالمة 20 دقيقة؟\n\nشكراً،\nخالد' } },
  { id: 't4', type: 'reminder', time: '17:00', done: false, en: { title: 'Pay the packaging supplier', who: 'Al Noor Packaging' }, ar: { title: 'أدفع لمورّد التغليف', who: 'النور للتغليف' },
    goal: { en: 'Transfer invoice #2231', ar: 'تحويل فاتورة 2231' }, points: { en: ['SAR 4,800', 'Bank transfer'], ar: ['4,800 ريال', 'تحويل بنكي'] }, draft: { en: '', ar: '' } },
];

TASKS.push(
  { id: 't5', type: 'call', time: '12:30', done: false, remind: '10', en: { title: 'Confirm Friday catering order', who: 'Reem Al-Qahtani' }, ar: { title: 'تأكيد طلب ضيافة الجمعة', who: 'ريم القحطاني' }, goal: { en: 'Confirm Friday catering order', ar: 'تأكيد طلب ضيافة الجمعة' }, points: { en: [], ar: [] }, draft: { en: '', ar: '' } },
  { id: 't6', type: 'email', time: '13:00', done: false, en: { title: 'Send October invoices', who: 'Omar Khalid · Accountant' }, ar: { title: 'أرسل فواتير أكتوبر', who: 'عمر خالد · محاسب' }, goal: { en: 'Send October invoices', ar: 'أرسل فواتير أكتوبر' }, points: { en: [], ar: [] }, draft: { en: '', ar: '' } },
  { id: 't7', type: 'whatsapp', time: '13:30', done: false, en: { title: 'Share new menu photos', who: 'Noura Al-Harbi · Designer' }, ar: { title: 'أرسل صور المنيو الجديدة', who: 'نورة الحربي · مصممة' }, goal: { en: 'Share new menu photos', ar: 'أرسل صور المنيو الجديدة' }, points: { en: [], ar: [] }, draft: { en: '', ar: '' } },
  { id: 't8', type: 'reminder', time: '14:00', done: false, remind: '60', en: { title: 'Renew commercial registration', who: 'Ministry portal' }, ar: { title: 'تجديد السجل التجاري', who: 'بوابة الوزارة' }, goal: { en: 'Renew commercial registration', ar: 'تجديد السجل التجاري' }, points: { en: [], ar: [] }, draft: { en: '', ar: '' } },
  { id: 't9', type: 'call', time: '16:00', done: false, en: { title: 'Ask about the lease renewal', who: 'Yousef Al-Dosari · Landlord' }, ar: { title: 'أسأل عن تجديد الإيجار', who: 'يوسف الدوسري · المؤجر' }, goal: { en: 'Ask about the lease renewal', ar: 'أسأل عن تجديد الإيجار' }, points: { en: [], ar: [] }, draft: { en: '', ar: '' } },
  { id: 't10', type: 'whatsapp', time: '16:30', done: false, en: { title: 'Thank the delivery team', who: 'Ops group' }, ar: { title: 'أشكر فريق التوصيل', who: 'قروب العمليات' }, goal: { en: 'Thank the delivery team', ar: 'أشكر فريق التوصيل' }, points: { en: [], ar: [] }, draft: { en: '', ar: '' } },
  { id: 't11', type: 'reminder', time: '08:30', done: true, remind: 'at', en: { title: 'Turn off the shop alarm', who: 'Shop' }, ar: { title: 'إطفاء إنذار المحل', who: 'المحل' }, goal: { en: 'Turn off the shop alarm', ar: 'إطفاء إنذار المحل' }, points: { en: [], ar: [] }, draft: { en: '', ar: '' } },
  { id: 't12', type: 'email', time: '09:00', done: true, remind: 'at', en: { title: 'Reply to job applicant', who: 'Lina · Barista' }, ar: { title: 'الرد على المتقدمة للوظيفة', who: 'لينا · باريستا' }, goal: { en: 'Reply to job applicant', ar: 'الرد على المتقدمة للوظيفة' }, points: { en: [], ar: [] }, draft: { en: '', ar: '' } },
  { id: 't13', type: 'call', time: 'z2026-10-1010:00', done: false, when: { en: 'Tmw 10:00', ar: 'بكرة 10:00' }, remind: '10', en: { title: 'Weekly call with co-founder', who: 'Hamad' }, ar: { title: 'المكالمة الأسبوعية مع الشريك', who: 'حمد' }, goal: { en: 'Weekly call with co-founder', ar: 'المكالمة الأسبوعية مع الشريك' }, points: { en: [], ar: [] }, draft: { en: '', ar: '' } },
  { id: 't14', type: 'email', time: 'z2026-10-1011:00', done: false, when: { en: 'Tmw 11:00', ar: 'بكرة 11:00' }, en: { title: 'Send pitch to Riyadh Angels', who: 'Riyadh Angels' }, ar: { title: 'أرسل العرض لمستثمري الرياض', who: 'مستثمري الرياض' }, goal: { en: 'Send pitch to Riyadh Angels', ar: 'أرسل العرض لمستثمري الرياض' }, points: { en: [], ar: [] }, draft: { en: '', ar: '' } },
  { id: 't15', type: 'reminder', time: 'z2026-10-1015:00', done: false, when: { en: 'Tmw 15:00', ar: 'بكرة 15:00' }, en: { title: 'Pick up packaging samples', who: 'Al Noor Packaging' }, ar: { title: 'استلام عينات التغليف', who: 'النور للتغليف' }, goal: { en: 'Pick up packaging samples', ar: 'استلام عينات التغليف' }, points: { en: [], ar: [] }, draft: { en: '', ar: '' } },
  { id: 't16', type: 'whatsapp', time: 'z2026-10-1310:00', done: false, when: { en: 'Mon 13 · 10:00', ar: 'الإثنين 13 · 10:00' }, en: { title: 'Check in with Reem on beans', who: 'Reem Al-Qahtani' }, ar: { title: 'أتابع مع ريم بخصوص البن', who: 'ريم القحطاني' }, goal: { en: 'Check in with Reem on beans', ar: 'أتابع مع ريم بخصوص البن' }, points: { en: [], ar: [] }, draft: { en: '', ar: '' } },
  { id: 't17', type: 'reminder', time: 'z2026-10-1509:00', done: false, when: { en: 'Thu 15 · 09:00', ar: 'الخميس 15 · 09:00' }, remind: 'morning', en: { title: 'Quarterly VAT filing', who: 'ZATCA' }, ar: { title: 'إقرار ضريبة القيمة المضافة', who: 'الزكاة والضريبة' }, goal: { en: 'Quarterly VAT filing', ar: 'إقرار ضريبة القيمة المضافة' }, points: { en: [], ar: [] }, draft: { en: '', ar: '' } },
  { id: 't18', type: 'email', time: 'z2026-10-2012:00', done: false, when: { en: 'Tue 20 · 12:00', ar: 'الثلاثاء 20 · 12:00' }, en: { title: 'Newsletter to loyal customers', who: 'Mailing list' }, ar: { title: 'نشرة للعملاء المميزين', who: 'قائمة البريد' }, goal: { en: 'Newsletter to loyal customers', ar: 'نشرة للعملاء المميزين' }, points: { en: [], ar: [] }, draft: { en: '', ar: '' } }
);
TASKS[0].remind = 'at'; TASKS[1].remind = '10'; TASKS[2].remind = '30';
TASKS[0].phone = ''; TASKS[1].phone = '+966 55 123 4567'; TASKS[2].email = 'sara@northwind.vc'; TASKS[2].subject = { en: 'Deck v3 + a quick call', ar: 'العرض النسخة 3 + مكالمة سريعة' };
const FUS = [
  { id: 'f1', status: 'waiting', ch: 'whatsapp', en: { who: 'Mohammed Al-Saadi', what: 'Price quote', since: 'Sent Sunday · follow up Tue' }, ar: { who: 'محمد السعدي', what: 'عرض السعر', since: 'أرسلته الأحد · تابع الثلاثاء' } },
  { id: 'f2', status: 'due', ch: 'email', en: { who: 'Noura · Designer', what: 'Logo final files', since: '3 days, no reply' }, ar: { who: 'نورة · المصممة', what: 'ملفات الشعار النهائية', since: '3 أيام بدون رد' } },
  { id: 'f3', status: 'waiting', ch: 'call', en: { who: 'Al Noor Packaging', what: 'Revised invoice', since: 'Promised by today' }, ar: { who: 'النور للتغليف', what: 'الفاتورة المعدّلة', since: 'وعدوا اليوم' } },
];

const ACC = {
  en: { si: { title: 'Your day, under control.', sub: 'One priority. Every small promise kept. Sign in to start.', apple: 'Continue with Apple', google: 'Continue with Google',
      terms1: 'I agree to the', termsL: 'Terms of Service', and: 'and', privL: 'Privacy Policy', terms2: '.', mkt: 'Send me tips, product news and offers.', opt: '(optional)',
      err: 'Please accept the Terms and Privacy Policy to continue.', note: 'We collect your name, phone, job title and how you use the app to run it and improve it. Marketing only if you opt in — change anytime in Settings.', updated: 'Last updated 9 October 2026' },
    su: { q: ['What should we call you?', 'What’s your phone number?', 'What do you do?'], sub: ['Just your first name is perfect — it’s how I’ll talk to you.', 'Optional. Used for WhatsApp reminders and account recovery. Never shared.', 'Helps me suggest the right follow-ups and drafts.'],
      hello: ['Welcome 👋', 'Nice to meet you, {n}.', 'Almost done, {n}.'], namePh: 'Your first name', jobPh: 'e.g. Founder at Qahwa House', jobs: ['Founder', 'Freelancer', 'Sales', 'Manager', 'Consultant', 'Student'], cont: 'Continue', done: 'Let’s go, {n}' },
    terms: [['Using the app', 'The One Thing helps you plan your day, draft messages and remember follow-ups. You send messages yourself from your own apps; we never send on your behalf without you tapping send.'], ['Your account', 'You sign in with Apple or Google. Keep your device secure. You can delete your account at any time from Settings.'], ['Subscriptions', 'Pro is billed through the App Store or Google Play and renews until you cancel in your store settings. Prices are shown before you buy.'], ['Acceptable use', 'Don’t use the app to spam, harass or break the law.'], ['Changes', 'If we change these terms we’ll tell you in the app before they apply.']],
    priv: [['What we collect', 'Your name, phone number, job title, email from your sign-in provider, the tasks, contacts and notes you add, and basic usage data (which features you use, crashes).'], ['Why we use it', 'To run the app, personalise your assistant, send reminders you asked for, and improve the product. With your consent, to send tips, offers and marketing messages.'], ['Sharing', 'We never sell your data. We use trusted providers (hosting, analytics, payments through Apple and Google) who process it only for us.'], ['Who at our company can see it', 'Our support team can see your account details (name, email, phone, job title), your tasks, the contacts you save (name, position, company, phone and email) and your message drafts. We use this to troubleshoot problems, answer your support requests, keep the service secure and meet legal requests. Every time a team member opens your data it is recorded. For product analysis we use your activity with names, phone numbers and emails replaced by codes.'], ['People you add', 'When you save a contact, we store their name, position, phone and email so the app can work for you. They can ask us to remove their details at privacy@theonething.app.'], ['Your choices', 'Turn marketing off any time in Settings. Download or delete your data and account from Settings or at theonething.app/delete — deletion removes everything within 30 days.'], ['Children', 'The One Thing is not intended for children under 13 and we don’t knowingly collect their data.'], ['Health', 'The One Thing is a productivity tool. It is not a medical device and doesn’t diagnose or treat any condition.'], ['Contact', 'privacy@theonething.app']] },
  ar: { si: { title: 'يومك تحت السيطرة.', sub: 'أولوية وحدة. وكل التزام صغير محفوظ. سجّل دخولك وابدأ.', apple: 'المتابعة مع Apple', google: 'المتابعة مع Google',
      terms1: 'أوافق على', termsL: 'شروط الاستخدام', and: 'و', privL: 'سياسة الخصوصية', terms2: '.', mkt: 'أرسلوا لي نصائح وأخبار وعروض.', opt: '(اختياري)',
      err: 'وافق على الشروط وسياسة الخصوصية عشان تكمّل.', note: 'نجمع اسمك ورقمك ومسمّاك الوظيفي وطريقة استخدامك للتطبيق لتشغيله وتحسينه. التسويق فقط إذا وافقت — وتقدر تغيّرها من الإعدادات.', updated: 'آخر تحديث ٩ أكتوبر ٢٠٢٦' },
    su: { q: ['وش تحب نناديك؟', 'وش رقم جوالك؟', 'وش تشتغل؟'], sub: ['اسمك الأول يكفي — كذا بكلمك.', 'اختياري. للتذكير بالواتساب واسترجاع الحساب. ما نشاركه أبداً.', 'يساعدني أقترح متابعات ومسودات تناسبك.'],
      hello: ['أهلاً فيك 👋', 'تشرّفنا يا {n}.', 'قرّبنا يا {n}.'], namePh: 'اسمك الأول', jobPh: 'مثلاً: مؤسس بيت القهوة', jobs: ['مؤسس', 'مستقل', 'مبيعات', 'مدير', 'مستشار', 'طالب'], cont: 'كمّل', done: 'يلّا يا {n}' },
    terms: [['استخدام التطبيق', 'يساعدك التطبيق ترتّب يومك وتكتب رسايلك وتتذكّر متابعاتك. أنت اللي ترسل من تطبيقاتك، وما نرسل شي بدون ما تضغط إرسال.'], ['حسابك', 'تسجّل دخولك عن طريق Apple أو Google. وتقدر تحذف حسابك متى ما تبي من الإعدادات.'], ['الاشتراك', 'يتم الدفع عبر App Store أو Google Play ويتجدد لين تلغيه من إعدادات المتجر.'], ['الاستخدام المقبول', 'لا تستخدم التطبيق للإزعاج أو مخالفة النظام.'], ['التغييرات', 'إذا غيّرنا الشروط بنبلغك داخل التطبيق قبل تطبيقها.']],
    priv: [['وش نجمع', 'اسمك، رقمك، مسمّاك الوظيفي، بريدك من مزوّد الدخول، المهام وجهات الاتصال والملاحظات اللي تضيفها، وبيانات استخدام بسيطة.'], ['ليش نستخدمها', 'لتشغيل التطبيق وتخصيص المساعد وإرسال التذكيرات وتحسين الخدمة. وبموافقتك، لإرسال نصائح وعروض ورسائل تسويقية.'], ['المشاركة', 'ما نبيع بياناتك أبداً. نستخدم مزوّدين موثوقين يعالجونها لنا فقط.'], ['مين يقدر يشوفها عندنا', 'فريق الدعم يقدر يشوف بيانات حسابك (الاسم والإيميل والجوال والمسمى)، ومهامك، وجهات الاتصال اللي تحفظها (الاسم والمنصب والشركة والجوال والإيميل)، ومسودات رسائلك. نستخدمها لحل المشاكل والرد على طلبات الدعم وحماية الخدمة وللطلبات النظامية. وكل مرة يفتح أحد من الفريق بياناتك تنسجّل. ولتحليل المنتج نستخدم نشاطك بعد استبدال الأسماء والأرقام والإيميلات برموز.'], ['الأشخاص اللي تضيفهم', 'لما تحفظ جهة اتصال نخزّن اسمه ومنصبه ورقمه وإيميله عشان يشتغل التطبيق لك. ويقدر يطلب حذف بياناته على privacy@theonething.app.'], ['خياراتك', 'أوقف التسويق متى ما تبي من الإعدادات. حمّل أو احذف بياناتك وحسابك من الإعدادات خلال ٣٠ يوم.'], ['تواصل معنا', 'privacy@theonething.app']] },
};
Object.assign(C.en.unAct, { visit: 'Open in Maps', meeting: 'Join meeting', webinar: 'Join webinar', course: 'Start lesson' });
Object.assign(C.ar.unAct, { visit: 'افتح الخريطة', meeting: 'ادخل الاجتماع', webinar: 'ادخل الويبينار', course: 'ابدأ الدرس' });
const HIST = {
  'Mohammed Al-Saadi': [[4, 'email', 'Sent the price quote', 'أرسلت عرض السعر', '10:20'], [11, 'meeting', 'Met at Qahwa House — wants a bulk order for 3 branches', 'اجتماع في بيت القهوة — يبي طلب كبير لـ٣ فروع', '16:00'], [11, 'note', 'Prefers mornings. Has a son doing exams.', 'يفضّل الصباح. ولده عنده اختبارات.', '16:45'], [24, 'call', 'First call — referred by Faisal', 'أول مكالمة — عن طريق فيصل', '11:05']],
  'Sara Haddad': [[3, 'email', 'Sent deck v2', 'أرسلت العرض النسخة ٢', '09:40'], [17, 'meeting', 'Intro meeting on Zoom', 'اجتماع تعارف على Zoom', '14:00']],
  'Noura Al-Harbi': [[3, 'whatsapp', 'Asked for the logo final files', 'طلبت ملفات الشعار النهائية', '18:10'], [9, 'visit', 'Visited her studio — reviewed 3 logo options', 'زرت الاستوديو — راجعنا ٣ خيارات للشعار', '12:00']],
};
const PFX = {
  en: { l: { edit: 'Edit', remember: 'Remember for next time', rememberPh: 'Tap to add — e.g. prefers WhatsApp, talks prices in SAR', next: 'Coming up', history: 'History', logPh: 'What happened?', add: 'Log', meet: 'Meeting' },
    kinds: [['note', 'Note'], ['call', 'Call'], ['meeting', 'Meeting'], ['visit', 'Visit']], today: 'Today', yest: 'Yesterday', n: '{n} moments', since: 'Since {d}', lastTalk: 'Last talked {d}', open: 'Open task' },
  ar: { l: { edit: 'تعديل', remember: 'تذكّر للمرة الجاية', rememberPh: 'اضغط وأضف — مثلاً يفضّل الواتساب', next: 'الجاي', history: 'السجل', logPh: 'وش صار؟', add: 'سجّل', meet: 'اجتماع' },
    kinds: [['note', 'ملاحظة'], ['call', 'اتصال'], ['meeting', 'اجتماع'], ['visit', 'زيارة']], today: 'اليوم', yest: 'أمس', n: '{n} لحظات', since: 'من {d}', lastTalk: 'آخر تواصل {d}', open: 'مهمة مفتوحة' },
};
const FUX = {
  en: { tabs: ['Nudge', 'Waiting', 'Closed'], sum0: 'All caught up. Nobody’s waiting on you.', sum: '{a} need a nudge · {b} waiting on a reply', due: 'Overdue', wait: 'Waiting', closed: 'Closed', nudge: 'Nudge', remind: 'Remind me', closeL: 'Got a reply', reopen: 'Reopen', nudged: 'Nudged just now', closedNow: 'Closed just now',
    empty: [['Nothing to chase', 'When someone goes quiet, they’ll show up here.'], ['No one to wait on', 'Sent something? I’ll track the reply here.'], ['Nothing closed yet', 'Replies you mark as done land here.']], toastClose: 'Nice — {n} is closed.' },
  ar: { tabs: ['تابع', 'ينتظر', 'تم'], sum0: 'كل شي تمام. ما أحد ينتظرك.', sum: '{a} يحتاجون متابعة · {b} ننتظر ردهم', due: 'متأخر', wait: 'ننتظر', closed: 'تم', nudge: 'تابع', remind: 'ذكّرني', closeL: 'وصل الرد', reopen: 'افتحها', nudged: 'تابعت الحين', closedNow: 'تم الحين',
    empty: [['ما في أحد تتابعه', 'إذا أحد سكت، بيطلع لك هنا.'], ['ما في أحد ننتظره', 'أرسلت شي؟ بتابع الرد هنا.'], ['ما في شي مقفول', 'الردود اللي تقفلها تنحفظ هنا.']], toastClose: 'حلو — تم إقفال {n}.' },
};
const EV_TYPES = ['visit', 'meeting', 'webinar', 'course'];
const EVX = {
  en: { l: { cancel: 'Cancel', save: 'Save', plat: 'Where', link: 'Link', host: 'Host or organiser', hostPh: 'e.g. Monsha’at, HubSpot Academy', loc: 'Location', locPh: 'Address or place name', maps: 'Maps',
      whoL: 'Who', lesson: 'Next lesson', lessonPh: 'e.g. Module 3 · Pricing basics', days: 'Study days', date: 'Day', time: 'Time', dur: 'Length', prog: 'Progress', remind: 'Remind me', notes: 'Notes' },
    head: { visit: 'New visit', meeting: 'New meeting', webinar: 'New webinar', course: 'New course' },
    titleL: { visit: 'What’s the visit for?', meeting: 'Meeting about', webinar: 'Webinar name', course: 'Course name' },
    titlePh: { visit: 'e.g. Tasting at the new branch', meeting: 'e.g. Q4 pricing review', webinar: 'e.g. Growing a café on Instagram', course: 'e.g. Financial modelling for founders' },
    linkPh: { meeting: 'Paste the Zoom / Meet / Teams link', webinar: 'Registration or join link', course: 'Course page link' },
    notesPh: { visit: 'Parking, who to ask for, what to bring…', meeting: 'Agenda, points to cover…', webinar: 'What do you want to learn?', course: 'Why you started, what’s next…' },
    whoHint: { visit: 'Contact person', meeting: 'Tap to add attendees' },
    plats: ['Zoom', 'Google Meet', 'Teams', 'In person'], cplats: ['Udemy', 'Coursera', 'YouTube', 'Other'],
    dates: ['Today', 'Tomorrow', 'This week'], durs: ['15 min', '30 min', '45 min', '1 hr'], rems: ['10 min before', '1 hr before', 'Day before', 'None'],
    wk: ['S', 'M', 'T', 'W', 'T', 'F', 'S'], cta: { visit: 'Save visit', meeting: 'Save meeting', webinar: 'Save webinar', course: 'Save course' }, prog: '{a} of {b} lessons', toast: '{x} saved · I’ll remind you {r}', toastNoR: '{x} saved', addT: 'Add a task', addL: 'Add', addVoice: 'Or just say it' },
  ar: { l: { cancel: 'إلغاء', save: 'حفظ', plat: 'وين', link: 'الرابط', host: 'المنظّم', hostPh: 'مثلاً: منشآت', loc: 'الموقع', locPh: 'العنوان أو اسم المكان', maps: 'الخرائط',
      whoL: 'مع مين', lesson: 'الدرس الجاي', lessonPh: 'مثلاً: الوحدة ٣ · أساسيات التسعير', days: 'أيام الدراسة', date: 'اليوم', time: 'الوقت', dur: 'المدة', prog: 'التقدّم', remind: 'ذكّرني', notes: 'ملاحظات' },
    head: { visit: 'زيارة جديدة', meeting: 'اجتماع جديد', webinar: 'ويبينار جديد', course: 'دورة جديدة' },
    titleL: { visit: 'وش سبب الزيارة؟', meeting: 'الاجتماع عن', webinar: 'اسم الويبينار', course: 'اسم الدورة' },
    titlePh: { visit: 'مثلاً: تذوّق في الفرع الجديد', meeting: 'مثلاً: مراجعة أسعار الربع الرابع', webinar: 'مثلاً: تنمية المقهى على إنستقرام', course: 'مثلاً: النمذجة المالية للمؤسسين' },
    linkPh: { meeting: 'الصق رابط Zoom / Meet / Teams', webinar: 'رابط التسجيل أو الدخول', course: 'رابط صفحة الدورة' },
    notesPh: { visit: 'المواقف، مين تسأل عنه، وش تجيب…', meeting: 'الأجندة والنقاط…', webinar: 'وش تبي تتعلّم؟', course: 'ليش بديت، وش الجاي…' },
    whoHint: { visit: 'الشخص المسؤول', meeting: 'اضغط لإضافة الحضور' },
    plats: ['Zoom', 'Google Meet', 'Teams', 'حضوري'], cplats: ['Udemy', 'Coursera', 'YouTube', 'غيره'],
    dates: ['اليوم', 'بكرة', 'هالأسبوع'], durs: ['15 د', '30 د', '45 د', 'ساعة'], rems: ['قبل 10 د', 'قبل ساعة', 'قبلها بيوم', 'بدون'],
    wk: ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'], cta: { visit: 'احفظ الزيارة', meeting: 'احفظ الاجتماع', webinar: 'احفظ الويبينار', course: 'احفظ الدورة' }, prog: '{a} من {b} دروس', toast: 'انحفظ {x} · بذكّرك {r}', toastNoR: 'انحفظ {x}', addT: 'أضف مهمة', addL: 'أضف', addVoice: 'أو قولها بصوتك' },
};
const SETX = {
  en: { st: { remind: 'Reminders', support: 'Support us', privacy: 'Privacy & data', proT: 'Try Pro free for 7 days', proS: 'Unlimited assistant, client history and smart follow-ups.',
      coffee: 'Buy us a coffee', coffeeS: 'A small tip keeps the app ad-free', restore: 'Restore purchases', manage: 'Manage subscription', tipT: 'Buy us a coffee', tipS: 'Tips are optional, one-time and don’t unlock anything — they just keep us building. Thank you!', tipNote: 'Paid through your App Store or Google Play account.', tipSizes: ['Small', 'Regular', 'Large'], toastTip: 'Thank you so much ☕', toastManage: 'Opening your store subscriptions…', mkt: 'Tips & offers', mktS: 'Occasional emails and messages. Off anytime.', export: 'Download my data',
      del: 'Delete account', ver: 'Version 1.0.0', delT: 'Delete your account?', delS: 'This can’t be undone. We’ll permanently erase:', delList: ['Your profile, name, phone and job title', 'All tasks, follow-ups and notes', 'Contacts and their history'],
      delNote: 'Data is removed within 30 days. A Pro subscription isn’t cancelled automatically — cancel it in App Store or Google Play settings. You can also request deletion at theonething.app/delete.', delCta: 'Delete my account', keep: 'Keep my account', free: 'Free', pro: 'Pro', toastDel: 'Your account was deleted.', toastExp: 'We’ll email your data within 24 hours.', toastOut: 'Signed out.' },
    pw: { k: 'THE ONE THING PRO', title: 'Never drop a promise again{n}.', sub: 'Everything in Free, plus the tools that keep every client warm.', restore: 'Restore',
      feats: [['spark', 'Unlimited smart assistant', 'Free plan: 10 requests a day.'], ['users', 'Client history', 'Every call, message and meeting with a client, by date.'], ['loop', 'Auto follow-ups', 'I nudge you before anyone waits too long.'], ['mic', 'Unlimited brain dumps', 'Talk for a minute — I turn it into tasks.'], ['video', 'Meetings, webinars & courses', 'Links, reminders and notes in one place.'], ['moon', 'Weekly recap', 'What you got done, and who still needs you.']],
      year: 'Yearly', yearSub: '$35.88 billed once a year', month: 'Monthly', monthSub: 'Billed every month', per: '/ month', save: 'Save 40%', cta: 'Start 7-day free trial',
      fineY: 'Free for 7 days, then $35.88/year. Payment is charged to your Apple ID or Google Play account when the trial ends. Renews automatically unless cancelled at least 24 hours before the end of the period. Manage or cancel in your store account settings.', fineM: 'Free for 7 days, then $4.99/month. Payment is charged to your Apple ID or Google Play account when the trial ends. Renews automatically unless cancelled at least 24 hours before the end of the period. Manage or cancel in your store account settings.', toastBuy: 'Welcome to Pro 🎉', toastRestore: 'No previous purchases found.' } },
  ar: { st: { remind: 'التذكيرات', support: 'ادعمنا', privacy: 'الخصوصية والبيانات', proT: 'جرّب Pro مجاناً ٧ أيام', proS: 'مساعد بلا حدود، سجل العملاء، ومتابعات ذكية.',
      coffee: 'اعزمنا على قهوة', coffeeS: 'دعم بسيط يخلّي التطبيق بدون إعلانات', restore: 'استرجاع المشتريات', manage: 'إدارة الاشتراك', tipT: 'اعزمنا على قهوة', tipS: 'الدعم اختياري ولمرة وحدة وما يفتح أي ميزة — بس يساعدنا نكمّل. شكراً لك!', tipNote: 'الدفع عن طريق حسابك في App Store أو Google Play.', tipSizes: ['صغير', 'وسط', 'كبير'], toastTip: 'شكراً من القلب ☕', toastManage: 'نفتح اشتراكاتك في المتجر…', mkt: 'نصائح وعروض', mktS: 'رسائل بين فترة وفترة. تقدر توقفها متى ما تبي.', export: 'حمّل بياناتي',
      del: 'حذف الحساب', ver: 'الإصدار 1.0.0', delT: 'تبي تحذف حسابك؟', delS: 'ما تقدر ترجع عنها. بنحذف نهائياً:', delList: ['ملفك واسمك ورقمك ومسمّاك', 'كل المهام والمتابعات والملاحظات', 'جهات الاتصال وسجلها'],
      delNote: 'تنحذف البيانات خلال ٣٠ يوم. اشتراك Pro ما ينلغي تلقائياً — ألغه من إعدادات App Store أو Google Play.', delCta: 'احذف حسابي', keep: 'خلّي حسابي', free: 'مجاني', pro: 'Pro', toastDel: 'انحذف حسابك.', toastExp: 'بنرسل بياناتك على بريدك خلال ٢٤ ساعة.', toastOut: 'سجّلت خروج.' },
    pw: { k: 'ذا ون ثينق PRO', title: 'لا تنسى أي وعد بعد اليوم{n}.', sub: 'كل اللي في المجاني، وأدوات تخلّي علاقتك مع عملائك دافية.', restore: 'استرجاع',
      feats: [['spark', 'مساعد ذكي بلا حدود', 'الخطة المجانية: ١٠ طلبات يومياً.'], ['users', 'سجل العملاء', 'كل مكالمة ورسالة واجتماع مع العميل، بالتاريخ.'], ['loop', 'متابعات تلقائية', 'أذكّرك قبل ما أحد ينتظر كثير.'], ['mic', 'تفريغ أفكار بلا حدود', 'تكلّم دقيقة — وأحوّلها لمهام.'], ['video', 'اجتماعات وندوات ودورات', 'الروابط والتذكيرات والملاحظات بمكان واحد.'], ['moon', 'ملخص أسبوعي', 'وش أنجزت، ومين لسا يحتاجك.']],
      year: 'سنوي', yearSub: '35.88$ تُدفع مرة بالسنة', month: 'شهري', monthSub: 'يُدفع كل شهر', per: '/ شهر', save: 'وفّر ٤٠٪', cta: 'ابدأ تجربة ٧ أيام مجاناً',
      fineY: 'مجاناً ٧ أيام، بعدها 35.88$ بالسنة. يُخصم المبلغ من حساب Apple أو Google Play بعد انتهاء التجربة، ويتجدد تلقائياً ما لم يُلغَ قبل نهاية الفترة بـ٢٤ ساعة على الأقل. تقدر تديره أو تلغيه من إعدادات حسابك في المتجر.', fineM: 'مجاناً ٧ أيام، بعدها 4.99$ بالشهر. يُخصم المبلغ من حساب Apple أو Google Play بعد انتهاء التجربة، ويتجدد تلقائياً ما لم يُلغَ قبل نهاية الفترة بـ٢٤ ساعة على الأقل. تقدر تديره أو تلغيه من إعدادات حسابك في المتجر.', toastBuy: 'أهلاً فيك في Pro 🎉', toastRestore: 'ما لقينا مشتريات سابقة.' } },
};
const BRAND_IC = {
  apple: React.createElement('svg', { width: 18, height: 18, viewBox: '0 0 24 24', fill: '#fff' }, React.createElement('path', { d: 'M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8 1.6 0 2 .8 3.4.8s2.3-1.3 3.1-2.5c1-1.4 1.4-2.8 1.4-2.9-.1 0-2.7-1-2.7-4.1zM13.9 5c.7-.9 1.2-2 1-3.2-1 0-2.3.7-3 1.6-.7.8-1.2 2-1.1 3.1 1.2.1 2.3-.6 3.1-1.5z' })),
  google: React.createElement('svg', { width: 18, height: 18, viewBox: '0 0 24 24' }, React.createElement('path', { fill: '#4285F4', d: 'M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.7-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.8z' }), React.createElement('path', { fill: '#34A853', d: 'M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9h-4v3.1C3.4 21.4 7.4 24 12 24z' }), React.createElement('path', { fill: '#FBBC05', d: 'M5.4 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.6.4-2.4V6.5h-4C.5 8.2 0 10 0 12s.5 3.8 1.4 5.5l4-3.1z' }), React.createElement('path', { fill: '#EA4335', d: 'M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4C17.9 1.2 15.2 0 12 0 7.4 0 3.4 2.6 1.4 6.5l4 3.1c.9-2.8 3.5-4.8 6.6-4.8z' })),
};
const SCREENS = ['signin', 'setup', 'legal', 'paywall', 'event', 'profile', 'onboard', 'priority', 'home', 'tasks', 'people', 'contact', 'settings', 'focus', 'stuck', 'capture', 'dump', 'compose', 'followups', 'chat', 'review'];
const NAV_LABEL = { profile: 'Contact profile', event: 'New meeting / visit', paywall: 'Go Pro (paywall)', signin: 'Sign in', setup: 'Account setup', legal: 'Terms & privacy', contact: 'New contact', tasks: 'All tasks', people: 'People (contacts)', settings: 'Profile & settings', stuck: 'Overwhelm mode', dump: 'Brain dump', onboard: 'Onboarding', priority: 'Morning priority', home: 'Today', focus: 'Lock In', capture: 'Quick capture', compose: 'Compose & send', followups: 'Follow-ups', chat: 'Assistant chat', review: 'Daily review' };


export { C, P, TYPE_COL, TYPE_ICON, CCS, ACC, SETX, EVX, EV_TYPES, FUX, PFX, HIST, CONTACTS, TASKS, FUS, ONE_SUGG, SUG_ORDER, SCREENS, NAV_LABEL };
