/**
 * The two things TypeScript cannot check about bilingual copy.
 *
 * Each `_ar` block is declared `typeof` its `_en` block, so a *missing*
 * translation is already a compile error. What the compiler cannot see is
 * inside the strings: an Arabic line left empty, or one that lost the
 * placeholder the code substitutes into. Both ship as a blank space or a
 * literal "{n}" in front of a reviewer, in the language neither of us reads
 * fluently enough to notice by eye.
 *
 * 998 pairs passed when this was last counted, so it starts from a clean sheet.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { added } from './additions';
import { ACC, C, EVX, FUX, PFX, SETX } from './strings';

/** `{name}` and `{الاسم}` are the same placeholder: both consumers accept either. */
const NAME_TOKENS = new Set(['{name}', '{الاسم}']);
const tokensOf = (text: string): string[] =>
  (text.match(/\{[^}\s]{1,20}\}/g) ?? []).map((t) => (NAME_TOKENS.has(t) ? '{name}' : t)).sort();

type Pair = { path: string; en: string; ar: string };

function pairs(path: string, en: unknown, ar: unknown, out: Pair[] = []): Pair[] {
  if (typeof en === 'string') {
    if (typeof ar === 'string') out.push({ path, en, ar });
    return out;
  }
  if (Array.isArray(en) && Array.isArray(ar)) {
    en.forEach((v, i) => pairs(`${path}[${i}]`, v, ar[i], out));
    return out;
  }
  if (en && ar && typeof en === 'object' && typeof ar === 'object') {
    for (const key of Object.keys(en as object)) pairs(`${path}.${key}`, (en as Record<string, unknown>)[key], (ar as Record<string, unknown>)[key], out);
  }
  return out;
}

const ROOTS: readonly (readonly [string, unknown, unknown])[] = [
  ['added', added('en'), added('ar')],
  ['C', C.en, C.ar],
  ['ACC', ACC.en, ACC.ar],
  ['SETX', SETX.en, SETX.ar],
  ['EVX', EVX.en, EVX.ar],
  ['FUX', FUX.en, FUX.ar],
  ['PFX', PFX.en, PFX.ar],
];

const all: Pair[] = ROOTS.flatMap(([path, en, ar]) => pairs(path, en, ar));

/**
 * `pairs` walks the English side and reads `ar[i]` beside it, so an Arabic
 * list with fewer entries than its English twin loses the tail in silence —
 * no blank to find, because the pair was never made. That is exactly how a
 * section of the privacy policy could ship in one language only.
 */
function uneven(path: string, en: unknown, ar: unknown, out: string[] = []): string[] {
  if (Array.isArray(en) || Array.isArray(ar)) {
    const len = (x: unknown) => (Array.isArray(x) ? `${x.length}` : 'not a list');
    if (!Array.isArray(en) || !Array.isArray(ar) || en.length !== ar.length) {
      out.push(`${path}: en ${len(en)}, ar ${len(ar)}`);
      return out;
    }
    en.forEach((v, i) => uneven(`${path}[${i}]`, v, ar[i], out));
    return out;
  }
  if (en && ar && typeof en === 'object' && typeof ar === 'object') {
    for (const key of Object.keys(en as object)) uneven(`${path}.${key}`, (en as Record<string, unknown>)[key], (ar as Record<string, unknown>)[key], out);
  }
  return out;
}

describe('every English line has Arabic behind it', () => {
  it('finds plenty to check', () => {
    assert.ok(all.length > 900, `only ${all.length} pairs — a copy block may have stopped being walked`);
  });

  it('leaves none of it blank', () => {
    const blank = all.filter((p) => p.en.trim() && !p.ar.trim()).map((p) => p.path);
    assert.deepEqual(blank, [], `Arabic is empty at: ${blank.join(', ')}`);
  });

  it('gives every list the same number of entries in both languages', () => {
    const lost = ROOTS.flatMap(([path, en, ar]) => uneven(path, en, ar));
    assert.deepEqual(lost, [], `a list is longer on one side, so its tail is dropped without a trace:\n  ${lost.join('\n  ')}`);
  });

  it('keeps every placeholder the code substitutes into', () => {
    const lost = all
      .filter((p) => tokensOf(p.en).join(',') !== tokensOf(p.ar).join(','))
      .map((p) => `${p.path}: en[${tokensOf(p.en)}] ar[${tokensOf(p.ar)}]`);
    assert.deepEqual(lost, [], `placeholders differ:\n  ${lost.join('\n  ')}`);
  });
});
