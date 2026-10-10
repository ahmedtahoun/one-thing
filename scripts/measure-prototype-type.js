/**
 * Tallies the type styles the prototype actually computes, across every screen.
 *
 * README.md's type scale and the prototype disagree in places (body-s is 1.5
 * in the table but 1.45 in the prototype; micro is 1.4 in the table but 1.5 in
 * the prototype). The screenshots show the prototype, and ACCEPTANCE.md is
 * written against the screenshots, so the prototype wins — but only once it has
 * been measured rather than assumed.
 *
 *   node scripts/measure-prototype-type.js <path to design_handoff_the_one_thing>
 */
'use strict';
const { launch: launchChromium } = require('./browser.js');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { handoffDir } = require('./handoff.js');

const ROOT = path.join(__dirname, '..');
const DESIGN = path.join(handoffDir(process.argv[2]), 'design');
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
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.jsx': 'text/javascript', '.css': 'text/css', '.ttf': 'font/ttf' };

(async () => {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent((req.url || '/').split('?')[0]);
    if (url.startsWith('/__font/')) {
      res.writeHead(200, { 'content-type': 'font/ttf' });
      return res.end(fs.readFileSync(path.join(FONT_DIR, url.replace('/__font/', ''))));
    }
    const file = path.join(DESIGN, url);
    if (!fs.existsSync(file)) {
      res.writeHead(404);
      return res.end();
    }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(fs.readFileSync(file));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;

  const css = FACES.map(
    ([w, f]) =>
      `@font-face{font-family:'IBM Plex Sans Arabic';font-style:normal;font-weight:${w};font-display:block;src:url(http://127.0.0.1:${port}/__font/${f}) format('truetype');}`
  ).join('\n');

  const browser = await launchChromium();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 1100 }, deviceScaleFactor: 2 });
  await ctx.route(/unpkg\.com/, (r) => {
    const key = r.request().url().replace('https://unpkg.com/', '');
    const local = CDN[key];
    return local
      ? r.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(ROOT, local)) })
      : r.fulfill({ status: 404, body: '' });
  });
  await ctx.route(/fonts\.googleapis\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/css', body: css }));

  const page = await ctx.newPage();
  await page.goto(`http://127.0.0.1:${port}/${encodeURIComponent('The One Thing v5.dc.html')}`, {
    waitUntil: 'networkidle',
  });
  await page.waitForTimeout(2500);
  await page.evaluate(() => document.fonts.ready);

  const tally = {};
  const buttons = page.locator('aside button');
  const count = await buttons.count();
  for (let i = 0; i < count; i++) {
    const label = (await buttons.nth(i).innerText()).trim();
    if (!/^\d+/.test(label)) continue;
    await buttons.nth(i).click();
    await page.waitForTimeout(450);
    const screenTally = await page.evaluate(() => {
      const frame = document.querySelector('[dir="ltr"],[dir="rtl"]');
      const out = {};
      frame.querySelectorAll('*').forEach((el) => {
        const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
        if (!hasText) return;
        const cs = getComputedStyle(el);
        const key = [cs.fontSize, cs.fontWeight, cs.lineHeight, cs.letterSpacing].join(' | ');
        out[key] = (out[key] || 0) + 1;
      });
      return out;
    });
    for (const [k, v] of Object.entries(screenTally)) tally[k] = (tally[k] || 0) + v;
  }

  await browser.close();
  server.close();

  const rows = Object.entries(tally)
    .map(([k, uses]) => {
      const [size, weight, lh, ls] = k.split(' | ');
      const px = parseFloat(size);
      const lhPx = lh === 'normal' ? null : parseFloat(lh);
      return { size: px, weight: +weight, lineHeight: lhPx, ratio: lhPx ? +(lhPx / px).toFixed(3) : null, letterSpacing: ls, uses };
    })
    .sort((a, b) => b.size - a.size || b.uses - a.uses);

  console.log(JSON.stringify(rows, null, 2));
})();
