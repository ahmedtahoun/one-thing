/**
 * The Free plan's daily assistant limit — DATA_MODEL § AI / parsing, and the
 * paywall's "Free plan: 10 requests a day." Run with `npm test`.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { spendOne, usedOn } from './assistant-meter';
import {
  assistantRequestsLeft,
  can,
  canAutoChase,
  canBrainDump,
  canUseAssistant,
  FREE_ASSISTANT_REQUESTS_PER_DAY,
  FREE_BRAIN_DUMPS_PER_DAY,
} from '@/policy/entitlements';

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

describe('the gates settled in October 2026', () => {
  it('meters brain dumps on Free and not on Pro', () => {
    assert.ok(canBrainDump('free', 0));
    assert.ok(canBrainDump('free', FREE_BRAIN_DUMPS_PER_DAY - 1));
    assert.equal(canBrainDump('free', FREE_BRAIN_DUMPS_PER_DAY), false);
    assert.ok(canBrainDump('pro', 500));
    assert.ok(canBrainDump('trial', 500));
    assert.equal(canBrainDump('lapsed', FREE_BRAIN_DUMPS_PER_DAY), false);
  });

  it('starts the chase by itself only on Pro', () => {
    // Not a count: how many people may be waiting is not limited at all,
    // because follow-ups accumulate rather than being added, and a cap would
    // fail invisibly on the message that most needed chasing.
    assert.equal(canAutoChase('free'), false);
    assert.equal(canAutoChase('lapsed'), false);
    assert.ok(canAutoChase('pro'));
    assert.ok(canAutoChase('trial'));
  });

  it('leaves what the card no longer sells alone', () => {
    // Client history is the person's own notes; the event types have no way
    // in since Today went to four tiles. Both are off the paywall rather
    // than locked.
    assert.ok(can('free', 'clientHistory'));
    assert.ok(can('free', 'events'));
    assert.ok(can('free', 'autoFollowUps'));
  });

  it('weekly recap is open to everyone now that it exists', () => {
    // It came off the card because it had no screen (§2.56). It has one now
    // (app/recap.tsx, §2.70) and reads only what is already on the device, so
    // there is nothing to meter and nothing to lock. Putting it back on the
    // paywall is a pricing decision, not a consequence of writing it.
    assert.ok(can('free', 'weeklyRecap'));
    assert.ok(can('pro', 'weeklyRecap'));
  });

  it('still answers false for what is listed and not written', () => {
    // Pro+'s other two. Bulk card scanning, the third, is built and metered.
    assert.equal(can('pro_plus', 'smartLists'), false);
    assert.equal(can('pro_plus', 'enrichment'), false);
    assert.ok(can('pro_plus', 'bulkCardScan'));
  });
});
