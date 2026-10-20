import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { A11Y } from './a11y';
import { added } from './additions';
import { EGYPTIAN_LINES } from './egyptian-lines';
import { INLINE } from './inline-copy';
import { ACC, C, EVX, FUX, PFX, SETX } from './strings';

const KEEP = new Set(['terms', 'priv', 'micNotice']);

/** Every Arabic line the app shows, outside the legal copy. */
function arabicLines(): string[] {
  const all = new Set<string>();
  const walk = (v: unknown, key = '') => {
    if (KEEP.has(key)) return;
    if (typeof v === 'string') all.add(v);
    else if (Array.isArray(v)) v.forEach((x) => walk(x));
    else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => walk(x, k));
  };
  [C.ar, ACC.ar, SETX.ar, EVX.ar, FUX.ar, PFX.ar, INLINE.ar, A11Y.ar, added('ar')].forEach((x) => walk(x));
  return [...all].filter((s) => /[؀-ۿ]/.test(s));
}

const placeholders = (s: string) => (s.match(/\{[^}]+\}/g) ?? []).sort();

describe('the Egyptian lines', () => {
  it('has a hand-written Egyptian line for every Arabic line', () => {
    // Fragments joined to a number ("بكرة ", " د") are left to the rules.
    const fragment = (s: string) => s !== s.trim() || /^\{n\} .$/.test(s);
    const missing = arabicLines().filter((s) => !fragment(s) && !(s in EGYPTIAN_LINES));
    assert.deepEqual(missing, [], 'add these to src/content/egyptian-lines.ts');
  });

  it('keeps every placeholder', () => {
    for (const [gulf, egypt] of Object.entries(EGYPTIAN_LINES)) assert.deepEqual(placeholders(egypt), placeholders(gulf), gulf);
  });

  it('keeps no Gulf words', () => {
    const GULF = /(^|[\s«(])(وش|ايش|تبي|أبي|يبي|الحين|ليش|وين|كذا|هذا|هذي|زين|وايد|جوال|جوالك|لين|ما فيه|مو)($|[\s،.؟!»):])/;
    const left = Object.values(EGYPTIAN_LINES).filter((s) => GULF.test(s) && !s.includes('مجاناً ٧ أيام'));
    assert.deepEqual(left, []);
  });
});
