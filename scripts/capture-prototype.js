/**
 * Captures each screen of the design prototype at the reference size, to
 * compare the build against.
 *
 * Two things the prototype needs that this environment does not give it:
 * React and Babel come from unpkg (blocked), and IBM Plex Sans Arabic comes
 * from Google Fonts (blocked). Both are served from the project's own
 * node_modules instead — the font especially, because a fallback font changes
 * where every line wraps and would make the comparison meaningless.
 *
 *   node scripts/capture-prototype.js <path to design_handoff_the_one_thing> [outDir]
 */
'use strict';
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const HANDOFF = process.argv[2];
const DESIGN = path.join(HANDOFF, 'design');
const OUT = process.argv[3] || path.join(ROOT, '.screens-prototype');
const PAGE = 'The One Thing v5.dc.html';

// The prototype runs on React 18 UMD builds, which React 19 no longer ships —
// hence the aliased devDependencies. They are only ever loaded by this script.
const CDN = {
  'react@18.3.1/umd/react.production.min.js': 'node_modules/prototype-react/umd/react.production.min.js',
  'react-dom@18.3.1/umd/react-dom.production.min.js':
    'node_modules/prototype-react-dom/umd/react-dom.production.min.js',
  '@babel/standalone@7.29.0/babel.min.js': 'node_modules/@babel/standalone/babel.min.js',
};

const FONT_DIR = path.join(ROOT, 'node_modules/@expo-google-fonts/ibm-plex-sans-arabic');
const FONT_FACES = [
  ['400', '400Regular/IBMPlexSansArabic_400Regular.ttf'],
  ['500', '500Medium/IBMPlexSansArabic_500Medium.ttf'],
  ['600', '600SemiBold/IBMPlexSansArabic_600SemiBold.ttf'],
  ['700', '700Bold/IBMPlexSansArabic_700Bold.ttf'],
];

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.jsx': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.ttf': 'font/ttf' };

(async () => {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent((req.url || '/').split('?')[0]);

    // Fonts are served from here so the prototype gets the real typeface.
    if (url.startsWith('/__font/')) {
      const file = path.join(FONT_DIR, url.replace('/__font/', ''));
      if (!fs.existsSync(file)) {
        res.writeHead(404);
        return res.end();
      }
      res.writeHead(200, { 'content-type': 'font/ttf' });
      return res.end(fs.readFileSync(file));
    }

    const file = path.join(DESIGN, url);
    if (!file.startsWith(DESIGN) || !fs.existsSync(file)) {
      res.writeHead(404);
      return res.end('not found');
    }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(fs.readFileSync(file));
  });

  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;

  const fontCss = FONT_FACES.map(
    ([weight, file]) => `@font-face{font-family:'IBM Plex Sans Arabic';font-style:normal;font-weight:${weight};font-display:block;src:url(http://127.0.0.1:${port}/__font/${file}) format('truetype');}`
  ).join('\n');

  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 1100 }, deviceScaleFactor: 2 });

  await ctx.route(/unpkg\.com/, (route) => {
    const key = route.request().url().replace('https://unpkg.com/', '');
    const local = CDN[key];
    if (!local) return route.fulfill({ status: 404, body: '' });
    return route.fulfill({
      status: 200,
      contentType: 'text/javascript',
      body: fs.readFileSync(path.join(ROOT, local)),
    });
  });
  await ctx.route(/fonts\.googleapis\.com/, (route) =>
    route.fulfill({ status: 200, contentType: 'text/css', body: fontCss })
  );

  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().includes('404')) errors.push(m.text());
  });

  await page.goto(`http://127.0.0.1:${port}/${encodeURIComponent(PAGE)}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await page.evaluate(() => document.fonts.ready);

  fs.mkdirSync(OUT, { recursive: true });
  const skip = new Set(['Empty state', 'Reset demo', 'Send a test push notification', 'EN', 'English', 'العربية', 'Morning', 'Evening']);
  const captured = [];

  for (const lang of ['en', 'ar']) {
    if (lang === 'ar') {
      await page.locator('aside button', { hasText: 'العربية' }).first().click();
      await page.waitForTimeout(700);
    }

    const buttons = page.locator('aside button');
    const count = await buttons.count();
    for (let i = 0; i < count; i++) {
      const label = (await buttons.nth(i).innerText()).trim();
      if (skip.has(label)) continue;
      // Sidebar entries read "01\nSign in"; keep the number for ordering.
      const m = /^(\d+)\s*\n?(.*)$/s.exec(label);
      if (!m) continue;

      await buttons.nth(i).click();
      await page.waitForTimeout(600);
      const frame = page.locator('[dir="ltr"], [dir="rtl"]').first();
      const slug = m[2].trim().replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase().replace(/^-|-$/g, '');
      const name = `${lang}-${m[1]}-${slug}.png`;
      await frame.screenshot({ path: path.join(OUT, name) });
      captured.push(name);
    }
  }

  await browser.close();
  server.close();
  console.log(JSON.stringify({ captured: captured.length, out: path.relative(ROOT, OUT), errors }, null, 2));
})();
