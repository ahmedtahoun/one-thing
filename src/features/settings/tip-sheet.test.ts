/**
 * The tip jar's arithmetic. Run with `npm test`.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { allLive, canCount, clampCups, MAX_CUPS, TIP_FALLBACK, tipPrice, totalOf } from './tip-sheet';
import type { Money } from '@/features/paywall/live-prices';

const IDS = ['tip_small', 'tip_regular', 'tip_large'] as const;
const sar = (minor: number): Money => ({ minor, currency: 'SAR' });

describe('which price the sheet shows', () => {
  it('prefers the store, in the buyer’s own currency', () => {
    const store = { tip_small: sar(375) };
    assert.deepEqual(tipPrice(0, store, IDS), sar(375));
  });

  it('falls back to the typed table per tier, not all or nothing', () => {
    const store = { tip_regular: sar(1125) };
    assert.deepEqual(tipPrice(0, store, IDS), TIP_FALLBACK[0]);
    assert.deepEqual(tipPrice(1, store, IDS), sar(1125));
    assert.deepEqual(tipPrice(2, store, IDS), TIP_FALLBACK[2]);
  });

  it('falls back when the store said nothing at all', () => {
    assert.deepEqual(tipPrice(2, {}, IDS), TIP_FALLBACK[2]);
  });

  it('keeps the typed table at the documented amounts', () => {
    assert.deepEqual(TIP_FALLBACK.map((m) => m.minor), [99, 299, 499]);
    assert.ok(TIP_FALLBACK.every((m) => m.currency === 'USD'));
  });

  it('knows whether every tier is the store’s word', () => {
    assert.equal(allLive({ tip_small: sar(375), tip_regular: sar(1125), tip_large: sar(1875) }, IDS), true);
    assert.equal(allLive({ tip_small: sar(375) }, IDS), false);
    assert.equal(allLive({}, IDS), false);
  });
});

describe('how many cups', () => {
  it('starts at one and stops at ten', () => {
    assert.equal(clampCups(0), 1);
    assert.equal(clampCups(-4), 1);
    assert.equal(clampCups(MAX_CUPS + 5), MAX_CUPS);
    assert.equal(clampCups(7), 7);
  });

  it('takes whole cups only, and survives nonsense', () => {
    assert.equal(clampCups(2.9), 2);
    assert.equal(clampCups(Number.NaN), 1);
    // Nonsense falls to one cup, not ten: if the number reaching this is
    // not a number at all, the safe direction is the cheap one.
    assert.equal(clampCups(Number.POSITIVE_INFINITY), 1);
  });
});

describe('what it comes to', () => {
  it('multiplies in minor units, so no float reaches a price', () => {
    assert.deepEqual(totalOf(sar(375), 3), sar(1125));
    assert.deepEqual(totalOf({ minor: 99, currency: 'USD' }, 7), { minor: 693, currency: 'USD' });
  });

  it('keeps the currency it was given', () => {
    assert.equal(totalOf({ minor: 1000, currency: 'KWD' }, 2).currency, 'KWD');
  });

  it('clamps before it multiplies, so the total matches the counter', () => {
    assert.deepEqual(totalOf(sar(100), 99), sar(100 * MAX_CUPS));
    assert.deepEqual(totalOf(sar(100), 0), sar(100));
  });
});

describe('where a counter can be honoured', () => {
  it('is iOS only: Play takes no quantity on the request', () => {
    assert.equal(canCount('ios'), true);
    assert.equal(canCount('android'), false);
    assert.equal(canCount('web'), false);
  });
});
