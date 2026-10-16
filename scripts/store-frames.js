/**
 * Marketing-style store screenshots: a headline, a soft colour, and a phone
 * showing the real app — in English and Arabic, for both stores.
 *
 *   npx expo export --platform web
 *   CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" node scripts/store-frames.js
 *
 * The screens inside the phones are the app itself, rendered from the web
 * export with demo data and a frozen clock, exactly as `capture-store.js`
 * does; this script adds what a listing needs around them. Output goes to
 * `store-assets/marketing/`:
 *
 *   apple-{en,ar}-N-name.png   1320 x 2868   (6.9-inch iPhone)
 *   play-{en,ar}-N-name.png    1080 x 2160   (Play: at most 2:1)
 *   play-{en,ar}-feature-graphic.png   1024 x 500
 *
 * Copy is written here, not taken from the app: it is marketing. Edit SLIDES.
 */
'use strict';
const { launch } = require('./browser.js');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const { demoContacts, demoFollowUps, demoHistory, demoTasks, dateKey } = require('./demo-state');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(ROOT, 'store-assets', 'marketing');
require('./dist-fresh.js').requireFreshDist();

const STORES = {
  apple: { w: 440, h: 956, scale: 3 },
  play: { w: 432, h: 864, scale: 2.5 },
};

const SESSION = {
  en: { userId: 'store', name: 'Khalid Al-Mansouri', firstName: 'Khalid', jobTitle: 'Founder · Qahwa House', authProvider: 'apple', plan: 'free', firstRun: false },
  ar: { userId: 'store', name: 'خالد المنصوري', firstName: 'خالد', jobTitle: 'مؤسس · بيت القهوة', authProvider: 'apple', plan: 'free', firstRun: false },
};
const ONE_THING = { en: 'Finish the investor proposal', ar: 'أخلّص عرض المستثمرين' };

/** What is typed into the Assistant for the two chat screens. */
const SAY = {
  en: {
    contact: 'Save a contact: Layla Nasser, works at Northwind, phone zero five five one two three four five six seven, email layla at gmail dot com',
    ask: 'Call Sara tomorrow at 10',
  },
  ar: {
    contact: 'احفظ جهة اتصال: ليلى ناصر، شغالة في شركة الشمال، رقمها صفر خمسة خمسة واحد اتنين تلاتة اربعة خمسة ستة سبعة، ايميلها layla ات جيميل دوت كوم',
    ask: 'كلم سارة بكرة الساعة عشرة',
  },
};

/** Each slide: which screen, the colours, and the words. `hi` is the highlighted part of the headline. */
const SLIDES = [
  {
    name: '1-today', path: '/today', seed: { tasks: true, oneThing: true, people: true, wins: true },
    bg: '#FFF1E6', accent: '#F26B21',
    en: { pre: 'Know what', hi: 'to do next', post: '', sub: 'Late tasks, replies owed and people going quiet, ranked for you.' },
    ar: { pre: 'اعرف', hi: 'شنو التالي', post: '', sub: 'المتأخر، والردود المنتظرة، واللي طال غيابهم، مرتّبة لك.' },
  },
  {
    name: '2-voice', path: '/assistant', say: 'contact', seed: { tasks: true, oneThing: true, people: true },
    bg: '#E8F6EC', accent: '#1F9D55',
    en: { pre: 'Save contacts', hi: 'by talking', post: '', sub: 'Say the name, number and email. It fills the card.' },
    ar: { pre: 'احفظ جهاتك', hi: 'بصوتك', post: '', sub: 'قل الاسم والرقم والإيميل وهو يعبّي البطاقة.' },
  },
  {
    name: '3-asks', path: '/assistant', say: 'ask', seed: { tasks: true, oneThing: true, people: true, twoSaras: true },
    bg: '#EAF1FF', accent: '#2F6BFF',
    en: { pre: 'It asks only', hi: 'what it needs', post: '', sub: 'Which Sara? What time? One tap answers.' },
    ar: { pre: 'يسأل بس', hi: 'عن الناقص', post: '', sub: 'أي سارة؟ أي وقت؟ ضغطة وحدة تكفي.' },
  },
  {
    name: '5-people', path: '/people', seed: { tasks: true, people: true },
    bg: '#FFF8DB', accent: '#D99A00',
    en: { pre: 'Reach anyone', hi: 'in one tap', post: '', sub: 'WhatsApp, email or call, with a draft ready.' },
    ar: { pre: 'تواصل مع أي أحد', hi: 'بضغطة', post: '', sub: 'واتساب أو إيميل أو اتصال، والمسودة جاهزة.' },
  },
  {
    name: '6-followups', path: '/followups', seed: { tasks: true, people: true },
    bg: '#FFE9EC', accent: '#E5384F',
    en: { pre: 'Know who', hi: 'owes you a reply', post: '', sub: 'Nudge in two taps. Nothing is sent for you.' },
    ar: { pre: 'اعرف مين', hi: 'ينتظر ردك', post: '', sub: 'ذكّره بضغطتين. وما يُرسل شي عنك.' },
  },
  {
    name: '7-language', path: '/settings', seed: { tasks: true },
    bg: '#EAF1FF', accent: '#2F6BFF',
    en: { pre: 'English and', hi: 'العربية', post: '', sub: 'Switch language in one tap, right-to-left included.' },
    ar: { pre: 'العربية و', hi: 'English', post: '', sub: 'بدّل اللغة بضغطة، والاتجاه من اليمين لليسار.' },
  },
];

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

/** Both stores want 24-bit RGB with no alpha. */
function flatten(file) {
  const png = PNG.sync.read(fs.readFileSync(file));
  for (let i = 0; i < png.data.length; i += 4) {
    const a = png.data[i + 3];
    if (a === 255) continue;
    const k = a / 255;
    for (let c = 0; c < 3; c++) png.data[i + c] = Math.round(png.data[i + c] * k + 255 * (1 - k));
    png.data[i + 3] = 255;
  }
  fs.writeFileSync(file, PNG.sync.write(png, { colorType: 2, inputColorType: 6 }));
  return { width: png.width, height: png.height };
}

/** The real app, at a real phone's size, as a PNG buffer. */
async function rawScreen(browser, port, lang, slide) {
  const ctx = await browser.newContext({
    viewport: { width: 432, height: 900 },
    deviceScaleFactor: 3,
    locale: lang === 'ar' ? 'ar-SA' : 'en-SA',
  });
  const page = await ctx.newPage();
  const frozen = new Date();
  frozen.setHours(9, 20, 0, 0);
  await page.clock.setFixedTime(frozen);
  const now = new Date();
  const day = (offset) => {
    const d = new Date(now);
    d.setDate(d.getDate() - offset);
    return dateKey(d);
  };
  const people = demoContacts(lang, now);
  if (slide.seed.twoSaras) {
    // A second Sara, so "Call Sara" has to ask which.
    const sara = people.find((c) => /sara|سارة/i.test(c.name));
    if (sara) people.push({ ...sara, id: 'c-sara-2', name: lang === 'ar' ? 'سارة العتيبي' : 'Sara Al-Otaibi', phone: '555019977', email: 'sara.o@example.com', role: lang === 'ar' ? 'مصممة' : 'Designer' });
  }
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    ({ session, tasks, oneThing, contacts, followUps, history, language, wins }) => {
      const put = (k, v) => (v ? window.localStorage.setItem(k, JSON.stringify(v)) : window.localStorage.removeItem(k));
      window.localStorage.clear();
      put('ot.session', session);
      put('ot.tasks', tasks);
      put('ot.oneThing', oneThing);
      put('ot.contacts', contacts);
      put('ot.followups', followUps);
      put('ot.history', history);
      put('one-thing.wins.v1', wins);
      window.localStorage.setItem('ot.lang', JSON.stringify(language));
    },
    {
      session: SESSION[lang],
      tasks: slide.seed.tasks ? demoTasks(lang, now) : null,
      oneThing: slide.seed.oneThing ? { date: dateKey(now), done: false, focusMinutes: 45, title: ONE_THING[lang] } : null,
      contacts: slide.seed.people ? people : null,
      followUps: slide.seed.people ? demoFollowUps(lang) : null,
      history: slide.seed.people ? demoHistory(lang, now) : null,
      language: lang,
      // Three days in a row up to yesterday: today is the one to keep it alive.
      wins: slide.seed.wins ? [day(3), day(2), day(1)] : null,
    }
  );
  await page.goto(`http://127.0.0.1:${port}${slide.path}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(900);
  if (slide.say) {
    await page.getByTestId('assistant-input').fill(SAY[lang][slide.say]);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1600);
  }
  const buffer = await page.screenshot();
  await ctx.close();
  return buffer;
}

const FONTS =
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@500;700;800&family=IBM+Plex+Sans+Arabic:wght@500;600;700&display=swap">';

/** A phone frame around a screen. Width and position are in the slide's own units (u = 1% of its width). */
const phone = (img) => `
  <div class="phone"><div class="screen"><img src="${img}"></div>
    <div class="island"></div><div class="clock">9:41</div></div>`;

const CSS = `
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden}
body{font-family:'Inter','IBM Plex Sans Arabic',system-ui,sans-serif;color:#0B0B0B}
[lang=ar] body,[lang=ar] *{font-family:'IBM Plex Sans Arabic','Inter',system-ui,sans-serif}
.slide{position:relative;width:100%;height:100%;overflow:hidden;display:flex;flex-direction:column;align-items:center}
.glow{position:absolute;left:50%;top:38%;width:130u;height:130u}
.text{position:relative;z-index:2;text-align:center;padding:0 calc(var(--u)*7);margin-top:calc(var(--u)*11)}
h1{font-size:calc(var(--u)*10.4);line-height:1.12;font-weight:800;letter-spacing:-0.02em}
[lang=ar] h1{font-weight:700;letter-spacing:0;line-height:1.3;font-size:calc(var(--u)*10)}
.hi{display:inline-block;color:#fff;padding:0 calc(var(--u)*2.4);border-radius:calc(var(--u)*2.6);margin:calc(var(--u)*.6) 0}
.sub{margin-top:calc(var(--u)*3.4);font-size:calc(var(--u)*4.4);line-height:1.4;color:#4A4A45;font-weight:500}
.phone{position:absolute;z-index:1;left:50%;transform:translateX(-50%);width:calc(var(--u)*80);
  padding:calc(var(--u)*1.7);background:#0B0B0B;border-radius:calc(var(--u)*13);
  box-shadow:0 calc(var(--u)*3) calc(var(--u)*9) rgba(0,0,0,.28),inset 0 0 0 calc(var(--u)*.35) #3a3a38}
.screen{border-radius:calc(var(--u)*11.4);overflow:hidden;background:#fff}
.screen img{display:block;width:100%}
.island{position:absolute;top:calc(var(--u)*3.6);left:50%;transform:translateX(-50%);width:calc(var(--u)*22);height:calc(var(--u)*6.4);background:#000;border-radius:999px}
.clock{position:absolute;top:calc(var(--u)*3.9);left:calc(var(--u)*10);font-size:calc(var(--u)*3.9);font-weight:700;color:#0B0B0B;font-family:'Inter',system-ui,sans-serif!important}
`;

function slideHtml(store, lang, slide, img) {
  const s = STORES[store];
  const t = slide[lang];
  const rtl = lang === 'ar';
  // The phone starts below the text and bleeds off the bottom, as in the references.
  const phoneTop = store === 'apple' ? 58 : 60;
  return `<!doctype html><html lang="${lang}" dir="${rtl ? 'rtl' : 'ltr'}"><head><meta charset="utf-8">${FONTS}
  <style>:root{--u:${s.w / 100}px}${CSS}
  .slide{background:radial-gradient(circle at 50% 62%, #ffffff 0, ${slide.bg} 62%)}
  .hi{background:${slide.accent}}
  .phone{top:calc(var(--u)*${phoneTop})}
  </style></head><body><div class="slide">
    <div class="text"><h1>${t.pre} <span class="hi">${t.hi}</span>${t.post ? ' ' + t.post : ''}</h1><p class="sub">${t.sub}</p></div>
    ${phone(img)}
  </div></body></html>`;
}

function featureHtml(lang, img) {
  const rtl = lang === 'ar';
  const copy = rtl
    ? { pre: 'شيئك الواحد.', hi: 'تنجزه اليوم.', sub: 'اكتب مهامك أو قلها بصوتك، بالعربي أو الإنجليزي.' }
    : { pre: 'Your one thing.', hi: 'Done today.', sub: 'Type it or say it, in English or Arabic.' };
  return `<!doctype html><html lang="${lang}" dir="${rtl ? 'rtl' : 'ltr'}"><head><meta charset="utf-8">${FONTS}
  <style>
  *{margin:0;padding:0;box-sizing:border-box}html,body{width:1024px;height:500px;overflow:hidden}
  body{font-family:'Inter','IBM Plex Sans Arabic',system-ui,sans-serif;background:radial-gradient(circle at 78% 60%,#fff 0,#FFF1E6 60%);color:#0B0B0B}
  [lang=ar] *{font-family:'IBM Plex Sans Arabic','Inter',system-ui,sans-serif}
  .row{height:500px;display:flex;align-items:center;justify-content:space-between;padding:0 70px}
  h1{font-size:62px;line-height:1.12;font-weight:800;letter-spacing:-0.02em}[lang=ar] h1{font-weight:700;letter-spacing:0;line-height:1.3;font-size:56px}
  .hi{display:inline-block;background:#F26B21;color:#fff;padding:0 18px;border-radius:20px;margin-top:8px}
  p{margin-top:22px;font-size:26px;color:#4A4A45;font-weight:500;max-width:470px;line-height:1.4}
  .ph{width:250px;height:560px;margin-top:150px;padding:9px;background:#0B0B0B;border-radius:44px;box-shadow:0 18px 40px rgba(0,0,0,.28);flex:none;position:relative;transform:rotate(${rtl ? '6' : '-6'}deg)}
  .ph img{width:100%;display:block;border-radius:36px}
  .ph i{position:absolute;top:18px;left:50%;transform:translateX(-50%);width:78px;height:22px;background:#000;border-radius:99px}
  </style></head><body><div class="row"><div><h1>${copy.pre}<br><span class="hi">${copy.hi}</span></h1><p>${copy.sub}</p></div>
  <div class="ph"><img src="${img}"><i></i></div></div></body></html>`;
}

(async () => {
  if (!fs.existsSync(DIST)) throw new Error('No dist/. Run: npx expo export --platform web');
  fs.mkdirSync(OUT, { recursive: true });
  const server = serve(DIST);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await launch();
  const made = [];
  const errors = [];

  for (const lang of ['en', 'ar']) {
    const raws = [];
    for (const slide of SLIDES) {
      const buffer = await rawScreen(browser, port, lang, slide);
      raws.push(`data:image/png;base64,${buffer.toString('base64')}`);
    }
    for (const store of ['apple', 'play']) {
      const s = STORES[store];
      const ctx = await browser.newContext({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: s.scale });
      const page = await ctx.newPage();
      page.on('pageerror', (e) => errors.push(e.message));
      for (const [i, slide] of SLIDES.entries()) {
        await page.setContent(slideHtml(store, lang, slide, raws[i]), { waitUntil: 'networkidle' });
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(400);
        const file = path.join(OUT, `${store}-${lang}-${slide.name}.png`);
        await page.screenshot({ path: file });
        made.push({ file: path.relative(ROOT, file), ...flatten(file) });
      }
      await ctx.close();
    }
    // Play's feature graphic, from the Today screen.
    const ctx = await browser.newContext({ viewport: { width: 1024, height: 500 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.setContent(featureHtml(lang, raws[0]), { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);
    const file = path.join(OUT, `play-${lang}-feature-graphic.png`);
    await page.screenshot({ path: file });
    made.push({ file: path.relative(ROOT, file), ...flatten(file) });
    await ctx.close();
  }

  await browser.close();
  server.close();
  console.log(JSON.stringify({ out: path.relative(ROOT, OUT), count: made.length, sizes: [...new Set(made.map((m) => `${m.width}x${m.height}`))], errors }, null, 2));
  process.exit(errors.length ? 1 : 0);
})();
