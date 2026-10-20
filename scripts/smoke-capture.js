/**
 * Drives Quick capture, Brain dump, the Assistant and the Paywall in a browser
 * and asserts on what is stored — above all, that nothing is saved until the
 * person confirms it.
 *
 *   Capture:    typing and speaking both reach the parsed card; the card
 *               follows edits; Save writes one task; Close writes none; the
 *               mic explains itself before it opens and is not explained
 *               twice; with no recogniser the mic falls back to typing.
 *   Dump:       an empty box sorts nothing; the sample splits into six; a tap
 *               drops one; Edit keeps the text; Save writes only what is kept.
 *   Assistant:  greets by name; a task waits for "Looks right"; the plan and
 *               follow-ups replies; a note with no "when" is asked about
 *               rather than guessed at; the eleventh request on Free opens
 *               the paywall; Pro is not metered.
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
  // Google wants the microphone explained in the app before it is asked
  // for, in the policy's own words — src/features/mic/notice.ts.
  await page.getByTestId('capture-mic').click();
  await page.waitForTimeout(250);
  check('the mic explains itself before it opens', (await count('mic-notice')) === 1 && (await count('capture-stop')) === 0);
  check('…in the words the published policy uses', (await text('mic-notice')).includes('speech recogniser'), await text('mic-notice'));
  await page.getByTestId('mic-notice-deny').click();
  await page.waitForTimeout(250);
  check('“Not now” records nothing and opens nothing', (await count('capture-stop')) === 0 && (await read('ot.mic.notice')) === null);
  await page.getByTestId('capture-mic').click();
  await page.waitForTimeout(250);
  check('…so it is asked again next time', (await count('mic-notice')) === 1);
  await page.getByTestId('mic-notice-allow').click();
  await page.waitForTimeout(250);
  check('the mic listens once it is agreed to', (await count('capture-stop')) === 1 && (await read('ot.mic.notice')) === true);
  await page.getByTestId('capture-stop').click();
  await page.waitForTimeout(300);
  const heardCard = await text('capture-card');
  // Times read as people say them now — "3:00 PM", not "15:00".
  check('what was heard is parsed', heardCard.includes('Call Sara') && heardCard.includes('Sara Haddad') && heardCard.includes('Tomorrow · 3:00 PM'), heardCard);
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
  await page.waitForTimeout(250);
  check('the notice is not shown twice on one device', (await count('mic-notice')) === 0);
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
  // A fresh seed, so the notice is owed again on this device.
  await page.getByTestId('dump-talk').click();
  await page.waitForTimeout(250);
  check('Brain dump explains the mic as well', (await count('mic-notice')) === 1);
  await page.getByTestId('mic-notice-allow').click();
  await page.waitForTimeout(250);
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
  // The sentence is the same; the time inside it reads "11:00 AM" now, so
  // the full stop is no longer part of what to match.
  check('…and says when it will remind', (await page.locator('body').innerText()).includes('Saved. I’ll tap you gently at 11:00') && (await count('assistant-kept')) === 1);

  // Everything from here is answered from what is already on the device
  // (src/lib/parse/ask-data.ts): no request spent, no server asked, and the
  // meter check at the end of the block is what proves it.
  const spent = async () => ((await read('ot.assistantUsage')) ?? { used: 0 }).used;
  const afterTask = await spent();

  await page.getByTestId('assistant-chip-day').click();
  await page.waitForTimeout(900);
  check('the "My day" chip answers from the list itself', (await count('qa-tasks')) === 1);
  check('…naming today\'s real tasks', (await text('qa-tasks')).includes('Follow up on price quote'), (await text('qa-tasks')).slice(0, 120));

  await page.getByTestId('assistant-chip-waiting').click();
  await page.waitForTimeout(900);
  check('the "Who’s waiting?" chip answers from the follow-ups', (await count('qa-waiting')) === 1);
  check('…and offers Replied on each', (await page.locator('[data-testid^="qa-replied-"]').count()) > 0);

  await page.getByTestId('assistant-input').fill("What's Sara's number?");
  await page.getByTestId('assistant-send').click();
  await page.waitForTimeout(900);
  check('a question about someone answers with their number', (await page.getByTestId('assistant-reply').last().innerText()).includes('50 331 2045'));
  check('…and the ways to reach them', (await count('qa-call')) === 1 && (await count('qa-whatsapp')) === 1 && (await count('qa-email')) === 1);

  // Two people with one name: it asks which, and choosing answers the
  // question that was asked rather than opening a profile.
  await page.evaluate(() => {
    const people = JSON.parse(localStorage.getItem('ot.contacts') || '[]');
    people.push({ id: 'c99', name: 'Sara Mansour', dial: '+966', phone: '55 777 1234', email: 'sara.m@example.com', createdAt: new Date().toISOString() });
    localStorage.setItem('ot.contacts', JSON.stringify(people));
  });
  await open('/assistant');
  await page.getByTestId('assistant-input').fill("What's Sara's number?");
  await page.getByTestId('assistant-send').click();
  await page.waitForTimeout(900);
  check('two people with one name are offered as a choice', (await count('qa-who')) === 1 && (await page.locator('[data-testid^="qa-who-"]').count()) === 2);
  await page.getByTestId('qa-who-c99').click();
  await page.waitForTimeout(700);
  check('…and choosing one answers the question that was asked', (await page.getByTestId('assistant-reply').last().innerText()).includes('55 777 1234'), await page.getByTestId('assistant-reply').last().innerText());

  await page.getByTestId('assistant-input').fill("What's Jane's number?");
  await page.getByTestId('assistant-send').click();
  await page.waitForTimeout(900);
  check('somebody the app does not know offers a search, not a dead end', (await count('qa-find')) === 1);
  await page.getByTestId('qa-find').click();
  await page.waitForTimeout(500);
  check('…which opens People to pick from', (await count('person-search')) === 1);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  await open('/assistant');
  await page.getByTestId('assistant-input').fill("What's Sara Haddad's number?");
  await page.getByTestId('assistant-send').click();
  await page.waitForTimeout(900);

  // The thread. The next question names nobody, and is about the same
  // person — which is what makes it a conversation (src/lib/parse/ask-data.ts).
  await page.getByTestId('assistant-input').fill('and her email?');
  await page.getByTestId('assistant-send').click();
  await page.waitForTimeout(900);
  check('a follow-up question stays on the person just asked about', (await page.getByTestId('assistant-reply').last().innerText()).includes('sara@northwind.vc'), await page.getByTestId('assistant-reply').last().innerText());

  await page.getByTestId('assistant-input').fill("What's my One Thing today?");
  await page.getByTestId('assistant-send').click();
  await page.waitForTimeout(900);
  check('it knows today’s One Thing', (await page.getByTestId('assistant-reply').last().innerText()).includes('Finish the investor proposal'));
  check('…and offers to start the focus session', (await count('qa-focus')) === 1 && (await count('qa-one-done')) === 1);

  await page.getByTestId('assistant-input').fill("What's next?");
  await page.getByTestId('assistant-send').click();
  await page.waitForTimeout(900);
  check('it answers what to do next with one task', (await count('qa-next')) === 1);

  await page.getByTestId('assistant-input').fill('What did I do today?');
  await page.getByTestId('assistant-send').click();
  await page.waitForTimeout(900);
  // Nothing is logged today in the demo day, and an empty log says so rather
  // than counting nought — a Task has no finished-at, so this reads history.
  check('it answers the day from what is actually dated', (await page.getByTestId('assistant-reply').last().innerText()).includes('Nothing logged today'), await page.getByTestId('assistant-reply').last().innerText());

  await page.getByTestId('assistant-input').fill('Who did I talk to this week?');
  await page.getByTestId('assistant-send').click();
  await page.waitForTimeout(900);
  check('…and the week has the history in it', (await count('qa-log')) === 1);

  // Everything open with one person — the question this app is for, and the
  // one that used to come back as his phone number.
  await page.getByTestId('assistant-input').fill('Anything pending with Mohammed?');
  await page.getByTestId('assistant-send').click();
  await page.waitForTimeout(900);
  check('a question about one person gathers what is open with them', (await count('qa-with-person')) === 1);
  const withOne = (await count('qa-with-person')) ? await text('qa-with-person') : '';
  check(
    '…his task and the reply he owes, in one card',
    withOne.includes('Follow up on price quote') && withOne.includes('Price quote'),
    withOne.slice(0, 180)
  );
  check('…and the reply can be closed from the chat', (await page.locator('[data-testid^="qa-replied-"]').count()) > 0);

  // The thread remembers him, so the next question needs no name in it.
  await page.getByTestId('assistant-input').fill('did he reply?');
  await page.getByTestId('assistant-send').click();
  await page.waitForTimeout(900);
  check('…and the question after it can just say "he"', (await count('qa-with-person')) === 2, `${await count('qa-with-person')} cards`);

  // A task found by its own words: people remember the thing, not the date.
  await page.getByTestId('assistant-input').fill('When is the VAT filing?');
  await page.getByTestId('assistant-send').click();
  await page.waitForTimeout(900);
  check('a task can be found by its own words', (await count('qa-found-task')) === 1);
  check(
    '…and it is the one that was named',
    (await count('qa-found-task')) ? (await text('qa-found-task')).includes('Quarterly VAT filing') : false,
    (await count('qa-found-task')) ? (await text('qa-found-task')).slice(0, 120) : 'no card'
  );

  // Acting on an answer, not only reading it.
  await page.getByTestId('assistant-chip-day').click();
  await page.waitForTimeout(900);
  const openBefore = (await read('ot.tasks')).filter((t) => t.status === 'open').length;
  await page.locator('[data-testid^="qa-done-"]').first().click();
  await page.waitForTimeout(500);
  const openAfter = (await read('ot.tasks')).filter((t) => t.status === 'open').length;
  check('a task can be ticked off from the chat', openAfter === openBefore - 1, `${openBefore} → ${openAfter}`);
  check('…and says so, with Undo', (await text('toast')).includes('Done — '));
  await page.getByTestId('toast-undo').click();
  await page.waitForTimeout(400);
  check('…which puts it back', (await read('ot.tasks')).filter((t) => t.status === 'open').length === openBefore);

  await page.getByTestId('assistant-input').fill("What's late?");
  await page.getByTestId('assistant-send').click();
  await page.waitForTimeout(900);
  check('"What\'s late?" answers from the list', (await page.getByTestId('assistant-reply').last().innerText()).match(/late|Nothing late/i) !== null);

  const beforeFrance = await taskCount();
  await page.getByTestId('assistant-input').fill('What is the capital of France?');
  await page.getByTestId('assistant-send').click();
  await page.waitForTimeout(900);
  // A question it cannot answer is answered as one: it no longer becomes a
  // task about the question, and it no longer asks when to do it.
  check(
    'a question outside its scope says so and offers examples',
    (await page.getByTestId('assistant-reply').last().innerText()).includes('best with your people') && (await count('assistant-hint')) === 1,
    await page.getByTestId('assistant-reply').last().innerText()
  );
  check('…and saves nothing', (await taskCount()) === beforeFrance);
  check('…and asks nothing', (await count('assistant-ask')) === 0);

  // The chips: short, drawn from this person's own data, and they learn.
  const chipKeys = async () => page.evaluate(() => [...document.querySelectorAll('[data-testid^="assistant-chip-"]')].map((el) => el.getAttribute('data-testid')));
  const onScreen = await chipKeys();
  check('the chips are the ones this person’s data calls for', onScreen.includes('assistant-chip-waiting') && onScreen.includes('assistant-chip-scan'), JSON.stringify(onScreen));
  check('…and short enough to read', (await page.evaluate(() => [...document.querySelectorAll('[data-testid^="assistant-chip-"]')].every((el) => (el.textContent || '').length <= 18))));
  // The fault it replaced: one chip held a whole sentence and filled the
  // row on its own. Any chip wider than about a third of the screen is
  // that fault coming back.
  const widest = await page.evaluate(() => Math.max(...[...document.querySelectorAll('[data-testid^="assistant-chip-"]')].map((el) => el.getBoundingClientRect().width)));
  check('…and no chip fills the row on its own', widest < 402 * 0.45, `widest chip ${Math.round(widest)}pt`);

  // And they learn: the chip this person keeps tapping comes back first.
  // "My day" was tapped once above; twice more makes it the one they use.
  await page.getByTestId('assistant-chip-day').click();
  await page.waitForTimeout(500);
  await page.getByTestId('assistant-chip-day').click();
  await page.waitForTimeout(500);
  check('every tap is counted on the device', ((await read('ot.assistant.habits')) ?? {}).day >= 2, JSON.stringify(await read('ot.assistant.habits')));
  await open('/assistant');
  check('…and the one used most comes back first', (await chipKeys())[0] === 'assistant-chip-day', JSON.stringify(await chipKeys()));

  // A question asked while a question is open is answered, not swallowed.
  // Found on a phone: "What tasks I have today" became the *time* for the
  // task being asked about, which answered neither.
  const beforeAsk = await taskCount();
  // The "My day" chip above already left one list card in the chat, so it
  // is the new one that matters.
  const listsBefore = await count('qa-tasks');
  await page.getByTestId('assistant-input').fill('Email Faisal the invoice');
  await page.getByTestId('assistant-send').click();
  await page.waitForTimeout(900);
  check('a note with no time asks when', (await count('assistant-ask')) === 1);
  await page.getByTestId('assistant-input').fill('No I want it here');
  await page.getByTestId('assistant-send').click();
  await page.waitForTimeout(700);
  check('turning the question down says what it needs, not “I couldn’t read that”', (await page.getByTestId('assistant-reply').last().innerText()).includes('needs a time'), await page.getByTestId('assistant-reply').last().innerText());
  await page.getByTestId('assistant-input').fill('What tasks I have today');
  await page.getByTestId('assistant-send').click();
  await page.waitForTimeout(900);
  check('a new question is answered rather than read as the time', (await count('qa-tasks')) === listsBefore + 1, `${listsBefore} → ${await count('qa-tasks')}`);
  check('…and nothing was saved on the way', (await taskCount()) === beforeAsk);

  check('none of those questions spent a request', (await spent()) === afterTask, `${await spent()} vs ${afterTask}`);
  // "Call Faisal tomorrow at 11" names a channel, a person and a time, so the
  // rules read it on the device and the server is never asked (§2.69). The
  // meter counts requests, so it counts none of this (§2.72).
  check('…and nor did the explicit task, which the device read itself', afterTask === 0, String(afterTask));

  // A note the rules cannot be sure of is what a request is actually for.
  await page.getByTestId('assistant-input').fill('the deck thing for sara');
  await page.getByTestId('assistant-send').click();
  await page.waitForTimeout(900);
  check('a note that needs the server spends one', (await spent()) === 1, String(await spent()));

  await page.evaluate((day) => localStorage.setItem('ot.assistantUsage', JSON.stringify({ date: day, used: 10 })), dateKey(new Date()));
  await open('/assistant');
  await page.getByTestId('assistant-input').fill('Email Sara the deck');
  await page.getByTestId('assistant-send').click();
  await page.waitForTimeout(800);
  // Out of requests no longer means out of Assistant: this one is read on the
  // device, so it is answered rather than sent to the paywall.
  check('an explicit note still works with the day’s requests gone', page.url().endsWith('/assistant'), page.url());
  check('…and still spends nothing', (await read('ot.assistantUsage')).used === 10);

  // A fresh screen: that note left a "when?" open, and typing into an open
  // question answers it rather than starting a new errand.
  await open('/assistant');
  await page.getByTestId('assistant-input').fill('the deck thing for sara');
  await page.getByTestId('assistant-send').click();
  await page.waitForTimeout(800);
  check('the eleventh request on Free opens the paywall', page.url().endsWith('/paywall'), page.url());
  check('…without spending one', (await read('ot.assistantUsage')).used === 10);

  await seed({ ...SESSION, plan: 'pro' });
  await page.evaluate((day) => localStorage.setItem('ot.assistantUsage', JSON.stringify({ date: day, used: 10 })), dateKey(new Date()));
  await open('/assistant');
  await page.getByTestId('assistant-input').fill('the deck thing for sara');
  await page.getByTestId('assistant-send').click();
  await page.waitForTimeout(1000);
  // The eleventh request on Free opened the paywall; on Pro the same request
  // is simply answered. Staying on the screen is the whole assertion — what
  // it answers with is the clarify layer's business, tested above.
  check('Pro is not metered', page.url().endsWith('/assistant') && (await count('assistant-ask')) === 1, page.url());

  // ---------------------------------------------------------------- Paywall
  await seed();
  await open('/paywall');
  check('the title names the person', (await text('paywall-title')) === 'Never drop a promise again, Khalid.');
  check('Yearly is selected', (await page.getByTestId('paywall-plan-year').getAttribute('aria-checked')) === 'true' && (await page.getByTestId('paywall-plan-month').getAttribute('aria-checked')) === 'false');
  check('all three tiers are shown', (await count('paywall-tier-free')) === 1 && (await count('paywall-tier-pro')) === 1 && (await count('paywall-tier-pro_plus')) === 1);
  // The reason the saving is computed rather than typed: the two tiers do
  // not discount by the same amount, so no single badge could be true of
  // both. 6.99x12 against 39.99 is 52.3%; 12.99x12 against 99.99 is 35.8%.
  // 6.99x12 against 39.99 is 52.3%, floored. Pro+ would be 35.8%, but a
  // saving is an offer and Pro+ is not one, so it carries a price and no badge.
  check('Pro states its own saving, computed', (await text('paywall-save-pro')) === 'Save 52%');
  check('…and the tier that is not for sale advertises none', (await count('paywall-save-pro_plus')) === 0);
  check('…per month, against the annual total', (await text('paywall-price-pro')) === '$3.33' && (await text('paywall-price-pro_plus')) === '$8.33');
  check('…with the yearly fine print', (await text('paywall-fine')).startsWith('Free for 7 days, then $39.99/year.'));
  // Priced in full view and impossible to buy, because none of what it sells
  // is built yet (src/features/paywall/plans.ts, FOR_SALE).
  check('Pro+ is shown as coming, not for sale', (await count('paywall-soon-pro_plus')) === 1 && (await page.getByTestId('paywall-tier-pro_plus').getAttribute('aria-checked')) === null);
  check('…and Pro is the one selected', (await page.getByTestId('paywall-tier-pro').getAttribute('aria-checked')) === 'true');
  await page.getByTestId('paywall-plan-month').click();
  await page.waitForTimeout(150);
  check('Monthly can be picked instead', (await page.getByTestId('paywall-plan-month').getAttribute('aria-checked')) === 'true');
  check('…and the monthly price has no saving to claim', (await text('paywall-price-pro')) === '$6.99' && (await count('paywall-save-pro')) === 0);
  check('the fine print follows the plan', (await text('paywall-fine')).startsWith('Free for 7 days, then $6.99/month.'));
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
