/**
 * Drives Compose in a browser and asserts what each action does — what is
 * opened, what is stored, and above all that nothing is marked done or sent
 * until the user says so.
 *
 *   npx expo export --platform web
 *   node scripts/smoke-compose.js
 */
'use strict';
const { launch: launchChromium } = require('./browser.js');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { demoContacts, demoFollowUps, demoHistory, demoTasks } = require('./demo-state.js');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
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

(async () => {
  process.on('exit', () => {
    if (process.exitCode) console.error(JSON.stringify(checks.filter((c) => !c.ok)));
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await launchChromium();
  const ctx = await browser.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, locale: 'en-GB' });
  // Every URL the app hands off to (wa.me, mailto:, tel:) is recorded rather
  // than opened.
  await ctx.addInitScript(() => {
    window.__opened = [];
    window.open = (url) => {
      window.__opened.push(String(url).replace(/^x-tel:/, 'tel:'));
      return null;
    };
    // React Native Web opens tel: by assigning window.location rather than
    // calling window.open; a headless browser cannot follow that, and stops
    // taking clicks after trying. Its URL check is `startsWith('tel:')` on
    // `new URL(...).toString()`, so a prefix here sends tel: through the
    // window.open stub above instead.
    const RealURL = window.URL;
    window.URL = class extends RealURL {
      toString() {
        const href = super.toString();
        return href.startsWith('tel:') ? `x-${href}` : href;
      }
    };
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

  const seed = async () => {
    await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate((d) => {
      localStorage.clear();
      for (const [k, v] of Object.entries(d)) localStorage.setItem(k, JSON.stringify(v));
      localStorage.setItem('ot.lang', 'en');
    }, {
      'ot.session': SESSION,
      'ot.tasks': demoTasks('en', new Date()),
      'ot.contacts': demoContacts('en', new Date()),
      'ot.followups': demoFollowUps('en'),
      'ot.history': demoHistory('en', new Date()),
    });
  };
  const open = async (id) => {
    await page.goto(`${base}/compose?id=${id}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);
  };
  const read = (key) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), key);
  const task = async (id) => (await read('ot.tasks')).find((t) => t.id === id);
  const opened = () => page.evaluate(() => window.__opened);
  const text = (id) => page.getByTestId(id).innerText();
  const visible = (id) => page.getByTestId(id).isVisible();
  // Real time, not page.clock.runFor: that switches the page to fake timers,
  // and presses stop registering once the clock is driven by hand.
  const wait = (ms) => page.waitForTimeout(ms + 150);

  // ------------------------------------------------- WhatsApp, no number yet
  await seed();
  await open('t1');
  check('the brief shows the latest history', (await text('compose-last-time')).includes('Sent the price quote'));
  check('no number yet: the ask', (await text('compose-phone-msg')).startsWith('Add their number once'));
  await page.getByTestId('compose-send-wa').click();
  await wait(1000);
  check('send with no number shows the error', (await text('compose-phone-msg')) === 'Looks short — check the number.');
  check('…opens nothing', (await opened()).length === 0);
  check('…and asks nothing', !(await page.getByTestId('compose-after').count()));

  await page.getByTestId('compose-phone').fill('55');
  await page.waitForTimeout(200);
  check('typing digits suggests people with them', await visible('compose-suggestion-c3'));
  await page.getByTestId('compose-country').click();
  await page.waitForTimeout(200);
  await page.getByTestId('compose-countries-AE').click();
  await page.waitForTimeout(200);
  check('the country picker sets the dial code', (await text('compose-country')).includes('+971'));
  await page.getByTestId('compose-phone').fill('050 111 2222');
  await page.waitForTimeout(200);
  check('a full number is accepted', (await text('compose-phone-msg')) === 'Saved for next time');

  await page.getByTestId('compose-draft').fill('Hi Mohammed — any news on the quote?');
  await page.waitForTimeout(200);
  check('draft edits are kept on the task', (await task('t1')).draft.body === 'Hi Mohammed — any news on the quote?');

  await page.getByTestId('compose-send-wa').click();
  await page.waitForTimeout(200);
  const wa = (await opened())[0] || '';
  check('WhatsApp opens with the full number and the draft', wa.startsWith('https://wa.me/971501112222?text=Hi%20Mohammed'), wa);
  check('…and the toast says so', (await page.getByTestId('toast').innerText()) === 'Opening WhatsApp with Mohammed Al-Saadi…');
  const contacts = await read('ot.contacts');
  check('the number is remembered on the contact', contacts[0].id === 'c1' && contacts[0].phone === '050 111 2222' && contacts[0].dial === '+971');
  check('…who moves to the top of People', contacts[0].lastLabel === 'Just now');
  check('…and the task is linked to them', (await task('t1')).contactIds.includes('c1'));
  check('handing off does not mark it done', (await task('t1')).status === 'open');
  await wait(800);
  check('back from WhatsApp: "Did you send it?"', await visible('compose-after'));
  await page.getByTestId('compose-after-1').click();
  await page.waitForTimeout(500);
  const sent = await task('t1');
  check('"In 2 days" marks it done, with the time', sent.status === 'done' && sent.sentConfirmedAt);
  const fu = (await read('ot.followups'))[0];
  check('…sets a waiting follow-up', fu.status === 'waiting' && fu.taskId === 't1' && fu.channel === 'whatsapp' && fu.contactId === 'c1');
  check('…with the prototype’s note', fu.since === 'Sent today · follow up in 2 days', fu.since);
  const days = Math.round((new Date(fu.nextAt) - new Date(sent.sentConfirmedAt)) / 86400000);
  check('…due in two days', days === 2, `${days}`);
  check('…and returns to Today', page.url().endsWith('/today'), page.url());

  // ------------------------------------------- WhatsApp, number remembered
  await seed();
  await open('t7');
  check('a known number is filled in', (await page.getByTestId('compose-phone').inputValue()) === '54 880 1123');
  await page.getByTestId('compose-send-wa').click();
  await wait(800);
  await page.getByTestId('compose-not-sent').click();
  await page.waitForTimeout(300);
  check('"Not yet" closes the question', !(await page.getByTestId('compose-after').count()));
  check('…keeps the task open', (await task('t7')).status === 'open');
  check('…and says the draft is kept', (await page.getByTestId('toast').innerText()) === 'Okay — the draft is saved. Still on your list.');

  // ------------------------------------------------------------------ Email
  await seed();
  await open('t3');
  check('a known address is filled in', (await page.getByTestId('compose-email').inputValue()) === 'sara@northwind.vc');
  check('the subject is the task’s', (await page.getByTestId('compose-subject').inputValue()) === 'Deck v3 + a quick call');
  await page.getByTestId('compose-open-mail').click();
  await page.waitForTimeout(300);
  const mail = (await opened()).find((u) => u.startsWith('mailto:')) || '';
  check('Mail opens addressed, with subject and body', mail.startsWith('mailto:sara@northwind.vc?subject=Deck%20v3%20%2B%20a%20quick%20call&body=Hi%20Sara'), mail.slice(0, 80));
  check('…and the toast names Mail', (await page.getByTestId('toast').innerText()) === 'Draft copied — opening Mail…');
  await wait(800);
  check('back from Mail: "Did you send it?"', await visible('compose-after'));

  await seed();
  await open('t3');
  await page.getByTestId('compose-email').fill('sara@northwind');
  await page.waitForTimeout(200);
  check('a half-typed address is flagged', (await text('compose-email-msg')) === 'Check the email address.');
  await page.getByTestId('compose-send-email').click();
  await page.waitForTimeout(300);
  check('…and nothing opens', (await opened()).length === 0);
  await page.getByTestId('compose-email').fill('omar');
  await page.waitForTimeout(200);
  check('typing a name suggests their address', await visible('compose-suggestion-c6'));
  await page.getByTestId('compose-suggestion-c6').click();
  await page.waitForTimeout(200);
  check('picking it fills the address', (await page.getByTestId('compose-email').inputValue()) === 'omar@ledgerco.sa');

  // --------------------------------------------------------------- Reminder
  await seed();
  await open('t4');
  check('a reminder has no draft', !(await page.getByTestId('compose-draft').count()));
  await page.getByTestId('compose-done').click();
  await page.waitForTimeout(300);
  check('Done marks a reminder done', (await task('t4')).status === 'done');
  const undo = await page.getByTestId('toast-undo').count();
  check('…offers Undo', undo === 1, await page.locator('body').innerText().then((b) => b.slice(-120)));
  if (undo) await page.getByTestId('toast-undo').click();
  await page.waitForTimeout(300);
  check('…with Undo', (await task('t4')).status === 'open');

  // ---------------------------------------------------------------- Missing
  await open('nope');
  await page.waitForTimeout(500);
  check('an unknown task goes to Today', page.url().endsWith('/today'), page.url());

  // ------------------------------------------------------------------- Call
  await seed();
  await open('t2');
  await page.getByTestId('compose-call').click();
  await page.waitForTimeout(200);
  const tel = (await opened()).find((u) => u.startsWith('tel:')) || '';
  check('Call now dials the contact’s number', tel === 'tel:+966551234567', tel);
  await wait(1000);
  const before = (await read('ot.followups')).length;
  await page.getByTestId('compose-after-3').click();
  await page.waitForTimeout(500);
  check('"No need" marks it done', (await task('t2')).status === 'done');
  check('…and sets no follow-up', (await read('ot.followups')).length === before);

  await browser.close();
  srv.close();
  const failed = checks.filter((c) => !c.ok);
  console.log(JSON.stringify({ checks: checks.length, failed, errors }, null, 2));
  process.exit(failed.length || errors.length ? 1 : 0);
})();
