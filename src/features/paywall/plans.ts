/**
 * What each tier costs, and what the cards may claim about it.
 *
 * Prices used to live in five places per language — `PRICE` in the paywall,
 * `yearSub`, `fineY`, `fineM`, and a hand-typed "Save 40%" — so a price
 * change meant finding ten strings and the saving meant doing arithmetic in
 * your head. The 40% was right for $4.99 / $35.88 and wrong for everything
 * after it.
 *
 * So the numbers live here once, in whole cents, and every string that shows
 * one takes it as a placeholder. **The saving is computed, never typed.** A
 * discount a human typed is a claim nobody re-checks when the price moves,
 * and an overstated one is a false-discount claim both stores act on.
 *
 * These are the fallback prices. The store's own localised figures replace
 * them once the products exist in App Store Connect and Play, which is also
 * the only place the real currency is known.
 */
import type { Period } from './store';
import type { TierPrices } from './live-prices';

/**
 * A paid tier. `free` is not here because nothing about it is priced.
 *
 * Spelled as the database spells it. `plan_kind` is a Postgres enum and
 * every other value maps 1:1 from this union to that enum, so a camelCase
 * `proPlus` here would need a translation at the boundary — and the one
 * place it was forgotten would be a webhook writing a plan Postgres rejects.
 */
export type Tier = 'pro' | 'pro_plus';

/** Whole cents, so no float ever reaches a price or a percentage. */
export type Prices = Record<Period, number>;

export const PRICES: Record<Tier, Prices> = {
  pro: { month: 699, year: 3999 },
  pro_plus: { month: 1299, year: 9999 },
};

/** The store product each tier and period maps to. */
export const PRODUCT_ID: Record<Tier, Record<Period, string>> = {
  pro: { month: 'pro_monthly', year: 'pro_yearly' },
  pro_plus: { month: 'proplus_monthly', year: 'proplus_yearly' },
};

/**
 * Tiers a person can actually buy today.
 *
 * Pro+ is priced and built into the model but **not sold**: bulk card
 * scanning, smart lists, bulk email to a segment and LinkedIn enrichment are
 * what it is for, and none of them exist yet (see `Capability` in
 * src/policy/entitlements.ts, where all four answer false). Selling a tier
 * for features that are not there is the Weekly recap mistake at $12.99 a
 * month — a Pro buyer got nothing for that bullet, and it had to be taken
 * off the card (BUILD-REVIEW.md § 2.56).
 *
 * Add 'pro_plus' here the day the first of those features ships, and the card
 * stops saying "coming soon" on its own.
 */
export const FOR_SALE: readonly Tier[] = ['pro'];

export const isForSale = (tier: Tier): boolean => FOR_SALE.includes(tier);

/** "$6.99" — whole cents to the two-decimal form the cards show. */
export function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * The table above as money, for a store that has not answered: on the web,
 * before the products exist, or with the network down. US dollars, because
 * that is the currency these figures were typed in — see
 * `./live-prices.ts` for why a wrong currency is worse than a stale one,
 * and why the live pair replaces both of these or neither.
 */
export function fallbackPrices(tier: Tier): TierPrices {
  return {
    month: { minor: PRICES[tier].month, currency: 'USD' },
    year: { minor: PRICES[tier].year, currency: 'USD' },
  };
}

/** What a year costs per month, which is how the cards compare the two. */
export function perMonth(tier: Tier, period: Period): string {
  const cents = PRICES[tier][period];
  return money(period === 'year' ? Math.round(cents / 12) : cents);
}

/** What the year is billed as, in one payment. */
export const yearlyTotal = (tier: Tier): string => money(PRICES[tier].year);

/**
 * How much the annual plan saves against paying monthly, as a whole percent.
 *
 * **Rounded down, always.** 35.85% shows as 35, not 36. A tenth of a point
 * of generosity is worth nothing; a claim that rounds up is a discount the
 * buyer did not get, and that is the kind of number a regulator reads
 * literally.
 */
export function savingsPercent(tier: Tier): number {
  const { month, year } = PRICES[tier];
  return Math.floor((1 - year / (month * 12)) * 100);
}
