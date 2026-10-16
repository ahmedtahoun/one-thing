import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { clockFromHHMM, clockOf, clockText } from './clock-format';

describe('clockText', () => {
  it('writes the 12-hour clock with AM and PM', () => {
    assert.equal(clockText(9, 30, 'en'), '9:30 AM');
    assert.equal(clockText(17, 5, 'en'), '5:05 PM');
    assert.equal(clockText(23, 59, 'en'), '11:59 PM');
  });
  it('writes midnight as 12 AM and noon as 12 PM', () => {
    assert.equal(clockText(0, 0, 'en'), '12:00 AM');
    assert.equal(clockText(12, 0, 'en'), '12:00 PM');
    assert.equal(clockText(12, 45, 'en'), '12:45 PM');
  });
  it('writes ص and م in Arabic, keeping the digits in their own order', () => {
    assert.equal(clockText(9, 30, 'ar'), '⁦9:30⁩ ص');
    assert.equal(clockText(17, 45, 'ar'), '⁦5:45⁩ م');
    assert.equal(clockText(0, 10, 'ar'), '⁦12:10⁩ ص');
  });
});

describe('clockOf and clockFromHHMM', () => {
  it('reads a local time of day from an instant', () => {
    assert.equal(clockOf(new Date(2026, 9, 14, 15, 20).toISOString(), 'en'), '3:20 PM');
    assert.equal(clockOf(null, 'en'), '');
    assert.equal(clockOf('nonsense', 'en'), '');
  });
  it('converts a stored HH:MM, and leaves anything else alone', () => {
    assert.equal(clockFromHHMM('17:45', 'en'), '5:45 PM');
    assert.equal(clockFromHHMM('08:00', 'en'), '8:00 AM');
    assert.equal(clockFromHHMM('Tonight', 'en'), 'Tonight');
    assert.equal(clockFromHHMM('25:00', 'en'), '25:00');
  });
});
