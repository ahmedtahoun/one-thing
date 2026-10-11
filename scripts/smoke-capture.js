/**
 * Drives Quick capture, Brain dump, the Assistant and the Paywall in a browser
 * and asserts on what is stored — above all, that nothing is saved until the
 * person confirms it.
 *
 *   Capture:    typing and speaking both reach the parsed card; the card
 *               follows edits; Save writes one task; Close writes none; with
 *               no recogniser the mic falls back to typing.
 *   Dump:       an empty box sorts nothing; the sample splits into six; a tap
 *               drops one; Edit keeps the text; Save writes only what is kept.
 *   Assistant:  greets by name; a task waits for "Looks right"; the plan and
 *               follow-ups replies; a question outside its scope still comes
 *               back as a task to keep or ignore; the eleventh request on Free
 *               opens the paywall; Pro is not metered.
 *   Paywall:    Yearly by default; the fine print follows the plan; starting
 *               the trial makes nobody Pro; Restore; Terms.
 *
 * A fake speech recogniser stands in for the platform's, so the listening
 * path can be driven; deleting it shows the typing fallback.
 *
 *   npx expo export --platform web
 *   node scripts/smoke-capture.js
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

const SESSION = { userId: 'smoke', name: 'Khalid Al-Mansouri', firstName: 'Khalid', jobTitle: 'Founder', authProvider: 'apple', plan: 'free', firstRun: false };
const CAP_SAMPLE = 'Remind me tomorrow at 10 to send Mohammed the price quote and follow up.';
const D_SAMPLE =
  'Call the lawyer about the contract tomorrow at 11, email Sara the deck, buy printer ink, reply to Noura about the logo, book the dentist, pay the supplier invoice by 5';

(async () => {
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await launchChromium();
  const ctx = await browser.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, locale: 'en-GB' });
  // A recogniser that "hears" whatever window.__heard holds once stopped.
  await ctx.addInitScript(() => {
    window.__heard = '';
    class FakeRecognition {
      start() {}
      stop() {
        if (window.__heard) this.onresult?.({ results: [[{ transcript: window.__heard }]] });
        this.onend?.();
      }
    }
    window.SpeechRecognition = FakeRecognition;
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  const frozen = new Date();
  frozen.setHours(9, 20, 0, 0);
  await page.clock.setFixedTime(frozen);

  const seed = async (session = SESSION) => {
    await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate((d) => {
      localStorage.clear();
      for (const [k, v] of Object.entries(d)) localStorage.setItem(k, JSON.stringify(v));
      localStorage.setItem('ot.lang', 'en');
    }, {
      'ot.session': session,
      'ot.tasks': demoTasks('en', new Date()),
      'ot.contacts': demoContacts('en', new Date()),
      'ot.followups': demoFollowUps('en'),
      'ot.history': demoHistory('en', new Date()),
      'ot.oneThing': { date: dateKey(new Date()), title: 'Finish the investor proposal', done: false, focusMinutes: 45 },
    });
  };
  const open = async (route) => {
    await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);
  };
  const read = (key) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), key);
  const text = (id) => page.getByTestId(id).innerText();
  const count = (id) => page.getByTestId(id).count();
  const taskCount = async () => (await read('ot.tasks')).length;

  // ---------------------------------------------------------------- Capture
  await seed();
  const startTasks = await taskCount();
  await open('/capture');
  await page.getByTestId('capture-type-input').fill(CAP_SAMPLE);
  await page.getByTestId('capture-type-send').click();
  await page.waitForTimeout(300);
  const card = await text('capture-card');
  check('typing reaches the parsed card', card.includes('Send Mohammed the price quote and follow up'), card);
  check('…who, when and via read from the sentence', card.includes('Mohammed Al-Saadi') && card.includes('Tomorrow · 10:00') && card.includes('WhatsApp'), card);
  check('nothing is saved before Save', (await taskCount()) === startTasks);
  await page.getByTestId('capture-heard').fill(CAP_SAMPLE.replace('tomorrow', 'today'));
  await page.waitForTimeout(300);
  check('the card follows an edit', (await text('capture-card')).includes('Today · 10:00'));
  await page.getByTestId('capture-save').click();
  await page.waitForTimeout(600);
  const captured = (await read('ot.tasks')).slice(startTasks);
  check('Save writes one task', captured.length === 1 && captured[0].createdVia === 'capture', JSON.stringify(captured.map((t) => t.title)));
  check('…linked to the person', captured[0] && captured[0].contactIds[0] === 'c1' && captured[0].type === 'whatsapp');
  check('…at the time it said', captured[0] && new Date(captured[0].dueAt).getHours() === 10);
  check('…and says so', (await text('toast')) === 'Saved. Back to your One Thing.');

  await open('/capture');
  await page.evaluate(() => {
    window.__heard = 'Call Sara tomorrow at 3pm';
  });
  await page.getByTestId('capture-mic').click();
  await page.waitForTimeout(200);
  check('the mic listens', (await count('capture-stop')) === 1);
  await page.getByTestId('capture-stop').click();
  await page.waitForTimeout(300);
  const heardCard = await text('capture-card');
  check('what was heard is parsed', heardCard.includes('Call Sara') && heardCard.includes('Sara Haddad') && heardCard.includes('Tomorrow · 15:00'), heardCard);
  const beforeClose = await taskCount();
  await page.getByTestId('capture-close').click();
  await page.waitForTimeout(400);
  check('Close throws it away', (await taskCount()) === beforeClose);

  await open('/capture');
  await page.evaluate(() => {
    delete window.SpeechRecognition;
    delete window.webkitSpeechRecognition;
  });
  await page.getByTestId('capture-mic').click();
  await page.waitForTimeout(200);
  check('with no recogniser, the mic falls back to typing', (await count('capture-stop')) === 0 && (await page.evaluate(() => document.activeElement?.getAttribute('data-testid'))) === 'capture-type-input');

  // ------------------------------------------------------------------- Dump
  await seed();
  const dumpStart = await taskCount();
  await open('/brain-dump');
  await page.getByTestId('dump-sort').click();
  await page.waitForTimeout(200);
  check('an empty box sorts nothing', (await count('dump-found')) === 0);
  await page.getByTestId('dump-text').fill(D_SAMPLE);
  await page.getByTestId('dump-sort').click();
  await page.waitForTimeout(300);
  check('the sample splits into six things', (await text('dump-found')) === 'I found 6 things');
  check('nothing is saved by sorting', (await taskCount()) === dumpStart);
  await page.getByTestId('dump-item-2').click();
  await page.waitForTimeout(150);
  check('a tap drops one', (await text('dump-save')) === 'Save 5 and clear my head');
  check('…and says so to a screen reader', (await page.getByTestId('dump-item-2').getAttribute('aria-checked')) === 'false' && (await page.getByTestId('dump-item-1').getAttribute('aria-checked')) === 'true');
  await page.getByTestId('dump-edit').click();
  await page.waitForTimeout(150);
  check('Edit goes back to the words', (await page.getByTestId('dump-text').inputValue()) === D_SAMPLE);
  await page.evaluate(() => {
    window.__heard = 'call Hamad';
  });
  await page.getByTestId('dump-talk').click();
  await page.getByTestId('dump-talk').click();
  await page.waitForTimeout(200);
  check('talking adds to what is written', (await page.getByTestId('dump-text').inputValue()) === `${D_SAMPLE}\ncall Hamad`);
  await page.getByTestId('dump-sort').click();
  await page.waitForTimeout(300);
  await page.getByTestId('dump-item-2').click();
  await page.getByTestId('dump-save').click();
  await page.waitForTimeout(600);
  const dumped = (await read('ot.tasks')).slice(dumpStart);
  check('Save writes only what is kept', dumped.length === 6 && dumped.every((t) => t.createdVia === 'dump') && !dumped.some((t) => t.title === 'Buy printer ink'), JSON.stringify(dumped.map((t) => t.title)));
  check('…each linked where a name was caught', dumped.find((t) => t.title === 'Email Sara the deck')?.contactIds[0] === 'c2');
  check('…returns to Today and says so', page.url().endsWith('/today') && (await text('toast')) === '6 things saved. Head’s clearer now.');

  // -------------------------------------------------------------- Assistant
  await seed();
  const askStart = await taskCount();
  await open('/assistant');
  check('it greets by name', (await page.getByTestId('assistant-reply').first().innerText()).startsWith('Morning Khalid.'));
  await page.getByTestId('assistant-input').fill('Call Faisal tomorrow at 11 about the contract');
  await page.getByTestId('assistant-send').click();
  await page.waitForTimeout(1000);
  check('a task comes back as a card', (await count('assistant-card')) === 1 && (await text('assistant-card')).includes('Faisal Al-Otaibi'));
  check('…and is not saved yet', (await taskCount()) === askStart);
  await page.getByTestId('assistant-confirm').click();
  await page.waitForTimeout(300);
  const asked = (await read('ot.tasks')).slice(askStart);
  check('"Looks right" saves it', asked.length === 1 && asked[0].createdVia === 'assistant' && asked[0].type === 'call' && asked[0].contactIds[0] === 'c3');
  check('…and says when it will remind', (await page.locator('body').innerText()).includes('Saved. I’ll tap you gently at 11:00.') && (await count('assistant-kept')) === 1);

  await page.getByTestId('assistant-chip-1').click();
  await page.waitForTimeout(1000);
  const plan = await text('assistant-plan');
  check('"Arrange my day" lays out the day, One Thing first', plan.startsWith('09:00') && plan.includes('Finish the investor proposal') && plan.includes('Follow up on price quote'), plan.slice(0, 120));
  await page.getByTestId('assistant-chip-2').click();
  await page.waitForTimeout(1000);
  check('"Who am I waiting on?" counts the real follow-ups', (await page.locator('body').innerText()).includes('1 need a nudge · 2 waiting on a reply'));

  await page.getByTestId('assistant-input').fill('What is the capital of France?');
  await page.getByTestId('assistant-send').click();
  await page.waitForTimeout(1000);
  check('a question outside its scope comes back as a task to keep or ignore', (await count('assistant-card')) === 2);
  check('…and saves nothing on its own', (await taskCount()) === askStart + 1);
  check('each message spends one request', (await read('ot.assistantUsage')).used === 4);

  await page.evaluate((day) => localStorage.setItem('ot.assistantUsage', JSON.stringify({ date: day, used: 10 })), dateKey(new Date()));
  await open('/assistant');
  await page.getByTestId('assistant-input').fill('Email Sara the deck');
  await page.getByTestId('assistant-send').click();
  await page.waitForTimeout(800);
  check('the eleventh request on Free opens the paywall', page.url().endsWith('/paywall'), page.url());
  check('…without spending one', (await read('ot.assistantUsage')).used === 10);

  await seed({ ...SESSION, plan: 'pro' });
  await page.evaluate((day) => localStorage.setItem('ot.assistantUsage', JSON.stringify({ date: day, used: 10 })), dateKey(new Date()));
  await open('/assistant');
  await page.getByTestId('assistant-input').fill('Email Sara the deck');
  await page.getByTestId('assistant-send').click();
  await page.waitForTimeout(1000);
  check('Pro is not metered', page.url().endsWith('/assistant') && (await count('assistant-card')) === 1);

  // ---------------------------------------------------------------- Paywall
  await seed();
  await open('/paywall');
  check('the title names the person', (await text('paywall-title')) === 'Never drop a promise again, Khalid.');
  check('Yearly is selected, tagged "Save 40%"', (await page.getByTestId('paywall-plan-year').getAttribute('aria-checked')) === 'true' && (await page.getByTestId('paywall-plan-month').getAttribute('aria-checked')) === 'false' && (await text('paywall-tag-year')) === 'Save 40%' && (await count('paywall-tag-month')) === 0);
  check('…with the yearly fine print', (await text('paywall-fine')).startsWith('Free for 7 days, then $35.88/year.'));
  await page.getByTestId('paywall-plan-month').click();
  await page.waitForTimeout(150);
  check('Monthly can be picked instead', (await page.getByTestId('paywall-plan-month').getAttribute('aria-checked')) === 'true');
  check('the fine print follows the plan', (await text('paywall-fine')).startsWith('Free for 7 days, then $4.99/month.'));
  await page.getByTestId('paywall-start').click();
  await page.waitForTimeout(400);
  check('starting the trial makes nobody Pro', (await read('ot.session')).plan === 'free' && page.url().endsWith('/paywall'));
  check('…and claims nothing', (await count('toast')) === 0);
  await page.getByTestId('paywall-restore').click();
  await page.waitForTimeout(200);
  check('Restore says what a restore with no store finds', (await text('toast')) === 'No previous purchases found.');
  await page.getByTestId('paywall-terms').click();
  await page.waitForTimeout(400);
  check('Terms opens the legal page', page.url().endsWith('/legal?tab=terms'));

  await browser.close();
  srv.close();
  const failed = checks.filter((c) => !c.ok);
  console.log(JSON.stringify({ checks: checks.length, failed, errors }, null, 2));
  process.exit(failed.length || errors.length ? 1 : 0);
})();
