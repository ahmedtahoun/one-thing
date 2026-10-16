/**
 * The welcome's two steps. Run with `npm test`.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { STEPS, canTurnOff, ctaKey, isLast, next, pips, type Step } from './steps';

describe('the welcome’s steps', () => {
  it('is two, and the last one knows it', () => {
    assert.equal(STEPS, 2);
    assert.equal(isLast(0), false);
    assert.equal(isLast(1), true);
  });

  it('says Continue, then Let’s start', () => {
    assert.equal(ctaKey(0), 'cont');
    assert.equal(ctaKey(1), 'start');
  });

  it('walks forward once and then finishes', () => {
    assert.equal(next(0), 1);
    assert.equal(next(1), null, 'the last step finishes rather than advancing');
  });

  it('stretches the pip for the step you are on', () => {
    assert.deepEqual(pips(0), [{ width: 22, active: true }, { width: 6, active: false }]);
    assert.deepEqual(pips(1), [{ width: 6, active: false }, { width: 22, active: true }]);
    for (const step of [0, 1] as Step[]) {
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
