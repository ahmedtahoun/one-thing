import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { C } from './strings';
import { twelveHour } from './twelve-hour';

describe('twelveHour', () => {
  it('writes the fixed times on the 12-hour clock', () => {
    const en = twelveHour(C.en, 'en');
    assert.equal(en.set_quietV, '10:00 PM – 8:00 AM');
    assert.equal(en.remTiny.morning, '8:00 AM');
    assert.equal(en.remShort.morning, '8:00 AM');
    assert.ok(en.remOpts.some(([, label]) => label === 'Morning of · 8:00 AM'));
  });
  it('does the same in Arabic, with ص and م', () => {
    const ar = twelveHour(C.ar, 'ar');
    assert.ok(ar.set_quietV.includes('م') && ar.set_quietV.includes('ص'));
    assert.ok(!/\b0\d:\d{2}\b/.test(ar.set_quietV));
    assert.ok(ar.remOpts.every(([, label]) => !/\b0\d:\d{2}\b/.test(label ?? '')));
  });
  it('says Overdue, not Slipped', () => {
    assert.equal(twelveHour(C.en, 'en').slipped, 'Overdue');
    assert.equal(twelveHour(C.ar, 'ar').slipped, 'متأخرة');
  });
  it('leaves the rest of the copy alone', () => {
    const en = twelveHour(C.en, 'en');
    assert.equal(en.resched, C.en.resched);
    assert.equal(en.remOpts.length, C.en.remOpts.length);
  });
});
