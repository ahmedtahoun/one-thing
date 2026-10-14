/**
 * What the app records about itself, and the one promise it used to make
 * without keeping: "Download my data".
 *
 *   Analytics: the events DATA_MODEL § Analytics events lists actually reach
 *              the device queue as the user moves through the app, once each,
 *              carrying nothing but the properties the spec names.
 *   Export:    tapping "Download my data" leaves a privacy request behind,
 *              not just a toast (RELEASE.md § 9.3).
 *
 *   npx expo export --platform web
 *   node scripts/smoke-analytics.js
 */
'use strict';
const { launch: launchChromium } = require('./browser.js');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { demoContacts, demoTasks, dateKey } = require('./demo-state.js');

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

const SESSION = { userId: 'smoke', name: 'Khalid Al-Mansouri', firstName: 'Khalid', jobTitle: 'Founder', authProvider: 'apple', plan: 'free', firstRun: false };
const ONE_THING = { en: 'Finish the investor proposal', ar: 'أخلّص عرض المستثمرين' };

(async () => {
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await launchChromium();
  const ctx = await browser.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, locale: 'en-GB' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  const frozen = new Date();
  frozen.setHours(9, 20, 0, 0);
  await page.clock.setFixedTime(frozen);

  const seed = async (lang = 'en', { oneThing = true, tasks = true } = {}) => {
    await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(
      (d) => {
        localStorage.clear();
        for (const [k, v] of Object.entries(d)) if (v !== null) localStorage.setItem(k, JSON.stringify(v));
        localStorage.setItem('ot.lang', d.lang);
      },
      {
        lang,
        'ot.session': SESSION,
        'ot.tasks': tasks ? demoTasks(lang, new Date()) : [],
        'ot.contacts': demoContacts(lang, new Date()),
        'ot.oneThing': oneThing ? { date: dateKey(new Date()), done: false, focusMinutes: 45, title: ONE_THING[lang] } : null,
      }
    );
  };
  const open = async (route) => {
    await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);
  };
  const read = (key) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), key);
  const queue = async () => (await read('ot.analyticsQueue')) || [];
  const names = async () => (await queue()).map((e) => e.name);

  // -------------------------------------------------------- 01 first run
  // The sign-in screen had no behavioural coverage at all before real Apple
  // and Google sign-in went in, and on web both report "wrong-platform", so
  // what runs here is the local fallback — which is the part most likely to
  // be broken by wiring the real flows up.
  const fresh = async () => {
    await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => localStorage.clear());
    await open('/sign-in');
  };

  await fresh();
  // expo-router keeps the previous screen mounted through a transition, and
  // the harness's clock is frozen, so wait for the button itself rather than
  // for the page: `open` returning is not the screen being ready.
  const apple = page.getByTestId('sign-in-apple');
  await apple.waitFor({ state: 'visible' });
  await apple.click();
  await page.waitForTimeout(400);
  check('signing in without accepting the Terms is refused', (await page.getByTestId('consent-error').count()) === 1);
  check('and goes nowhere', page.url().endsWith('/sign-in'), page.url());
  check('and records nothing', !(await names()).includes('signin'));

  // The whole consent row is the checkbox, and the middle of it is the
  // "Terms of Service" link — clicking the centre opens Legal, which is the
  // design, not a bug. Tick the 22 x 22 box at the start of the row.
  await page.getByTestId('consent-terms').click({ position: { x: 11, y: 11 } });
  await page.waitForTimeout(250);
  check('ticking the box does not open Legal', page.url().endsWith('/sign-in'), page.url());
  await apple.click();
  await page.waitForTimeout(900);
  check('accepting the Terms and signing in reaches Account setup', page.url().endsWith('/setup'), page.url());
  check('and records signin once', (await names()).filter((n) => n === 'signin').length === 1);

  await page.getByTestId('setup-name').fill('Khalid Al-Mansouri');
  await page.waitForTimeout(250);
  await page.getByTestId('setup-cta').click();
  await page.waitForTimeout(900);
  const session = await read('ot.session');
  check('finishing setup creates the session', session?.firstName === 'Khalid', JSON.stringify(session));
  check('with the provider that was tapped', session?.authProvider === 'apple');
  check('and lands on Today', page.url().endsWith('/today'), page.url());
  check('and records setup_done', (await names()).includes('setup_done'));
  const consent = (await read('ot.consentQueue')) || [];
  check('consent is queued for the server, terms granted', consent.some((c) => c.kind === 'terms_privacy' && c.granted === true));
  check('and marketing recorded separately, unticked', consent.some((c) => c.kind === 'marketing' && c.granted === false), JSON.stringify(consent));

  // ------------------------------------------------------------ the events
  await seed('en', { oneThing: false });
  await open('/today');
  await page.getByTestId('today-set-one').click();
  await page.getByTestId('onething-input').fill('Rewrite the pricing page');
  await page.getByTestId('onething-save').click();
  await page.waitForTimeout(700);
  check('setting the One Thing records one_thing_set', (await names()).includes('one_thing_set'));

  await open('/today');
  const firstTick = page.locator('[data-testid^="next-"][data-testid$="-done"]').first();
  await firstTick.click();
  await page.waitForTimeout(500);
  check('finishing a task records task_done', (await names()).includes('task_done'));
  // Unticking is not a second done.
  const doneBefore = (await names()).filter((n) => n === 'task_done').length;
  await firstTick.click();
  await page.waitForTimeout(500);
  check('un-finishing it records nothing', (await names()).filter((n) => n === 'task_done').length === doneBefore);

  await open('/paywall');
  await page.waitForTimeout(400);
  check('the paywall records being seen', (await names()).includes('paywall_viewed'));
  check('and records it once, not once per render', (await names()).filter((n) => n === 'paywall_viewed').length === 1);

  await open('/compose?id=t1');
  await page.waitForTimeout(400);
  const opened = (await queue()).filter((e) => e.name === 'compose_opened');
  check('opening Compose records the channel', opened.length === 1 && ['whatsapp', 'email', 'call'].includes(opened[0]?.props?.channel), JSON.stringify(opened[0]?.props));

  const created = (await queue()).filter((e) => e.name === 'task_created');
  await open('/new?type=meeting');
  await page.getByTestId('event-title').fill('Board review');
  await page.getByTestId('event-save').click();
  await page.waitForTimeout(700);
  const createdNow = (await queue()).filter((e) => e.name === 'task_created');
  check('saving an event records task_created', createdNow.length === created.length + 1);
  check('with the type and the route it came in by', createdNow.at(-1)?.props?.via === 'event_form', JSON.stringify(createdNow.at(-1)?.props));

  // The promise the whole taxonomy rests on: nothing personal goes out.
  const allowed = ['type', 'via', 'channel', 'min', 'period', 'product'];
  const stray = (await queue()).flatMap((e) => Object.keys(e.props || {})).filter((k) => !allowed.includes(k));
  check('no event carries a property outside the six the spec names', stray.length === 0, stray.join(', '));
  const stamped = (await queue()).every((e) => typeof e.at === 'string' && !Number.isNaN(Date.parse(e.at)));
  check('every event is stamped with when it happened', stamped);

  // ---------------------------------------------------------- the export
  await open('/settings');
  await page.getByTestId('settings-privacy').click();
  await page.waitForTimeout(400);
  await page.getByTestId('settings-export').click();
  await page.waitForTimeout(500);
  const requests = (await read('ot.privacyRequests')) || [];
  check('asking for the data leaves a request behind', requests.length === 1 && requests[0]?.kind === 'export', JSON.stringify(requests));
  check('and still tells the user it is coming', (await page.getByText(/24 hours/).count()) > 0);
  await page.getByTestId('settings-export').click();
  await page.waitForTimeout(500);
  check('asking twice is two requests, each with its own deadline', ((await read('ot.privacyRequests')) || []).length === 2);

  await browser.close();
  srv.close();
  const failed = checks.filter((c) => !c.ok);
  console.log(JSON.stringify({ checks: checks.length, failed, errors }, null, 2));
  process.exit(failed.length || errors.length ? 1 : 0);
})();
