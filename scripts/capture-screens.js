/**
 * Renders the exported web build at the design's reference size and saves a
 * PNG per route, so a screen can be put side by side with the prototype.
 *
 * The handoff's screenshots/ PNGs are 924x540 device-frame shots with the
 * phone content at roughly 0.57x, so they cannot answer "±2 pt at 402 x 874"
 * (BUILD-REVIEW.md §2.6). These captures, and the matching ones taken from
 * design/The One Thing v5.dc.html, can.
 *
 *   npx expo export --platform web
 *   node scripts/capture-screens.js [outDir]
 */
'use strict';
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { demoTasks, dateKey } = require('./demo-state');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const OUT = process.argv[2] || path.join(ROOT, '.screens');

/** The iPhone 16 Pro logical size the design is specified at. */
const FRAME = { width: 402, height: 874 };

/**
 * Screens that need someone signed in get this session seeded first, so Today
 * renders with a name and a first-run card rather than empty. It matches the
 * prototype's own demo user.
 */
const DEMO_SESSION = {
  en: {
    userId: 'capture',
    name: 'Khalid Al-Mansouri',
    firstName: 'Khalid',
    jobTitle: 'Founder',
    authProvider: 'apple',
    plan: 'free',
    firstRun: true,
  },
  ar: {
    userId: 'capture',
    name: 'خالد المنصوري',
    firstName: 'خالد',
    jobTitle: 'مؤسس',
    authProvider: 'apple',
    plan: 'free',
    firstRun: true,
  },
};

/** The One Thing the prototype's demo day is built around. */
const DEMO_ONE_THING = {
  en: 'Finish the investor proposal',
  ar: 'أخلّص عرض المستثمرين',
};

const ROUTES = [
  { path: '/sign-in', name: '01-sign-in' },
  { path: '/setup', name: '02-account-setup' },
  { path: '/legal?tab=terms', name: '03-legal-terms' },
  { path: '/legal?tab=privacy', name: '03-legal-privacy' },
  { path: '/today', name: '06-today-first-run', signedIn: true },
  { path: '/today', name: '06-today', signedIn: true, firstRun: false, seedTasks: true, oneThing: true },
  { path: '/today', name: '06-today-empty', signedIn: true, firstRun: false },
  { path: '/tasks', name: '07-tasks', signedIn: true, firstRun: false, seedTasks: true, oneThing: true },
];

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
};

function serve(dir) {
  return http.createServer((req, res) => {
    const url = decodeURIComponent((req.url || '/').split('?')[0]);
    let file = path.join(dir, url);
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      const asHtml = path.join(dir, url + '.html');
      file = fs.existsSync(asHtml) ? asHtml : path.join(dir, 'index.html');
    }
    if (!file.startsWith(dir) || !fs.existsSync(file)) {
      res.writeHead(404);
      return res.end('not found');
    }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(fs.readFileSync(file));
  });
}

(async () => {
  if (!fs.existsSync(DIST)) throw new Error('No dist/. Run: npx expo export --platform web');
  fs.mkdirSync(OUT, { recursive: true });

  const server = serve(DIST);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;

  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  });
  const results = [];

  for (const lang of ['en', 'ar']) {
    const ctx = await browser.newContext({
      viewport: FRAME,
      deviceScaleFactor: 2,
      locale: lang === 'ar' ? 'ar-SA' : 'en-GB',
    });
    const page = await ctx.newPage();
    // The prototype's demo clock reads 09:20, and a moving clock would make
    // "in 40 min" and the Now divider differ on every run.
    const frozen = new Date();
    frozen.setHours(9, 20, 0, 0);
    await page.clock.setFixedTime(frozen);
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });

    for (const route of ROUTES) {
      const before = errors.length;
      // The session is read from AsyncStorage, which is localStorage on web.
      await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded' });
      await page.evaluate(
        ({ session, tasks, oneThing }) => {
          const put = (key, value) => {
            if (value) window.localStorage.setItem(key, JSON.stringify(value));
            else window.localStorage.removeItem(key);
          };
          put('ot.session', session);
          put('ot.tasks', tasks);
          put('ot.oneThing', oneThing);
        },
        {
          session: route.signedIn
            ? { ...DEMO_SESSION[lang], firstRun: route.firstRun !== false }
            : null,
          tasks: route.seedTasks ? demoTasks(lang, new Date()) : null,
          oneThing: route.oneThing
            ? { date: dateKey(new Date()), done: false, focusMinutes: 45, title: DEMO_ONE_THING[lang] }
            : null,
        }
      );
      await page.goto(`http://127.0.0.1:${port}${route.path}`, { waitUntil: 'networkidle' });
      // Fonts and the first paint of the React tree.
      await page.waitForTimeout(900);
      const file = path.join(OUT, `${lang}-${route.name}.png`);
      await page.screenshot({ path: file });

      const text = await page.locator('body').innerText();
      const broken = ['undefined', 'NaN', '[object Object]'].filter((tok) => text.includes(tok));
      results.push({
        lang,
        route: route.path,
        file: path.relative(ROOT, file),
        broken,
        errors: errors.slice(before),
        textLength: text.length,
      });
    }
    await ctx.close();
  }

  await browser.close();
  server.close();

  const failures = results.filter((r) => r.broken.length || r.errors.length);
  console.log(JSON.stringify({ captured: results.length, out: path.relative(ROOT, OUT), failures }, null, 2));
  process.exit(failures.length ? 1 : 0);
})();
