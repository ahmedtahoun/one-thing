/**
 * SCREENS.md § 24 calls the paywall's fine print "required wording" — both
 * stores check it. This holds the copy to the spec's own sentence, so neither
 * can drift without a failing test.
 *
 * Two things changed under it. The price is no longer written into the
 * sentence; `{price}` is, and the screen fills it from plans.ts, so these
 * tests compose what the person actually reads rather than the template. And
 * the prices moved, while SCREENS.md still says $35.88 — the handoff is the
 * record of what was asked for, not configuration (BUILD-REVIEW.md § 2.43),
 * so the divergence is written down here instead of edited into the spec.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { SETX } from '@/content/strings';
import { PRICES, money, yearlyTotal } from './plans';

const screens = readFileSync(join(__dirname, '../../../design-handoff/SCREENS.md'), 'utf8');
const required = /Fine print \(required wording\): "([^"]+)"/.exec(screens)?.[1];

/** The spec's sentence at the prices we actually charge. */
const atCurrentPrices = (period: 'year' | 'month') =>
  period === 'year'
    ? required?.replace('$35.88/year', `${yearlyTotal('pro')}/year`)
    : required?.replace('$35.88/year', `${money(PRICES.pro.month)}/month`);

const filled = (template: string, price: string) => template.replace('{price}', price);

it('finds the required wording in SCREENS.md', () => assert.ok(required));

it('shows the yearly fine print word for word', () => {
  assert.equal(filled(SETX.en.pw.fineY, yearlyTotal('pro')), atCurrentPrices('year'));
});

it('words the monthly plan the same, at its own price', () => {
  assert.equal(filled(SETX.en.pw.fineM, money(PRICES.pro.month)), atCurrentPrices('month'));
});

describe('the prices the fine print quotes', () => {
  it('are the ones the cards charge, not a second copy of them', () => {
    // The whole point of the placeholder: a price change cannot leave the
    // legally required sentence quoting the old figure.
    assert.match(filled(SETX.en.pw.fineY, yearlyTotal('pro')), /\$39\.99\/year/);
    assert.match(filled(SETX.en.pw.fineM, money(PRICES.pro.month)), /\$6\.99\/month/);
  });

  it('leaves no placeholder behind, in either language', () => {
    const shown = [
      filled(SETX.en.pw.fineY, yearlyTotal('pro')),
      filled(SETX.en.pw.fineM, money(PRICES.pro.month)),
      filled(SETX.ar.pw.fineY, yearlyTotal('pro')),
      filled(SETX.ar.pw.fineM, money(PRICES.pro.month)),
      filled(SETX.en.pw.yearSub, yearlyTotal('pro')),
      filled(SETX.ar.pw.yearSub, yearlyTotal('pro')),
      SETX.en.pw.save.replace('{n}', '52'),
      SETX.ar.pw.save.replace('{n}', '52'),
    ];
    for (const line of shown) {
      assert.doesNotMatch(line, /\{[a-z]+\}/i, `a placeholder reached the screen: ${line}`);
    }
  });
});
