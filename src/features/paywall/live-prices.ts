/**
 * What the store actually charges, in the buyer's own currency.
 *
 * The cards used to render `PRICES` — a table of US cents typed by hand —
 * through a `money()` that prefixed a dollar sign. So a buyer in Riyadh was
 * shown **$6.99** and charged a SAR tier, which is wrong twice: Apple
 * compares the figure on the screen with the product (Guideline 3.1.2), and
 * a price in the wrong currency is a refund queue even if nobody rejects
 * it. `plans.ts` said the store's figures "replace" these; nothing did.
 *
 * Now they do. `fetchProducts` was already being called before a purchase —
 * StoreKit will not sell a product it has not loaded — so the amounts were
 * arriving and being thrown away. These functions read them.
 *
 * **Live or fallback, never a mixture.** If only one of the two periods
 * comes back, the whole tier stays on the fallback. Mixing them would put a
 * live SAR year beside a hand-typed USD month and compute a saving between
 * the two, which is a number nobody should be shown — and the one a
 * regulator reads literally.
 *
 * Pure, so every shape the two stores return is tested in Node. Binding to
 * expo-iap is `./purchases.ts`.
 */
import type { Period } from './store';

/** An amount in the smallest unit of its own currency, with that currency. */
export type Money = { minor: number; currency: string };

export type TierPrices = { month: Money; year: Money };

/** How many minor units make one major one. Most currencies are 100. */
const MINOR: Record<string, number> = { BHD: 1000, IQD: 1000, JOD: 1000, KWD: 1000, OMR: 1000, TND: 1000, JPY: 1, KRW: 1 };

export const minorUnits = (currency: string): number => MINOR[currency.toUpperCase()] ?? 100;

/**
 * `Intl` is in Hermes with full ICU, and it is the only thing that knows
 * that SAR reads "ر.س. ٦٫٩٩" in Arabic and "SAR 6.99" in English. A
 * hand-rolled `$${n}` cannot be right for more than one country.
 */
export function formatMoney(money: Money, locale: string): string {
  const divisor = minorUnits(money.currency);
  // Latin digits in Arabic too, pinned rather than left to the locale.
  // Everything computed in this app reads `3`, not `٣`, and the paywall
  // becoming the one screen that disagrees would be an accident, not a
  // decision — the decision is still open (RELEASE.md, item 10).
  const tag = locale.includes('-u-') ? locale : `${locale}-u-nu-latn`;
  const digits = divisor === 1 ? 0 : divisor === 1000 ? 3 : 2;
  try {
    return new Intl.NumberFormat(tag, {
      style: 'currency',
      currency: money.currency,
      // "$6.99", not "US$6.99", which is what `ar` disambiguates to.
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(money.minor / divisor);
  } catch {
    // An unknown currency code must not take the paywall down with it.
    return `${money.currency} ${(money.minor / divisor).toFixed(digits)}`;
  }
}

/** A year's price expressed per month, rounded to the nearest minor unit. */
export const perMonthOf = (prices: TierPrices, period: Period): Money =>
  period === 'year' ? { minor: Math.round(prices.year.minor / 12), currency: prices.year.currency } : prices.month;

/**
 * What the year saves against twelve months, as a whole percent, **rounded
 * down**: 35.85% shows as 35. A claim that rounds up is a discount the
 * buyer did not get. Null when the two are not in the same currency, which
 * should be impossible and would be a lie if it happened.
 */
export function savingsOf(prices: TierPrices): number | null {
  if (prices.month.currency !== prices.year.currency) return null;
  if (prices.month.minor <= 0) return null;
  return Math.floor((1 - prices.year.minor / (prices.month.minor * 12)) * 100);
}

type AppleProduct = { id?: unknown; price?: unknown; displayPrice?: unknown; currency?: unknown };

/** StoreKit gives a major-unit number and a currency code per product. */
export function applePrices(products: unknown, ids: Record<Period, string>): Partial<Record<Period, Money>> {
  const list = Array.isArray(products) ? (products as AppleProduct[]) : [];
  const out: Partial<Record<Period, Money>> = {};
  for (const period of ['month', 'year'] as Period[]) {
    const found = list.find((p) => typeof p?.id === 'string' && p.id === ids[period]);
    const amount = typeof found?.price === 'number' ? found.price : Number(found?.price);
    const currency = typeof found?.currency === 'string' ? found.currency : '';
    if (!found || !currency || !Number.isFinite(amount) || amount <= 0) continue;
    out[period] = { minor: Math.round(amount * minorUnits(currency)), currency };
  }
  return out;
}

/**
 * The same reading for a one-off product, keyed by its id.
 *
 * Subscriptions need two readers because Play wraps them in base plans and
 * pricing phases; a consumable has none of that. Both stores hand back
 * `{ id, price, currency }` with the price in major units, so the tips
 * — which exist on both — are read once here (BUILD-REVIEW §2.100).
 */
export function inAppPrices<Id extends string>(products: unknown, ids: readonly Id[]): Partial<Record<Id, Money>> {
  const list = Array.isArray(products) ? (products as AppleProduct[]) : [];
  const out: Partial<Record<Id, Money>> = {};
  for (const id of ids) {
    const found = list.find((p) => typeof p?.id === 'string' && p.id === id);
    const amount = typeof found?.price === 'number' ? found.price : Number(found?.price);
    const currency = typeof found?.currency === 'string' ? found.currency : '';
    if (!found || !currency || !Number.isFinite(amount) || amount <= 0) continue;
    out[id] = { minor: Math.round(amount * minorUnits(currency)), currency };
  }
  return out;
}

/** n of them: what the counter on the tip sheet charges. */
export const times = (money: Money, n: number): Money => ({ minor: money.minor * n, currency: money.currency });

type Phase = { priceAmountMicros?: unknown; priceCurrencyCode?: unknown };
type PlayOffer = {
  basePlanIdAndroid?: unknown;
  pricingPhasesAndroid?: { pricingPhaseList?: Phase[] } | null;
};

/**
 * Play sells one subscription with a base plan per period, and each base
 * plan is a *list* of pricing phases: an introductory or free phase can
 * come first, and the recurring price is the last one. Reading phase zero
 * would advertise a free trial as the price forever.
 */
export function playPrices(products: unknown, subscriptionId: string, basePlans: Record<Period, string>): Partial<Record<Period, Money>> {
  const list = Array.isArray(products) ? (products as { id?: unknown; subscriptionOffers?: PlayOffer[] }[]) : [];
  const offers = list.find((p) => p?.id === subscriptionId)?.subscriptionOffers ?? [];
  const out: Partial<Record<Period, Money>> = {};

  for (const period of ['month', 'year'] as Period[]) {
    const offer = offers.find((o) => o?.basePlanIdAndroid === basePlans[period]);
    const phases = offer?.pricingPhasesAndroid?.pricingPhaseList ?? [];
    const paid = [...phases].reverse().find((p) => Number(p?.priceAmountMicros) > 0);
    const micros = Number(paid?.priceAmountMicros);
    const currency = typeof paid?.priceCurrencyCode === 'string' ? paid.priceCurrencyCode : '';
    if (!currency || !Number.isFinite(micros) || micros <= 0) continue;
    out[period] = { minor: Math.round((micros / 1_000_000) * minorUnits(currency)), currency };
  }
  return out;
}

/**
 * The prices to show: the store's when it gave both periods in one
 * currency, the hand-typed table otherwise. `live` is what the screen uses
 * to decide whether it may state a saving at all.
 */
export function resolvePrices(fallback: TierPrices, fromStore: Partial<Record<Period, Money>>): { prices: TierPrices; live: boolean } {
  const { month, year } = fromStore;
  if (!month || !year || month.currency !== year.currency) return { prices: fallback, live: false };
  return { prices: { month, year }, live: true };
}
