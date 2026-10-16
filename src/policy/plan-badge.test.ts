/**
 * Which badge each plan wears. Run with `npm test`.
 *
 * The bug this exists to prevent is the one it was written after: the badge
 * asked `isPro`, which is true for `trial`, `pro` and `pro_plus` alike, so a
 * Pro+ subscriber and somebody on a free trial both read "Pro". `isPro` is
 * right to answer that way — every "has this person paid" check depends on
 * it — which is exactly why naming the plan needs a different question.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isPro, planBadge, type Plan } from './entitlements';

const EVERY: readonly Plan[] = ['free', 'trial', 'pro', 'pro_plus', 'lapsed'];

describe('the plan badge', () => {
  it('gives each paid state its own badge', () => {
    assert.equal(planBadge('pro'), 'pro');
    assert.equal(planBadge('pro_plus'), 'plus');
    assert.equal(planBadge('trial'), 'trial');
  });

  it('does not let Pro+ or a trial read as Pro, which is what it is for', () => {
    const paid = EVERY.filter(isPro);
    assert.deepEqual(paid, ['trial', 'pro', 'pro_plus'], 'isPro still treats all three as paying');
    assert.equal(new Set(paid.map(planBadge)).size, 3, 'but each wears a different badge');
  });

  it('says Free for a plan that is not paying, lapsed included', () => {
    assert.equal(planBadge('free'), 'free');
    assert.equal(planBadge('lapsed'), 'free', 'a lapsed subscriber is on Free now; the badge should not pretend otherwise');
  });

  it('answers for every plan there is', () => {
    for (const plan of EVERY) assert.ok(planBadge(plan), plan);
  });
});
