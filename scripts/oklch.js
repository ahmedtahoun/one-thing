// OKLCH -> sRGB hex. Used to bake the design's oklch() tokens into values
// React Native can use. Verified against Chromium's own oklch() rendering
// by scripts/verify-oklch.js.
'use strict';

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

/** Linear-light sRGB channel -> gamma-encoded sRGB channel. */
function gamma(c) {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

/** @returns {[number, number, number]} gamma-encoded sRGB in 0..1, gamut-clipped. */
function oklchToSrgb(L, C, hDeg) {
  const h = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  return [clamp01(gamma(r)), clamp01(gamma(g)), clamp01(gamma(bl))];
}

const hex2 = (v) => Math.round(v * 255).toString(16).padStart(2, '0');

/** `oklch(L C H)` -> `#rrggbb`. */
function oklchStringToHex(str) {
  const m = /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)$/.exec(str.trim());
  if (!m) throw new Error('not an oklch() colour: ' + str);
  const [r, g, b] = oklchToSrgb(parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]));
  return '#' + hex2(r) + hex2(g) + hex2(b);
}

module.exports = { oklchToSrgb, oklchStringToHex };
