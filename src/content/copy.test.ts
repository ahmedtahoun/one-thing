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
 * 964 pairs passed when this was written, so it starts from a clean sheet.
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

const all: Pair[] = [
  ...pairs('added', added('en'), added('ar')),
  ...pairs('C', C.en, C.ar),
  ...pairs('ACC', ACC.en, ACC.ar),
  ...pairs('SETX', SETX.en, SETX.ar),
  ...pairs('EVX', EVX.en, EVX.ar),
  ...pairs('FUX', FUX.en, FUX.ar),
  ...pairs('PFX', PFX.en, PFX.ar),
];

describe('every English line has Arabic behind it', () => {
  it('finds plenty to check', () => {
    assert.ok(all.length > 900, `only ${all.length} pairs — a copy block may have stopped being walked`);
  });

  it('leaves none of it blank', () => {
    const blank = all.filter((p) => p.en.trim() && !p.ar.trim()).map((p) => p.path);
    assert.deepEqual(blank, [], `Arabic is empty at: ${blank.join(', ')}`);
  });

  it('keeps every placeholder the code substitutes into', () => {
    const lost = all
      .filter((p) => tokensOf(p.en).join(',') !== tokensOf(p.ar).join(','))
      .map((p) => `${p.path}: en[${tokensOf(p.en)}] ar[${tokensOf(p.ar)}]`);
    assert.deepEqual(lost, [], `placeholders differ:\n  ${lost.join('\n  ')}`);
  });
});
