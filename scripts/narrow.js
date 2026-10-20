/**
 * The app on a small Android phone.
 *
 * Everything else in this repository is measured at 402 x 874, the iPhone
 * the design was drawn on, and RELEASE.md §9.9 records what shooting the
 * Play set at 360 showed: a greeting that truncated and a tab bar over the
 * list. A device class nothing renders is a device class nothing protects,
 * and 360 x 640 is Play's own small-phone baseline, so this suite renders
 * the screens people live in at that size and asserts the three things that
 * break there.
 *
 *   Width:     nothing makes the page scroll sideways.
 *   Truncation: the few strings that must survive — the greeting, the tab
 *               labels, the primary buttons — are not cut off. A long
 *               contact's name ellipsising is design; a greeting losing the
 *               person's name is not.
 *   The bar:    scrolled to the end, the last row clears the floating tab
 *               bar rather than hiding under it.
 *
 * All three languages, Egyptian included. Egyptian is written by hand from
 * the Gulf copy (src/content/egyptian-lines.ts) and its lines are not the
 * same length — "عايزني أفكّرك إزاي؟" is not "كيف تبيني أذكّرك؟" — so a
 * dialect that reads fine at 402 can still cut a greeting at 360. The unit
 * tests check that every Arabic line *has* an Egyptian line; only rendering
 * it says whether it fits.
 *
 *   npx expo export --platform web
 *   node scripts/narrow.js
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

/**
 * Play's small-phone baseline. Most of the Android install base is wider.
 * `OT_FRAME=300x600` narrows it further, which is how the checks here were
 * shown to bite rather than to pass vacuously.
 */
const FRAME = (() => {
  const [width, height] = (process.env.OT_FRAME || '360x640').split('x').map(Number);
  if (!Number.isFinite(width) || !Number.isFinite(height)) throw new Error(`OT_FRAME must read like 360x640, not ${process.env.OT_FRAME}`);
  return { width, height };
})();

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

const SESSION = {
  en: { userId: 'narrow', name: 'Abdulrahman Al-Mutairi', firstName: 'Abdulrahman', jobTitle: 'Founder · Qahwa House', authProvider: 'apple', plan: 'free', firstRun: false },
  ar: { userId: 'narrow', name: 'عبدالرحمن المطيري', firstName: 'عبدالرحمن', jobTitle: 'مؤسس · بيت القهوة', authProvider: 'apple', plan: 'free', firstRun: false },
};
const ONE_THING = { en: 'Finish the investor proposal', ar: 'أخلّص عرض المستثمرين' };

/**
 * The longest first name in the demo set on purpose: a greeting is the one
 * line where the name is the point, and "Good morning, Abdulrahman" is the
 * sentence that found the fault.
 */
const ROUTES = [
  { path: '/today', name: 'Today', tabBar: true },
  { path: '/people', name: 'People', tabBar: true },
  { path: '/followups', name: 'Follow-ups' },
  { path: '/settings', name: 'Settings' },
  { path: '/paywall', name: 'Paywall' },
  { path: '/assistant', name: 'Assistant' },
  { path: '/recap', name: 'Recap' },
  { path: '/smart-lists', name: 'Smart lists' },
];

/** Strings whose whole point is to be read. A cut-off one is a defect. */
const MUST_READ = ['today-greeting', 'tab-People', 'tab-Home', 'tab-Assistant', 'tab-Me', 'tab-الأشخاص', 'tab-الرئيسية', 'tab-المساعد', 'tab-أنا'];

(async () => {
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await launchChromium();

  // 'eg' is Arabic copy in the Egyptian dialect: `Lang` stays 'en' | 'ar'
  // and only the words change, so demo data and the session are seeded from
  // `lang` while `choice` decides the dialect. See src/i18n/dialect.ts.
  for (const choice of ['en', 'ar', 'eg']) {
    const lang = choice === 'eg' ? 'ar' : choice;
    const locale = choice === 'eg' ? 'ar-EG' : choice === 'ar' ? 'ar-SA' : 'en-GB';
    const ctx = await browser.newContext({ viewport: FRAME, deviceScaleFactor: 2, locale });
    const page = await ctx.newPage();
    const frozen = new Date();
    frozen.setHours(9, 20, 0, 0);
    await page.clock.setFixedTime(frozen);

    for (const route of ROUTES) {
      await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
      await page.evaluate(
        (d) => {
          localStorage.clear();
          for (const [k, v] of Object.entries(d.store)) localStorage.setItem(k, JSON.stringify(v));
          localStorage.setItem('ot.lang', d.lang);
          // Raw strings, both: AsyncStorage on web is localStorage, and the
          // provider compares these against 'ar' and 'egypt' directly.
          localStorage.setItem('ot.dialect', d.dialect);
        },
        {
          lang,
          dialect: choice === 'eg' ? 'egypt' : 'gulf',
          store: {
            'ot.session': SESSION[lang],
            'ot.tasks': demoTasks(lang, new Date()),
            'ot.contacts': demoContacts(lang, new Date()),
            'ot.followups': demoFollowUps(lang),
            'ot.history': demoHistory(lang, new Date()),
            'ot.oneThing': { date: dateKey(new Date()), done: false, focusMinutes: 45, title: ONE_THING[lang] },
          },
        }
      );
      await page.goto(`${base}${route.path}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(700);

      const where = `${choice} ${route.name}`;

      const sideways = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
      }));
      check(`${where}: does not scroll sideways`, sideways.scroll <= sideways.client + 1, JSON.stringify(sideways));

      // numberOfLines={1} becomes text-overflow: ellipsis on web, so a cut
      // string is one whose content is wider than the box drawing it.
      const cut = await page.evaluate((ids) => {
        const out = [];
        for (const id of ids) {
          const el = document.querySelector(`[data-testid="${id}"]`);
          if (!el) continue;
          if (el.scrollWidth > el.clientWidth + 1) out.push({ id, text: el.textContent, scroll: el.scrollWidth, client: el.clientWidth });
        }
        return out;
      }, MUST_READ);
      check(`${where}: nothing that has to be read is cut off`, cut.length === 0, JSON.stringify(cut));

      if (route.tabBar) {
        const covered = await page.evaluate(() => {
          const scroller = [...document.querySelectorAll('div')].find((d) => d.scrollHeight > d.clientHeight + 4 && getComputedStyle(d).overflowY !== 'visible');
          if (scroller) scroller.scrollTop = scroller.scrollHeight;
          window.scrollTo(0, document.body.scrollHeight);
          return new Promise((done) =>
            setTimeout(() => {
              const bar = document.querySelector('[data-testid^="tab-"]');
              if (!bar) return done({ skipped: 'no tab bar' });
              const barTop = bar.getBoundingClientRect().top;
              // The lowest thing with its own words, the bar itself aside.
              let lowest = null;
              for (const el of document.querySelectorAll('div,span,p')) {
                if (el.closest('[data-testid^="tab-"]') || el.closest('[data-testid="mic-orb"]')) continue;
                if (!el.textContent || el.children.length) continue;
                const r = el.getBoundingClientRect();
                if (r.height === 0 || r.bottom <= 0) continue;
                if (!lowest || r.bottom > lowest.bottom) lowest = { bottom: r.bottom, text: el.textContent.slice(0, 40) };
              }
              done({ barTop, lowest });
            }, 400)
          );
        });
        check(
          `${where}: the end of the list clears the tab bar`,
          covered.skipped !== undefined || !covered.lowest || covered.lowest.bottom <= covered.barTop + 1,
          JSON.stringify(covered)
        );
      }
    }
    await ctx.close();
  }

  await browser.close();
  srv.close();
  const failed = checks.filter((c) => !c.ok);
  console.log(JSON.stringify({ frame: `${FRAME.width}x${FRAME.height}`, checks: checks.length, failed }, null, 2));
  process.exit(failed.length ? 1 : 0);
})();
