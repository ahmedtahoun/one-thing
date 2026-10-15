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
  canAddFollowUp,
  canBrainDump,
  canUseAssistant,
  canUseEventType,
  FREE_ACTIVE_FOLLOW_UPS,
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

  it('caps how many people Free can be waiting on at once', () => {
    assert.ok(canAddFollowUp('free', FREE_ACTIVE_FOLLOW_UPS - 1));
    assert.equal(canAddFollowUp('free', FREE_ACTIVE_FOLLOW_UPS), false);
    // Closing one makes room, which is the point of counting the open ones.
    assert.ok(canAddFollowUp('free', FREE_ACTIVE_FOLLOW_UPS - 1));
    assert.ok(canAddFollowUp('pro', 500));
  });

  it('keeps meetings and visits free, and sells webinars and courses', () => {
    assert.ok(canUseEventType('free', 'meeting'));
    assert.ok(canUseEventType('free', 'visit'));
    assert.equal(canUseEventType('free', 'webinar'), false);
    assert.equal(canUseEventType('free', 'course'), false);
    for (const type of ['visit', 'meeting', 'webinar', 'course'] as const) {
      assert.ok(canUseEventType('pro', type), type);
      assert.ok(canUseEventType('trial', type), type);
    }
  });

  it('leaves what the card no longer sells alone', () => {
    // Client history is the person's own notes: open to everyone, and off
    // the paywall rather than locked. Weekly recap has no screen to route to.
    assert.ok(can('free', 'clientHistory'));
    assert.equal(can('pro', 'weeklyRecap'), false);
  });
});
