/**
 * All user-facing copy, English and Arabic. Edit it here.
 *
 * This was generated from the design handoff until October 2026. It is a
 * normal source file now: the handoff describes a prototype the app has
 * outgrown, and some of this text — the privacy policy above all — has to
 * be true about what the app actually does, which nothing should be able to
 * revert from a stale source (BUILD-REVIEW § 2.57).
 *
 * `scripts/port-content.js` still ports the handoff's icon paths, country
 * list and seed data, which really are the designer's and which nobody edits.
 *
 * Arabic must have exactly the same keys as English: each `_ar` block is
 * declared `typeof` its `_en` block, so a missing translation is a compile
 * error rather than a blank screen. Keep that shape.
 */

/** The two languages the app ships in. */
export type Lang = 'en' | 'ar';

/** Main screen copy. */
const C_en = {
  "ob1_k": "THE ONE THING",
  "ob1_t": "Your day, under control.",
  "ob1_s": "One thing that matters. Every small promise kept — calls, messages, follow-ups.",
  "ob2_t": "How should I nudge you?",
  "ob2_s": "Gentle by default. Change it any time.",
  "nudges": [
    [
      "gentle",
      "Gentle",
      "A soft tap, once. Snooze anytime."
    ],
    [
      "firm",
      "Firm",
      "I come back until it’s handled."
    ],
    [
      "quiet",
      "Quiet",
      "Badge only. No sound."
    ]
  ],
  "ob3_t": "Where do your promises live?",
  "ob3_s": "I write the draft. You send it from the app you already use.",
  "chans": [
    [
      "whatsapp",
      "WhatsApp"
    ],
    [
      "email",
      "Mail"
    ],
    [
      "call",
      "Phone calls"
    ]
  ],
  "cont": "Continue",
  "start": "Let’s start",
  "skip": "Skip",
  "pr_k": "GOOD MORNING, KHALID",
  "pr_q": "If you finish one thing today, which one makes it a good day?",
  "pr_ph": "Type it, or pick one below",
  "pr_sugg": "From your week",
  "pr_len": "Focus session",
  "min": "min",
  "pr_cta": "Make it my One Thing",
  "pr_note": "Everything else is safe. I’ll remind you when it’s time.",
  "date": "Thursday, 9 October",
  "h_k": "YOUR ONE THING TODAY",
  "lockin": "Lock In",
  "doneToday": "Done today",
  "focusMeta": "Focus session · {n} min",
  "next": "Small promises",
  "nextNote": "They won’t compete with your One Thing.",
  "waiting": "Waiting on others",
  "waitingSub": "{n} people owe you a reply",
  "review": "Close the day",
  "reviewSub": "Takes a minute",
  "chatPh": "Tell me anything",
  "types": {
    "call": "Call",
    "email": "Email",
    "whatsapp": "WhatsApp",
    "reminder": "Reminder",
    "visit": "Visit",
    "meeting": "Meeting",
    "webinar": "Webinar",
    "course": "Course"
  },
  "f_k": "LOCKED IN",
  "pause": "Pause",
  "resume": "Resume",
  "finish": "I’m done",
  "f_cap": "Remembered something? Park it.",
  "f_safe": "{n} promises are safe until later",
  "f_left": "remaining",
  "cap_t": "Say it. Forget it.",
  "cap_s": "Tap and talk. I’ll catch who, what and when.",
  "listening": "Listening…",
  "tapStop": "Tap to stop",
  "cap_sample": "Remind me tomorrow at 10 to send Mohammed the price quote and follow up.",
  "what": "What",
  "who": "Who",
  "when": "When",
  "via": "Via",
  "save": "Save & back to focus",
  "orType": "or type it",
  "heard": "I heard",
  "c_to": "To",
  "c_goal": "Goal",
  "c_points": "Points to cover",
  "c_draft": "Draft",
  "openWa": "Open in WhatsApp",
  "openMail": "Open in Mail",
  "callNow": "Call now",
  "copy": "Copy",
  "afterQ": "Did you send it? If yes, when should I follow up?",
  "fuOpts": [
    "Tomorrow",
    "In 2 days",
    "Next week",
    "No need"
  ],
  "fu_t": "Follow-ups",
  "fu_s": "Who owes you a reply — and who you owe.",
  "st": {
    "waiting": "Waiting for reply",
    "due": "Needs a nudge",
    "done": "Closed"
  },
  "nudgeBtn": "Nudge",
  "closeBtn": "Mark closed",
  "now": "now",
  "nDone": "Done",
  "nSnooze": "Snooze 10 min",
  "nLater": "Reschedule",
  "rv_k": "EVENING REVIEW",
  "rv_t": "How did today go?",
  "rv_one": "Your One Thing",
  "yes": "Done",
  "notYet": "Not yet",
  "rv_list": "Promises",
  "tomorrow": "Tomorrow",
  "kept": "Kept",
  "rv_close": "Close the day",
  "rv_end": "Rest well.",
  "rv_end2": "Tomorrow starts with one thing.",
  "rv_sum": "{a} of {b} promises kept",
  "asst": "Assistant",
  "ok": "Looks right",
  "edit": "Edit",
  "openFu": "Open follow-ups",
  "toastSaved": "Saved. Back to your One Thing.",
  "toastHand": "Draft copied — opening {app}…",
  "toastFu": "Follow-up set · {w}",
  "toastSnooze": "Snoozed 10 min",
  "toastDone": "Nice. One less thing.",
  "toastNudge": "Draft ready for {who}",
  "bot0": "Morning Khalid. Your One Thing is set. Anything rattling around your head? Dump it here — I’ll sort it.",
  "chips": [
    "Remind me tomorrow at 10 to send Mohammed the price quote",
    "Arrange my day",
    "Who am I waiting on?"
  ],
  "botTask": "Got it. Here’s what I caught:",
  "botSaved": "Saved. I’ll tap you gently at {t}.",
  "botPlan": "Here’s a calm order for today. Your One Thing goes first, while your head is fresh.",
  "botFu": "Three threads are open. Noura is the oldest — 3 days.",
  "today": "Today",
  "tmw": "Tomorrow",
  "r_t": "When works better?",
  "r_s": "No guilt. I’ll bring it back then.",
  "toastMoved": "Moved to {w}. I’ll remind you then.",
  "resched": "Reschedule",
  "rOpts": [
    [
      "After my focus session",
      "10:30",
      "10:30"
    ],
    [
      "In 1 hour",
      "12:00",
      "12:00"
    ],
    [
      "This evening",
      "18:00",
      "18:00"
    ],
    [
      "Tomorrow morning",
      "09:00",
      "Tmw 09:00"
    ],
    [
      "Monday",
      "10:00",
      "Mon 10:00"
    ]
  ],
  "d_k": "BRAIN DUMP",
  "d_t": "Empty your head.",
  "d_s": "Type or talk it all out, messy is fine. I’ll split it into separate things.",
  "d_ph": "call the lawyer, email Sara the deck, buy ink…",
  "d_fill": "Talk instead",
  "d_sort": "Sort it for me",
  "d_found": "I found {n} things",
  "d_hint": "Tap to drop anything that doesn’t matter.",
  "d_save": "Save {n} and clear my head",
  "d_edit": "Edit",
  "toastDump": "{n} things saved. Head’s clearer now.",
  "d_sample": "Call the lawyer about the contract tomorrow at 11, email Sara the deck, buy printer ink, reply to Noura about the logo, book the dentist, pay the supplier invoice by 5",
  "dumpCard": "Head full?",
  "dumpCardSub": "Brain dump — I’ll sort it",
  "s_k": "TOO MUCH? LET’S SHRINK IT",
  "s_t": "Just the next tiny step.",
  "s_step": "Step {a} of {b}",
  "s_mins": "About 2 minutes",
  "s_tinyPre": "Only this, for 2 minutes: ",
  "s_sprint": "Start a 5-min sprint",
  "s_next": "Done — next step",
  "s_smaller": "Still too big",
  "s_bigger": "Show the normal step",
  "s_hold": "Everything else can wait. I’m holding it.",
  "s_all": "All steps done. That was the hard part.",
  "stuck": "I’m stuck",
  "stuckLink": "Feeling stuck? Shrink it",
  "ev_k": "EVENING",
  "ev_t": "Ready to close your day?",
  "empty_t": "Nothing here yet",
  "empty_s": "Tell me what’s on your mind — calls, messages, anything. I’ll sort it.",
  "empty_cta": "Empty your head",
  "f_tap": "Tap anywhere for controls",
  "swipeHint": "Swipe → done · ← later",
  "nowL": "Now",
  "relIn": "in {m}",
  "more": "{n} more later today",
  "less": "Show less",
  "holdHint": "Tap the mic for one thing · hold it to empty your head",
  "undo": "Undo",
  "sugK": "A thought",
  "notNow": "Not now",
  "sug": {
    "fresh": [
      "Fresh start. 2 things slipped yesterday — no big deal. Bring them in quietly?",
      "Bring them"
    ],
    "overload": [
      "Today has about 5h of work in 3h of free time. Move “Pay the packaging supplier” to tomorrow morning?",
      "Move it"
    ],
    "plan": [
      "I lined up your day: focus first, then Mohammed at 10:00, the lawyer at 11:00, Sara at 15:00. 15-min breaks in between.",
      "Use this plan"
    ],
    "fu": [
      "Your email to Sara mentions a call next week. Follow up Tuesday if she doesn’t reply?",
      "Yes, remind me"
    ]
  },
  "sugToast": {
    "fresh": "2 things added. Clean slate.",
    "overload": "Moved. Today feels lighter.",
    "plan": "Day arranged. I’ll nudge you as you go.",
    "fu": "Follow-up set for Tuesday."
  },
  "fresh": [
    [
      "Reply to the landlord",
      "reminder"
    ],
    [
      "Order business cards",
      "reminder"
    ]
  ],
  "set_t": "Settings",
  "set_name": "Khalid Al-Mansouri",
  "set_role": "Founder · Qahwa House",
  "set_rem": "Reminder style",
  "set_ch": "Channels",
  "set_focus": "Default focus session",
  "set_lang": "Language",
  "set_quiet": "Quiet hours",
  "set_quietV": "22:00 – 08:00",
  "set_plan": "Plan",
  "set_planV": "Free",
  "set_up": "Try Founder Pro",
  "set_out": "Sign out",
  "c_phone": "WhatsApp number",
  "c_phonePh": "+966 5X XXX XXXX",
  "c_phoneAsk": "Add their number once — I’ll remember it.",
  "c_phoneErr": "Looks short — check the number.",
  "c_emailPh": "name@company.com",
  "c_emailAsk": "Add their email once — I’ll remember it.",
  "c_emailErr": "Check the email address.",
  "c_subject": "Subject",
  "savedNext": "Saved for next time",
  "sendWa": "Send on WhatsApp",
  "sendEmail": "Send email",
  "openMailApp": "Open in Mail app instead",
  "toastSentTo": "Sent to {to}",
  "toastWa": "Opening WhatsApp with {to}…",
  "r_time": "Time",
  "r_move": "Move to {d} · {t}",
  "wk": [
    "Sun",
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat"
  ],
  "months": [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
  ],
  "rQuick": [
    [
      "After focus",
      0,
      "10:30"
    ],
    [
      "In 1 hour",
      0,
      "12:00"
    ],
    [
      "Tonight",
      0,
      "18:00"
    ],
    [
      "Tomorrow 9am",
      1,
      "09:00"
    ],
    [
      "Monday",
      4,
      "10:00"
    ]
  ],
  "q_x": {
    "visit": "Visit",
    "meeting": "Meeting",
    "webinar": "Webinar",
    "course": "Course"
  },
  "tk_t": "Tasks",
  "tk_prog": "{a} of {b} done today",
  "upNext": "UP NEXT",
  "nowW": "now",
  "unCall": "Call {n}",
  "unAct": {
    "whatsapp": "Open WhatsApp draft",
    "email": "Open email draft",
    "reminder": "Open",
    "call": "Call",
    "visit": "Open in Maps",
    "meeting": "Join meeting",
    "webinar": "Join webinar",
    "course": "Start lesson"
  },
  "slipped": "Slipped",
  "moveTmw": "Move to tomorrow",
  "toastMovedN": "{n} moved to tomorrow. Fresh start.",
  "pMorning": "This morning",
  "pAfternoon": "This afternoon",
  "pEvening": "This evening",
  "doneToday2": "Done today",
  "show": "Show",
  "hide": "Hide",
  "noRemB": "{n} without a reminder ·",
  "remTiny": {
    "10": "−10m",
    "30": "−30m",
    "60": "−1h",
    "at": "on time",
    "morning": "8:00"
  },
  "remTinyC": "custom",
  "newC": "New",
  "newCT": "New contact",
  "editC": "Edit contact",
  "cancel": "Cancel",
  "saveC": "Save",
  "f_name": "Name",
  "f_namePh": "e.g. Ahmed Al-Rashid",
  "f_nameErr": "Add a name so you can find them later.",
  "f_role": "Company or role",
  "f_rolePh": "e.g. Supplier · Qahwa Beans",
  "c_email": "Email",
  "f_pref": "Usually reach them by",
  "f_notes": "Notes for next time",
  "f_notesPh": "e.g. Prefers mornings. Talk prices in SAR. Ask about his son’s exams.",
  "saveTask": "Save & start a {ch}",
  "toastC": "{n} saved to People",
  "tk_sum": "{a} to do · {b} done",
  "later": "Later",
  "all": "All",
  "fl": {
    "call": "Calls",
    "email": "Emails",
    "whatsapp": "WhatsApp",
    "reminder": "Reminders"
  },
  "doneF": "Done",
  "remAll": "Add reminders to these",
  "toastRemAll": "Added reminders to {n} tasks · your existing ones weren’t touched",
  "addRem": "Add",
  "remShort": {
    "10": "10m before",
    "30": "30m before",
    "60": "1h before",
    "at": "On time",
    "morning": "08:00"
  },
  "rem_t": "Remind me",
  "remOpts": [
    [
      "at",
      "At the time"
    ],
    [
      "10",
      "10 minutes before"
    ],
    [
      "30",
      "30 minutes before"
    ],
    [
      "60",
      "1 hour before"
    ],
    [
      "morning",
      "Morning of · 08:00"
    ]
  ],
  "remNone": "No reminder",
  "remCustom": "Pick a date & time",
  "toastRem": "Reminder · {w}",
  "seeAll": "See all {n} tasks",
  "r_remT": "When should I remind you?",
  "r_remApply": "Remind me {d} · {t}",
  "tk_empty": "Nothing here. Enjoy the space.",
  "q_k": "QUICK ACTIONS",
  "q_rem": "Remind",
  "q_who": {
    "call": "Call who?",
    "email": "Email who?",
    "whatsapp": "WhatsApp who?"
  },
  "q_new": "Someone new",
  "q_noEmail": "No email yet — add it next",
  "q_noPhone": "No number yet — add it next",
  "newPerson": "New contact",
  "tabs": [
    "Today",
    "Tasks",
    "Follow-ups",
    "People"
  ],
  "pp_t": "People",
  "pp_s": "Everyone you’ve emailed, called or messaged.",
  "pp_ph": "Search name, email or number",
  "pp_recent": "RECENT",
  "pp_res": "{n} RESULTS",
  "pp_none": "No one matches “{q}”",
  "sugRecent": "Sent before",
  "sugMatch": "Matches",
  "newMsg": {
    "whatsapp": "Message {n}",
    "email": "Email {n}",
    "call": "Call {n}"
  },
  "justNow": "Just now"
};

const C_ar: typeof C_en = {
  "ob1_k": "ذا ون ثينق",
  "ob1_t": "يومك تحت السيطرة.",
  "ob1_s": "شي واحد مهم. وكل التزاماتك الصغيرة محفوظة — مكالمات، رسايل، ومتابعات.",
  "ob2_t": "كيف تبيني أذكّرك؟",
  "ob2_s": "بهدوء افتراضياً، وتقدر تغيّرها متى ما تبي.",
  "nudges": [
    [
      "gentle",
      "بهدوء",
      "تنبيه خفيف مرة وحدة، وتقدر تأجّله."
    ],
    [
      "firm",
      "بحزم",
      "أرجع لك لين تخلّصه."
    ],
    [
      "quiet",
      "صامت",
      "علامة بس، بدون صوت."
    ]
  ],
  "ob3_t": "وين تتواصل مع الناس؟",
  "ob3_s": "أنا أكتب المسودة، وأنت ترسلها من التطبيق اللي تستخدمه.",
  "chans": [
    [
      "whatsapp",
      "واتساب"
    ],
    [
      "email",
      "البريد"
    ],
    [
      "call",
      "المكالمات"
    ]
  ],
  "cont": "كمّل",
  "start": "يلّا نبدأ",
  "skip": "تخطّي",
  "pr_k": "صباح الخير يا خالد",
  "pr_q": "لو خلّصت شي واحد بس اليوم، وش اللي بيخلّي يومك ناجح؟",
  "pr_ph": "اكتبه، أو اختر من تحت",
  "pr_sugg": "من أسبوعك",
  "pr_len": "جلسة التركيز",
  "min": "دقيقة",
  "pr_cta": "خلّه شغلي الأساسي اليوم",
  "pr_note": "كل الباقي محفوظ، وبذكّرك فيه بوقته.",
  "date": "الخميس، ٩ أكتوبر",
  "h_k": "شغلك الأساسي اليوم",
  "lockin": "ابدأ التركيز",
  "doneToday": "خلّصته اليوم",
  "focusMeta": "جلسة تركيز · {n} دقيقة",
  "next": "التزاماتك الصغيرة",
  "nextNote": "ما راح تزاحم شغلك الأساسي.",
  "waiting": "تنتظر رد",
  "waitingSub": "{n} أشخاص عليهم رد لك",
  "review": "سكّر يومك",
  "reviewSub": "ياخذ دقيقة",
  "chatPh": "قول لي أي شي",
  "types": {
    "call": "اتصال",
    "email": "إيميل",
    "whatsapp": "واتساب",
    "reminder": "تذكير",
    "visit": "زيارة",
    "meeting": "اجتماع",
    "webinar": "ويبينار",
    "course": "دورة"
  },
  "f_k": "في وضع التركيز",
  "pause": "وقّف",
  "resume": "كمّل",
  "finish": "خلّصت",
  "f_cap": "تذكّرت شي؟ سجّله وارجع.",
  "f_safe": "{n} التزامات محفوظة لبعدين",
  "f_left": "باقي",
  "cap_t": "قلها وانساها.",
  "cap_s": "اضغط وتكلّم، وأنا ألقط مين ووش ومتى.",
  "listening": "أسمعك…",
  "tapStop": "اضغط للإيقاف",
  "cap_sample": "ذكّرني بكرة الساعة 10 أرسل لمحمد عرض السعر وأتابع معه.",
  "what": "وش",
  "who": "مين",
  "when": "متى",
  "via": "عن طريق",
  "save": "احفظ وارجع لشغلك",
  "orType": "أو اكتبها",
  "heard": "سمعتك تقول",
  "c_to": "إلى",
  "c_goal": "الهدف",
  "c_points": "النقاط",
  "c_draft": "المسودة",
  "openWa": "افتح في واتساب",
  "openMail": "افتح في البريد",
  "callNow": "اتصل الحين",
  "copy": "انسخ",
  "afterQ": "أرسلتها؟ أتابع معك بعدين؟",
  "fuOpts": [
    "بكرة",
    "بعد يومين",
    "الأسبوع الجاي",
    "ما يحتاج"
  ],
  "fu_t": "المتابعات",
  "fu_s": "مين عليه رد لك — ومين لازم ترد عليه.",
  "st": {
    "waiting": "ينتظر الرد",
    "due": "يحتاج متابعة",
    "done": "تم"
  },
  "nudgeBtn": "تابع",
  "closeBtn": "سكّرها",
  "now": "الحين",
  "nDone": "تم",
  "nSnooze": "أجّل 10 د",
  "nLater": "غيّر الموعد",
  "rv_k": "مراجعة المسا",
  "rv_t": "كيف كان يومك؟",
  "rv_one": "شغلك الأساسي",
  "yes": "خلّصته",
  "notYet": "لسّا",
  "rv_list": "الالتزامات",
  "tomorrow": "لبكرة",
  "kept": "تم",
  "rv_close": "سكّر اليوم",
  "rv_end": "ارتاح.",
  "rv_end2": "بكرة نبدأ بشي واحد.",
  "rv_sum": "{a} من {b} التزامات تمّت",
  "asst": "المساعد",
  "ok": "تمام",
  "edit": "عدّل",
  "openFu": "افتح المتابعات",
  "toastSaved": "انحفظت. ارجع لشغلك الأساسي.",
  "toastHand": "نسخت المسودة — نفتح {app}…",
  "toastFu": "حطّيت متابعة · {w}",
  "toastSnooze": "أجّلته 10 دقايق",
  "toastDone": "حلو. شي أقل في بالك.",
  "toastNudge": "المسودة جاهزة لـ{who}",
  "bot0": "صباح الخير يا خالد. شغلك الأساسي جاهز. في شي شاغل بالك؟ قوله هنا وأنا أرتّبه.",
  "chips": [
    "ذكّرني بكرة الساعة 10 أرسل لمحمد عرض السعر",
    "رتّب لي يومي",
    "مين أنتظر منه رد؟"
  ],
  "botTask": "وصلت. هذا اللي فهمته:",
  "botSaved": "انحفظت. بذكّرك بهدوء الساعة {t}.",
  "botPlan": "هذا ترتيب هادي ليومك. شغلك الأساسي أول، وراسك صافي.",
  "botFu": "عندك ثلاث متابعات مفتوحة. نورة أقدمها — من 3 أيام.",
  "today": "اليوم",
  "tmw": "بكرة",
  "r_t": "متى يناسبك أكثر؟",
  "r_s": "عادي، بذكّرك فيه بوقته الجديد.",
  "toastMoved": "نقلته لـ{w}. بذكّرك وقتها.",
  "resched": "غيّر الموعد",
  "rOpts": [
    [
      "بعد جلسة التركيز",
      "10:30",
      "10:30"
    ],
    [
      "بعد ساعة",
      "12:00",
      "12:00"
    ],
    [
      "الليلة",
      "18:00",
      "18:00"
    ],
    [
      "بكرة الصبح",
      "09:00",
      "بكرة 09:00"
    ],
    [
      "يوم الإثنين",
      "10:00",
      "الإثنين 10:00"
    ]
  ],
  "d_k": "فضفضة",
  "d_t": "فضّي راسك.",
  "d_s": "اكتب أو تكلّم بكل اللي في بالك، حتى لو مخربط. أنا أقسّمه لأشياء منفصلة.",
  "d_ph": "أتصل بالمحامي، أرسل العرض لسارة، أشتري حبر…",
  "d_fill": "تكلّم بدال",
  "d_sort": "رتّبها لي",
  "d_found": "لقيت {n} أشياء",
  "d_hint": "اضغط على أي شي ما يهم عشان تشيله.",
  "d_save": "احفظ {n} وريّح راسك",
  "d_edit": "عدّل",
  "toastDump": "حفظت {n} أشياء. راسك أخف الحين.",
  "d_sample": "أتصل بالمحامي بخصوص العقد بكرة الساعة 11، أرسل لسارة العرض بالإيميل، أشتري حبر للطابعة، أرد على نورة بخصوص الشعار، أحجز موعد الأسنان، أدفع فاتورة المورّد قبل الساعة 5",
  "dumpCard": "راسك مليان؟",
  "dumpCardSub": "فضفض — وأنا أرتّبه",
  "s_k": "كثير عليك؟ نصغّرها",
  "s_t": "بس الخطوة الصغيرة الجاية.",
  "s_step": "خطوة {a} من {b}",
  "s_mins": "تقريباً دقيقتين",
  "s_tinyPre": "بس هذي، لمدة دقيقتين: ",
  "s_sprint": "ابدأ 5 دقايق بس",
  "s_next": "خلّصتها — اللي بعدها",
  "s_smaller": "لسّا كبيرة",
  "s_bigger": "رجّع الخطوة العادية",
  "s_hold": "كل الباقي يقدر ينتظر. أنا ماسكه لك.",
  "s_all": "خلّصت كل الخطوات. هذا كان الجزء الصعب.",
  "stuck": "معلّق",
  "stuckLink": "حاس إنك معلّق؟ صغّرها",
  "ev_k": "المسا",
  "ev_t": "جاهز تسكّر يومك؟",
  "empty_t": "ما فيه شي للحين",
  "empty_s": "قول لي وش في بالك — مكالمات، رسايل، أي شي. وأنا أرتّبه.",
  "empty_cta": "فضّي راسك",
  "f_tap": "اضغط بأي مكان عشان تطلع الأزرار",
  "swipeHint": "اسحب ← تم · → بعدين",
  "nowL": "الحين",
  "relIn": "بعد {m}",
  "more": "{n} أشياء ثانية اليوم",
  "less": "أقل",
  "holdHint": "اضغط المايك لشي واحد · اضغط مطوّل وفضفض كل اللي في بالك",
  "undo": "تراجع",
  "sugK": "فكرة",
  "notNow": "مو الحين",
  "sug": {
    "fresh": [
      "بداية جديدة. فيه شيئين ما تمّوا أمس — عادي. أضيفهم بهدوء؟",
      "أضفهم"
    ],
    "overload": [
      "اليوم فيه تقريباً 5 ساعات شغل و3 ساعات فاضية بس. أنقل «أدفع لمورّد التغليف» لبكرة الصبح؟",
      "انقله"
    ],
    "plan": [
      "رتّبت يومك: التركيز أول، بعدين محمد الساعة 10، المحامي 11، وسارة 3 العصر. مع استراحة ربع ساعة بينهم.",
      "اعتمد الترتيب"
    ],
    "fu": [
      "إيميلك لسارة فيه مكالمة الأسبوع الجاي. أذكّرك تتابع معها الثلاثاء لو ما ردّت؟",
      "أيوه، ذكّرني"
    ]
  },
  "sugToast": {
    "fresh": "أضفتهم. صفحة جديدة.",
    "overload": "نقلته. يومك أخف الحين.",
    "plan": "رتّبت يومك. بذكّرك وأنت ماشي.",
    "fu": "حطّيت متابعة يوم الثلاثاء."
  },
  "fresh": [
    [
      "أرد على المؤجر",
      "reminder"
    ],
    [
      "أطلب كروت شغل",
      "reminder"
    ]
  ],
  "set_t": "الإعدادات",
  "set_name": "خالد المنصوري",
  "set_role": "مؤسس · بيت القهوة",
  "set_rem": "طريقة التذكير",
  "set_ch": "القنوات",
  "set_focus": "مدة التركيز الافتراضية",
  "set_lang": "اللغة",
  "set_quiet": "وقت الهدوء",
  "set_quietV": "22:00 – 08:00",
  "set_plan": "الباقة",
  "set_planV": "مجانية",
  "set_up": "جرّب Founder Pro",
  "set_out": "تسجيل خروج",
  "c_phone": "رقم الواتساب",
  "c_phonePh": "+966 5X XXX XXXX",
  "c_phoneAsk": "أضف رقمه مرة وحدة، وأنا أحفظه.",
  "c_phoneErr": "الرقم ناقص — تأكد منه.",
  "c_emailPh": "name@company.com",
  "c_emailAsk": "أضف إيميله مرة وحدة، وأنا أحفظه.",
  "c_emailErr": "تأكد من الإيميل.",
  "c_subject": "الموضوع",
  "savedNext": "انحفظ للمرة الجاية",
  "sendWa": "أرسل على واتساب",
  "sendEmail": "أرسل الإيميل",
  "openMailApp": "أو افتحه في تطبيق البريد",
  "toastSentTo": "انرسل إلى {to}",
  "toastWa": "نفتح واتساب مع {to}…",
  "r_time": "الوقت",
  "r_move": "انقله لـ{d} · {t}",
  "wk": [
    "أحد",
    "إثنين",
    "ثلاثاء",
    "أربعاء",
    "خميس",
    "جمعة",
    "سبت"
  ],
  "months": [
    "يناير",
    "فبراير",
    "مارس",
    "أبريل",
    "مايو",
    "يونيو",
    "يوليو",
    "أغسطس",
    "سبتمبر",
    "أكتوبر",
    "نوفمبر",
    "ديسمبر"
  ],
  "rQuick": [
    [
      "بعد التركيز",
      0,
      "10:30"
    ],
    [
      "بعد ساعة",
      0,
      "12:00"
    ],
    [
      "الليلة",
      0,
      "18:00"
    ],
    [
      "بكرة 9 الصبح",
      1,
      "09:00"
    ],
    [
      "الإثنين",
      4,
      "10:00"
    ]
  ],
  "q_x": {
    "visit": "زيارة",
    "meeting": "اجتماع",
    "webinar": "ويبينار",
    "course": "دورة"
  },
  "tk_t": "المهام",
  "tk_prog": "{a} من {b} تمّت اليوم",
  "upNext": "الجاي",
  "nowW": "الحين",
  "unCall": "اتصل بـ{n}",
  "unAct": {
    "whatsapp": "افتح مسودة الواتساب",
    "email": "افتح مسودة الإيميل",
    "reminder": "افتح",
    "call": "اتصل",
    "visit": "افتح الخريطة",
    "meeting": "ادخل الاجتماع",
    "webinar": "ادخل الويبينار",
    "course": "ابدأ الدرس"
  },
  "slipped": "فاتت",
  "moveTmw": "انقلها لبكرة",
  "toastMovedN": "نقلت {n} لبكرة. بداية جديدة.",
  "pMorning": "الصبح",
  "pAfternoon": "الظهر والعصر",
  "pEvening": "المسا",
  "doneToday2": "تمّت اليوم",
  "show": "عرض",
  "hide": "إخفاء",
  "noRemB": "{n} بدون تذكير ·",
  "remTiny": {
    "10": "−10د",
    "30": "−30د",
    "60": "−1س",
    "at": "بوقتها",
    "morning": "8:00"
  },
  "remTinyC": "مخصص",
  "newC": "جديد",
  "newCT": "شخص جديد",
  "editC": "تعديل",
  "cancel": "إلغاء",
  "saveC": "حفظ",
  "f_name": "الاسم",
  "f_namePh": "مثلاً: أحمد الراشد",
  "f_nameErr": "اكتب الاسم عشان تلقاه بعدين.",
  "f_role": "الشركة أو الدور",
  "f_rolePh": "مثلاً: مورّد · قهوة بينز",
  "c_email": "الإيميل",
  "f_pref": "عادةً تتواصل معه عن طريق",
  "f_notes": "ملاحظات للمرة الجاية",
  "f_notesPh": "مثلاً: يفضّل الصبح. الأسعار بالريال. اسأله عن اختبارات ولده.",
  "saveTask": "احفظ وابدأ {ch}",
  "toastC": "انحفظ {n} في الأشخاص",
  "tk_sum": "{a} باقية · {b} تمّت",
  "later": "بعدين",
  "all": "الكل",
  "fl": {
    "call": "مكالمات",
    "email": "إيميلات",
    "whatsapp": "واتساب",
    "reminder": "تذكيرات"
  },
  "doneF": "تمّت",
  "remAll": "ذكّرني فيها كلها بوقتها",
  "toastRemAll": "حطّيت تذكير لـ{n} مهام",
  "addRem": "أضف",
  "remShort": {
    "10": "قبل 10د",
    "30": "قبل 30د",
    "60": "قبل ساعة",
    "at": "بوقتها",
    "morning": "08:00"
  },
  "rem_t": "ذكّرني",
  "remOpts": [
    [
      "at",
      "بنفس الوقت"
    ],
    [
      "10",
      "قبل 10 دقايق"
    ],
    [
      "30",
      "قبل نص ساعة"
    ],
    [
      "60",
      "قبل ساعة"
    ],
    [
      "morning",
      "الصبح · 08:00"
    ]
  ],
  "remNone": "بدون تذكير",
  "remCustom": "اختر يوم ووقت",
  "toastRem": "تذكير · {w}",
  "seeAll": "شوف كل المهام ({n})",
  "r_remT": "متى أذكّرك؟",
  "r_remApply": "ذكّرني {d} · {t}",
  "tk_empty": "ما فيه شي هنا. استمتع بالهدوء.",
  "q_k": "إجراءات سريعة",
  "q_rem": "ذكّرني",
  "q_who": {
    "call": "تتصل بمين؟",
    "email": "ترسل إيميل لمين؟",
    "whatsapp": "ترسل واتساب لمين؟"
  },
  "q_new": "شخص جديد",
  "q_noEmail": "ما عنده إيميل — أضفه بالخطوة الجاية",
  "q_noPhone": "ما عنده رقم — أضفه بالخطوة الجاية",
  "newPerson": "شخص جديد",
  "tabs": [
    "اليوم",
    "المهام",
    "المتابعات",
    "الأشخاص"
  ],
  "pp_t": "الأشخاص",
  "pp_s": "كل اللي راسلتهم أو كلمتهم قبل.",
  "pp_ph": "دوّر بالاسم أو الإيميل أو الرقم",
  "pp_recent": "الأخيرين",
  "pp_res": "{n} نتائج",
  "pp_none": "ما لقيت أحد يطابق «{q}»",
  "sugRecent": "أرسلت لهم قبل",
  "sugMatch": "نتائج",
  "newMsg": {
    "whatsapp": "رسالة لـ{n}",
    "email": "إيميل لـ{n}",
    "call": "اتصال بـ{n}"
  },
  "justNow": "الحين"
};

export const C = { en: C_en, ar: C_ar };

/** Account, legal and paywall copy. */
const ACC_en = {
  "si": {
    "title": "Your day, under control.",
    "sub": "One priority. Every small promise kept. Sign in to start.",
    "apple": "Continue with Apple",
    "google": "Continue with Google",
    "terms1": "I agree to the",
    "termsL": "Terms of Service",
    "and": "and",
    "privL": "Privacy Policy",
    "terms2": ".",
    "mkt": "Send me tips, product news and offers.",
    "opt": "(optional)",
    "err": "Please accept the Terms and Privacy Policy to continue.",
    "note": "We collect your name, phone, job title and how you use the app to run it and improve it. Marketing only if you opt in — change anytime in Settings.",
    "updated": "Last updated 15 October 2026",
    "fail": "We couldn’t sign you in. Please try again."
  },
  "su": {
    "q": [
      "What should we call you?",
      "What’s your phone number?",
      "What do you do?"
    ],
    "sub": [
      "Just your first name is perfect — it’s how I’ll talk to you.",
      "Optional. Used for WhatsApp reminders and account recovery. Never shared.",
      "Helps me suggest the right follow-ups and drafts."
    ],
    "hello": [
      "Welcome 👋",
      "Nice to meet you, {n}.",
      "Almost done, {n}."
    ],
    "namePh": "Your first name",
    "jobPh": "e.g. Founder at Qahwa House",
    "jobs": [
      "Founder",
      "Freelancer",
      "Sales",
      "Manager",
      "Consultant",
      "Student"
    ],
    "cont": "Continue",
    "done": "Let’s go, {n}"
  },
  "terms": [
    [
      "Who you are agreeing with",
      "The One Thing is run by Where To Spot, a sole proprietorship on the Egyptian commercial register in Damanhour, registration number 101557, owned by Ahmed Salah Tahoun. “We” and “us” below mean that business. You can reach us at privacy@onlyonething.app."
    ],
    [
      "Using the app",
      "The One Thing helps you plan your day, draft messages and remember follow-ups. You send messages yourself from your own apps; we never send on your behalf without you tapping send."
    ],
    [
      "Your account",
      "You sign in with Apple or Google. Keep your device secure — anyone who can unlock it can read what is in the app. You need to be at least 13 to have an account. You can delete your account at any time from Settings."
    ],
    [
      "Your data on our servers",
      "Using The One Thing means your tasks, contacts, follow-ups and activity are kept on our servers, so they reach every device you sign in to and can be put back if you lose your phone. That is part of the service, not something extra. You can download or delete all of it from Settings at any time, and we never sell it or share it for advertising."
    ],
    [
      "The people you add",
      "When you add someone’s details — by hand, from your phone’s contacts, from a file, or by photographing a card — you are telling us you are allowed to hold them. That responsibility is yours: you decide whose details go in, and you should have a reason to keep them. We store them only so the app works for you, and anyone can ask us to remove their own details at privacy@onlyonething.app."
    ],
    [
      "Subscriptions",
      "Pro is billed through the App Store or Google Play and renews until you cancel in your store settings. Prices are shown before you buy. Refunds are handled by the store you bought from, under its rules, not by us."
    ],
    [
      "Acceptable use",
      "Don’t use the app to spam, harass or break the law. If an account is used that way we may suspend or close it."
    ],
    [
      "What the app does not promise",
      "The One Thing helps you remember; it does not do the remembering for you. We work to keep it running and to keep what it suggests sensible, but we cannot promise it will always be available or always get something right. The commitments you make to other people stay yours, and so does the decision to act on anything the app proposes."
    ],
    [
      "Where our responsibility ends",
      "As far as the law allows, we are not responsible for losses nobody could reasonably have seen coming, or for what follows from relying on the app instead of your own judgement. Nothing here removes a responsibility the law does not let us remove."
    ],
    [
      "Ending it",
      "You can delete your account from Settings whenever you want, and these terms end with it. We may close an account that breaks these terms, and we will tell you why unless the law stops us."
    ],
    [
      "Which law applies",
      "These terms are governed by the law of the Arab Republic of Egypt, and disputes go to the Egyptian courts. If you use the app as a consumer, this does not take away any protection the law where you live gives you and does not let us contract out of."
    ],
    [
      "Changes",
      "If we change these terms we’ll tell you in the app before they apply."
    ]
  ],
  "priv": [
    [
      "Who we are",
      "The One Thing is run by Where To Spot, a sole proprietorship on the Egyptian commercial register in Damanhour, registration number 101557, owned by Ahmed Salah Tahoun. We decide what happens to the data described here, which in data protection law makes us its controller. Write to us at privacy@onlyonething.app."
    ],
    [
      "What we collect",
      "Your name, phone number, job title and the email address your sign-in provider gives us. The tasks, contacts, follow-ups, notes and message drafts you add. And basic usage data: which features you use, and crashes."
    ],
    [
      "Why we use it, and on what basis",
      "Running the app for you — keeping your tasks on every device, putting them back if you lose your phone, sending the reminders you set — is the thing you signed up for, so our basis for it is performing our agreement with you. Keeping the service secure and working, and seeing which features get used, rests on our legitimate interest in running it properly. Marketing messages, and reaching your phone’s contacts, camera or files, happen only with your permission, and you can take that permission back at any time."
    ],
    [
      "Do you have to give us this",
      "You need an account to use the app, so your name and the email from your sign-in are required — without them there is nothing to sync and nothing to restore. Everything else is your choice: your photo, your job title, and whether the app may read your phone’s contacts, camera or files. The app works without them."
    ],
    [
      "Where your data lives",
      "Your tasks, contacts, follow-ups and how you use the app are stored on our servers in Ireland, and travel there encrypted. That is what lets the app work on any device you sign in to, and what lets us put your data back if you lose your phone. It is how the service works rather than an extra: without it there would be nothing to sync and nothing to restore. We keep backups for the same reason, and delete them on the same 30-day clock as everything else. Because we are registered in Egypt and you may be somewhere else again, your data crosses borders on its way there — it stays encrypted in transit and at rest, and the providers who hold it are bound to handle it for us and for nobody else."
    ],
    [
      "How long we keep it",
      "For as long as your account exists. When you delete it, everything goes within 30 days, backups included. The only exception is a record we are obliged to keep — a purchase receipt, for instance — which we keep for as long as the law requires and no longer."
    ],
    [
      "Who we share it with",
      "We never sell your data and never share it for advertising. Supabase host our database and servers. Apple and Google handle your sign-in and your payments under their own terms. When you use the assistant, what you typed goes to Anthropic to be read — see the next section. If the app crashes, a diagnostic report goes to Sentry: what went wrong and where in the code, not what you were working on. Nobody else receives it unless the law obliges us to hand it over."
    ],
    [
      "The assistant",
      "When you write something and ask the assistant to make sense of it, the words you typed are sent to Anthropic, along with your language and your time zone, and come back as a suggested task. Your contact list is not sent — but if you typed somebody’s name in the note, that name travels with the text. Nothing the assistant produces is a decision about you: it fills in a task for you to accept, change or throw away."
    ],
    [
      "Who at our company can see it",
      "Our support team can see your account details (name, email, phone, job title), your tasks, the contacts you save (name, position, company, phone and email) and your message drafts. We use this to troubleshoot problems, answer your support requests, keep the service secure and meet legal requests. Every time someone on the team opens your record it is written down, so it can be checked afterwards. For product analysis we use your activity with names, phone numbers and emails replaced by codes."
    ],
    [
      "People you add",
      "When you save a contact, we store their name, position, company, phone numbers, emails, address, labels and your notes about them so the app can work for you. They can ask us to remove their details at privacy@onlyonething.app."
    ],
    [
      "Pictures and files",
      "A picture you choose for a person or for yourself is copied into the app and stays on your phone; it is not uploaded. A photo of a business card is read on your phone and not kept; only the text you confirm becomes a contact. A spreadsheet, PDF or contacts file you import is read on your phone and the file itself is not uploaded."
    ],
    [
      "Voice notes",
      "When you tap the microphone, your phone’s own speech recogniser (Apple’s or Google’s, under their privacy terms) turns what you say into text. The One Thing uses that text and does not keep the audio."
    ],
    [
      "Reminders",
      "Reminders and nudges are scheduled on your phone. You can turn them off in your phone’s settings at any time."
    ],
    [
      "Your rights and choices",
      "You can ask us to show you what we hold about you, correct it, delete it, hand it over in a form you can take elsewhere, pause what we do with it, or stop a particular use altogether. Downloading and deleting are built into Settings, and into ahmedtahoun.github.io/one-thing/delete; for anything else write to privacy@onlyonething.app and we will answer within 30 days. Marketing can be turned off in Settings whenever you like. Where we rely on your permission, you can withdraw it at any time — that stops what comes next, and does not undo what was already done while it stood."
    ],
    [
      "If you want to complain",
      "Tell us first and we will try to put it right. You can also complain to a data protection regulator: in Egypt the Personal Data Protection Centre, in Saudi Arabia SDAIA, and in the European Union the authority in the country where you live."
    ],
    [
      "If something goes wrong",
      "If data is lost or exposed in a way that puts you at risk, we will tell the regulator that oversees us, and tell you where the law requires it — quickly, and with what we know at the time rather than waiting until we know everything."
    ],
    [
      "Children",
      "The One Thing is not intended for children under 13 and we don’t knowingly collect their data."
    ],
    [
      "Health",
      "The One Thing is a productivity tool. It is not a medical device and doesn’t diagnose or treat any condition."
    ],
    [
      "Changes",
      "If we change this policy we’ll tell you in the app before the change applies, and the date at the top will change with it."
    ],
    [
      "Contact",
      "Where To Spot (Ahmed Salah Tahoun) · privacy@onlyonething.app"
    ]
  ]
};

const ACC_ar: typeof ACC_en = {
  "si": {
    "title": "يومك تحت السيطرة.",
    "sub": "أولوية وحدة. وكل التزام صغير محفوظ. سجّل دخولك وابدأ.",
    "apple": "المتابعة مع Apple",
    "google": "المتابعة مع Google",
    "terms1": "أوافق على",
    "termsL": "شروط الاستخدام",
    "and": "و",
    "privL": "سياسة الخصوصية",
    "terms2": ".",
    "mkt": "أرسلوا لي نصائح وأخبار وعروض.",
    "opt": "(اختياري)",
    "err": "وافق على الشروط وسياسة الخصوصية عشان تكمّل.",
    "note": "نجمع اسمك ورقمك ومسمّاك الوظيفي وطريقة استخدامك للتطبيق لتشغيله وتحسينه. التسويق فقط إذا وافقت — وتقدر تغيّرها من الإعدادات.",
    "updated": "آخر تحديث ١٥ أكتوبر ٢٠٢٦",
    "fail": "ما قدرنا نسجّل دخولك. جرّب مرة ثانية."
  },
  "su": {
    "q": [
      "وش تحب نناديك؟",
      "وش رقم جوالك؟",
      "وش تشتغل؟"
    ],
    "sub": [
      "اسمك الأول يكفي — كذا بكلمك.",
      "اختياري. للتذكير بالواتساب واسترجاع الحساب. ما نشاركه أبداً.",
      "يساعدني أقترح متابعات ومسودات تناسبك."
    ],
    "hello": [
      "أهلاً فيك 👋",
      "تشرّفنا يا {n}.",
      "قرّبنا يا {n}."
    ],
    "namePh": "اسمك الأول",
    "jobPh": "مثلاً: مؤسس بيت القهوة",
    "jobs": [
      "مؤسس",
      "مستقل",
      "مبيعات",
      "مدير",
      "مستشار",
      "طالب"
    ],
    "cont": "كمّل",
    "done": "يلّا يا {n}"
  },
  "terms": [
    [
      "مع مين تتعامل",
      "«الشيء الواحد» تشغّله مؤسسة Where To Spot، مؤسسة فردية مقيّدة في السجل التجاري المصري بدمنهور برقم ١٠١٥٥٧، ومالكها أحمد صلاح طاحون. و«نحن» في هذا النص تعني هذي المؤسسة. تقدر توصل لنا على privacy@onlyonething.app."
    ],
    [
      "استخدام التطبيق",
      "يساعدك التطبيق ترتّب يومك وتكتب رسايلك وتتذكّر متابعاتك. أنت اللي ترسل من تطبيقاتك، وما نرسل شي بدون ما تضغط إرسال."
    ],
    [
      "حسابك",
      "تسجّل دخولك عن طريق Apple أو Google. وخلّ جهازك محمي — أي أحد يقدر يفتحه يقدر يقرأ اللي داخل التطبيق. ولازم يكون عمرك ١٣ سنة على الأقل عشان يكون لك حساب. وتقدر تحذف حسابك متى ما تبي من الإعدادات."
    ],
    [
      "بياناتك على سيرفراتنا",
      "استخدامك لـ«الشيء الواحد» يعني إن مهامك وجهات اتصالك ومتابعاتك ونشاطك تنحفظ على سيرفراتنا، عشان توصل لكل جهاز تسجّل دخولك فيه وتقدر ترجّعها إذا ضاع جوالك. هذا جزء من الخدمة مو شي زايد. وتقدر تحمّلها أو تحذفها كلها من الإعدادات وقت ما تبي، وما نبيعها ولا نشاركها للإعلانات أبداً."
    ],
    [
      "الأشخاص اللي تضيفهم",
      "لما تضيف بيانات شخص — بيدك، أو من جهات اتصال جوالك، أو من ملف، أو بتصوير بطاقة — أنت تقول لنا إنك مخوّل بالاحتفاظ فيها. وهذي مسؤوليتك أنت: أنت اللي تقرر بيانات مين تدخل، والمفروض يكون عندك سبب للاحتفاظ فيها. نحنا نحفظها عشان يشتغل التطبيق لك فقط، ويقدر أي شخص يطلب حذف بياناته على privacy@onlyonething.app."
    ],
    [
      "الاشتراك",
      "يتم الدفع عبر App Store أو Google Play ويتجدد لين تلغيه من إعدادات المتجر. والأسعار تظهر لك قبل الشراء. أما الاسترجاع فيتم عن طريق المتجر اللي اشتريت منه وبحسب شروطه، مو عن طريقنا."
    ],
    [
      "الاستخدام المقبول",
      "لا تستخدم التطبيق للإزعاج أو مخالفة النظام. وإذا استُخدم الحساب بهذي الطريقة يمكن نوقفه أو نقفله."
    ],
    [
      "وش ما يوعد فيه التطبيق",
      "«الشيء الواحد» يساعدك تتذكّر، لكنه ما يتذكّر عنك. نشتغل عشان يظل شغّال واقتراحاته معقولة، لكن ما نقدر نوعدك إنه ما ينقطع أبداً ولا يغلط أبداً. والالتزامات اللي تقطعها للناس تبقى التزاماتك أنت، وقرار إنك تمشي على أي اقتراح من التطبيق يبقى قرارك."
    ],
    [
      "حدود مسؤوليتنا",
      "بالقدر اللي يسمح فيه النظام، ما نتحمّل الخسائر اللي ما كان أحد يقدر يتوقعها، ولا اللي يترتب على اعتمادك على التطبيق بدل حكمك أنت. وما في شي هنا يرفع عنا مسؤولية ما يسمح النظام برفعها."
    ],
    [
      "إنهاء الاستخدام",
      "تقدر تحذف حسابك من الإعدادات وقت ما تبي، وتنتهي هذي الشروط معه. ويمكن نقفل حساب يخالف هذي الشروط، وبنقول لك السبب إلا إذا كان النظام يمنعنا."
    ],
    [
      "القانون المطبّق",
      "تخضع هذي الشروط لقانون جمهورية مصر العربية، والنزاعات تنظرها المحاكم المصرية. وإذا كنت تستخدم التطبيق كمستهلك، فهذا ما يسقط أي حماية يعطيك إياها نظام بلدك ولا يسمح لنا بالتنازل عنها."
    ],
    [
      "التغييرات",
      "إذا غيّرنا الشروط بنبلغك داخل التطبيق قبل تطبيقها."
    ]
  ],
  "priv": [
    [
      "مين نحن",
      "«الشيء الواحد» تشغّله مؤسسة Where To Spot، مؤسسة فردية مقيّدة في السجل التجاري المصري بدمنهور برقم ١٠١٥٥٧، ومالكها أحمد صلاح طاحون. ونحن اللي نقرر وش يصير بالبيانات الموضّحة هنا، وهذا اللي يخلّينا «المتحكّم» فيها بلغة أنظمة حماية البيانات. راسلنا على privacy@onlyonething.app."
    ],
    [
      "وش نجمع",
      "اسمك ورقمك ومسمّاك الوظيفي والإيميل اللي يعطينا إياه مزوّد تسجيل الدخول. والمهام وجهات الاتصال والمتابعات والملاحظات ومسودات الرسايل اللي تضيفها. وبيانات استخدام بسيطة: أي الميزات تستخدم، وأي تعطّل يصير."
    ],
    [
      "ليش نستخدمها، وعلى أي أساس",
      "تشغيل التطبيق لك — إن مهامك تكون على كل جهاز، وترجع لك إذا ضاع جوالك، وتوصلك التذكيرات اللي ضبطتها — هو الشي اللي سجّلت عشانه، فأساسنا فيه تنفيذ الاتفاق اللي بيننا وبينك. وحماية الخدمة وتشغيلها ومعرفة أي الميزات تُستخدم، أساسها مصلحتنا المشروعة في إدارتها صح. أما الرسايل التسويقية، والوصول لجهات اتصال جوالك أو الكاميرا أو الملفات، فما تصير إلا بإذنك، وتقدر تسحب الإذن وقت ما تبي."
    ],
    [
      "هل لازم تعطينا هذي البيانات",
      "تحتاج حساب عشان تستخدم التطبيق، فاسمك والإيميل اللي تدخل فيه مطلوبين — بدونهم ما فيه شي يتزامن ولا شي يترجّع. وكل اللي بعدها اختيارك أنت: صورتك، ومسمّاك الوظيفي، وهل تسمح للتطبيق يقرأ جهات اتصال جوالك أو الكاميرا أو الملفات. والتطبيق يشتغل بدونها."
    ],
    [
      "وين تنحفظ بياناتك",
      "مهامك وجهات اتصالك ومتابعاتك وطريقة استخدامك للتطبيق تنحفظ على سيرفراتنا في أيرلندا، وتنتقل لها مشفّرة. هذا اللي يخلّي التطبيق يشتغل على أي جهاز تسجّل دخولك فيه، واللي يخلّينا نرجّع بياناتك إذا ضاع جوالك. هذي طريقة عمل الخدمة مو إضافة: بدونها ما فيه شي يتزامن ولا شي يترجّع. ونحتفظ بنسخ احتياطية لنفس السبب، ونحذفها بنفس مدة الـ٣٠ يوم. وبما إننا مقيّدين في مصر وإنت يمكن تكون في بلد ثالث، فبياناتك تعبر الحدود وهي رايحة لهناك — تبقى مشفّرة في الطريق وعند التخزين، والمزوّدين اللي يحتفظون فيها ملزَمين يعالجونها لنا إحنا فقط."
    ],
    [
      "كم نحتفظ فيها",
      "طول ما حسابك موجود. ولما تحذفه يروح كل شي خلال ٣٠ يوم، والنسخ الاحتياطية معه. والاستثناء الوحيد سجل نكون ملزَمين نحتفظ فيه — فاتورة شراء مثلاً — نحتفظ فيه بالمدة اللي يفرضها النظام ولا زيادة."
    ],
    [
      "مع مين نشاركها",
      "ما نبيع بياناتك أبداً ولا نشاركها للإعلانات. Supabase يستضيفون قاعدة بياناتنا وسيرفراتنا. وApple وGoogle يتولّون تسجيل دخولك ومدفوعاتك وفق شروطهم. ولما تستخدم المساعد، اللي كتبته يروح لـAnthropic عشان يُقرأ — شوف الفقرة الجاية. وإذا تعطّل التطبيق يروح تقرير تشخيصي لـSentry: وش صار وفين في الكود، مو وش كنت تشتغل عليه. وما يستلمها أحد غيرهم إلا إذا ألزمنا النظام بتسليمها."
    ],
    [
      "المساعد",
      "لما تكتب شي وتطلب من المساعد يفهمه، الكلمات اللي كتبتها تنرسل لـAnthropic، ومعها لغتك ومنطقتك الزمنية، وترجع لك على شكل مهمة مقترحة. قائمة جهات اتصالك ما تنرسل — لكن إذا كتبت اسم أحد داخل الملاحظة، الاسم يروح مع النص. وما يطلع من المساعد يعتبر قرار عنك: هو يعبّي لك مهمة أنت اللي تقبلها أو تعدّلها أو ترميها."
    ],
    [
      "مين يقدر يشوفها عندنا",
      "فريق الدعم يقدر يشوف بيانات حسابك (الاسم والإيميل والجوال والمسمى)، ومهامك، وجهات الاتصال اللي تحفظها (الاسم والمنصب والشركة والجوال والإيميل)، ومسودات رسايلك. نستخدمها لحل المشاكل والرد على طلبات الدعم وحماية الخدمة وللطلبات النظامية. وكل مرة يفتح أحد من الفريق سجلك ينكتب ذلك، عشان يمكن مراجعته بعدين. ولتحليل المنتج نستخدم نشاطك بعد استبدال الأسماء والأرقام والإيميلات برموز."
    ],
    [
      "الأشخاص اللي تضيفهم",
      "لما تحفظ جهة اتصال نخزّن اسمه ومنصبه وشركته وأرقامه وإيميلاته وعنوانه وتصنيفاته وملاحظاتك عنه عشان يشتغل التطبيق لك. ويقدر يطلب حذف بياناته على privacy@onlyonething.app."
    ],
    [
      "الصور والملفات",
      "الصورة اللي تختارها لشخص أو لنفسك تنحفظ داخل التطبيق وتبقى على جوالك ولا تُرفع. وصورة بطاقة العمل تُقرأ على جوالك ولا تنحفظ؛ بس النص اللي تأكّده يصير جهة اتصال. وأي ملف جدول أو PDF أو جهات اتصال تستورده يُقرأ على جوالك ولا يُرفع الملف نفسه."
    ],
    [
      "الملاحظات الصوتية",
      "لما تضغط على الميكروفون، يحوّل مُتعرّف الكلام في جوالك (من آبل أو قوقل، وفق شروط خصوصيتهم) كلامك إلى نص. «الشيء الواحد» يستخدم هذا النص ولا يحتفظ بالتسجيل الصوتي."
    ],
    [
      "التذكيرات",
      "التذكيرات والتنبيهات تُجدول على جوالك. تقدر توقفها من إعدادات جوالك في أي وقت."
    ],
    [
      "حقوقك وخياراتك",
      "تقدر تطلب منا نوريك وش نحتفظ فيه عنك، أو تصحّحه، أو تحذفه، أو تسلّمه لك بصيغة تقدر تاخذها لمكان ثاني، أو توقف استخدامه مؤقتاً، أو تمنع استخدام معيّن نهائياً. التحميل والحذف موجودين داخل الإعدادات وعلى ahmedtahoun.github.io/one-thing/delete؛ وأي طلب ثاني راسلنا فيه على privacy@onlyonething.app وبنرد خلال ٣٠ يوم. والتسويق توقفه من الإعدادات متى ما تبي. وإذا كان أساسنا إذنك، تقدر تسحبه وقت ما تبي — والسحب يوقف اللي جاي، وما يلغي اللي صار وهو قائم."
    ],
    [
      "إذا تبي تقدّم شكوى",
      "كلّمنا أول وبنحاول نصلّح الوضع. وتقدر كمان تشتكي لجهة رقابية لحماية البيانات: في مصر «مركز حماية البيانات الشخصية»، وفي السعودية «سدايا»، وفي الاتحاد الأوروبي الجهة المختصة في البلد اللي تسكن فيه."
    ],
    [
      "إذا صار شي غلط",
      "إذا ضاعت بيانات أو انكشفت بطريقة تعرّضك للخطر، بنبلّغ الجهة الرقابية المشرفة علينا، وبنبلّغك أنت إذا كان النظام يلزمنا بذلك — بسرعة، وباللي نعرفه وقتها بدل ما ننتظر لين نعرف كل شي."
    ],
    [
      "الأطفال",
      "«الشيء الواحد» غير موجّه للأطفال دون ١٣ سنة، ولا نجمع بياناتهم عن علم."
    ],
    [
      "الصحة",
      "«الشيء الواحد» أداة إنتاجية. ليس جهازًا طبيًا ولا يشخّص أو يعالج أي حالة."
    ],
    [
      "التغييرات",
      "إذا غيّرنا هذي السياسة بنبلغك داخل التطبيق قبل ما يسري التغيير، وبيتغيّر التاريخ اللي فوق معه."
    ],
    [
      "تواصل معنا",
      "Where To Spot (أحمد صلاح طاحون) · privacy@onlyonething.app"
    ]
  ]
};

export const ACC = { en: ACC_en, ar: ACC_ar };

/** Settings, tips and paywall copy. */
const SETX_en = {
  "st": {
    "remind": "Reminders",
    "support": "Support us",
    "privacy": "Privacy & data",
    "proT": "Try Pro free for 7 days",
    "proS": "Unlimited assistant, unlimited brain dumps, and follow-ups that chase for you.",
    "coffee": "Buy us a coffee",
    "coffeeS": "A small tip keeps the app ad-free",
    "restore": "Restore purchases",
    "manage": "Manage subscription",
    "tipT": "Buy us a coffee",
    "tipS": "Tips are optional, one-time and don’t unlock anything — they just keep us building. Thank you!",
    "tipNote": "Paid through your App Store or Google Play account.",
    "tipBuy": "Send {p}",
    "tipCups": "How many?",
    "tipFewer": "One fewer",
    "tipMore": "One more",
    "tipSizes": [
      "Small",
      "Regular",
      "Large"
    ],
    "toastTip": "Thank you so much ☕",
    "toastManage": "Opening your store subscriptions…",
    "mkt": "Tips & offers",
    "mktS": "Occasional emails and messages. Off anytime.",
    "export": "Download my data",
    "del": "Delete account",
    "ver": "Version 1.0.0",
    "delT": "Delete your account?",
    "delS": "This can’t be undone. We’ll permanently erase:",
    "delList": [
      "Your profile, name, phone and job title",
      "All tasks, follow-ups and notes",
      "Contacts and their history"
    ],
    "delNote": "Data is removed within 30 days. A Pro subscription isn’t cancelled automatically — cancel it in App Store or Google Play settings. You can also request deletion at ahmedtahoun.github.io/one-thing/delete.",
    "delCta": "Delete my account",
    "keep": "Keep my account",
    "free": "Free",
    "pro": "Pro",
    "toastDel": "Your account was deleted.",
    "toastExp": "We’ll email your data within 24 hours.",
    "toastOut": "Signed out."
  },
  "pw": {
    "k": "THE ONE THING PRO",
    "title": "Never drop a promise again{n}.",
    "sub": "Everything in Free, plus the tools that keep every client warm.",
    "restore": "Restore",
    "feats": [
      [
        "spark",
        "Unlimited smart assistant",
        "Free plan: 10 a day need the cloud."
      ],
      [
        "loop",
        "Auto follow-ups",
        "I nudge you before anyone waits too long."
      ],
      [
        "mic",
        "Unlimited brain dumps",
        "Talk for a minute — I turn it into tasks."
      ]
    ],
    "year": "Yearly",
    "yearSub": "{price} billed once a year",
    "month": "Monthly",
    "monthSub": "Billed every month",
    "per": "/ month",
    "save": "Save {n}%",
    "tierFree": "Free",
    "tierPro": "Pro",
    "tierPlus": "Pro+",
    "current": "What you have now",
    "soon": "Coming soon",
    "soonSub": "Not on sale yet — we will not charge for it until it works.",
    "freeFeats": [
      [
        "spark",
        "Smart assistant",
        "10 a day need the cloud."
      ],
      [
        "users",
        "People and follow-ups",
        "Everyone you deal with, and who owes you a reply."
      ],
      [
        "mic",
        "Brain dumps",
        "Three a day."
      ]
    ],
    "plusFeats": [
      [
        "cards",
        "Scan a stack of cards",
        "A whole conference in one sitting. Free keeps 5 a batch."
      ],
      [
        "list",
        "Smart lists",
        "Groups that keep themselves up to date. Free keeps one."
      ],
      [
        "send",
        "Message a whole list",
        "One message, written to each of them by name."
      ],
      [
        "globe",
        "Fill in the gaps",
        "Job title and company, looked up from a name and an email."
      ]
    ],
    "cta": "Start 7-day free trial",
    "fineY": "Free for 7 days, then {price}/year. Payment is charged to your Apple ID or Google Play account when the trial ends. Renews automatically unless cancelled at least 24 hours before the end of the period. Manage or cancel in your store account settings.",
    "fineM": "Free for 7 days, then {price}/month. Payment is charged to your Apple ID or Google Play account when the trial ends. Renews automatically unless cancelled at least 24 hours before the end of the period. Manage or cancel in your store account settings.",
    "toastBuy": "Welcome to Pro 🎉",
    "toastRestore": "No previous purchases found."
  }
};

const SETX_ar: typeof SETX_en = {
  "st": {
    "remind": "التذكيرات",
    "support": "ادعمنا",
    "privacy": "الخصوصية والبيانات",
    "proT": "جرّب Pro مجاناً ٧ أيام",
    "proS": "مساعد بلا حدود، تفريغ أفكار بلا حدود، ومتابعات تلاحق عنك.",
    "coffee": "اعزمنا على قهوة",
    "coffeeS": "دعم بسيط يخلّي التطبيق بدون إعلانات",
    "restore": "استرجاع المشتريات",
    "manage": "إدارة الاشتراك",
    "tipT": "اعزمنا على قهوة",
    "tipS": "الدعم اختياري ولمرة وحدة وما يفتح أي ميزة — بس يساعدنا نكمّل. شكراً لك!",
    "tipNote": "الدفع عن طريق حسابك في App Store أو Google Play.",
    "tipBuy": "ارسل {p}",
    "tipCups": "كم كوب؟",
    "tipFewer": "واحد أقل",
    "tipMore": "واحد أكثر",
    "tipSizes": [
      "صغير",
      "وسط",
      "كبير"
    ],
    "toastTip": "شكراً من القلب ☕",
    "toastManage": "نفتح اشتراكاتك في المتجر…",
    "mkt": "نصائح وعروض",
    "mktS": "رسائل بين فترة وفترة. تقدر توقفها متى ما تبي.",
    "export": "حمّل بياناتي",
    "del": "حذف الحساب",
    "ver": "الإصدار 1.0.0",
    "delT": "تبي تحذف حسابك؟",
    "delS": "ما تقدر ترجع عنها. بنحذف نهائياً:",
    "delList": [
      "ملفك واسمك ورقمك ومسمّاك",
      "كل المهام والمتابعات والملاحظات",
      "جهات الاتصال وسجلها"
    ],
    "delNote": "تنحذف البيانات خلال ٣٠ يوم. اشتراك Pro ما ينلغي تلقائياً — ألغه من إعدادات App Store أو Google Play. وتقدر كمان تطلب الحذف من ahmedtahoun.github.io/one-thing/delete.",
    "delCta": "احذف حسابي",
    "keep": "خلّي حسابي",
    "free": "مجاني",
    "pro": "Pro",
    "toastDel": "انحذف حسابك.",
    "toastExp": "بنرسل بياناتك على بريدك خلال ٢٤ ساعة.",
    "toastOut": "سجّلت خروج."
  },
  "pw": {
    "k": "ذا ون ثينق PRO",
    "title": "لا تنسى أي وعد بعد اليوم{n}.",
    "sub": "كل اللي في المجاني، وأدوات تخلّي علاقتك مع عملائك دافية.",
    "restore": "استرجاع",
    "feats": [
      [
        "spark",
        "مساعد ذكي بلا حدود",
        "الخطة المجانية: ١٠ في اليوم تحتاج السحابة."
      ],
      [
        "loop",
        "متابعات تلقائية",
        "أذكّرك قبل ما أحد ينتظر كثير."
      ],
      [
        "mic",
        "تفريغ أفكار بلا حدود",
        "تكلّم دقيقة — وأحوّلها لمهام."
      ]
    ],
    "year": "سنوي",
    "yearSub": "{price} تُدفع مرة بالسنة",
    "month": "شهري",
    "monthSub": "يُدفع كل شهر",
    "per": "/ شهر",
    "save": "وفّر {n}٪",
    "tierFree": "المجاني",
    "tierPro": "Pro",
    "tierPlus": "Pro+",
    "current": "اللي عندك الحين",
    "soon": "قريباً",
    "soonSub": "ما هو معروض للبيع بعد — وما راح ناخذ عليه فلوس قبل ما يشتغل.",
    "freeFeats": [
      [
        "spark",
        "مساعد ذكي",
        "١٠ في اليوم تحتاج السحابة."
      ],
      [
        "users",
        "الأشخاص والمتابعات",
        "كل اللي تتعامل معهم، ومين عليه رد لك."
      ],
      [
        "mic",
        "تفريغ الأفكار",
        "ثلاث مرات في اليوم."
      ]
    ],
    "plusFeats": [
      [
        "cards",
        "صوّر كومة بطاقات",
        "مؤتمر كامل بجلسة وحدة. المجاني يحفظ ٥ في المرة."
      ],
      [
        "list",
        "قوائم ذكية",
        "مجموعات تحدّث نفسها. المجاني يحفظ واحدة."
      ],
      [
        "send",
        "راسل قائمة كاملة",
        "رسالة وحدة، مكتوبة لكل واحد فيهم باسمه."
      ],
      [
        "globe",
        "كمّل الناقص",
        "المسمى الوظيفي والشركة، تتجاب من الاسم والإيميل."
      ]
    ],
    "cta": "ابدأ تجربة ٧ أيام مجاناً",
    "fineY": "مجاناً ٧ أيام، بعدها {price} بالسنة. يُخصم المبلغ من حساب Apple أو Google Play بعد انتهاء التجربة، ويتجدد تلقائياً ما لم يُلغَ قبل نهاية الفترة بـ٢٤ ساعة على الأقل. تقدر تديره أو تلغيه من إعدادات حسابك في المتجر.",
    "fineM": "مجاناً ٧ أيام، بعدها {price} بالشهر. يُخصم المبلغ من حساب Apple أو Google Play بعد انتهاء التجربة، ويتجدد تلقائياً ما لم يُلغَ قبل نهاية الفترة بـ٢٤ ساعة على الأقل. تقدر تديره أو تلغيه من إعدادات حسابك في المتجر.",
    "toastBuy": "أهلاً فيك في Pro 🎉",
    "toastRestore": "ما لقينا مشتريات سابقة."
  }
};

export const SETX = { en: SETX_en, ar: SETX_ar };

/** Event form copy (visit / meeting / webinar / course). */
const EVX_en = {
  "l": {
    "cancel": "Cancel",
    "save": "Save",
    "plat": "Where",
    "link": "Link",
    "host": "Host or organiser",
    "hostPh": "e.g. Monsha’at, HubSpot Academy",
    "loc": "Location",
    "locPh": "Address or place name",
    "maps": "Maps",
    "whoL": "Who",
    "lesson": "Next lesson",
    "lessonPh": "e.g. Module 3 · Pricing basics",
    "days": "Study days",
    "date": "Day",
    "time": "Time",
    "dur": "Length",
    "prog": "Progress",
    "remind": "Remind me",
    "notes": "Notes"
  },
  "head": {
    "visit": "New visit",
    "meeting": "New meeting",
    "webinar": "New webinar",
    "course": "New course"
  },
  "titleL": {
    "visit": "What’s the visit for?",
    "meeting": "Meeting about",
    "webinar": "Webinar name",
    "course": "Course name"
  },
  "titlePh": {
    "visit": "e.g. Tasting at the new branch",
    "meeting": "e.g. Q4 pricing review",
    "webinar": "e.g. Growing a café on Instagram",
    "course": "e.g. Financial modelling for founders"
  },
  "linkPh": {
    "meeting": "Paste the Zoom / Meet / Teams link",
    "webinar": "Registration or join link",
    "course": "Course page link"
  },
  "notesPh": {
    "visit": "Parking, who to ask for, what to bring…",
    "meeting": "Agenda, points to cover…",
    "webinar": "What do you want to learn?",
    "course": "Why you started, what’s next…"
  },
  "whoHint": {
    "visit": "Contact person",
    "meeting": "Tap to add attendees"
  },
  "plats": [
    "Zoom",
    "Google Meet",
    "Teams",
    "In person"
  ],
  "cplats": [
    "Udemy",
    "Coursera",
    "YouTube",
    "Other"
  ],
  "dates": [
    "Today",
    "Tomorrow",
    "This week"
  ],
  "durs": [
    "15 min",
    "30 min",
    "45 min",
    "1 hr"
  ],
  "rems": [
    "10 min before",
    "1 hr before",
    "Day before",
    "None"
  ],
  "wk": [
    "S",
    "M",
    "T",
    "W",
    "T",
    "F",
    "S"
  ],
  "cta": {
    "visit": "Save visit",
    "meeting": "Save meeting",
    "webinar": "Save webinar",
    "course": "Save course"
  },
  "prog": "{a} of {b} lessons",
  "toast": "{x} saved · I’ll remind you {r}",
  "toastNoR": "{x} saved",
  "addT": "Add a task",
  "addL": "Add",
  "addVoice": "Or just say it"
};

const EVX_ar: typeof EVX_en = {
  "l": {
    "cancel": "إلغاء",
    "save": "حفظ",
    "plat": "وين",
    "link": "الرابط",
    "host": "المنظّم",
    "hostPh": "مثلاً: منشآت",
    "loc": "الموقع",
    "locPh": "العنوان أو اسم المكان",
    "maps": "الخرائط",
    "whoL": "مع مين",
    "lesson": "الدرس الجاي",
    "lessonPh": "مثلاً: الوحدة ٣ · أساسيات التسعير",
    "days": "أيام الدراسة",
    "date": "اليوم",
    "time": "الوقت",
    "dur": "المدة",
    "prog": "التقدّم",
    "remind": "ذكّرني",
    "notes": "ملاحظات"
  },
  "head": {
    "visit": "زيارة جديدة",
    "meeting": "اجتماع جديد",
    "webinar": "ويبينار جديد",
    "course": "دورة جديدة"
  },
  "titleL": {
    "visit": "وش سبب الزيارة؟",
    "meeting": "الاجتماع عن",
    "webinar": "اسم الويبينار",
    "course": "اسم الدورة"
  },
  "titlePh": {
    "visit": "مثلاً: تذوّق في الفرع الجديد",
    "meeting": "مثلاً: مراجعة أسعار الربع الرابع",
    "webinar": "مثلاً: تنمية المقهى على إنستقرام",
    "course": "مثلاً: النمذجة المالية للمؤسسين"
  },
  "linkPh": {
    "meeting": "الصق رابط Zoom / Meet / Teams",
    "webinar": "رابط التسجيل أو الدخول",
    "course": "رابط صفحة الدورة"
  },
  "notesPh": {
    "visit": "المواقف، مين تسأل عنه، وش تجيب…",
    "meeting": "الأجندة والنقاط…",
    "webinar": "وش تبي تتعلّم؟",
    "course": "ليش بديت، وش الجاي…"
  },
  "whoHint": {
    "visit": "الشخص المسؤول",
    "meeting": "اضغط لإضافة الحضور"
  },
  "plats": [
    "Zoom",
    "Google Meet",
    "Teams",
    "حضوري"
  ],
  "cplats": [
    "Udemy",
    "Coursera",
    "YouTube",
    "غيره"
  ],
  "dates": [
    "اليوم",
    "بكرة",
    "هالأسبوع"
  ],
  "durs": [
    "15 د",
    "30 د",
    "45 د",
    "ساعة"
  ],
  "rems": [
    "قبل 10 د",
    "قبل ساعة",
    "قبلها بيوم",
    "بدون"
  ],
  "wk": [
    "ح",
    "ن",
    "ث",
    "ر",
    "خ",
    "ج",
    "س"
  ],
  "cta": {
    "visit": "احفظ الزيارة",
    "meeting": "احفظ الاجتماع",
    "webinar": "احفظ الويبينار",
    "course": "احفظ الدورة"
  },
  "prog": "{a} من {b} دروس",
  "toast": "انحفظ {x} · بذكّرك {r}",
  "toastNoR": "انحفظ {x}",
  "addT": "أضف مهمة",
  "addL": "أضف",
  "addVoice": "أو قولها بصوتك"
};

export const EVX = { en: EVX_en, ar: EVX_ar };

/** Follow-ups copy. */
const FUX_en = {
  "tabs": [
    "Nudge",
    "Waiting",
    "Closed"
  ],
  "sum0": "All caught up. Nobody’s waiting on you.",
  "sum": "{a} need a nudge · {b} waiting on a reply",
  "due": "Overdue",
  "wait": "Waiting",
  "closed": "Closed",
  "nudge": "Nudge",
  "remind": "Remind me",
  "closeL": "Got a reply",
  "reopen": "Reopen",
  "nudged": "Nudged just now",
  "closedNow": "Closed just now",
  "empty": [
    [
      "Nothing to chase",
      "When someone goes quiet, they’ll show up here."
    ],
    [
      "No one to wait on",
      "Sent something? I’ll track the reply here."
    ],
    [
      "Nothing closed yet",
      "Replies you mark as done land here."
    ]
  ],
  "toastClose": "Nice — {n} is closed."
};

const FUX_ar: typeof FUX_en = {
  "tabs": [
    "تابع",
    "ينتظر",
    "تم"
  ],
  "sum0": "كل شي تمام. ما أحد ينتظرك.",
  "sum": "{a} يحتاجون متابعة · {b} ننتظر ردهم",
  "due": "متأخر",
  "wait": "ننتظر",
  "closed": "تم",
  "nudge": "تابع",
  "remind": "ذكّرني",
  "closeL": "وصل الرد",
  "reopen": "افتحها",
  "nudged": "تابعت الحين",
  "closedNow": "تم الحين",
  "empty": [
    [
      "ما في أحد تتابعه",
      "إذا أحد سكت، بيطلع لك هنا."
    ],
    [
      "ما في أحد ننتظره",
      "أرسلت شي؟ بتابع الرد هنا."
    ],
    [
      "ما في شي مقفول",
      "الردود اللي تقفلها تنحفظ هنا."
    ]
  ],
  "toastClose": "حلو — تم إقفال {n}."
};

export const FUX = { en: FUX_en, ar: FUX_ar };

/** Contact profile copy. */
const PFX_en = {
  "l": {
    "edit": "Edit",
    "remember": "Remember for next time",
    "rememberPh": "Tap to add — e.g. prefers WhatsApp, talks prices in SAR",
    "next": "Coming up",
    "history": "History",
    "logPh": "What happened?",
    "add": "Log",
    "meet": "Meeting"
  },
  "kinds": [
    [
      "note",
      "Note"
    ],
    [
      "call",
      "Call"
    ],
    [
      "meeting",
      "Meeting"
    ],
    [
      "visit",
      "Visit"
    ]
  ],
  "today": "Today",
  "yest": "Yesterday",
  "n": "{n} moments",
  "since": "Since {d}",
  "lastTalk": "Last talked {d}",
  "open": "Open task"
};

const PFX_ar: typeof PFX_en = {
  "l": {
    "edit": "تعديل",
    "remember": "تذكّر للمرة الجاية",
    "rememberPh": "اضغط وأضف — مثلاً يفضّل الواتساب",
    "next": "الجاي",
    "history": "السجل",
    "logPh": "وش صار؟",
    "add": "سجّل",
    "meet": "اجتماع"
  },
  "kinds": [
    [
      "note",
      "ملاحظة"
    ],
    [
      "call",
      "اتصال"
    ],
    [
      "meeting",
      "اجتماع"
    ],
    [
      "visit",
      "زيارة"
    ]
  ],
  "today": "اليوم",
  "yest": "أمس",
  "n": "{n} لحظات",
  "since": "من {d}",
  "lastTalk": "آخر تواصل {d}",
  "open": "مهمة مفتوحة"
};

export const PFX = { en: PFX_en, ar: PFX_ar };

/**
 * Overwhelm-mode step breakdowns, keyed by One Thing title. Not a bilingual
 * block like the others: each entry holds its own en/ar step lists.
 */
export const STEPS: Record<string, { en: string[]; ar: string[] }> = {
  "Finish the investor proposal": {
    "en": [
      "Open the proposal doc",
      "Write 3 bullets for the traction section",
      "Paste last month’s numbers",
      "Fix the ask slide",
      "Read it once, out loud",
      "Send it to one person for feedback"
    ],
    "ar": [
      "افتح ملف العرض",
      "اكتب 3 نقاط عن النمو",
      "الصق أرقام الشهر اللي فات",
      "عدّل شريحة المبلغ المطلوب",
      "اقراه مرة وحدة بصوت عالي",
      "أرسله لشخص واحد ياخذ رأيه"
    ]
  },
  "Close the supplier deal": {
    "en": [
      "Find the last quote",
      "List your 2 must-haves",
      "Write your walk-away price",
      "Send one WhatsApp to set a call"
    ],
    "ar": [
      "دوّر آخر عرض سعر",
      "اكتب شرطين ما تتنازل عنهم",
      "حدّد أقل سعر تقبله",
      "أرسل واتساب واحد تحدد فيه مكالمة"
    ]
  },
  "Launch the new menu page": {
    "en": [
      "Open the page draft",
      "Add 3 dish photos",
      "Check the prices",
      "Hit publish"
    ],
    "ar": [
      "افتح مسودة الصفحة",
      "أضف 3 صور أطباق",
      "راجع الأسعار",
      "اضغط نشر"
    ]
  },
  "_": {
    "en": [
      "Open the thing you need",
      "Do the smallest visible piece",
      "Write down what’s next",
      "Take one more step"
    ],
    "ar": [
      "افتح الشي اللي تحتاجه",
      "سوّ أصغر جزء تقدر تشوفه",
      "اكتب وش الخطوة الجاية",
      "خذ خطوة وحدة زيادة"
    ]
  }
};

/** The four event types that use the event form. */
export const EV_TYPES = [
  "visit",
  "meeting",
  "webinar",
  "course"
] as const;

/** Shape of one language's main copy block. */
export type Copy = (typeof C)['en'];
