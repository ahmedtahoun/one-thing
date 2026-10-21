/**
 * The welcome's three steps. Run with `npm test`.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { STEPS, asks, canTurnOff, ctaKey, isLast, next, pips, type Step } from './steps';

describe('the welcome’s steps', () => {
  it('is three, and the last one knows it', () => {
    assert.equal(STEPS, 3);
    assert.equal(isLast(0), false);
    assert.equal(isLast(1), false);
    assert.equal(isLast(2), true);
  });

  /**
   * "Let's start" moved back a step when the question was added after it:
   * the CTA finishes the steps that *tell*, and the step that *asks* is
   * finished by one of its two answers instead.
   */
  it('says Continue, then Let’s start, and then asks instead', () => {
    assert.equal(ctaKey(0), 'cont');
    assert.equal(ctaKey(1), 'start');
    assert.equal(asks(0), false);
    assert.equal(asks(1), false);
    assert.equal(asks(2), true, 'the last step draws its own two answers');
  });

  it('walks forward to the question and then finishes', () => {
    assert.equal(next(0), 1);
    assert.equal(next(1), 2);
    assert.equal(next(2), null, 'the last step finishes rather than advancing');
  });

  it('stretches the pip for the step you are on', () => {
    assert.deepEqual(pips(0), [{ width: 22, active: true }, { width: 6, active: false }, { width: 6, active: false }]);
    assert.deepEqual(pips(1), [{ width: 6, active: false }, { width: 22, active: true }, { width: 6, active: false }]);
    assert.deepEqual(pips(2), [{ width: 6, active: false }, { width: 6, active: false }, { width: 22, active: true }]);
    for (const step of [0, 1, 2] as Step[]) {
      assert.equal(pips(step).filter((p) => p.active).length, 1, 'exactly one pip is lit');
      assert.equal(pips(step).length, STEPS);
    }
  });
});

describe('the channels', () => {
  const all = { whatsapp: true, email: true, call: true };

  it('lets any of them off while others remain', () => {
    for (const key of Object.keys(all)) assert.equal(canTurnOff(all, key), true, key);
  });

  /**
   * The rule worth protecting. With every channel off, Today's Call, Email
   * and WhatsApp tiles lead nowhere and the app cannot reach anybody — so
   * the last one on cannot be turned off.
   */
  it('refuses to turn the last one off', () => {
    assert.equal(canTurnOff({ whatsapp: true, email: false, call: false }, 'whatsapp'), false);
  });

  it('…but turning an already-off one “off” is not the last one', () => {
    assert.equal(canTurnOff({ whatsapp: true, email: false, call: false }, 'email'), true, 'it is off; tapping it turns it on');
  });

  it('lets the second-to-last off, leaving one', () => {
    assert.equal(canTurnOff({ whatsapp: true, email: true, call: false }, 'email'), true);
  });
});
