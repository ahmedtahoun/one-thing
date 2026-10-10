/**
 * Drives People, Follow-ups and Settings in a browser and asserts what each
 * action does to what is stored — the same idea as smoke-tasks.js.
 *
 *   People:      search by name, email and number; the results label and the
 *                empty state; a quick button starts a task and opens Compose.
 *   Follow-ups:  the counts; Got a reply closes with Undo; Reopen; Nudge
 *                writes a follow-up task with its draft, opens Compose, and
 *                never sends.
 *   Settings:    one accordion panel at a time; the reminder-style
 *                description follows the style; focus, channels and marketing
 *                are stored; language switches at once; the delete sheet only
 *                closes from its buttons and deleting wipes the device but the
 *                language; sign out.
 *
 *   npx expo export --platform web
 *   node scripts/smoke-people.js
 */
'use strict';
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { demoContacts, demoFollowUps, demoTasks } = require('./demo-state.js');

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
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
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
    });
  };
  const open = async (route) => {
    await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);
  };
  const read = (key) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), key);
  const text = (id) => page.getByTestId(id).innerText();
  const rows = (prefix) => page.locator(`[data-testid^="${prefix}"]`).count();

  // ---------------------------------------------------------------- People
  await seed();
  await open('/people');
  const everyone = await rows('person-c');
  check('people lists every contact', everyone === 8 * 4, `${everyone / 4} rows`); // row + 3 buttons each
  check('the label reads RECENT', (await text('people-label')) === 'RECENT');

  await page.getByTestId('people-search').fill('sara');
  await page.waitForTimeout(200);
  check('search by name', (await rows('person-c')) === 4 && (await page.getByTestId('person-c2').isVisible()));
  check('the label counts results', (await text('people-label')) === '1 RESULTS');

  await page.getByTestId('people-search').fill('ledgerco');
  await page.waitForTimeout(200);
  check('search by email', await page.getByTestId('person-c6').isVisible());

  await page.getByTestId('people-search').fill('900 11');
  await page.waitForTimeout(200);
  check('search by phone digits', (await rows('person-c')) === 4 && (await page.getByTestId('person-c8').isVisible()));

  await page.getByTestId('people-search').fill('zzz');
  await page.waitForTimeout(200);
  check('a word with no digits matches no number', (await rows('person-c')) === 0);
  check('the empty line names the query', (await text('people-none')).includes('zzz'));

  await page.getByTestId('people-clear').click();
  await page.waitForTimeout(200);
  check('clearing brings everyone back', (await rows('person-c')) === everyone);

  const tasksBefore = (await read('ot.tasks')).length;
  await page.getByTestId('person-c2-whatsapp').click();
  await page.waitForTimeout(500);
  const started = (await read('ot.tasks')).slice(tasksBefore);
  check('a quick button starts one task', started.length === 1, JSON.stringify(started.map((t) => t.title)));
  check('…a WhatsApp to that person', started[0] && started[0].type === 'whatsapp' && started[0].title === 'Message Sara' && started[0].contactIds[0] === 'c2');
  check('…and opens Compose on it', page.url().includes(`/compose?id=${started[0] && started[0].id}`), page.url());

  // ------------------------------------------------------------ Follow-ups
  await seed();
  await open('/followups');
  check('the summary counts both', (await text('followups-summary')) === '1 need a nudge · 2 waiting on a reply');
  check('Nudge lists the overdue one', (await page.getByTestId('followup-f2').isVisible()) && (await rows('followup-f')) > 0);

  await page.getByTestId('followup-f2-close').click();
  await page.waitForTimeout(300);
  check('Got a reply closes it', (await read('ot.followups')).find((f) => f.id === 'f2').status === 'done');
  check('…and offers Undo', await page.getByTestId('toast-undo').isVisible());
  check('the Nudge tab is then empty', await page.getByTestId('followups-empty').isVisible());
  await page.getByTestId('toast-undo').click();
  await page.waitForTimeout(300);
  check('Undo brings it back', (await read('ot.followups')).find((f) => f.id === 'f2').status === 'due');

  await page.getByTestId('followups-tab-waiting').click();
  await page.waitForTimeout(200);
  check('Waiting lists the two', (await page.getByTestId('followup-f1').isVisible()) && (await page.getByTestId('followup-f3').isVisible()));
  await page.getByTestId('followup-f1-close').click();
  await page.waitForTimeout(300);
  await page.getByTestId('followups-tab-done').click();
  await page.waitForTimeout(200);
  check('Closed shows it, marked just now', (await page.getByTestId('followup-f1').innerText()).includes('Closed just now'));
  await page.getByTestId('followup-f1-reopen').click();
  await page.waitForTimeout(300);
  const reopened = (await read('ot.followups')).find((f) => f.id === 'f1');
  check('Reopen puts it back to waiting', reopened.status === 'waiting' && !reopened.lastAction);

  await page.getByTestId('followups-tab-due').click();
  await page.waitForTimeout(200);
  const before = (await read('ot.tasks')).length;
  await page.getByTestId('followup-f2-nudge').click();
  await page.waitForTimeout(500);
  const nudge = (await read('ot.tasks')).slice(before)[0];
  check('Nudge writes a follow-up task', nudge && nudge.createdVia === 'followup' && nudge.type === 'email', nudge && nudge.title);
  check('…with the draft ready', nudge && nudge.draft.body === 'Hi Noura, just checking in on logo final files. Any update when you get a moment? Thanks!', nudge && nudge.draft.body);
  check('…and opens Compose, sending nothing', page.url().includes(`/compose?id=${nudge && nudge.id}`));
  await open('/followups');
  check('the card then says the draft is ready', (await page.getByTestId('followup-f2').innerText()).includes('Draft ready · not sent yet'));
  check('…and the follow-up stays open', (await read('ot.followups')).find((f) => f.id === 'f2').status === 'due');

  // -------------------------------------------------------------- Settings
  await seed();
  await open('/settings');
  await page.getByTestId('settings-reminders').click();
  await page.waitForTimeout(250);
  check('Reminders opens', await page.getByTestId('nudge-desc').isVisible());
  const gentle = await text('nudge-desc');
  await page.getByTestId('nudge-firm').click();
  await page.waitForTimeout(200);
  check('the description follows the style', (await text('nudge-desc')) !== gentle && (await text('nudge-desc')).startsWith('Notifies on time'));
  check('the style is stored', (await read('ot.prefs')).nudgeStyle === 'firm');
  await page.getByTestId('focus-25').click();
  await page.waitForTimeout(200);
  check('the collapsed value follows', (await text('settings-reminders')).includes('Firm · 25 min'));

  await page.getByTestId('settings-channels').click();
  await page.waitForTimeout(250);
  check('opening Channels closes Reminders', (await page.getByTestId('nudge-desc').count()) === 0);
  await page.getByTestId('settings-channel-call').click();
  await page.waitForTimeout(200);
  check('a channel turns off', (await read('ot.prefs')).channels.call === false && (await text('settings-channels')).includes('2 on'));

  await page.getByTestId('settings-privacy').click();
  await page.waitForTimeout(250);
  await page.getByTestId('settings-marketing').click();
  await page.waitForTimeout(200);
  check('marketing is stored', (await read('ot.prefs')).marketing === true);

  await page.getByTestId('settings-lang-ar').click();
  await page.waitForTimeout(300);
  check('language switches at once', (await page.locator('body').innerText()).includes('الإعدادات'));
  await page.getByTestId('settings-lang-en').click();
  await page.waitForTimeout(300);

  await page.getByTestId('settings-delete').click();
  await page.waitForTimeout(300);
  await page.getByTestId('delete-sheet-scrim').click({ position: { x: 20, y: 20 } });
  await page.waitForTimeout(200);
  check('the delete sheet ignores the scrim', await page.getByTestId('delete-sheet').isVisible());
  await page.getByTestId('delete-keep').click();
  await page.waitForTimeout(300);
  check('Keep my account closes it', (await page.getByTestId('delete-sheet').count()) === 0);
  check('…and keeps the data', (await read('ot.session')) !== null);

  await page.evaluate(() => localStorage.setItem('ot.lang', 'en'));
  await page.getByTestId('settings-delete').click();
  await page.waitForTimeout(300);
  await page.getByTestId('delete-confirm').click();
  await page.waitForTimeout(600);
  const left = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('ot.')));
  check('deleting wipes the account from the device', left.length === 1 && left[0] === 'ot.lang', JSON.stringify(left));
  check('…returns to Sign in', page.url().endsWith('/sign-in'), page.url());
  check('…and says so', (await page.getByTestId('toast').innerText()) === 'Your account was deleted.');

  await seed();
  await open('/settings');
  await page.getByTestId('settings-sign-out').click();
  await page.waitForTimeout(500);
  check('Sign out returns to Sign in', page.url().endsWith('/sign-in') && (await read('ot.session')) === null);
  check('…keeping the user’s tasks on the device', (await read('ot.tasks')).length > 0);

  await browser.close();
  srv.close();
  const failed = checks.filter((c) => !c.ok);
  console.log(JSON.stringify({ checks: checks.length, failed, errors }, null, 2));
  process.exit(failed.length || errors.length ? 1 : 0);
})();
