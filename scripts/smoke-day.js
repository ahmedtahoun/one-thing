/**
 * Drives the five screens that carry a day from morning to night, and asserts
 * what each one does to what is stored.
 *
 *   Priority:   a suggestion is pre-chosen; typing wins over it; saving sets
 *               the One Thing and goes to Today.
 *   Event form: the field table per type; the title gates Save; a meeting
 *               saves as a task with its reminder, platform and attendee.
 *   Overwhelm:  one step at a time, "tinier" prefixes rather than replaces,
 *               finishing a step advances, and the breakdown follows the
 *               language rather than falling back to the generic list.
 *   Focus:      the timer runs and pauses; "I'm done" marks the One Thing.
 *   Review:     marks change nothing until Close the day, which then applies
 *               Kept, Tomorrow and Not needed.
 *   Reschedule: moves a task, and in remind mode moves only the reminder.
 *
 *   npx expo export --platform web
 *   node scripts/smoke-day.js
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
  const text = (id) => page.getByTestId(id).innerText();

  // -------------------------------------------------- 05 Morning priority
  await seed('en', { oneThing: false });
  await open('/priority');
  // The tick is what the person sees, so it is what the test reads.
  const ticked = async (i) => (await page.getByTestId(`priority-tick-${i}`).count()) === 1;
  check('the first suggestion starts chosen', await ticked(0));
  await page.getByTestId('priority-suggestion-1').click();
  await page.waitForTimeout(200);
  check('picking another moves the tick', (await ticked(1)) && !(await ticked(0)));
  await page.getByTestId('priority-input').fill('Rewrite the pricing page');
  await page.waitForTimeout(250);
  check('typing clears the chosen suggestion', !(await ticked(1)));
  await page.getByTestId('priority-save').click();
  await page.waitForTimeout(600);
  const one = await read('ot.oneThing');
  check('saving sets the One Thing to what was typed', one?.title === 'Rewrite the pricing page', String(one?.title));
  check('saving lands on Today', page.url().endsWith('/today'), page.url());

  await seed('en', { oneThing: false });
  await open('/priority');
  await page.getByTestId('priority-save').click();
  await page.waitForTimeout(600);
  check('saving with nothing typed takes the chosen suggestion', (await read('ot.oneThing'))?.title === 'Finish the investor proposal');

  // -------------------------------------------------------- 09 Event form
  await seed('en');
  await open('/new?type=meeting');
  check('a meeting asks where', await page.getByTestId('event-platform-0').isVisible());
  check('a meeting offers a length', await page.getByTestId('event-duration-0').isVisible());
  check('a meeting has no study days', (await page.getByTestId('event-day-0').count()) === 0);
  await page.getByTestId('event-platform-3').click();
  await page.waitForTimeout(250);
  check('choosing In person hides the link', (await page.getByTestId('event-link').count()) === 0);
  check('choosing In person asks for a location', await page.getByTestId('event-location').isVisible());
  await page.getByTestId('event-platform-0').click();
  await page.waitForTimeout(250);

  // The prototype greys Save and its handler returns early; here the button
  // is really disabled, so the check is that it cannot be pressed at all.
  check('an untitled event cannot be saved', await page.getByTestId('event-save').isDisabled());
  check('and the header Save is off too', await page.getByTestId('event-save-header').isDisabled());

  await page.getByTestId('event-title').fill('Q4 pricing review');
  await page.getByTestId('event-who-0').click();
  await page.getByTestId('event-time-14:00').click();
  await page.waitForTimeout(250);
  await page.getByTestId('event-save').click();
  await page.waitForTimeout(700);
  const saved = (await read('ot.tasks')).find((t) => t.title === 'Q4 pricing review');
  check('the meeting saves as a task', !!saved);
  check('it keeps its type', saved?.type === 'meeting', String(saved?.type));
  check('it takes the chosen hour', new Date(saved?.dueAt).getHours() === 14, String(saved?.dueAt));
  check('it carries the default reminder', saved?.remind === 'hour_1', String(saved?.remind));
  check('the reminder gets an instant', !!saved?.remindAt);
  check('it names the platform and the attendee', (saved?.who || '').includes('Zoom'), String(saved?.who));
  check('it records which contact', (saved?.contactIds || []).length === 1);

  await open('/new?type=course');
  check('a course asks for study days', await page.getByTestId('event-day-0').isVisible());
  check('a course tracks progress', await page.getByTestId('event-progress-up').isVisible());
  check('a course has no Day chips', (await page.getByTestId('event-date-0').count()) === 0);
  await page.getByTestId('event-progress-up').click();
  await page.waitForTimeout(200);
  check('the lessons counter moves', (await text('event-progress-label')).startsWith('1 of'), await text('event-progress-label'));

  await open('/new?type=visit');
  check('a visit asks for a location', await page.getByTestId('event-location').isVisible());
  check('a visit has no link', (await page.getByTestId('event-link').count()) === 0);

  // --------------------------------------------------------- 16 Overwhelm
  await seed('en');
  await open('/overwhelm');
  check('it opens on step 1', (await text('overwhelm-step')).includes('Step 1 of 6'), await text('overwhelm-step'));
  const firstStep = await text('overwhelm-step-text');
  await page.getByTestId('overwhelm-tiny').click();
  await page.waitForTimeout(200);
  const tiny = await text('overwhelm-step-text');
  check('"Still too big" prefixes the step rather than replacing it', tiny.includes(firstStep), tiny);
  await page.getByTestId('overwhelm-next').click();
  await page.waitForTimeout(250);
  check('finishing a step advances', (await text('overwhelm-step')).includes('Step 2 of 6'));
  check('and drops back out of tiny', !(await text('overwhelm-step-text')).includes('Only this'));
  for (let i = 0; i < 5; i++) {
    await page.getByTestId('overwhelm-next').click();
    await page.waitForTimeout(120);
  }
  check('the last step ends the list', await page.getByTestId('overwhelm-all-done').isVisible());
  await page.getByTestId('overwhelm-reset').click();
  await page.waitForTimeout(250);
  check('and it can start again', (await text('overwhelm-step')).includes('Step 1 of 6'));

  await seed('ar');
  await open('/overwhelm');
  const arabicStep = await text('overwhelm-step-text');
  check('the Arabic breakdown is the One Thing’s, not the generic list', arabicStep.includes('العرض'), arabicStep);

  // ------------------------------------------------------------- 15 Focus
  await seed('en');
  await open('/focus');
  const started = await text('focus-time');
  check('it starts at the focus length', started === '45:00' || started === '44:59', started);
  await page.getByTestId('focus-pause').click();
  await page.waitForTimeout(1400);
  const paused = await text('focus-time');
  await page.waitForTimeout(1200);
  check('pausing stops the clock', (await text('focus-time')) === paused, paused);
  await page.getByTestId('focus-finish').click();
  await page.waitForTimeout(700);
  check('"I’m done" marks the One Thing done', (await read('ot.oneThing'))?.done === true);
  const sessions = (await read('ot.focusQueue')) || [];
  check(
    'and queues one completed session for the server, once',
    sessions.length === 1 && sessions[0].completed === true && sessions[0].plannedMin === 45,
    JSON.stringify(sessions)
  );

  // ------------------------------------------------------ 20 Daily review
  await seed('en');
  await open('/review');
  // The screen shows the first four by time, so the test has to pick from
  // the same order — the store's own order is not it.
  const openTasks = (await read('ot.tasks'))
    .filter((t) => t.status === 'open' && dateKey(new Date(t.dueAt)) === dateKey(new Date()))
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  const target = openTasks[0];
  await page.getByTestId(`review-keep-${target.id}`).click();
  await page.getByTestId(`review-move-${openTasks[1].id}`).click();
  await page.getByTestId(`review-drop-${openTasks[2].id}`).click();
  await page.waitForTimeout(300);
  const untouched = await read('ot.tasks');
  check('marking changes nothing yet', untouched.find((t) => t.id === target.id).status === 'open');
  await page.getByTestId('review-close-day').click();
  await page.waitForTimeout(700);
  const after = await read('ot.tasks');
  check('Close the day completes what was kept', after.find((t) => t.id === target.id).status === 'done');
  check('and moves what was put off', dateKey(new Date(after.find((t) => t.id === openTasks[1].id).dueAt)) !== dateKey(new Date()));
  check('and cancels what was not needed', after.find((t) => t.id === openTasks[2].id).status === 'cancelled');
  check('the closed state shows', await page.getByTestId('review-plan-tomorrow').isVisible());
  const reviews = (await read('ot.reviewQueue')) || [];
  const decided = Object.fromEntries((reviews[0]?.items || []).map((i) => [i.taskId, i.decision]));
  check(
    'and the answers are queued for the server, in its spelling',
    reviews.length === 1 &&
      reviews[0].date === dateKey(new Date()) &&
      decided[target.id] === 'kept' &&
      decided[openTasks[1].id] === 'tomorrow' &&
      decided[openTasks[2].id] === 'drop',
    JSON.stringify(reviews)
  );

  // --------------------------------------------------------- Reschedule
  await seed('en');
  await open('/reschedule?id=t6');
  await page.getByTestId('reschedule-quick-09:00').click();
  await page.waitForTimeout(250);
  await page.getByTestId('reschedule-apply').click();
  await page.waitForTimeout(700);
  const moved = (await read('ot.tasks')).find((t) => t.id === 't6');
  check('rescheduling moves the task to the chosen day', dateKey(new Date(moved.dueAt)) !== dateKey(new Date()), moved.dueAt);
  check('and to the chosen hour', new Date(moved.dueAt).getHours() === 9);

  await seed('en');
  await open('/reschedule?id=t6&mode=remind');
  const beforeRemind = (await read('ot.tasks')).find((t) => t.id === 't6');
  await page.getByTestId('reschedule-quick-12:00').click();
  await page.waitForTimeout(250);
  await page.getByTestId('reschedule-apply').click();
  await page.waitForTimeout(700);
  const reminded = (await read('ot.tasks')).find((t) => t.id === 't6');
  check('remind mode leaves the task where it is', reminded.dueAt === beforeRemind.dueAt);
  check('and sets a custom reminder', reminded.remind === 'custom' && !!reminded.remindAt);

  await browser.close();
  srv.close();
  const failed = checks.filter((c) => !c.ok);
  console.log(JSON.stringify({ checks: checks.length, failed, errors }, null, 2));
  process.exit(failed.length || errors.length ? 1 : 0);
})();
