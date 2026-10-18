/**
 * Measures how far each labelled element sits from where the prototype puts
 * it — the check ACCEPTANCE.md actually asks for ("±2 pt at 402 × 874").
 *
 * A pixel diff says how much of a screen differs, which is dominated by glyph
 * edges; this says where the layout is wrong and by how much, which is what
 * you fix. Run it after `npm run capture:prototype`.
 *
 *   node scripts/measure-drift.js [screen] [--handoff <path>]
 *
 * Each screen lists the exact text of elements to probe, in both languages.
 * Add to PROBES as screens are built.
 */
'use strict';
const { launch: launchChromium } = require('./browser.js');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { demoContacts, demoFollowUps, demoHistory, demoTasks, dateKey } = require('./demo-state');
const { handoffDir } = require('./handoff.js');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const FRAME = { width: 402, height: 874 };

/** Anything further than this from the prototype fails the check. */
const TOLERANCE_PT = 2;

/**
 * Drifts we have decided to accept, with the reason. Keyed
 * `screen/lang/element`. Anything not listed here must stay inside the
 * tolerance — this is a short list on purpose.
 */
const PEOPLE_SEARCH =
  'SCREENS.md § 10 gives the People search field 48 pt. The prototype renders ' +
  'it 24: it sits in a scrolling flex column whose content overflows, and ' +
  'without `flex: none` it shrinks to its input. Everything below it moves up ' +
  'by the difference. We follow the written 48 — BUILD-REVIEW.md §2.19.';

/**
 * Measured, not guessed: the title's layout box is at 126 in both, and the
 * prototype's inline span reports 131 because a 22 pt glyph box is taller
 * than the 28.6 line box it sits in. Nothing is out of place.
 */
const FOCUS_TITLE =
  "The Focus title is 22 pt on a 1.3 line-height, so the prototype's inline " +
  'span reports its glyph box about 5 pt above the line box. Both sides lay ' +
  'the title out at exactly 126 — this is the measurement, not the screen. ' +
  'See the note on TOPS below.';

/**
 * Where the build is allowed to be, when it is no longer where the design put
 * it.
 *
 * Build 9's redesign moved a lot on purpose — the Home tab, the Today/All
 * switch, the quick-action circles — and the product owner has confirmed that
 * design is now the reference (PR #12). That leaves the old question useless
 * and a new one worth asking. "Does the app match the prototype?" now answers
 * no on 76 probes and will keep saying so. "Has the app moved since build 9?"
 * is the regression this check exists to catch.
 *
 * So a probe listed here is measured against the recorded build-9 position
 * instead of the prototype's, while the distance from the design is still
 * reported as `designDelta` — visible, rather than erased, because a redesign
 * being deliberate is not a reason to stop knowing about it.
 *
 * Regenerate after an intended layout change: `npm run drift -- --save`. Read
 * the diff before committing it; a baseline written without looking is how the
 * missing One Thing card survived nine builds (BUILD-REVIEW.md § 2.66).
 */
const BASELINE_FILE = path.join(__dirname, 'drift-baseline.json');
const BASELINE = fs.existsSync(BASELINE_FILE) ? JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8')) : {};

const KNOWN_DEVIATIONS = {
  'sign-in/en/hero':
    "The prototype's consent checkbox measures 25 px (CSS content-box plus its " +
    '1.5 px borders) against the 22 × 22 SCREENS.md § 01 specifies, which is ' +
    'enough to wrap "…and Privacy / Policy." onto a second line there and not ' +
    'here. That extra line lifts the vertically-centred hero. We follow the ' +
    'written spec — BUILD-REVIEW.md §2.11.',
  'focus/en/oneThing': FOCUS_TITLE,
  'focus/ar/oneThing': FOCUS_TITLE,
  // people/en/recent and people/ar/recent sat here until 18 October. The
  // `recent` probe went when the People redesign replaced the RECENT eyebrow
  // with the filter chips (a90103e); the explanations for it stayed behind,
  // and every drift run since has printed them as stale (BUILD-REVIEW §2.99).
  'people/en/firstRow': PEOPLE_SEARCH,
  'people/en/secondRow': PEOPLE_SEARCH,
  'people/ar/firstRow': PEOPLE_SEARCH,
  'people/ar/secondRow': PEOPLE_SEARCH,
  // sign-in/ar/hero was listed here too. Once the writing direction stopped
  // being applied twice and the type scale took the font's real metrics, the
  // Arabic hero came back inside tolerance on its own, so the entry is gone.
};

const FONT_DIR = path.join(ROOT, 'node_modules/@expo-google-fonts/ibm-plex-sans-arabic');
const FACES = [
  ['400', '400Regular/IBMPlexSansArabic_400Regular.ttf'],
  ['500', '500Medium/IBMPlexSansArabic_500Medium.ttf'],
  ['600', '600SemiBold/IBMPlexSansArabic_600SemiBold.ttf'],
  ['700', '700Bold/IBMPlexSansArabic_700Bold.ttf'],
];
const CDN = {
  'react@18.3.1/umd/react.production.min.js': 'node_modules/prototype-react/umd/react.production.min.js',
  'react-dom@18.3.1/umd/react-dom.production.min.js':
    'node_modules/prototype-react-dom/umd/react-dom.production.min.js',
  '@babel/standalone@7.29.0/babel.min.js': 'node_modules/@babel/standalone/babel.min.js',
};

/**
 * What to probe, per screen. `app` is the route; `proto` is the prototype's
 * sidebar number. `labels` pairs a name with the exact text in each language —
 * optionally with an `app` override, for an element the build renamed and the
 * design did not. Build 9's redesign is the reference (PR #12), so a probe is
 * removed below only where the element has stopped being measurable text on
 * one side: an eyebrow the design dropped, a label that became a placeholder,
 * a field behind a disclosure, or a feature deliberately cut.
 * the prototype's demo copy and the app's seeded copy must match for a probe
 * to resolve.
 */
const PROBES = {
  today: {
    app: '/today',
    proto: '09',
    state: { signedIn: true, firstRun: false, seedTasks: true, oneThing: true },
    labels: {
      greeting: { en: 'Good morning, Khalid', ar: 'صباح الخير يا خالد' },
      oneThingEyebrow: { en: 'YOUR ONE THING TODAY', ar: 'شغلك الأساسي اليوم' },
      oneThingTitle: { en: 'Finish the investor proposal', ar: 'أخلّص عرض المستثمرين' },
      focusMeta: { en: 'Focus session · 45 min', ar: 'جلسة تركيز · 45 دقيقة' },
      lockIn: { en: 'Lock In', ar: 'ابدأ التركيز' },
      // quickActions: the design's "QUICK ACTIONS" eyebrow; the redesign shows
      // the four circles without one, so there is no text to measure.
      smallPromises: {
        en: 'Small promises',
        ar: 'التزاماتك الصغيرة',
        app: { en: 'Next', ar: 'التالي' },
      },
      firstRow: { en: 'Follow up on price quote', ar: 'متابعة عرض السعر' },
    },
  },
  // The welcome. Unlike most screens built after the handoff, the prototype
  // drew this one, so it can be measured rather than eyeballed.
  onboarding: {
    app: '/onboarding',
    proto: '07',
    state: { signedIn: true, firstRun: true },
    labels: {
      eyebrow: { en: 'THE ONE THING', ar: 'ذا ون ثينق' },
      title: { en: 'Your day, under control.', ar: 'يومك تحت السيطرة.' },
      sub: {
        en: 'One thing that matters. Every small promise kept — calls, messages, follow-ups.',
        ar: 'شي واحد مهم. وكل التزاماتك الصغيرة محفوظة — مكالمات، رسايل، ومتابعات.',
      },
      skip: { en: 'Skip', ar: 'تخطّي' },
    },
  },
  settings: {
    app: '/settings',
    proto: '13',
    state: { signedIn: true, firstRun: false },
    labels: {
      title: { en: 'Settings', ar: 'الإعدادات' },
      name: { en: 'Khalid Al-Mansouri', ar: 'خالد المنصوري' },
      pro: { en: 'Try Pro free for 7 days', ar: 'جرّب Pro مجاناً ٧ أيام' },
      reminders: { en: 'Reminders', ar: 'التذكيرات' },
      language: { en: 'Language', ar: 'اللغة' },
      coffee: { en: 'Buy us a coffee', ar: 'اعزمنا على قهوة' },
      // restore: moved to the paywall, where the store requires it to be and
      // where the purchase is actually made (app/settings.tsx).
      signOut: { en: 'Sign out', ar: 'تسجيل خروج' },
    },
  },
  people: {
    app: '/people',
    proto: '11',
    state: { signedIn: true, firstRun: false, seedPeople: true },
    labels: {
      title: { en: 'People', ar: 'الأشخاص' },
      // subtitle and the RECENT eyebrow: the People redesign replaced both with
      // the filter chips (All / Waiting / Favorites / Recent).
      firstRow: { en: 'Mohammed Al-Saadi', ar: 'محمد السعدي' },
      secondRow: { en: 'Sara Haddad', ar: 'سارة حداد' },
    },
  },
  // Still unprobed, and deliberately so after an attempt on 18 October:
  // priority, tasks and brain-dump (plus sign-in, account setup and the
  // new-contact form). The first two are the furthest of all forty pairs
  // from the design — 31.6% and 26.5% — so a gate on them would be worth
  // having, but the labels have to be chosen against both rendered DOMs,
  // not from `C`. A quick pass using the ported strings resolved one label
  // in eight: `pr_k` is 'GOOD MORNING, KHALID' where the app renders
  // 'Good morning, Khalid', the placeholders are `placeholder` attributes
  // rather than text, and in Arabic `pr_k` is byte-identical to the Today
  // greeting, so the one label that did resolve was not necessarily the
  // element meant (BUILD-REVIEW §2.99).
  followups: {
    app: '/followups',
    proto: '19',
    state: { signedIn: true, firstRun: false, seedPeople: true },
    // Not the title: "Follow-ups" is also the tab label, which the probe
    // would pick instead, as the smaller element.
    labels: {
      summary: { en: '1 need a nudge · 2 waiting on a reply', ar: '1 يحتاجون متابعة · 2 ننتظر ردهم' },
      who: { en: 'Noura', ar: 'نورة' },
      what: { en: 'Logo final files', ar: 'ملفات الشعار النهائية' },
      since: { en: '3 days, no reply', ar: '3 أيام بدون رد' },
    },
  },
  compose: {
    app: '/compose?id=t1',
    proto: '18',
    state: { signedIn: true, firstRun: false, seedTasks: true, seedPeople: true },
    labels: {
      title: { en: 'Follow up on price quote', ar: 'متابعة عرض السعر' },
      who: { en: 'Mohammed Al-Saadi', ar: 'محمد السعدي' },
      phoneLabel: { en: 'WhatsApp number', ar: 'رقم الواتساب' },
      phoneMessage: { en: 'Add their number once — I’ll remember it.', ar: 'أضف رقمه مرة وحدة، وأنا أحفظه.' },
      goalLabel: { en: 'Goal', ar: 'الهدف' },
      goal: {
        en: 'Confirm he received the quote and get a yes/no by Sunday',
        ar: 'أتأكد إنه وصله العرض وآخذ رد قبل الأحد',
      },
      lastTime: { en: 'Sent the price quote', ar: 'أرسلت عرض السعر' },
      draftLabel: { en: 'Draft', ar: 'المسودة' },
    },
  },
  contact: {
    app: '/contact?id=c1',
    proto: '06',
    state: { signedIn: true, firstRun: false, seedTasks: true, seedPeople: true },
    // Not the day headings: the demo history is dated from today, and the
    // prototype's from its frozen 9 October.
    labels: {
      name: { en: 'Mohammed Al-Saadi', ar: 'محمد السعدي' },
      role: { en: 'Client', ar: 'عميل' },
      nextTask: { en: 'Follow up on price quote', ar: 'متابعة عرض السعر' },
      // email, remember and history: the address is now an action row rather
      // than printed text, "Remember for next time" became the note field's
      // placeholder (no textContent to measure), and the history is a count
      // above the thread instead of a heading.
      count: { en: '4 moments', ar: '4 لحظات' },
    },
  },
  'contact-new': {
    app: '/contact-edit',
    proto: '12',
    state: { signedIn: true, firstRun: false, seedPeople: true },
    labels: {
      title: { en: 'New contact', ar: 'شخص جديد' },
      details: { en: 'Contact details (optional)', ar: 'التواصل (اختياري)' },
      pref: { en: 'Usually reach them by', ar: 'عادةً تتواصل معه عن طريق' },
      notes: { en: 'Notes for next time', ar: 'ملاحظات للمرة الجاية' },
      save: { en: 'Save contact', ar: 'احفظ جهة الاتصال' },
    },
  },
  event: {
    app: '/new?type=meeting',
    proto: '05',
    state: { signedIn: true, firstRun: false, seedPeople: true },
    labels: {
      head: { en: 'New meeting', ar: 'اجتماع جديد' },
      titleLabel: { en: 'Meeting about', ar: 'الاجتماع عن' },
      // where and link: both still exist, behind the collapsed "More" disclosure
      // the redesign added, so neither is rendered when the form opens.
      who: { en: 'Who', ar: 'مع مين' },
      day: { en: 'Day', ar: 'اليوم' },
      time: { en: 'Time', ar: 'الوقت' },
    },
  },
  focus: {
    app: '/focus',
    proto: '14',
    state: { signedIn: true, firstRun: false, seedTasks: true, oneThing: true },
    labels: {
      lockedIn: { en: 'LOCKED IN', ar: 'في وضع التركيز' },
      oneThing: { en: 'Finish the investor proposal', ar: 'أخلّص عرض المستثمرين' },
      remaining: { en: 'remaining', ar: 'باقي' },
      park: { en: 'Remembered something? Park it.', ar: 'تذكّرت شي؟ سجّله وارجع.' },
    },
  },
  overwhelm: {
    app: '/overwhelm',
    proto: '15',
    state: { signedIn: true, firstRun: false, seedTasks: true, oneThing: true },
    labels: {
      eyebrow: { en: 'TOO MUCH? LET’S SHRINK IT', ar: 'كثير عليك؟ نصغّرها' },
      title: { en: 'Just the next tiny step.', ar: 'بس الخطوة الصغيرة الجاية.' },
      step: { en: 'Open the proposal doc', ar: 'افتح ملف العرض' },
      sprint: { en: 'Start a 5-min sprint', ar: 'ابدأ 5 دقايق بس' },
    },
  },
  review: {
    app: '/review',
    proto: '21',
    state: { signedIn: true, firstRun: false, seedTasks: true, oneThing: true },
    labels: {
      eyebrow: { en: 'EVENING REVIEW', ar: 'مراجعة المسا' },
      title: { en: 'How did today go?', ar: 'كيف كان يومك؟' },
      oneThingLabel: { en: 'Your One Thing', ar: 'شغلك الأساسي' },
      promises: { en: 'Promises', ar: 'الالتزامات' },
      closeDay: { en: 'Close the day', ar: 'سكّر اليوم' },
    },
  },
  'sign-in': {
    app: '/sign-in',
    proto: '01',
    state: {},
    labels: {
      hero: { en: 'Your day, under control.', ar: 'يومك تحت السيطرة.' },
      apple: { en: 'Continue with Apple', ar: 'المتابعة مع Apple' },
      google: { en: 'Continue with Google', ar: 'المتابعة مع Google' },
    },
  },
  capture: {
    app: '/capture',
    proto: '16',
    state: { signedIn: true, firstRun: false },
    labels: {
      title: { en: 'Say it. Forget it.', ar: 'قلها وانساها.' },
      subtitle: { en: 'Tap and talk. I’ll catch who, what and when.', ar: 'اضغط وتكلّم، وأنا ألقط مين ووش ومتى.' },
      orType: { en: 'or type it', ar: 'أو اكتبها' },
    },
  },
  'brain-dump': {
    app: '/brain-dump',
    proto: '17',
    state: { signedIn: true, firstRun: false },
    labels: {
      eyebrow: { en: 'BRAIN DUMP', ar: 'فضفضة' },
      title: { en: 'Empty your head.', ar: 'فضّي راسك.' },
      subtitle: {
        en: 'Type or talk it all out, messy is fine. I’ll split it into separate things.',
        ar: 'اكتب أو تكلّم بكل اللي في بالك، حتى لو مخربط. أنا أقسّمه لأشياء منفصلة.',
      },
      talk: { en: 'Talk instead', ar: 'تكلّم بدال' },
      sort: { en: 'Sort it for me', ar: 'رتّبها لي' },
    },
  },
  assistant: {
    app: '/assistant',
    proto: '20',
    state: { signedIn: true, firstRun: false, seedTasks: true, seedPeople: true, oneThing: true },
    labels: {
      title: { en: 'Assistant', ar: 'المساعد' },
      oneThing: { en: 'Finish the investor proposal', ar: 'أخلّص عرض المستثمرين' },
      greeting: {
        en: 'Morning Khalid. Your One Thing is set. Anything rattling around your head? Dump it here — I’ll sort it.',
        ar: 'صباح الخير يا خالد. شغلك الأساسي جاهز. في شي شاغل بالك؟ قوله هنا وأنا أرتّبه.',
      },
      /**
       * The chip row holds this person's own short labels now (§2.92), so
       * the prototype's "Arrange my day" is the *sentence* a chip sends
       * rather than the words on it. What is measured here is the top of
       * the row, which has not moved.
       */
      chip: { en: 'Arrange my day', ar: 'رتّب لي يومي', app: { en: 'My day', ar: 'يومي' } },
    },
  },
  paywall: {
    app: '/paywall',
    proto: '04',
    // The prototype's demo account has no name, so its title has none; with
    // one, the Arabic title takes a third line. Measured nameless, like for like.
    state: { signedIn: true, firstRun: false, session: { firstName: '' } },
    labels: {
      badge: { en: 'THE ONE THING PRO', ar: 'ذا ون ثينق PRO' },
      subtitle: {
        en: 'Everything in Free, plus the tools that keep every client warm.',
        ar: 'كل اللي في المجاني، وأدوات تخلّي علاقتك مع عملائك دافية.',
      },
      firstFeature: { en: 'Unlimited smart assistant', ar: 'مساعد ذكي بلا حدود' },
      // recap: Weekly recap came off the paywall deliberately — it was sold
      // on a live paywall and did not exist, so a Pro buyer got nothing for
      // that bullet (RELEASE.md § 9.5). Unsold, not cancelled.
      yearly: { en: 'Yearly', ar: 'سنوي' },
      monthly: { en: 'Monthly', ar: 'شهري' },
      cta: { en: 'Start 7-day free trial', ar: 'ابدأ تجربة ٧ أيام مجاناً' },
    },
  },
};

const DEMO_SESSION = {
  en: { userId: 'drift', name: 'Khalid Al-Mansouri', firstName: 'Khalid', jobTitle: 'Founder · Qahwa House', authProvider: 'apple', plan: 'free' },
  ar: { userId: 'drift', name: 'خالد المنصوري', firstName: 'خالد', jobTitle: 'مؤسس · بيت القهوة', authProvider: 'apple', plan: 'free' },
};
const DEMO_ONE_THING = { en: 'Finish the investor proposal', ar: 'أخلّص عرض المستثمرين' };

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.jsx': 'text/javascript', '.css': 'text/css', '.ttf': 'font/ttf', '.png': 'image/png', '.json': 'application/json' };

function staticServer(dir, { spa = false, fontDir = null } = {}) {
  return http.createServer((req, res) => {
    const url = decodeURIComponent((req.url || '/').split('?')[0]);
    if (fontDir && url.startsWith('/__font/')) {
      res.writeHead(200, { 'content-type': 'font/ttf' });
      return res.end(fs.readFileSync(path.join(fontDir, url.replace('/__font/', ''))));
    }
    let file = path.join(dir, url);
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      const asHtml = path.join(dir, url + '.html');
      file = fs.existsSync(asHtml) ? asHtml : spa ? path.join(dir, 'index.html') : file;
    }
    if (!fs.existsSync(file)) {
      res.writeHead(404);
      return res.end();
    }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(fs.readFileSync(file));
  });
}

/**
 * Tops of each labelled element, relative to the screen's own top.
 *
 * The tightest element wrapping the text is the one to measure, on both
 * sides. The prototype's template wraps every interpolation in an inline
 * <span>, and React Native renders its own box around the same text, so the
 * two line up: text box against text box.
 *
 * Do not be tempted to skip that span. It looks like noise — an inline run's
 * rect is a glyph box rather than a layout box — but it is what every button
 * label in the prototype measures as, and dropping it falls back to the
 * button, which is 15 pt taller. Tried once; it turned 2 failures into 16,
 * across five screens nobody had touched.
 *
 * The cost is that where a glyph box overflows its line box — large text on a
 * tight line-height — the two sides differ by a point or two for no layout
 * reason. That is what KNOWN_DEVIATIONS is for.
 */
const TOPS = ({ labels, scopeSelector }) => {
  const scope = scopeSelector ? document.querySelector(scopeSelector) : document.body;
  const origin = scope.getBoundingClientRect().top;
  const sameText = (el) => (el.textContent || '').trim();
  const out = {};
  for (const [name, text] of Object.entries(labels)) {
    let best = null;
    scope.querySelectorAll('*').forEach((el) => {
      if (sameText(el) !== text) return;
      const r = el.getBoundingClientRect();
      if (!best || r.height < best.getBoundingClientRect().height) best = el;
    });
    out[name] = best ? Math.round((best.getBoundingClientRect().top - origin) * 10) / 10 : null;
  }
  return out;
};

async function measureApp(lang, screen, probe) {
  const server = staticServer(DIST, { spa: true });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;

  const browser = await launchChromium();
  const ctx = await browser.newContext({ viewport: FRAME, deviceScaleFactor: 2, locale: lang === 'ar' ? 'ar-SA' : 'en-GB' });
  const page = await ctx.newPage();
  const frozen = new Date();
  frozen.setHours(9, 20, 0, 0);
  await page.clock.setFixedTime(frozen);

  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    ({ session, tasks, oneThing, contacts, followUps, history }) => {
      const put = (k, v) => (v ? localStorage.setItem(k, JSON.stringify(v)) : localStorage.removeItem(k));
      put('ot.session', session);
      put('ot.tasks', tasks);
      put('ot.oneThing', oneThing);
      put('ot.contacts', contacts);
      put('ot.followups', followUps);
      put('ot.history', history);
    },
    {
      // `state.session` overrides fields of the demo session for one probe.
      session: probe.state.signedIn ? { ...DEMO_SESSION[lang], firstRun: probe.state.firstRun !== false, ...probe.state.session } : null,
      tasks: probe.state.seedTasks ? demoTasks(lang, new Date()) : null,
      oneThing: probe.state.oneThing
        ? { date: dateKey(new Date()), done: false, focusMinutes: 45, title: DEMO_ONE_THING[lang] }
        : null,
      contacts: probe.state.seedPeople ? demoContacts(lang, new Date()) : null,
      followUps: probe.state.seedPeople ? demoFollowUps(lang) : null,
      history: probe.state.seedPeople ? demoHistory(lang, new Date()) : null,
    }
  );
  await page.goto(`http://127.0.0.1:${port}${probe.app}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);

  // `app` overrides the text on this side only: where the build renamed a
  // heading the design still calls something else, the element is the same
  // one and is worth measuring. Without it a rename can only be deleted.
  const labels = Object.fromEntries(
    Object.entries(probe.labels).map(([k, v]) => [k, (v.app ?? v)[lang]])
  );
  const tops = await page.evaluate(TOPS, { labels, scopeSelector: null });
  await browser.close();
  server.close();
  return tops;
}

async function measurePrototype(lang, probe, designDir) {
  const server = staticServer(designDir, { fontDir: FONT_DIR });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;

  const css = FACES.map(
    ([w, f]) => `@font-face{font-family:'IBM Plex Sans Arabic';font-weight:${w};font-display:block;src:url(http://127.0.0.1:${port}/__font/${f}) format('truetype');}`
  ).join('\n');

  const browser = await launchChromium();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 1100 }, deviceScaleFactor: 2 });
  await ctx.route(/unpkg\.com/, (r) => {
    const local = CDN[r.request().url().replace('https://unpkg.com/', '')];
    return local
      ? r.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(ROOT, local)) })
      : r.fulfill({ status: 404, body: '' });
  });
  await ctx.route(/fonts\.googleapis\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/css', body: css }));

  const page = await ctx.newPage();
  await page.goto(`http://127.0.0.1:${port}/${encodeURIComponent('The One Thing v5.dc.html')}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await page.evaluate(() => document.fonts.ready);

  if (lang === 'ar') {
    await page.locator('aside button', { hasText: 'العربية' }).first().click();
    await page.waitForTimeout(700);
  }

  const buttons = page.locator('aside button');
  const count = await buttons.count();
  for (let i = 0; i < count; i++) {
    const label = (await buttons.nth(i).innerText()).trim();
    if (label.startsWith(probe.proto)) {
      await buttons.nth(i).click();
      break;
    }
  }
  await page.waitForTimeout(800);

  // The prototype always uses the design's own wording, never the override.
  const labels = Object.fromEntries(Object.entries(probe.labels).map(([k, v]) => [k, v[lang]]));
  const tops = await page.evaluate(TOPS, { labels, scopeSelector: '[dir="ltr"],[dir="rtl"]' });
  await browser.close();
  server.close();
  return tops;
}

(async () => {
  // The handoff is in the repo, so the only argument worth typing is the
  // screen to narrow to: `npm run drift -- tasks`. A different copy of the
  // handoff goes in HANDOFF= or after --handoff.
  const args = process.argv.slice(2);
  const save = args.includes('--save');
  if (save) args.splice(args.indexOf('--save'), 1);
  const flag = args.indexOf('--handoff');
  const explicit = flag === -1 ? undefined : args[flag + 1];
  if (flag !== -1) args.splice(flag, 2);
  const designDir = path.join(handoffDir(explicit), 'design');
  const only = args[0];
  if (only && !(only in PROBES)) {
    throw new Error(`No probes for "${only}". Screens: ${Object.keys(PROBES).join(', ')}`);
  }
  const results = [];

  for (const [screen, probe] of Object.entries(PROBES)) {
    if (only && screen !== only) continue;
    for (const lang of ['en', 'ar']) {
      const app = await measureApp(lang, screen, probe);
      const proto = await measurePrototype(lang, probe, designDir);
      for (const name of Object.keys(probe.labels)) {
        const a = app[name];
        const p = proto[name];
        results.push({
          screen,
          lang,
          element: name,
          app: a,
          prototype: p,
          drift: a === null || p === null ? null : Math.round((a - p) * 10) / 10,
        });
      }
    }
  }

  const key = (r) => `${r.screen}/${r.lang}/${r.element}`;
  const measured = results.filter((r) => r.drift !== null);
  const unresolved = results.filter((r) => r.drift === null);

  if (save) {
    const next = Object.fromEntries(
      results.filter((r) => r.app !== null).map((r) => [key(r), r.app])
    );
    fs.writeFileSync(BASELINE_FILE, JSON.stringify(next, null, 2) + '\n');
    console.log(`Wrote ${Object.keys(next).length} positions to ${path.relative(process.cwd(), BASELINE_FILE)}.`);
    console.log('Read the diff before committing it.');
    process.exit(0);
  }

  // Against build 9 where we have it, against the design where we do not.
  const since = (r) => (key(r) in BASELINE ? Math.round((r.app - BASELINE[key(r)]) * 10) / 10 : null);
  const off = (r) => (key(r) in BASELINE ? since(r) : r.drift);
  const over = measured.filter((r) => Math.abs(off(r)) > TOLERANCE_PT);
  const failing = over
    .filter((r) => !(key(r) in KNOWN_DEVIATIONS))
    .map((r) => (key(r) in BASELINE ? { ...r, movedSinceBuild9: since(r), designDelta: r.drift } : r));
  const accepted = over
    .filter((r) => key(r) in KNOWN_DEVIATIONS)
    .map((r) => ({ ...r, reason: KNOWN_DEVIATIONS[key(r)] }));

  console.log(
    JSON.stringify(
      {
        tolerancePt: TOLERANCE_PT,
        probes: results.length,
        baselined: measured.filter((r) => key(r) in BASELINE).length,
        worstDrift: measured.reduce(
          (m, r) => (key(r) in KNOWN_DEVIATIONS ? m : Math.max(m, Math.abs(off(r)))),
          0
        ),
        // The five furthest out, so a drift creeping up on the tolerance is
        // visible before it crosses it.
        worst: [...measured]
          .filter((r) => !(key(r) in KNOWN_DEVIATIONS))
          .sort((a, b) => Math.abs(off(b)) - Math.abs(off(a)))
          .slice(0, 5)
          .map((r) => `${key(r)} ${off(r) > 0 ? '+' : ''}${off(r)}`),
        // How far build 9 sits from the design. Not a failure — the record of
        // what accepting it cost, so nobody has to re-derive it later.
        furthestFromDesign: [...measured]
          .sort((a, b) => Math.abs(b.drift) - Math.abs(a.drift))
          .slice(0, 5)
          .map((r) => `${key(r)} ${r.drift > 0 ? '+' : ''}${r.drift}`),
        // A deviation we no longer need is a claim that has stopped being
        // true, so it is reported rather than left in the file.
        // Only for screens this run actually measured — narrowing to one
        // screen would otherwise report every other screen's deviation as
        // stale.
        // Only for probes the baseline does not cover: where it does, the
        // deviation never applies, so calling it stale would report every
        // entry on every run and teach everyone to skim past this field.
        staleDeviations: Object.keys(KNOWN_DEVIATIONS).filter(
          (k) =>
            !(k in BASELINE) &&
            measured.some((r) => r.screen === k.split('/')[0]) &&
            !over.some((r) => key(r) === k)
        ),
        // A baseline entry for a probe that no longer exists is a position
        // nothing is holding any more.
        staleBaseline: Object.keys(BASELINE).filter(
          (k) => measured.some((r) => r.screen === k.split('/')[0]) && !results.some((r) => key(r) === k)
        ),
        failing,
        accepted,
        unresolved: unresolved.map((r) => `${r.screen}/${r.lang}/${r.element}`),
      },
      null,
      2
    )
  );
  process.exit(failing.length || unresolved.length ? 1 : 0);
})();
