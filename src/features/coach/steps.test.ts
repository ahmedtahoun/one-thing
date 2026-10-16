/**
 * Which coach marks run, and when the tour runs at all. `npm test`.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { COACH_STEPS, shouldRun, visibleSteps } from './steps';

describe('the tour’s steps', () => {
  it('is short, and every step names an anchor and a line of copy', () => {
    assert.ok(COACH_STEPS.length <= 3, 'a tour longer than three is a toll, not a help');
    for (const step of COACH_STEPS) {
      assert.ok(step.anchor, 'anchor');
      assert.ok(step.copy, 'copy');
    }
    assert.equal(new Set(COACH_STEPS.map((s) => s.anchor)).size, COACH_STEPS.length, 'no anchor twice');
  });

  it('skips a step whose target is not on screen', () => {
    const all = { oneThing: {}, actions: {}, mic: {} };
    assert.equal(visibleSteps(all).length, 3);
    // Before a One Thing is set the card is a different component, so its
    // anchor is missing — the tour goes on without it rather than pointing
    // at nothing.
    assert.deepEqual(
      visibleSteps({ actions: {}, mic: {} }).map((s) => s.anchor),
      ['actions', 'mic']
    );
    assert.deepEqual(visibleSteps({}), []);
  });

  it('keeps the order it was written in', () => {
    assert.deepEqual(
      visibleSteps({ mic: {}, oneThing: {}, actions: {} }).map((s) => s.anchor),
      ['oneThing', 'actions', 'mic'],
      'the order is the one in COACH_STEPS, not the order anchors arrived'
    );
  });
});

describe('whether the tour runs', () => {
  it('runs for somebody who just arrived and has not seen it', () => {
    assert.equal(shouldRun(true, false, 3), true);
  });

  it('does not run twice', () => {
    assert.equal(shouldRun(true, true, 3), false);
  });

  it('does not run with nothing to point at', () => {
    assert.equal(shouldRun(true, false, 0), false);
  });

  /**
   * The rule that keeps the overlay out of every screenshot and probe: a
   * session seeded straight into storage has never been onboarded, so the
   * tour stays away — the same answer a person who never saw the welcome
   * would get.
   */
  it('does not run for a session that never came through the welcome', () => {
    assert.equal(shouldRun(false, false, 3), false);
    assert.equal(shouldRun(false, true, 3), false);
  });
});
