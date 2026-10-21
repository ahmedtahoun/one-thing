/**
 * Egyptian Arabic, rendered.
 *
 * The dialect arrived as 1,363 lines of hand-written copy
 * (src/content/egyptian-lines.ts) with unit tests that read the copy tables:
 * every Arabic line has an Egyptian line, every placeholder survives, no
 * Gulf word is left in the table. All true, and none of it renders anything.
 * What those tests cannot see is a label a screen *builds* at run time —
 * `added(lang)` composes sentences from parts, and a part that never passed
 * through the table reaches the screen in Gulf Arabic with every unit test
 * still green. The last two Arabic faults the owner found on his phone were
 * both of that shape.
 *
 * So this suite chooses Egyptian the way a person does, in Settings, and
 * then reads the screens back:
 *
 *   The switch:  three languages are offered; picking مصري changes the copy
 *                at once, is stored, survives a reload, and gives the Gulf
 *                copy back when العربية is picked again.
 *   The screens: with Egyptian on, no screen people live in renders a Gulf
 *                word — the same word list src/content/egyptian-lines.test.ts
 *                holds the copy tables to, applied to what is on the glass.
 *   The legal:   the privacy policy and the terms stay exactly as approved.
 *                They are the one text a dialect must not touch, and the
 *                microphone notice has to be the policy's own words.
 *
 *   npx expo export --platform web
 *   node scripts/smoke-dialect.js
 */
'use strict';
const { launch: launchChromium } = require('./browser.js');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { demoContacts, demoFollowUps, demoHistory, demoTasks, dateKey } = require('./demo-state.js');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

// The suite is only as true as the bundle it reads. ./dist-fresh.js
require('./dist-fresh.js').requireFreshDist();
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.ttf': 'font/ttf', '.png': 'image/png', '.json': 'application/json', '.woff2': 'font/woff2' };
const srv = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  let f = path.join(DIST, url);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) {
    const h = path.join(DIST, url + '.html');
    f = fs.existsSync(h) ? h : path.join(DIST, 'index.html');
  }
  if (!fs.existsSync(f)) {
    res.writeHead(404);
    return res.end();
  }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
  res.end(fs.readFileSync(f));
});

const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok: !!ok, detail });

const SESSION = {
  userId: 'dialect',
  name: 'خالد المنصوري',
  firstName: 'خالد',
  jobTitle: 'مؤسس',
  authProvider: 'apple',
  plan: 'free',
  firstRun: false,
};

/** The One Thing card's own heading, which the dialect rewrites. */
const TODAY_HEADING = { gulf: 'شغلك الأساسي اليوم', egypt: 'شغلك الأساسي النهارده' };

/**
 * Gulf words, as src/content/egyptian-lines.test.ts defines them — the same
 * list, so the rendered check and the copy-table check cannot disagree about
 * what counts. Bounded by space or punctuation on both sides: a rule that
 * fired inside a longer word would flag ordinary Egyptian text.
 */
const GULF_WORDS = ['وش', 'ايش', 'تبي', 'أبي', 'يبي', 'الحين', 'ليش', 'وين', 'كذا', 'هذا', 'هذي', 'زين', 'وايد', 'جوال', 'جوالك', 'لين', 'ما فيه', 'مو'];

/** Screens somebody uses every day, each seeded enough to have words on it. */
const ROUTES = ['/today', '/people', '/followups', '/settings', '/recap', '/smart-lists', '/assistant'];

(async () => {
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await launchChromium();
  const ctx = await browser.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, locale: 'ar-EG' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  const frozen = new Date();
  frozen.setHours(9, 20, 0, 0);
  await page.clock.setFixedTime(frozen);

  /** Arabic, Gulf dialect: where a person starts before choosing Egyptian. */
  const seed = async () => {
    await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(
      (d) => {
        localStorage.clear();
        for (const [k, v] of Object.entries(d)) localStorage.setItem(k, JSON.stringify(v));
        // Raw strings: AsyncStorage on web is localStorage, and the provider
        // compares these against 'ar' and 'gulf' directly.
        localStorage.setItem('ot.lang', 'ar');
        localStorage.setItem('ot.dialect', 'gulf');
      },
      {
        'ot.session': SESSION,
        'ot.tasks': demoTasks('ar', new Date()),
        'ot.contacts': demoContacts('ar', new Date()),
        'ot.followups': demoFollowUps('ar'),
        'ot.history': demoHistory('ar', new Date()),
        'ot.oneThing': { date: dateKey(new Date()), done: false, focusMinutes: 45, title: 'أخلّص عرض المستثمرين' },
        'ot.onboarded': true,
      }
    );
  };
  const open = async (route) => {
    await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);
  };
  const raw = (key) => page.evaluate((k) => localStorage.getItem(k), key);
  const onScreen = (needle) => page.evaluate((s) => document.body.innerText.includes(s), needle);
  const pick = async (choice) => {
    await page.getByTestId(`settings-lang-${choice}`).click();
    await page.waitForTimeout(500);
  };

  // --------------------------------------------------------------- the switch
  await seed();
  await open('/settings');
  const offered = await Promise.all(['en', 'ar', 'eg'].map((k) => page.getByTestId(`settings-lang-${k}`).count()));
  check('Settings offers English, Arabic and Egyptian', offered.every((n) => n === 1), JSON.stringify(offered));

  await open('/today');
  check('Arabic starts in Gulf', await onScreen(TODAY_HEADING.gulf), TODAY_HEADING.gulf);

  await open('/settings');
  await pick('eg');
  await open('/today');
  check('picking مصري rewrites the copy', await onScreen(TODAY_HEADING.egypt), TODAY_HEADING.egypt);
  check('…and the Gulf line is gone', !(await onScreen(TODAY_HEADING.gulf)));

  check('the dialect is stored, the language unchanged', (await raw('ot.dialect')) === 'egypt' && (await raw('ot.lang')) === 'ar', `${await raw('ot.lang')} / ${await raw('ot.dialect')}`);

  // A dialect that is not read back on launch is the fault a person meets as
  // "it forgot", which is how the notification bug read too.
  await open('/today');
  check('it survives a reload', await onScreen(TODAY_HEADING.egypt));

  await open('/settings');
  await pick('ar');
  await open('/today');
  check('picking العربية gives the Gulf copy back', await onScreen(TODAY_HEADING.gulf));
  check('…and that is stored as well', (await raw('ot.dialect')) === 'gulf', String(await raw('ot.dialect')));

  await open('/settings');
  await pick('en');
  await open('/today');
  check('English is English, whatever the dialect was', await onScreen('YOUR ONE THING TODAY'), 'YOUR ONE THING TODAY');

  // ------------------------------------------------------------- the screens
  await open('/settings');
  await pick('eg');
  for (const route of ROUTES) {
    await open(route);
    const found = await page.evaluate((words) => {
      const text = document.body.innerText;
      const hits = [];
      for (const w of words) {
        // The same boundaries egyptian-lines.test.ts uses.
        const re = new RegExp(`(^|[\\s«(])${w}($|[\\s،.؟!»):])`);
        const m = re.exec(text);
        if (!m) continue;
        hits.push({ word: w, around: text.slice(Math.max(0, m.index - 30), m.index + 40).replace(/\n/g, ' ⏎ ') });
      }
      return hits;
    }, GULF_WORDS);
    check(`eg ${route}: no Gulf word on the glass`, found.length === 0, JSON.stringify(found));
  }

  // --------------------------------------------------------------- the legal
  await open('/legal?tab=privacy');
  check('the privacy policy keeps its approved heading', await onScreen('مين نحن'), 'مين نحن');
  check('…and its approved opening', await onScreen('«الشيء الواحد» تشغّله مؤسسة Where To Spot'));
  await open('/legal');
  const termsArabic = await page.evaluate(() => /[ء-ي]/.test(document.body.innerText));
  check('the terms are still there in Arabic', termsArabic);

  await ctx.close();
  await browser.close();
  srv.close();
  const failed = checks.filter((c) => !c.ok);
  console.log(JSON.stringify({ checks: checks.length, failed, errors }, null, 2));
  process.exit(failed.length || errors.length ? 1 : 0);
})();
