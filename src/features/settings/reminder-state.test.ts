/**
 * What Settings says about reminders. Run with `npm test`.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { canTurnOn, isTrouble, reminderLine, showsRow } from './reminder-state';

const line = (over: Partial<Parameters<typeof reminderLine>[0]> = {}) =>
  reminderLine({ supported: true, allowed: true, scheduled: 0, remindable: 0, ...over });

describe('which line Settings shows', () => {
  it('says nothing on a platform that cannot deliver them', () => {
    assert.deepEqual(line({ supported: false, allowed: true, scheduled: 4 }), { kind: 'unsupported' });
  });

  it('counts what the OS is actually holding', () => {
    assert.deepEqual(line({ scheduled: 7 }), { kind: 'on', scheduled: 7 });
  });

  it('separates "nothing to remind about" from "should have, did not"', () => {
    assert.deepEqual(line({ scheduled: 0, remindable: 0 }), { kind: 'nothing' });
    assert.deepEqual(line({ scheduled: 0, remindable: 3 }), { kind: 'broken', expected: 3 });
  });

  it('treats an unanswered permission as off, not as allowed', () => {
    // Null is "the OS has not said yet". Reading it as allowed would be the
    // original fault over again: claiming reminders work when none can.
    assert.deepEqual(line({ allowed: null, scheduled: 0 }), { kind: 'off' });
    assert.deepEqual(line({ allowed: false, scheduled: 0 }), { kind: 'off' });
  });

  it('says off even when something is somehow still scheduled', () => {
    assert.deepEqual(line({ allowed: false, scheduled: 5 }), { kind: 'off' });
  });
});

describe('how the row behaves', () => {
  it('colours the two faults, and only those', () => {
    assert.equal(isTrouble(line({ allowed: false })), true);
    assert.equal(isTrouble(line({ remindable: 2 })), true);
    assert.equal(isTrouble(line({ scheduled: 3 })), false);
    assert.equal(isTrouble(line()), false);
  });

  it('offers Turn on only when permission is what is missing', () => {
    assert.equal(canTurnOn(line({ allowed: false })), true);
    assert.equal(canTurnOn(line({ allowed: null })), true);
    // Nothing scheduled with permission granted is not fixed by asking again.
    assert.equal(canTurnOn(line({ remindable: 2 })), false);
    assert.equal(canTurnOn(line({ scheduled: 1 })), false);
  });

  it('keeps the row off the screen only where they cannot be delivered', () => {
    assert.equal(showsRow(line({ supported: false })), false);
    assert.equal(showsRow(line({ allowed: false })), true);
    assert.equal(showsRow(line({ scheduled: 2 })), true);
  });
});
