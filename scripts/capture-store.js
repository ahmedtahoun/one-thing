/**
 * The screenshots and graphics the two stores ask for, rendered from the real
 * app rather than drawn.
 *
 *   npx expo export --platform web
 *   node scripts/capture-store.js [outDir]        # default store-assets/
 *
 * Sizes, and why these ones:
 *
 * **Apple** needs one iPhone set — the 6.9-inch class — and scales it to
 * every smaller iPhone. 1320 x 2868 is that class's native size (iPhone 16/17
 * Pro Max), which is 440 x 956 points at 3x, so the app is rendered at a real
 * device's logical size rather than stretched to fit a number.
 *
 * **Google** will not take the shape this app actually is. Play's rule is
 * that the long side may be at most twice the short side, and the design is
 * 402 x 874 — 1 : 2.17, which is too tall. So the Play set is rendered at
 * 432 x 864 points at 2.5x: exactly 1080 x 2160, exactly 1:2, and within
 * 30 points of the design frame, so the screens look like themselves.
 *
 * The obvious first try — 360 x 720 at 3x, a real small-phone size — was
 * wrong, and only looking at it showed why: at 360 the greeting truncates to
 * "Good morning, …" and the tab bar covers the top of the task list. Both
 * are true of the app on a narrow phone (BUILD-REVIEW §2.45) and neither
 * belongs in a store listing.
 *
 * Both are flattened to 24-bit RGB. A Playwright screenshot carries an alpha
 * channel even when nothing in it is transparent, and Play asks for PNGs
 * without one.
 *
 * The feature graphic is Play's one required piece of artwork that is not a
 * screenshot, and the handoff has no design for it. What is produced here is
 * the app's own sign-in lockup — the logo mark, the name, the tagline, in the
 * app's own colours and type — at 1024 x 500. It is honest and it is a
 * placeholder: a designer should replace it.
 */
'use strict';
const { launch: launchChromium } = require('./browser.js');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const { demoContacts, demoFollowUps, demoHistory, demoTasks, dateKey } = require('./demo-state');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const OUT = process.argv[2] || path.join(ROOT, 'store-assets');

/** One required iPhone set, and the tallest shape Play will accept. */
const DEVICES = {
  apple: { width: 440, height: 956, scale: 3, pixels: '1320x2868', note: '6.9-inch iPhone' },
  play: { width: 432, height: 864, scale: 2.5, pixels: '1080x2160', note: 'phone, inside Play’s 2:1 limit' },
};

/** The six that show what the app is for, in the order a listing reads best. */
const SHOTS = [
  { path: '/today', name: '1-today', seedTasks: true, oneThing: true, seedPeople: true },
  { path: '/tasks', name: '2-tasks', seedTasks: true, oneThing: true, seedPeople: true },
  { path: '/focus', name: '3-focus', seedTasks: true, oneThing: true },
  { path: '/compose?id=t1', name: '4-compose', seedTasks: true, seedPeople: true },
  { path: '/assistant', name: '5-assistant', seedTasks: true, seedPeople: true, oneThing: true },
  { path: '/contact?id=c1', name: '6-contact', seedTasks: true, seedPeople: true },
];

const SESSION = {
  en: { userId: 'store', name: 'Khalid Al-Mansouri', firstName: 'Khalid', jobTitle: 'Founder · Qahwa House', authProvider: 'apple', plan: 'free', firstRun: false },
  ar: { userId: 'store', name: 'خالد المنصوري', firstName: 'خالد', jobTitle: 'مؤسس · بيت القهوة', authProvider: 'apple', plan: 'free', firstRun: false },
};
const ONE_THING = { en: 'Finish the investor proposal', ar: 'أخلّص عرض المستثمرين' };

/** From src/content/strings.ts — the app's own words, not new ones. */
const LOCKUP = {
  en: { title: 'Your day, under control.', sub: 'One priority. Every small promise kept.' },
  ar: { title: 'يومك تحت السيطرة.', sub: 'أولوية وحدة. وكل التزام صغير محفوظ.' },
};
/**
 * The app's name, from app.json, in both graphics. There is no Arabic brand
 * name anywhere in the handoff and inventing one is not a typesetting
 * decision — it is the product owner's.
 */
const APP_NAME = 'The One Thing';

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };

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

/** Both stores want 24-bit RGB; a screenshot arrives as RGBA. */
function flatten(file) {
  const png = PNG.sync.read(fs.readFileSync(file));
  for (let i = 0; i < png.data.length; i += 4) {
    const a = png.data[i + 3];
    if (a === 255) continue;
    // Over white, which is what every screen here sits on anyway.
    const k = a / 255;
    for (let c = 0; c < 3; c++) png.data[i + c] = Math.round(png.data[i + c] * k + 255 * (1 - k));
    png.data[i + 3] = 255;
  }
  fs.writeFileSync(file, PNG.sync.write(png, { colorType: 2, inputColorType: 6 }));
  const { width, height } = png;
  return { width, height, bytes: fs.statSync(file).size };
}

/** Play's 512 x 512 icon, from the 1024 the app ships. */
async function icon(page, outFile) {
  const source = fs.readFileSync(path.join(ROOT, 'assets/icon.png')).toString('base64');
  const data = await page.evaluate(async (b64) => {
    const image = new Image();
    image.src = `data:image/png;base64,${b64}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    // The icon is opaque, but flatten anyway so no alpha reaches the store.
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 512, 512);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, 0, 0, 512, 512);
    return canvas.toDataURL('image/png').split(',')[1];
  }, source);
  fs.writeFileSync(outFile, Buffer.from(data, 'base64'));
  return flatten(outFile);
}

/** Play's required 1024 x 500 feature graphic: the app's own sign-in lockup. */
async function feature(page, lang, outFile) {
  const l = LOCKUP[lang];
  const rtl = lang === 'ar';
  await page.setViewportSize({ width: 1024, height: 500 });
  await page.setContent(`<!doctype html><html lang="${lang}" dir="${rtl ? 'rtl' : 'ltr'}"><head>
    <meta charset="utf-8">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600&display=swap">
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      html,body{width:1024px;height:500px}
      /* Centred rather than flush left, so the shorter Arabic title sits as
         deliberately as the longer English one. */
      body{background:#FFFFFF;font-family:'IBM Plex Sans Arabic',system-ui,sans-serif;
        display:flex;align-items:center;justify-content:center;gap:52px;padding:0 72px;color:#0B0B0B}
      .mark{width:132px;height:132px;border:3px solid #0B0B0B;border-radius:50%;
        display:flex;align-items:center;justify-content:center;flex:none}
      .ring{width:74px;height:74px;border:3px solid #0B0B0B;border-radius:50%;
        display:flex;align-items:center;justify-content:center}
      .dot{width:23px;height:23px;border-radius:50%;background:#0B0B0B}
      h1{font-size:60px;font-weight:600;letter-spacing:-0.6px;line-height:1.1}
      p{font-size:27px;font-weight:400;color:#55554F;margin-top:16px;line-height:1.35}
      /* Tracked-out capitals are an English device: letter-spacing pulls
         Arabic's joined letters apart, so the name is set the same either
         way and only the English one is tracked. */
      .name{font-size:19px;font-weight:500;color:#55554F;margin-bottom:18px;
        letter-spacing:1.6px;text-transform:uppercase}
    </style></head><body>
    <div class="mark"><div class="ring"><div class="dot"></div></div></div>
    <div><div class="name" dir="ltr" style="text-align:${rtl ? 'right' : 'left'}">${APP_NAME}</div>
      <h1>${l.title}</h1><p>${l.sub}</p></div>
  </body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
  await page.screenshot({ path: outFile });
  return flatten(outFile);
}

(async () => {
  if (!fs.existsSync(DIST)) throw new Error('No dist/. Run: npx expo export --platform web');
  fs.mkdirSync(OUT, { recursive: true });

  const server = serve(DIST);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await launchChromium();
  const made = [];
  const errors = [];

  for (const [store, device] of Object.entries(DEVICES)) {
    for (const lang of ['en', 'ar']) {
      const ctx = await browser.newContext({
        viewport: { width: device.width, height: device.height },
        deviceScaleFactor: device.scale,
        locale: lang === 'ar' ? 'ar-SA' : 'en-GB',
      });
      const page = await ctx.newPage();
      const frozen = new Date();
      frozen.setHours(9, 20, 0, 0);
      await page.clock.setFixedTime(frozen);
      page.on('pageerror', (e) => errors.push(`${store}/${lang}: ${e.message}`));

      for (const shot of SHOTS) {
        await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded' });
        await page.evaluate(
          ({ session, tasks, oneThing, contacts, followUps, history, language }) => {
            const put = (k, v) => (v ? window.localStorage.setItem(k, JSON.stringify(v)) : window.localStorage.removeItem(k));
            window.localStorage.clear();
            put('ot.session', session);
            put('ot.tasks', tasks);
            put('ot.oneThing', oneThing);
            put('ot.contacts', contacts);
            put('ot.followups', followUps);
            put('ot.history', history);
            window.localStorage.setItem('ot.lang', JSON.stringify(language));
          },
          {
            session: SESSION[lang],
            tasks: shot.seedTasks ? demoTasks(lang, new Date()) : null,
            oneThing: shot.oneThing ? { date: dateKey(new Date()), done: false, focusMinutes: 45, title: ONE_THING[lang] } : null,
            contacts: shot.seedPeople ? demoContacts(lang, new Date()) : null,
            followUps: shot.seedPeople ? demoFollowUps(lang) : null,
            history: shot.seedPeople ? demoHistory(lang, new Date()) : null,
            language: lang,
          }
        );
        await page.goto(`http://127.0.0.1:${port}${shot.path}`, { waitUntil: 'networkidle' });
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(900);
        const file = path.join(OUT, `${store}-${lang}-${shot.name}.png`);
        await page.screenshot({ path: file });
        const size = flatten(file);
        made.push({ file: path.relative(ROOT, file), ...size, expected: device.pixels });
      }
      await ctx.close();
    }
  }

  // Play's two required graphics. Apple needs neither: its icon comes from
  // the binary.
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 500 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  for (const lang of ['en', 'ar']) {
    const file = path.join(OUT, `play-${lang}-feature-graphic.png`);
    made.push({ file: path.relative(ROOT, file), ...(await feature(page, lang, file)), expected: '1024x500' });
  }
  const iconFile = path.join(OUT, 'play-icon-512.png');
  made.push({ file: path.relative(ROOT, iconFile), ...(await icon(page, iconFile)), expected: '512x512' });
  await ctx.close();

  await browser.close();
  server.close();

  const wrong = made.filter((m) => `${m.width}x${m.height}` !== m.expected);
  const tooBig = made.filter((m) => m.bytes > 8 * 1024 * 1024);
  console.log(JSON.stringify({ out: path.relative(ROOT, OUT), made, wrong, tooBig, errors }, null, 2));
  process.exit(wrong.length || tooBig.length || errors.length ? 1 : 0);
})();
