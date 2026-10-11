/**
 * The app's icons, rendered from the design's own logo mark.
 *
 *   node scripts/make-icons.js
 *
 * Everything under assets/ was Expo's scaffold placeholder — the blue chevron
 * with the construction guides — right up until this ran. Nobody had noticed,
 * including when the adaptive-icon *paths* were fixed: they were corrected to
 * point at placeholder art (BUILD-REVIEW §2.45).
 *
 * The mark is the one the app already uses: `LogoMark` in
 * src/design/BrandMarks.tsx, a ring inside a ring around a dot, in ink.base
 * on white. That is the logo the handoff drew — the sign-in screen is built
 * around it — so this is not a new one, it is the existing one at the sizes
 * the stores and the OSes need. A designer may still want to replace it;
 * what it replaces was not a design at all.
 *
 * Proportions come straight from LogoMark: at size S the ring is 36/64 S, the
 * dot 11/64 S, and every stroke 1.5/64 S.
 */
'use strict';
const { launch: launchChromium } = require('./browser.js');
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const ROOT = path.join(__dirname, '..');
const ASSETS = path.join(ROOT, 'assets');

const INK = '#0B0B0B';
const WHITE = '#FFFFFF';

/**
 * @param size      canvas, in pixels
 * @param mark      the outer circle's diameter as a fraction of the canvas
 * @param background null for transparent
 * @param colour    the mark's colour
 */
function markPage({ size, mark, background, colour }) {
  const S = Math.round(size * mark);
  const stroke = Math.max(1, +(S * (1.5 / 64)).toFixed(2));
  const ring = Math.round(S * (36 / 64));
  const dot = Math.round(S * (11 / 64));
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:${size}px;height:${size}px}
    body{background:${background ?? 'transparent'};display:flex;align-items:center;justify-content:center}
    .mark{width:${S}px;height:${S}px;border:${stroke}px solid ${colour};border-radius:50%;
      display:flex;align-items:center;justify-content:center}
    .ring{width:${ring}px;height:${ring}px;border:${stroke}px solid ${colour};border-radius:50%;
      display:flex;align-items:center;justify-content:center}
    .dot{width:${dot}px;height:${dot}px;border-radius:50%;background:${colour}}
  </style></head><body>
    <div class="mark"><div class="ring"><div class="dot"></div></div></div>
  </body></html>`;
}

/**
 * `mark` is the share of the canvas the logo fills.
 *
 * A plain icon is full-bleed and the mark sits at 60 %. An Android adaptive
 * foreground is masked and may be cropped to a circle, so its mark stays
 * inside the 66 % safe zone at 42 %. The splash is smaller again, because the
 * system draws it at its natural size on a full screen.
 */
const ICONS = [
  { file: 'icon.png', size: 1024, mark: 0.6, background: WHITE, colour: INK, note: 'iOS and the store listing' },
  { file: 'android-icon-foreground.png', size: 1024, mark: 0.42, background: null, colour: INK, note: 'inside the adaptive-icon safe zone' },
  { file: 'android-icon-background.png', size: 1024, mark: 0, background: WHITE, colour: WHITE, note: 'the layer behind it' },
  { file: 'android-icon-monochrome.png', size: 1024, mark: 0.42, background: null, colour: '#000000', note: 'Android themed icons' },
  { file: 'splash-icon.png', size: 1024, mark: 0.34, background: null, colour: INK, note: 'drawn on the splash background' },
  { file: 'favicon.png', size: 64, mark: 0.72, background: WHITE, colour: INK, note: 'the web build' },
];

/** The store wants 24-bit RGB; transparency has to survive everywhere else. */
function check(file, { opaque }) {
  const png = PNG.sync.read(fs.readFileSync(file));
  if (opaque) {
    for (let i = 3; i < png.data.length; i += 4) {
      if (png.data[i] !== 255) throw new Error(`${file} has transparent pixels but must not`);
    }
    fs.writeFileSync(file, PNG.sync.write(png, { colorType: 2, inputColorType: 6 }));
  }
  const { width, height } = PNG.sync.read(fs.readFileSync(file));
  return { width, height, bytes: fs.statSync(file).size };
}

(async () => {
  const browser = await launchChromium();
  const made = [];
  for (const icon of ICONS) {
    const ctx = await browser.newContext({ viewport: { width: icon.size, height: icon.size }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.setContent(markPage(icon));
    await page.waitForTimeout(150);
    const file = path.join(ASSETS, icon.file);
    await page.screenshot({ path: file, omitBackground: icon.background === null });
    made.push({ file: path.relative(ROOT, file), ...check(file, { opaque: icon.background !== null }), note: icon.note });
    await ctx.close();
  }
  await browser.close();
  console.log(JSON.stringify({ made }, null, 2));
})();
