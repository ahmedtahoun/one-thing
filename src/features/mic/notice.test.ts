/**
 * The microphone notice's one decision. Run with `npm test`.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { needsMicNotice } from './notice';

describe('explaining the microphone before asking for it', () => {
  it('explains it on the first tap', () => {
    assert.equal(needsMicNotice(false, true), true);
  });

  it('does not explain it again once somebody has agreed', () => {
    assert.equal(needsMicNotice(true, true), false);
  });

  /**
   * The case that decides which way the function leans. A tap landing
   * before storage has been read knows nothing, and the two mistakes
   * available are not the same size: a second notice costs a tap, a missing
   * one is the policy breach.
   */
  it('explains it when the stored answer has not been read yet', () => {
    assert.equal(needsMicNotice(true, false), true);
    assert.equal(needsMicNotice(false, false), true);
  });
});
