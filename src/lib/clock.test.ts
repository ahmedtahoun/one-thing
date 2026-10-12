/**
 * Typed reminder times, and the default offered when the old one has passed.
 * Run with `npm test`.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { nextSlot, parseClock } from './clock';

describe('parseClock', () => {
  it('reads the ways people type a time', () => {
    assert.equal(parseClock('17:45'), '17:45');
    assert.equal(parseClock('7:05'), '07:05');
    assert.equal(parseClock('1745'), '17:45');
    assert.equal(parseClock('17.45'), '17:45');
    assert.equal(parseClock(' 9 '), '09:00');
    assert.equal(parseClock('00:00'), '00:00');
  });

  it('reads Arabic-Indic digits', () => {
    assert.equal(parseClock('١٧:٤٥'), '17:45');
  });

  it('refuses what is not a time', () => {
    for (const bad of ['', 'abc', '24:00', '12:60', '9:5', '123456', '12:3', '-1']) {
      assert.equal(parseClock(bad), null, bad);
    }
  });
});

describe('nextSlot', () => {
  it('is the next half hour after now', () => {
    assert.deepEqual(nextSlot('11:02'), { time: '11:30', dayOffset: 0 });
    assert.deepEqual(nextSlot('11:30'), { time: '12:00', dayOffset: 0 });
    assert.deepEqual(nextSlot('11:31'), { time: '12:00', dayOffset: 0 });
  });

  it('starts at 08:00 before the chips begin', () => {
    assert.deepEqual(nextSlot('06:15'), { time: '08:00', dayOffset: 0 });
  });

  it('rolls to tomorrow morning when today is over', () => {
    assert.deepEqual(nextSlot('21:30'), { time: '09:00', dayOffset: 1 });
    assert.deepEqual(nextSlot('23:10'), { time: '09:00', dayOffset: 1 });
  });
});
