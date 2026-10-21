/**
 * Holds the admin panel to the design prototype (`design-handoff/design/
 * Admin Panel.dc.html`): renders both at the same size, drives both through
 * the same 13 screens with the same clicks, and reports
 *
 *   - pixel difference per screen (reported), and
 *   - drift: where each probed piece of text sits in each, which must be
 *     within 2 px (gates, as the app's `npm run drift` does).
 *
 * The panel runs in demo mode — the prototype's own seed data — on the
 * prototype's day, in UTC on both sides. Both get the same font files, so
 * a difference is layout, not typeface.
 *
 *   npm run build:demo && node scripts/fidelity.js [outDir]
 */
'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const path = require('path');

const ADMIN = path.join(__dirname, '..');
const ROOT = path.join(ADMIN, '..');
const { launch } = require(path.join(ROOT, 'scripts/browser.js'));
const { PNG } = require(path.join(ROOT, 'node_modules/pngjs'));
const pixelmatch = require(path.join(ROOT, 'node_modules/pixelmatch'));

const DESIGN = path.join(ROOT, 'design-handoff/design');
const PAGE = 'Admin Panel.dc.html';
const OUT = process.argv[2] || path.join(ADMIN, '.screens-admin');
const PORT = 3199;
const VIEW = { width: 1280, height: 860 };
const TOLERANCE = 2;

const CDN = {
  'react@18.3.1/umd/react.production.min.js': 'node_modules/prototype-react/umd/react.production.min.js',
  'react-dom@18.3.1/umd/react-dom.production.min.js': 'node_modules/prototype-react-dom/umd/react-dom.production.min.js',
  '@babel/standalone@7.29.0/babel.min.js': 'node_modules/@babel/standalone/babel.min.js',
};

/** The @fontsource stylesheets the panel imports, pointed at this server. */
function fontCss() {
  const sheets = [
    ...['400', '500', '600', '700'].map((w) => ['ibm-plex-sans-arabic', w]),
    ...['400', '500'].map((w) => ['ibm-plex-mono', w]),
  ];
  return sheets
    .map(([pkg, w]) =>
      fs
        .readFileSync(path.join(ADMIN, 'node_modules/@fontsource', pkg, `${w}.css`), 'utf8')
        .replace(/url\(\.\/files\//g, `url(/__fontsource/${pkg}/files/`)
    )
    .join('\n');
}

/**
 * The screens, in the order the handoff numbers them, and how to get from
 * one to the next. `probe` lists text whose position is compared. A probe is
 * usually one string, present in both; where the build deliberately says
 * something else — the team's email domain, which the product owner changed
 * after the prototype was drawn — it is `{ app, prototype }`, and the two
 * texts' positions are compared instead.
 */
const SCENES = [
  { name: '01-sign-in', probe: ['Admin sign in', 'For The One Thing team only.', 'Continue'] },
  { name: '02-two-step', go: async (p) => { await p.getByPlaceholder('Password').fill('secret1'); await click(p, 'Continue'); }, probe: ['Two-step verification', 'Verify'] },
  {
    name: '03-overview',
    go: async (p) => { await p.getByPlaceholder('6-digit code').fill('123456'); await click(p, 'Verify'); await p.waitForTimeout(800); },
    probe: ['Overview', 'Total users', 'Pro subscribers', 'Monthly revenue', 'New sign-ups', 'Where they come from', 'Analytics dataset', 'Needs attention', 'Feature usage · 7 days'],
  },
  { name: '04-users', go: (p) => click(p, 'Users'), probe: ['Users', 'Export CSV', 'Khalid Al-Mansouri', 'Sara Haddad', 'Aseel Al-Anazi'] },
  { name: '05-user-troubleshoot', go: (p) => click(p, 'Khalid Al-Mansouri'), probe: ['usr_1179', 'Email', 'App version', 'Subscription', 'Usage', 'Consent record', 'Notifications', 'Account actions'], scrollDrawer: false },
  { name: '06-user-contacts', go: (p) => tab(p, 'Contacts'), probe: ['Position · company', 'Mohammed Al-Saadi'], scrollTo: 'Position · company' },
  { name: '07-user-messages', go: (p) => tab(p, 'Messages'), probe: ['Deck v3 + a quick call'], scrollTo: 'Deck v3 + a quick call' },
  { name: '08-subscriptions', go: async (p) => { await click(p, '✕'); await click(p, 'Subscriptions'); }, probe: ['Subscriptions', 'Yearly share', 'Renews / ends', 'Khalid Al-Mansouri'] },
  { name: '09-support', go: (p) => click(p, 'Support'), probe: ['Support', 'Store reviews', 'Notifications fix', 'Mark resolved'] },
  { name: '10-growth', go: (p) => click(p, 'Growth'), probe: ['Growth', 'Funnel', 'Became Pro', 'Retention by sign-up week', 'Offer codes', 'LAUNCH50'] },
  { name: '11-privacy-requests', go: (p) => click(p, 'Privacy requests'), probe: ['Privacy requests', 'Delete now', 'Send export'] },
  { name: '12-audit-log', go: (p) => click(p, 'Audit log'), probe: ['Audit log', 'When', 'Reason', 'Signed in to admin'] },
  {
    name: '13-team-roles',
    go: (p) => click(p, 'Team & roles'),
    probe: [
      'Team & roles', 'Owner', 'Analyst', 'Khalid Al-Mansouri',
      // The domain moved to onlyonething.app after the prototype was drawn.
      { app: 'turki@onlyonething.app', prototype: 'turki@theonething.app' },
    ],
  },
];

async function click(page, text) {
  await page.getByText(text, { exact: true }).first().click();
  await page.waitForTimeout(500);
}

/** A drawer tab: a button whose text starts with the label (the count follows it). */
async function tab(page, label) {
  await page.locator('button').filter({ hasText: new RegExp('^' + label) }).last().click();
  await page.waitForTimeout(500);
}

/**
 * The top-left of the element whose own text is exactly `text`, preferring
 * one outside the sidebar.
 *
 * Half these screens are named after the sidebar link that opens them —
 * "Privacy requests", "Audit log", "Team & roles" — and a plain scan of the
 * document in order finds the link long before the heading. That was
 * invisible while the sidebar matched the prototype's, and stopped being
 * invisible the moment it gained two entries (§2.114, §2.115): three
 * headings "moved" 86 px, which is two sidebar rows, and none of them had
 * moved at all.
 *
 * Both the panel and the prototype put the sidebar in an `<aside>`, so the
 * main column is looked at first and the whole page only if the text lives
 * nowhere else — a label that exists solely in the sidebar is still probed.
 */
async function where(page, text) {
  return page.evaluate((t) => {
    const at = (el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return null;
      const range = document.createRange();
      range.selectNodeContents(el);
      const tr = range.getBoundingClientRect();
      return { x: Math.round(tr.left * 10) / 10, y: Math.round(tr.top * 10) / 10 };
    };
    const matches = [...document.querySelectorAll('body *')].filter((el) => {
      const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
      return (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' ? '' : own) === t;
    });
    for (const el of matches) if (!el.closest('aside')) { const p = at(el); if (p) return p; }
    for (const el of matches) { const p = at(el); if (p) return p; }
    return null;
  }, text);
}

async function scrollTo(page, text) {
  await page.evaluate((t) => {
    const el = [...document.querySelectorAll('body *')].find((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim() === t));
    if (el) el.scrollIntoView({ block: 'start' });
  }, text);
  await page.waitForTimeout(300);
}

async function run(page, base, label) {
  const shots = {};
  for (const scene of SCENES) {
    if (scene.go) await scene.go(page);
    if (scene.scrollTo) await scrollTo(page, scene.scrollTo);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    const file = path.join(OUT, `${label}-${scene.name}.png`);
    await page.screenshot({ path: file });
    const positions = {};
    for (const probe of scene.probe) {
      const text = typeof probe === 'string' ? probe : probe[label === 'prototype' ? 'prototype' : 'app'];
      // Keyed on the app's wording either way, so the comparison lines up.
      positions[typeof probe === 'string' ? probe : probe.app] = await where(page, text);
    }
    shots[scene.name] = { file, positions };
  }
  return shots;
}

function diff(a, b, out) {
  const A = PNG.sync.read(fs.readFileSync(a));
  const B = PNG.sync.read(fs.readFileSync(b));
  const D = new PNG({ width: A.width, height: A.height });
  const n = pixelmatch(A.data, B.data, D.data, A.width, A.height, { threshold: 0.1 });
  fs.writeFileSync(out, PNG.sync.write(D));
  return +((n / (A.width * A.height)) * 100).toFixed(2);
}

async function startAdmin() {
  const child = spawn(process.execPath, [path.join(ADMIN, 'node_modules/next/dist/bin/next'), 'start', '-p', String(PORT)], {
    cwd: ADMIN,
    env: { ...process.env, ADMIN_DEMO: '1', NEXT_PUBLIC_ADMIN_TIME_ZONE: 'UTC', NEXT_TELEMETRY_DISABLED: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stderr.on('data', (d) => process.stderr.write(d));
  for (let i = 0; i < 100; i++) {
    try {
      await new Promise((resolve, reject) => http.get(`http://127.0.0.1:${PORT}/sign-in`, (r) => (r.statusCode === 200 ? resolve() : reject())).on('error', reject));
      return child;
    } catch {
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  child.kill();
  throw new Error('The admin server did not start. Run `npm run build:demo` first.');
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const css = fontCss();
  const files = http.createServer((req, res) => {
    const url = decodeURIComponent((req.url || '/').split('?')[0]);
    if (url.startsWith('/__fontsource/')) {
      const file = path.join(ADMIN, 'node_modules/@fontsource', url.replace('/__fontsource/', ''));
      if (!file.startsWith(path.join(ADMIN, 'node_modules/@fontsource')) || !fs.existsSync(file)) return res.writeHead(404).end();
      res.writeHead(200, { 'content-type': 'font/woff2' });
      return res.end(fs.readFileSync(file));
    }
    const file = path.join(DESIGN, url);
    if (!file.startsWith(DESIGN) || !fs.existsSync(file)) return res.writeHead(404).end();
    res.writeHead(200, { 'content-type': file.endsWith('.html') ? 'text/html' : 'text/javascript' });
    res.end(fs.readFileSync(file));
  });
  await new Promise((r) => files.listen(0, '127.0.0.1', r));
  const filesPort = files.address().port;
  const admin = await startAdmin();
  const browser = await launch();

  try {
    const context = async () => {
      const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 1, timezoneId: 'UTC', locale: 'en-GB' });
      await ctx.route(/unpkg\.com/, (route) => {
        const local = CDN[route.request().url().replace('https://unpkg.com/', '')];
        return local ? route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(ROOT, local)) }) : route.fulfill({ status: 404, body: '' });
      });
      await ctx.route(/fonts\.googleapis\.com/, (route) => route.fulfill({ status: 200, contentType: 'text/css', body: css.replace(/url\(\/__fontsource/g, `url(http://127.0.0.1:${filesPort}/__fontsource`) }));
      return ctx;
    };

    const protoPage = await (await context()).newPage();
    // The prototype's day, so its "now"-relative pieces match the demo's.
    await protoPage.clock.setFixedTime(new Date('2026-10-10T12:00:00Z'));
    await protoPage.goto(`http://127.0.0.1:${filesPort}/${encodeURIComponent(PAGE)}`, { waitUntil: 'networkidle' });
    await protoPage.waitForTimeout(2500);
    const proto = await run(protoPage, filesPort, 'prototype');

    const appPage = await (await context()).newPage();
    await appPage.clock.setFixedTime(new Date('2026-10-10T12:00:00Z'));
    await appPage.goto(`http://127.0.0.1:${PORT}/sign-in`, { waitUntil: 'networkidle' });
    const app = await run(appPage, PORT, 'admin');

    const report = [];
    let failing = 0;
    for (const scene of SCENES) {
      const p = proto[scene.name];
      const a = app[scene.name];
      const pixels = diff(a.file, p.file, path.join(OUT, `diff-${scene.name}.png`));
      const probes = scene.probe.map((probe) => {
        const text = typeof probe === 'string' ? probe : probe.app;
        const pp = p.positions[text];
        const ap = a.positions[text];
        if (!pp || !ap) return { text, missing: !pp ? 'prototype' : 'admin' };
        const dx = +(ap.x - pp.x).toFixed(1);
        const dy = +(ap.y - pp.y).toFixed(1);
        const ok = Math.abs(dx) <= TOLERANCE && Math.abs(dy) <= TOLERANCE;
        if (!ok) failing++;
        return { text, dx, dy, ok };
      });
      for (const pr of probes) if (pr.missing) failing++;
      report.push({ screen: scene.name, pixels: pixels + '%', probes: probes.filter((x) => !x.ok) });
    }
    console.log(JSON.stringify({ probes: SCENES.reduce((n, s) => n + s.probe.length, 0), failing, report }, null, 2));
    process.exitCode = failing ? 1 : 0;
  } finally {
    await browser.close();
    admin.kill();
    files.close();
  }
})();
