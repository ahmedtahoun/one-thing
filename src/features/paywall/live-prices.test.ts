/**
 * Reading what the store charges. Run with `npm test`.
 *
 * Every case here is one a device can only show you if you happen to hold
 * a phone with that App Store account: a SAR tier, a three-decimal
 * currency, a Play base plan that opens with a free phase.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { applePrices, formatMoney, minorUnits, perMonthOf, playPrices, resolvePrices, savingsOf, type TierPrices } from './live-prices';

const USD: TierPrices = { month: { minor: 699, currency: 'USD' }, year: { minor: 3999, currency: 'USD' } };
const IDS = { month: 'pro_monthly', year: 'pro_yearly' };
const PLANS = { month: 'monthly', year: 'yearly' };

describe('formatting money', () => {
  it('uses the currency’s own form, not a dollar sign', () => {
    assert.match(formatMoney({ minor: 699, currency: 'USD' }, 'en-US'), /\$6\.99/);
    assert.match(formatMoney({ minor: 2600, currency: 'SAR' }, 'en-US'), /26\.00/);
    assert.match(formatMoney({ minor: 2600, currency: 'SAR' }, 'en-US'), /SAR|﷼|ر\.س/);
  });

  it('knows a currency with three decimals, and one with none', () => {
    assert.equal(minorUnits('KWD'), 1000);
    assert.equal(minorUnits('JPY'), 1);
    assert.match(formatMoney({ minor: 2500, currency: 'KWD' }, 'en-US'), /2\.500/);
    assert.match(formatMoney({ minor: 980, currency: 'JPY' }, 'en-US'), /980/);
  });

  /**
   * Two things learned here. `Intl` accepts any well-formed three-letter
   * code and prints it verbatim, so the hand-rolled fallback is only for a
   * code it rejects outright — and its output separates the code from the
   * amount with a **non-breaking** space, which is why nothing compares
   * these strings with `===` to a typed one.
   */
  it('does not take the paywall down on a code it has never heard of', () => {
    const unknown = formatMoney({ minor: 500, currency: 'ZZZ' }, 'en-US');
    assert.match(unknown, /ZZZ/);
    assert.match(unknown, /5\.00/);

    const malformed = formatMoney({ minor: 500, currency: 'nope' }, 'en-US');
    assert.equal(malformed, 'nope 5.00', 'a code Intl refuses falls back to plain text');
  });
});

describe('reading an App Store product', () => {
  it('takes the amount and the currency', () => {
    const products = [
      { id: 'pro_monthly', price: 26.99, currency: 'SAR', displayPrice: 'SAR 26.99' },
      { id: 'pro_yearly', price: 149.99, currency: 'SAR', displayPrice: 'SAR 149.99' },
    ];
    assert.deepEqual(applePrices(products, IDS), {
      month: { minor: 2699, currency: 'SAR' },
      year: { minor: 14999, currency: 'SAR' },
    });
  });

  it('ignores a product it did not ask for, and anything malformed', () => {
    assert.deepEqual(applePrices([{ id: 'something_else', price: 1, currency: 'USD' }], IDS), {});
    assert.deepEqual(applePrices([{ id: 'pro_monthly', price: 0, currency: 'USD' }], IDS), {}, 'free is not a price');
    assert.deepEqual(applePrices([{ id: 'pro_monthly', price: 6.99 }], IDS), {}, 'no currency, no price');
    assert.deepEqual(applePrices(null, IDS), {});
    assert.deepEqual(applePrices('nonsense', IDS), {});
  });
});

describe('reading a Play subscription', () => {
  const offer = (basePlanIdAndroid: string, phases: { priceAmountMicros: string; priceCurrencyCode: string }[]) => ({
    basePlanIdAndroid,
    pricingPhasesAndroid: { pricingPhaseList: phases },
  });

  it('takes the recurring phase, not the free one that comes first', () => {
    const products = [
      {
        id: 'pro',
        subscriptionOffers: [
          offer('monthly', [
            { priceAmountMicros: '0', priceCurrencyCode: 'SAR' },
            { priceAmountMicros: '26990000', priceCurrencyCode: 'SAR' },
          ]),
          offer('yearly', [{ priceAmountMicros: '149990000', priceCurrencyCode: 'SAR' }]),
        ],
      },
    ];
    assert.deepEqual(playPrices(products, 'pro', PLANS), {
      month: { minor: 2699, currency: 'SAR' },
      year: { minor: 14999, currency: 'SAR' },
    });
  });

  it('gives nothing when every phase is free, rather than claiming zero', () => {
    const products = [{ id: 'pro', subscriptionOffers: [offer('monthly', [{ priceAmountMicros: '0', priceCurrencyCode: 'SAR' }])] }];
    assert.deepEqual(playPrices(products, 'pro', PLANS), {});
  });

  it('survives a shape it does not recognise', () => {
    assert.deepEqual(playPrices([{ id: 'pro' }], 'pro', PLANS), {});
    assert.deepEqual(playPrices(undefined, 'pro', PLANS), {});
  });
});

describe('choosing between the store and the table', () => {
  const sar = { month: { minor: 2699, currency: 'SAR' }, year: { minor: 14999, currency: 'SAR' } };

  it('takes the store when it gave both periods', () => {
    assert.deepEqual(resolvePrices(USD, sar), { prices: sar, live: true });
  });

  /**
   * The rule worth protecting. One live period beside one hand-typed one
   * puts a SAR year next to a USD month and computes a saving between
   * them — a number that is simply false.
   */
  it('refuses to mix a live price with a typed one', () => {
    assert.deepEqual(resolvePrices(USD, { year: sar.year }), { prices: USD, live: false });
    assert.deepEqual(resolvePrices(USD, { month: sar.month }), { prices: USD, live: false });
    assert.deepEqual(resolvePrices(USD, {}), { prices: USD, live: false });
  });

  it('refuses two live prices in different currencies', () => {
    const mixed = { month: { minor: 699, currency: 'USD' }, year: sar.year };
    assert.deepEqual(resolvePrices(USD, mixed), { prices: USD, live: false });
  });
});

describe('the figures derived from them', () => {
  it('divides a year by twelve in its own currency', () => {
    assert.deepEqual(perMonthOf({ month: { minor: 2699, currency: 'SAR' }, year: { minor: 14999, currency: 'SAR' } }, 'year'), {
      minor: 1250,
      currency: 'SAR',
    });
  });

  it('rounds a saving down, never up', () => {
    // 3999 against 699×12 = 8388 is 52.32%.
    assert.equal(savingsOf(USD), 52);
    const barely = { month: { minor: 100, currency: 'USD' }, year: { minor: 641, currency: 'USD' } };
    assert.equal(savingsOf(barely), 46, '46.58% is 46, not 47');
  });

  it('states no saving it cannot stand behind', () => {
    assert.equal(savingsOf({ month: { minor: 699, currency: 'USD' }, year: { minor: 14999, currency: 'SAR' } }), null);
    assert.equal(savingsOf({ month: { minor: 0, currency: 'USD' }, year: { minor: 3999, currency: 'USD' } }), null);
  });

  it('agrees with the old hand-typed table, so nothing moves until a store answers', () => {
    assert.match(formatMoney(USD.month, 'en-US'), /^\$6\.99$/);
    assert.match(formatMoney(USD.year, 'en-US'), /^\$39\.99$/);
    assert.match(formatMoney(perMonthOf(USD, 'year'), 'en-US'), /^\$3\.33$/);
  });
});
