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
const { chromium } = require('playwright');
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

const KNOWN_DEVIATIONS = {
  'sign-in/en/hero':
    "The prototype's consent checkbox measures 25 px (CSS content-box plus its " +
    '1.5 px borders) against the 22 × 22 SCREENS.md § 01 specifies, which is ' +
    'enough to wrap "…and Privacy / Policy." onto a second line there and not ' +
    'here. That extra line lifts the vertically-centred hero. We follow the ' +
    'written spec — BUILD-REVIEW.md §2.11.',
  'people/en/recent': PEOPLE_SEARCH,
  'people/en/firstRow': PEOPLE_SEARCH,
  'people/en/secondRow': PEOPLE_SEARCH,
  'people/ar/recent': PEOPLE_SEARCH,
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
      quickActions: { en: 'QUICK ACTIONS', ar: 'إجراءات سريعة' },
      smallPromises: { en: 'Small promises', ar: 'التزاماتك الصغيرة' },
      firstRow: { en: 'Follow up on price quote', ar: 'متابعة عرض السعر' },
    },
  },
  tasks: {
    app: '/tasks',
    proto: '10',
    state: { signedIn: true, firstRun: false, seedTasks: true, oneThing: true },
    labels: {
      title: { en: 'Tasks', ar: 'المهام' },
      progress: { en: '2 of 12 done today', ar: '2 من 12 تمّت اليوم' },
      upNextEyebrow: { en: 'UP NEXT', ar: 'الجاي' },
      upNextTitle: { en: 'Follow up on price quote', ar: 'متابعة عرض السعر' },
      upNextAction: { en: 'Open WhatsApp draft', ar: 'افتح مسودة الواتساب' },
      morning: { en: 'This morning', ar: 'الصبح' },
      afternoon: { en: 'This afternoon', ar: 'الظهر والعصر' },
      firstAfternoonRow: { en: 'Confirm Friday catering order', ar: 'تأكيد طلب ضيافة الجمعة' },
      evening: { en: 'This evening', ar: 'المسا' },
      tomorrow: { en: 'Tomorrow', ar: 'بكرة' },
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
      restore: { en: 'Restore purchases', ar: 'استرجاع المشتريات' },
      signOut: { en: 'Sign out', ar: 'تسجيل خروج' },
    },
  },
  people: {
    app: '/people',
    proto: '11',
    state: { signedIn: true, firstRun: false, seedPeople: true },
    labels: {
      title: { en: 'People', ar: 'الأشخاص' },
      subtitle: { en: 'Everyone you’ve emailed, called or messaged.', ar: 'كل اللي راسلتهم أو كلمتهم قبل.' },
      recent: { en: 'RECENT', ar: 'الأخيرين' },
      firstRow: { en: 'Mohammed Al-Saadi', ar: 'محمد السعدي' },
      secondRow: { en: 'Sara Haddad', ar: 'سارة حداد' },
    },
  },
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

/** Tops of each labelled element, relative to the screen's own top. */
const TOPS = ({ labels, scopeSelector }) => {
  const scope = scopeSelector ? document.querySelector(scopeSelector) : document.body;
  const origin = scope.getBoundingClientRect().top;
  const out = {};
  for (const [name, text] of Object.entries(labels)) {
    let best = null;
    scope.querySelectorAll('*').forEach((el) => {
      if ((el.textContent || '').trim() !== text) return;
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

  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
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
      session: probe.state.signedIn ? { ...DEMO_SESSION[lang], firstRun: probe.state.firstRun !== false } : null,
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

  const labels = Object.fromEntries(Object.entries(probe.labels).map(([k, v]) => [k, v[lang]]));
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

  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
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
  const over = results.filter((r) => r.drift !== null && Math.abs(r.drift) > TOLERANCE_PT);
  const failing = over.filter((r) => !(key(r) in KNOWN_DEVIATIONS));
  const accepted = over
    .filter((r) => key(r) in KNOWN_DEVIATIONS)
    .map((r) => ({ ...r, reason: KNOWN_DEVIATIONS[key(r)] }));

  console.log(
    JSON.stringify(
      {
        tolerancePt: TOLERANCE_PT,
        probes: results.length,
        worstDrift: measured.reduce(
          (m, r) => (key(r) in KNOWN_DEVIATIONS ? m : Math.max(m, Math.abs(r.drift))),
          0
        ),
        // The five furthest out, so a drift creeping up on the tolerance is
        // visible before it crosses it.
        worst: [...measured]
          .filter((r) => !(key(r) in KNOWN_DEVIATIONS))
          .sort((a, b) => Math.abs(b.drift) - Math.abs(a.drift))
          .slice(0, 5)
          .map((r) => `${key(r)} ${r.drift > 0 ? '+' : ''}${r.drift}`),
        // A deviation we no longer need is a claim that has stopped being
        // true, so it is reported rather than left in the file.
        staleDeviations: Object.keys(KNOWN_DEVIATIONS).filter(
          (k) => !over.some((r) => key(r) === k)
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
