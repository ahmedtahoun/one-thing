/**
 * Measures the app's own font so src/features/people/quiet-line.ts can
 * estimate how wide a line of text will be drawn before drawing it. There is
 * no synchronous text metric in React Native, and `onTextLayout` arrives a
 * frame after the row is drawn, so the estimate has to come from a table and
 * the table has to come from somewhere. BUILD-REVIEW §2.111.
 *
 * It prints what `quiet-line.ts` holds as constants, so a font change or a
 * change to the row's layout can be answered by running this and pasting:
 *
 *   the WIDTHS table    every character's advance, in ems, bucketed to 0.05;
 *   ARABIC_EM           one average, fitted over real roles, because Arabic
 *                       letters join and so do not add up;
 *   the column          what the quiet line is really given at each reference
 *                       frame, to check `lineWidth` against.
 *
 * And it writes `src/features/people/font-widths.json` — the width of every
 * role-and-reach pair a real address book makes, in both languages. That file
 * is the oracle `quiet-line.test.ts` holds the estimate to: the test does not
 * check the estimate against a tolerance, it checks that the estimate reaches
 * the same fits-or-not verdict as the browser did, and never the unsafe one.
 *
 *   npx expo export --platform web
 *   npm run measure:line
 */
'use strict';
const { launch: launchChromium } = require('./browser.js');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { demoContacts, demoFollowUps, demoHistory, demoTasks } = require('./demo-state.js');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const ORACLE = path.join(ROOT, 'src', 'features', 'people', 'font-widths.json');
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

const SESSION = { userId: 'measure', name: 'Khalid Al-Mansouri', firstName: 'Khalid', jobTitle: 'Founder', authProvider: 'apple', plan: 'free', firstRun: false };

/** Roles and reaches of the shape people really have, in both languages. */
const ROLES = ['Founder', 'Travel', 'Operations Lead', 'General Manager', 'Head of Partnerships', 'CEO', 'CTO', 'Supplier', 'Accountant', 'General Manager · @speranza', 'مؤسس', 'مدير عام', 'مسؤول المشتريات', 'محاسب', 'مورد', 'رئيس الشراكات', 'مدير التشغيل', 'سفر'];
const REACHES = ['+20 100 123 4567', '+971 50 900 1122', '+966 55 123 4567', 'info@test.com', 'hello@example.com', 'books@ledgerco.com', 'ops@acme.co'];

/** The frames the app is designed and checked at. scripts/narrow.js, REFERENCE_FRAME. */
const FRAMES = [402, 360];

const ARABIC = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;
const bucket = (v) => Math.round(v * 20) / 20;

(async () => {
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await launchChromium();
  const ctx = await browser.newContext({ viewport: { width: FRAMES[0], height: 874 }, deviceScaleFactor: 2, locale: 'en-GB' });
  const page = await ctx.newPage();

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

  /** The quiet line's own font, and the column it is given, read off a real row. */
  const frame = async (width) => {
    await page.setViewportSize({ width, height: 874 });
    await page.goto(`${base}/people`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);
    return page.evaluate(() => {
      const row = document.querySelector('[data-testid^="person-c"]:not([data-testid$="-due"])');
      const lines = [...row.querySelectorAll('div')].filter((d) => !d.childElementCount && d.textContent.trim());
      const quiet = lines.find((d) => Math.round(parseFloat(getComputedStyle(d).fontSize)) === 14);
      const style = getComputedStyle(quiet);
      return { column: Math.round(quiet.getBoundingClientRect().width), size: Math.round(parseFloat(style.fontSize)), font: `${style.fontWeight} ${style.fontSize} ${style.fontFamily}` };
    });
  };

  const columns = {};
  let seen = null;
  for (const width of FRAMES) {
    const read = await frame(width);
    columns[width] = read.column;
    seen = read;
  }

  // Advances are read at 100px, where a tenth of a pixel is a thousandth of an em.
  const measured = await page.evaluate(
    ([font, roles, reaches]) => {
      const probe = document.createElement('canvas').getContext('2d');
      probe.font = font.replace(/[\d.]+px/, '100px');
      const em = (s) => probe.measureText(s).width / 100;
      const chars = {};
      for (let c = 32; c <= 126; c++) chars[String.fromCharCode(c)] = em(String.fromCharCode(c));
      for (const c of '·…–—') chars[c] = em(c);
      // Arabic letters shape, so these are their isolated widths — wider than
      // the same letter inside a word. quiet-line.ts shrinks them.
      for (const c of 'ابتثجحخدذرزسشصضطظعغفقكلمنهويىءآأإؤئةـ\u0640\u064B\u064C\u064D\u064E\u064F\u0650\u0651\u0652٠١٢٣٤٥٦٧٨٩') chars[c] = em(c);
      const pairs = {};
      for (const role of roles) {
        pairs[role] = em(role);
        for (const reach of reaches) pairs[`${role} · ${reach}`] = em(`${role} · ${reach}`);
      }
      for (const reach of reaches) pairs[reach] = em(reach);
      return { chars, pairs };
    },
    [seen.font, ROLES, REACHES]
  );

  const byWidth = new Map();
  for (const [char, v] of Object.entries(measured.chars)) {
    const key = bucket(v);
    byWidth.set(key, (byWidth.get(key) ?? '') + char);
  }

  console.log(`font:   ${seen.font}`);
  console.log(`column: ${FRAMES.map((w) => `${w}pt leaves ${columns[w]}`).join(', ')}`);
  console.log(`        so lineWidth subtracts ${[...new Set(FRAMES.map((w) => w - columns[w]))].join(' and ')}`);
  console.log('\n--- WIDTHS, for quiet-line.ts ---');
  for (const key of [...byWidth.keys()].sort((a, b) => a - b)) {
    console.log(`  [${key}, ${JSON.stringify(byWidth.get(key))}],`);
  }

  // Arabic letters join, so a shaped run is narrower than its glyphs end to
  // end. One average, fitted by taking the Latin part of each string as known
  // and sharing the remainder over its Arabic letters.
  let remainder = 0;
  let letters = 0;
  for (const [text, real] of Object.entries(measured.pairs)) {
    const arabic = [...text].filter((c) => ARABIC.test(c)).length;
    if (!arabic) continue;
    const latin = [...text].filter((c) => !ARABIC.test(c)).reduce((a, c) => a + bucket(measured.chars[c] ?? 0.6), 0);
    remainder += real - latin;
    letters += arabic;
  }
  console.log(`\nARABIC_EM, fitted over ${letters} letters: ${(remainder / letters).toFixed(4)}`);

  const pairs = {};
  for (const [text, em] of Object.entries(measured.pairs)) pairs[text] = Math.round(em * 1000) / 1000;
  fs.writeFileSync(
    ORACLE,
    `${JSON.stringify(
      {
        note: 'Measured by scripts/measure-line.js — do not edit by hand.',
        font: seen.font,
        size: seen.size,
        columns,
        chars: Object.fromEntries(Object.entries(measured.chars).map(([c, em]) => [c, Math.round(em * 1000) / 1000])),
        pairs,
      },
      null,
      1
    )}\n`
  );
  console.log(`\nwrote ${path.relative(ROOT, ORACLE)}: ${Object.keys(pairs).length} strings, columns ${JSON.stringify(columns)}`);
  console.log('`npm test` holds quiet-line.ts to it.');

  await browser.close();
  srv.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
