/**
 * Drives People, Follow-ups and Settings in a browser and asserts what each
 * action does to what is stored — the same idea as smoke-tasks.js.
 *
 *   People:      search by name, email and number; the results label and the
 *                empty state; a quick button starts a task and opens Compose.
 *   Follow-ups:  the counts; Got a reply closes with Undo; Reopen; Nudge
 *                writes a follow-up task with its draft, opens Compose, and
 *                never sends.
 *   Profile:     opens from People; tiles dim and do nothing without a number
 *                or address; the note saves as it is typed; Coming up; the
 *                quick log; closed follow-ups join the history.
 *   Form:        name required; email and phone checked when given; the
 *                duplicate banner; the country search; new, edit, "Save &
 *                message", and delete with confirm and Undo.
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
  const open = async (route) => {
    await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);
  };
  const read = (key) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), key);
  const text = (id) => page.getByTestId(id).innerText();
  const rows = (prefix) => page.locator(`[data-testid^="${prefix}"]`).count();
  // A person is one row now, not a row plus three buttons: the quick options
  // moved to a long press. The red follow-up dot shares the row's prefix, so
  // it has to be excluded or every waiting person counts twice.
  const people = () => page.locator('[data-testid^="person-c"]:not([data-testid$="-due"])').count();

  // ---------------------------------------------------------------- People
  await seed();
  await open('/people');
  const everyone = await people();
  check('people lists every contact', everyone === 8, `${everyone} rows`);
  // The RECENT / "n RESULTS" label is gone; People is filter chips and a list
  // in the manner of a chat app. What is worth asserting is that the chips
  // are there and that Waiting carries the count of who needs a nudge.
  check('the filters show', await page.getByTestId('people-filters').isVisible());
  check('Waiting carries the overdue count', (await text('people-filters-badge')) === '1');

  await page.getByTestId('people-search').fill('sara');
  await page.waitForTimeout(200);
  check('search by name', (await people()) === 1 && (await page.getByTestId('person-c2').isVisible()));

  await page.getByTestId('people-search').fill('ledgerco');
  await page.waitForTimeout(200);
  check('search by email', await page.getByTestId('person-c6').isVisible());

  await page.getByTestId('people-search').fill('900 11');
  await page.waitForTimeout(200);
  check('search by phone digits', (await people()) === 1 && (await page.getByTestId('person-c8').isVisible()));

  await page.getByTestId('people-search').fill('zzz');
  await page.waitForTimeout(200);
  check('a word with no digits matches no number', (await people()) === 0);
  check('the empty line names the query', (await text('people-none')).includes('zzz'));

  await page.getByTestId('people-clear').click();
  await page.waitForTimeout(200);
  check('clearing brings everyone back', (await people()) === everyone);

  // "Not contacted" (BUILD-REVIEW §2.97): a phone book just imported should
  // not go about unmarked among the people actually being dealt with. Of
  // the eight seeded, four have something logged or promised against them.
  await page.getByTestId('people-filters-untouched').click();
  await page.waitForTimeout(300);
  const untouched = await people();
  check('Not contacted shows only those nothing has happened with', untouched === 4, `${untouched} rows`);
  check('…and leaves out somebody with history against them', (await page.getByTestId('person-c1').count()) === 0);
  check('…while keeping one merely added', await page.getByTestId('person-c3').isVisible());

  await page.getByTestId('people-filters-all').click();
  await page.waitForTimeout(300);
  check('All brings everyone back after it', (await people()) === everyone);

  // The three per-row buttons are gone: press and hold opens the quick
  // options instead, which is what the row now promises.
  const tasksBefore = (await read('ot.tasks')).length;
  await page.getByTestId('person-c2').click({ delay: 600 });
  await page.waitForTimeout(400);
  check('press and hold opens the quick options', await page.getByTestId('contact-menu').isVisible());
  await page.getByTestId('menu-whatsapp').click();
  await page.waitForTimeout(500);
  const started = (await read('ot.tasks')).slice(tasksBefore);
  check('a quick option starts one task', started.length === 1, JSON.stringify(started.map((t) => t.title)));
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
  // The draft is a letter now rather than one line, and it will go on being
  // reworded. What has to hold is that it is addressed to the right person
  // and about the thing they owe — not its exact phrasing.
  check(
    '…with the draft ready',
    nudge && nudge.draft.body.includes('Noura') && nudge.draft.body.includes('logo final files'),
    nudge && nudge.draft.body
  );
  check('…and opens Compose, sending nothing', page.url().includes(`/compose?id=${nudge && nudge.id}`));
  await open('/followups');
  check('the card then says the draft is ready', (await page.getByTestId('followup-f2').innerText()).includes('Draft ready · not sent yet'));
  check('…and the follow-up stays open', (await read('ot.followups')).find((f) => f.id === 'f2').status === 'due');

  // --------------------------------------------------------------- Profile
  await seed();
  await open('/people');
  await page.getByTestId('person-c1').getByText('Mohammed Al-Saadi').click();
  await page.waitForTimeout(600);
  check('a People row opens the profile', page.url().endsWith('/contact?id=c1'), page.url());
  check('…with their name', (await text('contact-name')) === 'Mohammed Al-Saadi');

  const taskCount = (await read('ot.tasks')).length;
  await page.getByTestId('contact-action-whatsapp').click({ force: true });
  await page.getByTestId('contact-action-call').click({ force: true });
  await page.waitForTimeout(300);
  check('no number: WhatsApp and Call do nothing', (await read('ot.tasks')).length === taskCount && page.url().endsWith('/contact?id=c1'));

  await page.getByTestId('contact-details-toggle').click();
  await page.getByTestId('contact-note').fill('Prefers mornings');
  // The note has no Save button, so a pause is what commits it — a contact
  // write serialises every contact, which is too much to do per keystroke.
  await page.waitForTimeout(900);
  check('the note keeps itself, without a Save button', (await read('ot.contacts')).find((c) => c.id === 'c1').rememberNote === 'Prefers mornings');
  await open('/contact?id=c1');
  await page.getByTestId('contact-details-toggle').click();
  check('…and is there next time', (await page.getByTestId('contact-note').inputValue()) === 'Prefers mornings');

  // Typed and left behind at once. Leaving the FIELD has to commit it, since
  // `open` here is a full page load, which never runs an unmount — on a
  // device the screen really does unmount and that flush runs too.
  await page.getByTestId('contact-note').fill('Allergic to almonds');
  await page.getByTestId('contact-note').blur();
  await page.waitForTimeout(150);
  await open('/people');
  check('a note typed and left straight away is still kept', (await read('ot.contacts')).find((c) => c.id === 'c1').rememberNote === 'Allergic to almonds', JSON.stringify((await read('ot.contacts')).find((c) => c.id === 'c1').rememberNote));
  await open('/contact?id=c1');
  await page.getByTestId('contact-details-toggle').click();

  check('Coming up lists their open task', await page.getByTestId('contact-next-t1').isVisible());
  check('History counts four moments', (await text('contact-history-count')) === '4 moments');

  await page.getByTestId('contact-log').click();
  await page.waitForTimeout(200);
  check('an empty log adds nothing', (await read('ot.history')).length === demoHistory('en').length);
  await page.getByTestId('contact-log-text').fill('Called about delivery');
  await page.getByTestId('contact-log').click();
  await page.waitForTimeout(300);
  const logged = (await read('ot.history'))[0];
  check('the quick log adds a dated moment', logged.contactId === 'c1' && logged.kind === 'note' && logged.text === 'Called about delivery');
  check('…which the count includes', (await text('contact-history-count')) === '5 moments');
  const bubble = await page.getByTestId(`moment-${logged.id}`).innerText();
  // A thread reads like a chat, so the time does too: "9:20 AM", not "09:20".
  check('…shown in the thread, with its time', bubble.includes('Called about delivery') && bubble.includes('9:20'), bubble);
  check('…and the field clears', (await page.getByTestId('contact-log-text').inputValue()) === '');

  await page.getByTestId('contact-action-email').click();
  await page.waitForTimeout(500);
  const emailTask = (await read('ot.tasks')).slice(taskCount)[0];
  check('Email starts a task with them and opens Compose', emailTask && emailTask.title === 'Email Mohammed' && page.url().includes(`/compose?id=${emailTask.id}`));

  await page.evaluate(() => {
    const list = JSON.parse(localStorage.getItem('ot.followups'));
    list.find((f) => f.id === 'f2').status = 'done';
    localStorage.setItem('ot.followups', JSON.stringify(list));
  });
  await open('/contact?id=c4');
  check('a closed follow-up joins their history', (await page.locator('body').innerText()).includes('Logo final files ✓'));

  await page.getByTestId('contact-edit').click();
  await page.waitForTimeout(400);
  check('Edit opens the contact form', page.url().endsWith('/contact-edit?id=c4'), page.url());
  await open('/contact?id=nobody');
  check('an unknown contact goes to People', page.url().endsWith('/people'), page.url());

  // ------------------------------------------------------------ Smart lists
  // A smart list is a rule, not a folder: the chip is right every time it is
  // tapped, so the test that matters is that answering a follow-up takes the
  // person out of the list without anyone editing it.
  await seed();
  await open('/people');
  await page.getByTestId('people-more').click();
  await page.waitForTimeout(400);
  check('People offers smart lists', await page.getByTestId('more-smart').isVisible());
  await page.getByTestId('more-smart').click();
  await page.waitForTimeout(500);
  check('…and opens them', page.url().endsWith('/smart-lists'), page.url());
  check('with nothing in them yet', await page.getByTestId('smart-none').isVisible());

  await page.getByTestId('smart-add').click();
  await page.waitForTimeout(300);
  await page.getByTestId('smart-name').fill('Owes me');
  await page.getByTestId('smart-cond-waiting').click();
  await page.waitForTimeout(300);
  const holds = await text('smart-holds');
  check('the count is live while the rule is built', /\d/.test(holds), holds);
  await page.getByTestId('smart-save').click();
  await page.waitForTimeout(500);
  check('a saved list is listed with its rule', (await text('smart-list')).includes('Owes me'), await text('smart-list'));
  check('…and Free stops at one', await page.getByTestId('smart-capped').isVisible());

  await open('/people');
  const smartChip = page.locator('[data-testid^="people-filters-smart:"]');
  check('it becomes a chip on People', (await smartChip.count()) === 1);
  check('…carrying its own name', (await smartChip.first().innerText()).includes('Owes me'));
  await smartChip.first().click();
  await page.waitForTimeout(500);
  const inList = await page.locator('[data-testid^="person-c"]:not([data-testid$="-due"])').count();
  check('the chip shows the people the rule holds', inList > 0, String(inList));

  // Close every follow-up and the same chip empties, with nothing edited.
  await page.evaluate(() => {
    const open = JSON.parse(localStorage.getItem('ot.followups') || '[]');
    localStorage.setItem('ot.followups', JSON.stringify(open.map((f) => ({ ...f, status: 'done' }))));
  });
  await open('/people');
  await page.locator('[data-testid^="people-filters-smart:"]').first().click();
  await page.waitForTimeout(500);
  check(
    'answering them empties the list without anyone editing it',
    (await page.locator('[data-testid^="person-c"]:not([data-testid$="-due"])').count()) === 0
  );

  // A deleted list must not leave People showing nothing.
  await page.evaluate(() => localStorage.removeItem('one-thing.smartLists.v1'));
  await open('/people');
  check('a deleted list falls back to All', (await page.locator('[data-testid^="people-filters-smart:"]').count()) === 0);
  check('…and People still lists everyone', (await people()) > 0);

  // ---------------------------------------------------------- Weekly recap
  // Your week (app/recap.tsx): every line comes off something the app dates,
  // so the counts here are checked against the demo history itself rather
  // than against a screenshot.
  await seed();
  // Three days with a win, one of them outside the week it covers.
  const day = (n) => dateKey(new Date(Date.now() - n * 86400000));
  await page.evaluate(
    (days) => localStorage.setItem('one-thing.wins.v1', JSON.stringify(days)),
    [day(0), day(2), day(30)]
  );
  await open('/recap');
  check('the recap counts the days inside the week only', (await text('recap-days')).includes('2 of 7'), await text('recap-days'));
  check('…and shows the streak when there is one', (await text('recap-days')).includes('streak'), await text('recap-days'));
  const sent = await text('recap-sent');
  check('it counts what went out, by what it was', /went out/.test(sent), sent);
  check('…and a closed follow-up is not counted as something sent', !/^0 /.test(sent), sent);
  check('it names who was reached', (await text('recap-reached')).match(/reached/i) !== null, await text('recap-reached'));
  check('…each one tappable through to their profile', (await page.locator('[data-testid^="recap-person-"]').count()) > 0);
  check('it says what carries into next week', (await text('recap-carrying')).length > 0, await text('recap-carrying'));

  // Nothing recorded at all: a sentence, not a column of noughts.
  await page.evaluate(() => {
    localStorage.removeItem('one-thing.wins.v1');
    localStorage.setItem('ot.tasks', '[]');
    localStorage.setItem('ot.followups', '[]');
    localStorage.setItem('ot.history', '[]');
  });
  await open('/recap');
  check('an empty week says so instead of printing noughts', await page.getByTestId('recap-empty').isVisible());
  check('…and shows no counts at all', (await page.getByTestId('recap-sent').count()) === 0);

  // The way in.
  await seed();
  await open('/settings');
  check('Settings links to it', await page.getByTestId('settings-recap').isVisible());
  await page.getByTestId('settings-recap').click();
  await page.waitForTimeout(500);
  check('…and the link opens it', page.url().endsWith('/recap'), page.url());

  // ------------------------------------------------------------- Scan many
  // A stack of cards is its own way in (app/scan-many.tsx), beside the single
  // card. The camera itself cannot be driven here — the web build has no card
  // reader at all — but the way in, the honest refusal, and what a saved batch
  // hands on to Send to many are all this suite's business.
  await seed();
  await open('/people');
  check('People offers a bulk scan beside the single one', await page.getByTestId('people-scan-many').isVisible());
  await page.getByTestId('people-scan-many').click();
  await page.waitForTimeout(500);
  check('…and it opens the batch screen', page.url().endsWith('/scan-many'), page.url());
  check('the web build says it cannot read cards, instead of opening a camera', await page.getByTestId('many-single').isVisible());
  check('…and offers the single card screen, which can be typed into', (await page.getByTestId('many-camera').count()) === 0);
  await page.getByTestId('many-single').click();
  await page.waitForTimeout(500);
  check('the way out is the one card screen', page.url().endsWith('/scan-card'), page.url());

  await open('/people');
  await page.getByTestId('people-add').click();
  await page.waitForTimeout(400);
  check('Add offers the stack as well as the one card', await page.getByTestId('add-many').isVisible());

  // What a saved batch does next: Send to many, with those people already
  // picked, because a stack of cards nobody writes to was a contact import.
  await open('/bulk?ids=c2,c3');
  check('a saved batch arrives in Send to many already picked', (await text('bulk-start')).includes('2'), await text('bulk-start'));
  await open('/bulk');
  check('…and Send to many on its own still starts empty', !(await text('bulk-start')).includes('2'), await text('bulk-start'));

  // Attachments in Send to many. The channel starts on WhatsApp, which
  // cannot carry a file, so the row must not be offered there at all.
  check('WhatsApp offers no attachment row', (await page.getByTestId('bulk-add').count()) === 0);
  await page.getByText('Email', { exact: true }).first().click();
  await page.waitForTimeout(400);
  check('switching to Email offers one', (await page.getByTestId('bulk-add').count()) === 1);
  check('…and says nothing alarming before anything is attached', (await page.getByTestId('bulk-files-warning').count()) === 0);

  // ------------------------------------------------------------------ Form
  await seed();
  await open('/people');
  // Adding a person is a menu now — by hand, from a card, from a file, or
  // from the phone's contacts — so the form is two taps away.
  await page.getByTestId('people-add').click();
  await page.waitForTimeout(400);
  check('Add offers the ways in', await page.getByTestId('add-menu').isVisible());
  await page.getByTestId('add-new').click();
  await page.waitForTimeout(600);
  check('New opens an empty form', page.url().endsWith('/contact-edit') && (await text('contact-form-initials')) === '+');
  const contactsBefore = (await read('ot.contacts')).length;
  await page.getByTestId('contact-form-save').click();
  await page.waitForTimeout(200);
  check('no name: the error, and nothing saved', (await page.getByTestId('contact-form-name-error').isVisible()) && (await read('ot.contacts')).length === contactsBefore);

  await page.getByTestId('contact-form-name').fill('Ahmed Rashid');
  await page.waitForTimeout(150);
  check('initials follow the name', (await text('contact-form-initials')) === 'AR');
  check('…and the error goes', (await page.getByTestId('contact-form-name-error').count()) === 0);
  await page.getByTestId('contact-form-phone').fill('123');
  await page.getByTestId('contact-form-save').click();
  await page.waitForTimeout(200);
  check('a short number blocks saving', (await read('ot.contacts')).length === contactsBefore && page.url().endsWith('/contact-edit'));
  await page.getByTestId('contact-form-phone').fill('55 999 0000');
  await page.getByTestId('contact-form-email').fill('ahmed@');
  await page.getByTestId('contact-form-save').click();
  await page.waitForTimeout(200);
  check('a half-typed email blocks saving', (await read('ot.contacts')).length === contactsBefore);

  await page.getByTestId('contact-form-email').fill('sara@northwind.vc');
  await page.waitForTimeout(150);
  check('a known email raises the duplicate banner', (await text('contact-form-duplicate')).includes('You already have Sara Haddad with these details.'));
  await page.getByTestId('contact-form-email').fill('ahmed@rashid.sa');
  await page.waitForTimeout(150);
  check('…which goes when it no longer matches', (await page.getByTestId('contact-form-duplicate').count()) === 0);

  // A number that names its own country moves the picker with it. Found on
  // a phone: an Egyptian number typed into a form showing +966, and nothing
  // noticed (src/features/contact/form-rules.ts).
  await page.getByTestId('contact-form-phone').fill('01117515284');
  await page.waitForTimeout(250);
  check('an Egyptian number moves the flag to +20', (await text('contact-form-country')).includes('+20'), await text('contact-form-country'));
  check('…and the trunk zero goes with it', (await page.getByTestId('contact-form-phone').inputValue()) === '1117515284', await page.getByTestId('contact-form-phone').inputValue());
  await page.getByTestId('contact-form-phone').fill('+971 50 331 2045');
  await page.waitForTimeout(250);
  check('…and a written code moves it again', (await text('contact-form-country')).includes('+971'), await text('contact-form-country'));
  await page.getByTestId('contact-form-phone').fill('55 999 0000');
  await page.waitForTimeout(250);
  check('a local number leaves the picker where it was', (await text('contact-form-country')).includes('+971') && (await page.getByTestId('contact-form-phone').inputValue()) === '55 999 0000');

  await page.getByTestId('contact-form-country').click();
  await page.waitForTimeout(200);
  await page.getByTestId('contact-form-countries-search').fill('emir');
  await page.waitForTimeout(150);
  check('the country list searches by name', await page.getByTestId('contact-form-countries-AE').isVisible());
  await page.getByTestId('contact-form-countries-search').fill('971');
  await page.waitForTimeout(150);
  check('…and by dial code', await page.getByTestId('contact-form-countries-AE').isVisible());
  await page.getByTestId('contact-form-countries-search').fill('zzz');
  await page.waitForTimeout(150);
  check('…and says when nothing matches', (await text('contact-form-countries')).includes('No country found'));
  await page.getByTestId('contact-form-countries-search').fill('971');
  await page.getByTestId('contact-form-countries-AE').click();
  await page.waitForTimeout(150);
  await page.getByTestId('contact-form-position').fill('Supplier');
  await page.getByTestId('contact-form-save').click();
  await page.waitForTimeout(600);
  const added = (await read('ot.contacts'))[0];
  check('Save adds them at the top of People', page.url().endsWith('/people') && added.name === 'Ahmed Rashid');
  check('…with every field', added.role === 'Supplier' && added.dial === '+971' && added.phone === '55 999 0000' && added.email === 'ahmed@rashid.sa' && added.preferredChannel === 'whatsapp');
  check('…as "Added today"', added.lastLabel === 'Added today');
  check('…and says so', (await page.getByTestId('toast').innerText()) === 'Ahmed saved to People');

  await page.getByTestId('people-search').fill('Ahmed');
  await page.waitForTimeout(150);
  await page.getByTestId(`person-${added.id}`).getByText('Ahmed Rashid').click();
  await page.waitForTimeout(500);
  await page.getByTestId('contact-edit').click();
  await page.waitForTimeout(500);
  check('Edit fills the form', (await page.getByTestId('contact-form-name').inputValue()) === 'Ahmed Rashid' && (await page.getByTestId('contact-form-position').inputValue()) === 'Supplier');
  await page.getByTestId('contact-form-position').fill('Packaging supplier');
  await page.getByTestId('contact-form-save-top').click();
  await page.waitForTimeout(500);
  const edited = await read('ot.contacts');
  check('editing changes the contact, not the count', edited.length === contactsBefore + 1 && edited.find((c) => c.id === added.id).role === 'Packaging supplier');

  await open('/contact-edit');
  await page.getByTestId('contact-form-name').fill('Lina Barista');
  await page.getByTestId('contact-form-email').fill('lina@cafe.sa');
  await page.getByTestId('contact-form-pref-email').click();
  await page.waitForTimeout(150);
  check('the second button follows the channel', (await text('contact-form-save-start')).startsWith('Save & write an email'));
  const formTasksBefore = (await read('ot.tasks')).length;
  await page.getByTestId('contact-form-save-start').click();
  await page.waitForTimeout(600);
  const emailLina = (await read('ot.tasks')).slice(formTasksBefore)[0];
  check('"Save & write an email" saves and opens Compose', emailLina && emailLina.title === 'Email Lina' && page.url().includes(`/compose?id=${emailLina.id}`));

  await open('/contact-edit?id=c1');
  page.once('dialog', (d) => d.dismiss());
  await page.getByTestId('contact-form-delete').click();
  await page.waitForTimeout(300);
  check('declining the confirm deletes nothing', (await read('ot.contacts')).some((c) => c.id === 'c1'));
  page.once('dialog', (d) => d.accept());
  await page.getByTestId('contact-form-delete').click();
  await page.waitForTimeout(500);
  check('Delete removes the contact', !(await read('ot.contacts')).some((c) => c.id === 'c1') && page.url().endsWith('/people'));
  check('…and their history', !(await read('ot.history')).some((h) => h.contactId === 'c1'));
  await page.getByTestId('toast-undo').click();
  await page.waitForTimeout(300);
  check('Undo brings both back', (await read('ot.contacts')).some((c) => c.id === 'c1') && (await read('ot.history')).some((h) => h.contactId === 'c1'));
  check('the new form has no Delete', await (async () => { await open('/contact-edit'); return (await page.getByTestId('contact-form-delete').count()) === 0; })());

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

  // ------------------------------------------- the "Who?" sheet's order
  // It is ordered by what is owed, not by who was added first
  // (src/features/today/pick-order.ts). Noura owes a reply and it is due;
  // Al Noor owes one that is not; Sara was emailed three days ago. Sara is
  // starred on purpose: under the old sheet a star floated her to the top,
  // and the order below is the proof that it no longer does.
  await seed();
  await page.evaluate(() => localStorage.setItem('one-thing.favorites.v1', JSON.stringify(['c2'])));
  await open('/');
  await page.getByTestId('quick-action-whatsapp').click();
  await page.waitForTimeout(500);
  check('the WhatsApp tile opens the sheet', await page.getByTestId('pick-sheet').isVisible());
  const order = await page.evaluate(() =>
    [...document.querySelectorAll('[data-testid^="pick-c"]')]
      .filter((el) => !el.getAttribute('data-testid').startsWith('pick-pill'))
      .map((el) => el.getAttribute('data-testid'))
  );
  check('the overdue reply comes first', order[0] === 'pick-c4', JSON.stringify(order));
  check('…then the one still waiting', order[1] === 'pick-c5', JSON.stringify(order));
  check('…then whoever was reached most recently, star or no star', order[2] === 'pick-c2', JSON.stringify(order));
  check('a starred person is still marked as one', (await page.getByTestId('pick-star-c2').count()) === 1);
  check('…and nobody else is', (await page.getByTestId('pick-star-c4').count()) === 0);
  const sheet = await page.getByTestId('pick-sheet').innerText();
  check('a row says what is owed, not a phone number', sheet.includes('Waiting on a reply — Logo final files'));
  check('…and never guesses he or she', !/\bhis\b|\bher\b|\bhim\b/i.test(sheet), sheet.slice(0, 160));
  check('a row says how you last reached them', sheet.includes('You emailed'));
  check('the overdue one is marked', await page.getByTestId('pick-pill-c4').innerText() === 'Overdue');
  check('the waiting one is marked', await page.getByTestId('pick-pill-c5').innerText() === 'Waiting');
  check('somebody with nothing owed has no pill', (await page.getByTestId('pick-pill-c2').count()) === 0);

  // Over that order, the two things People has. The search used to appear
  // only past six people, which on a new account reads as "this sheet
  // cannot search" — so it is always there now.
  check('the sheet can be searched', (await page.getByTestId('pick-search').count()) === 1);
  check('…and carries the same chips People does', (await page.getByTestId('pick-filters-recent').count()) === 1 && (await page.getByTestId('pick-filters-waiting').count()) === 1);
  await page.getByTestId('pick-search').fill('noura');
  await page.waitForTimeout(300);
  const found = await page.evaluate(() => [...document.querySelectorAll('[data-testid^="pick-c"]')].filter((el) => !el.getAttribute('data-testid').startsWith('pick-pill')).map((el) => el.getAttribute('data-testid')));
  check('searching narrows it to the person named', found.length === 1 && found[0] === 'pick-c4', JSON.stringify(found));
  await page.getByTestId('pick-search').fill('zzzz');
  await page.waitForTimeout(300);
  check('a search that finds nobody says so', (await page.getByTestId('pick-none').count()) === 1);
  await page.getByTestId('pick-search').fill('');
  await page.waitForTimeout(300);

  await page.getByTestId('pick-filters-waiting').click();
  await page.waitForTimeout(300);
  const waiting = await page.evaluate(() => [...document.querySelectorAll('[data-testid^="pick-c"]')].filter((el) => !el.getAttribute('data-testid').startsWith('pick-pill')).map((el) => el.getAttribute('data-testid')));
  check('the Waiting chip shows only who owes a reply', waiting.length === 2 && waiting.includes('pick-c4') && waiting.includes('pick-c5'), JSON.stringify(waiting));
  await page.getByTestId('pick-filters-favorites').click();
  await page.waitForTimeout(300);
  const starred = await page.evaluate(() => [...document.querySelectorAll('[data-testid^="pick-c"]')].filter((el) => !el.getAttribute('data-testid').startsWith('pick-pill')).map((el) => el.getAttribute('data-testid')));
  check('the Favorites chip shows the starred person', starred.length === 1 && starred[0] === 'pick-c2', JSON.stringify(starred));
  await page.getByTestId('pick-filters-all').click();
  await page.waitForTimeout(300);
  check('All puts the owed-first order back', (await page.evaluate(() => document.querySelector('[data-testid^="pick-c"]')?.getAttribute('data-testid'))) === 'pick-c4');

  await page.getByTestId('pick-c2').click();
  await page.waitForTimeout(600);
  check('picking somebody starts the message', page.url().includes('/compose'), page.url());

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
