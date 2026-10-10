/**
 * The Free plan's daily assistant limit — DATA_MODEL § AI / parsing, and the
 * paywall's "Free plan: 10 requests a day." Run with `npm test`.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { spendOne, usedOn } from './assistant-meter';
import { assistantRequestsLeft, canUseAssistant, FREE_ASSISTANT_REQUESTS_PER_DAY } from '@/policy/entitlements';

describe('the daily assistant meter', () => {
  it('allows ten requests a day on Free, and not an eleventh', () => {
    let usage = null;
    for (let i = 0; i < FREE_ASSISTANT_REQUESTS_PER_DAY; i++) {
      assert.ok(canUseAssistant('free', usedOn(usage, '2026-10-10')), `request ${i + 1}`);
      usage = spendOne(usage, '2026-10-10');
    }
    assert.equal(usedOn(usage, '2026-10-10'), 10);
    assert.equal(canUseAssistant('free', usedOn(usage, '2026-10-10')), false);
    assert.equal(assistantRequestsLeft('free', 10), 0);
  });

  it('starts again the next day', () => {
    const yesterday = { date: '2026-10-09', used: 10 };
    assert.equal(usedOn(yesterday, '2026-10-10'), 0);
    assert.deepEqual(spendOne(yesterday, '2026-10-10'), { date: '2026-10-10', used: 1 });
  });

  it('does not limit Pro, or a trial', () => {
    assert.ok(canUseAssistant('pro', 500));
    assert.ok(canUseAssistant('trial', 500));
    assert.equal(assistantRequestsLeft('pro', 500), Infinity);
  });

  it('treats a lapsed subscription as Free', () => {
    assert.equal(canUseAssistant('lapsed', 10), false);
  });
});
