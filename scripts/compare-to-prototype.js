/**
 * Pixel-compares a captured app screen with the same screen captured from the
 * design prototype, and reports how far apart they are.
 *
 * ACCEPTANCE.md asks for "±2 pt at 402 x 874", which the handoff's own
 * screenshots cannot answer (they are 924x540 device-frame shots). These two
 * capture sets can: both are the same element at the same size.
 *
 * The status bar and the home indicator are drawn by the prototype's device
 * frame but by the OS in the real app, so those bands are excluded.
 *
 *   node scripts/compare-to-prototype.js <appDir> <protoDir> <pairs.json>
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch');

/** Logical pt, at the capture's 2x scale. */
const SCALE = 2;
const STATUS_BAR = 54 * SCALE;
const HOME_INDICATOR = 34 * SCALE;

/** Per-pixel colour tolerance; 0.1 ignores antialiasing, not layout. */
const THRESHOLD = 0.1;

function cropBands(png) {
  const top = STATUS_BAR;
  const bottom = png.height - HOME_INDICATOR;
  const height = bottom - top;
  const out = new PNG({ width: png.width, height });
  PNG.bitblt(png, out, 0, top, png.width, height, 0, 0);
  return out;
}

function compare(appFile, protoFile, diffFile) {
  const a = cropBands(PNG.sync.read(fs.readFileSync(appFile)));
  const b = cropBands(PNG.sync.read(fs.readFileSync(protoFile)));

  if (a.width !== b.width || a.height !== b.height) {
    return { error: `size mismatch: ${a.width}x${a.height} vs ${b.width}x${b.height}` };
  }

  const diff = new PNG({ width: a.width, height: a.height });
  const differing = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: THRESHOLD });
  if (diffFile) fs.writeFileSync(diffFile, PNG.sync.write(diff));

  const total = a.width * a.height;
  return { differingPixels: differing, percent: +((differing / total) * 100).toFixed(2) };
}

const [appDir, protoDir, pairsFile] = process.argv.slice(2);
const pairs = JSON.parse(fs.readFileSync(pairsFile, 'utf8'));
const diffDir = path.join(appDir, 'diff');
fs.mkdirSync(diffDir, { recursive: true });

const results = pairs.map(({ app, proto, name }) => {
  const appFile = path.join(appDir, app);
  const protoFile = path.join(protoDir, proto);
  if (!fs.existsSync(appFile)) return { name, error: 'app capture missing: ' + app };
  if (!fs.existsSync(protoFile)) return { name, error: 'prototype capture missing: ' + proto };
  return { name, ...compare(appFile, protoFile, path.join(diffDir, name + '.png')) };
});

console.log(JSON.stringify(results, null, 2));

// The percentage is advisory — it is dominated by glyph antialiasing, so any
// threshold would be arbitrary. A missing or mismatched capture is not: it
// means a screen listed in screen-pairs.json was never rendered, and silently
// passing that would make the whole comparison worthless.
const broken = results.filter((r) => r.error);
if (broken.length) {
  console.error('\nCould not compare:\n' + broken.map((r) => `  ${r.name}: ${r.error}`).join('\n'));
  process.exit(1);
}
