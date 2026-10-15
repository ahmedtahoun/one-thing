/**
 * The arithmetic behind a number the app puts on a card and a regulator can
 * read literally.
 *
 * "Save 40%" was true of $4.99 / $35.88 and survived into prices where it
 * was wrong in both directions at once. These tests exist so the next price
 * change cannot do that again: the percentage is derived, and derived from
 * the same constants the cards display.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { FOR_SALE, PRICES, PRODUCT_ID, isForSale, money, perMonth, savingsPercent, yearlyTotal } from './plans';

describe('what a tier costs', () => {
  it('formats cents without reaching for a float', () => {
    assert.equal(money(699), '$6.99');
    assert.equal(money(3999), '$39.99');
    assert.equal(money(100), '$1.00');
    assert.equal(money(5), '$0.05');
  });

  it('shows a year as what it works out to per month', () => {
    // 3999 / 12 = 333.25 → $3.33; the card compares this with $6.99.
    assert.equal(perMonth('pro', 'year'), '$3.33');
    assert.equal(perMonth('pro', 'month'), '$6.99');
    assert.equal(perMonth('pro_plus', 'year'), '$8.33');
    assert.equal(perMonth('pro_plus', 'month'), '$12.99');
  });

  it('bills the year as one payment', () => {
    assert.equal(yearlyTotal('pro'), '$39.99');
    assert.equal(yearlyTotal('pro_plus'), '$99.99');
  });
});

describe('the saving the card claims', () => {
  it('matches the prices rather than a number someone typed', () => {
    // Pro: 6.99 x 12 = 83.88 against 39.99 → 52.3%.
    assert.equal(savingsPercent('pro'), 52);
    // Pro+: 12.99 x 12 = 155.88 against 99.99 → 35.85%.
    assert.equal(savingsPercent('pro_plus'), 35);
  });

  it('never rounds a discount up', () => {
    // 35.85 would round to 36. Flooring is the whole point: the buyer gets
    // at least what the badge says, in every tier, at every price.
    const exact = (t: 'pro' | 'pro_plus') => (1 - PRICES[t].year / (PRICES[t].month * 12)) * 100;
    for (const tier of ['pro', 'pro_plus'] as const) {
      assert.ok(savingsPercent(tier) <= exact(tier), `${tier} overstates its discount`);
      assert.ok(exact(tier) - savingsPercent(tier) < 1, `${tier} understates by more than a point`);
    }
  });

  it('would have caught the badge that shipped', () => {
    // The old prices, with the old badge. It was right then — which is why
    // nobody checked it after the change.
    const old = (1 - 3588 / (499 * 12)) * 100;
    assert.equal(Math.floor(old), 40);
    assert.notEqual(savingsPercent('pro'), 40);
  });
});

describe('what is actually on sale', () => {
  it('sells Pro and not Pro+', () => {
    assert.deepEqual([...FOR_SALE], ['pro']);
    assert.equal(isForSale('pro'), true);
    assert.equal(isForSale('pro_plus'), false);
  });

  it('still prices and identifies the tier it does not sell', () => {
    // Priced and mapped to products, so the day it goes on sale is one edit
    // to FOR_SALE rather than a scramble through the console.
    assert.ok(PRICES.pro_plus.month > PRICES.pro.month);
    assert.equal(PRODUCT_ID.pro_plus.year, 'proplus_yearly');
    assert.equal(PRODUCT_ID.pro.year, 'pro_yearly');
  });

  it('gives every tier and period a distinct product id', () => {
    const ids = Object.values(PRODUCT_ID).flatMap((byPeriod) => Object.values(byPeriod));
    assert.equal(new Set(ids).size, ids.length, `duplicate product id in ${ids.join(', ')}`);
  });
});
