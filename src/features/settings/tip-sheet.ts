/**
 * The tip jar's arithmetic: which price to show, how many cups, and what
 * that comes to.
 *
 * Two things were wrong with the sheet before this (BUILD-REVIEW §2.100).
 * It showed `$0.99` to everybody — a hand-typed constant whose own comment
 * said the store's localised price would replace it "once the in-app
 * purchase is wired in", which it then was, and did not. A buyer in Riyadh
 * read dollars and was charged riyals. And a cup was all anyone could buy
 * at once, which the owner asked to change.
 *
 * `canCount` is the part to read twice. StoreKit takes a quantity on the
 * purchase request; Play's `RequestPurchaseAndroidProps` has no such field,
 * because multi-quantity there is a Play Console setting that puts a
 * stepper inside Google's own sheet. A counter on Android would say three
 * and charge for one, so there is no counter on Android.
 */
import type { Money } from '@/features/paywall/live-prices';

/** DATA_MODEL § Integrations, and what the US storefront charges. */
export const TIP_FALLBACK: readonly Money[] = [
  { minor: 99, currency: 'USD' },
  { minor: 299, currency: 'USD' },
  { minor: 499, currency: 'USD' },
];

/**
 * Ten cups. High enough that nobody generous is stopped by it, low enough
 * that a slipped finger on the stepper is not a forty-dollar surprise.
 */
export const MAX_CUPS = 10;

/** Whether this platform can honour a quantity. iOS can; Play cannot. */
export const canCount = (platform: string): boolean => platform === 'ios';

/** The store's price for a tier when it gave one, the typed table otherwise. */
export function tipPrice(size: number, fromStore: Partial<Record<string, Money>>, ids: readonly string[]): Money {
  const id = ids[size];
  const live = id ? fromStore[id] : undefined;
  return live ?? TIP_FALLBACK[size] ?? TIP_FALLBACK[0]!;
}

/** Whether every tier came back from the store, which is what lets the sheet trust them. */
export const allLive = (fromStore: Partial<Record<string, Money>>, ids: readonly string[]): boolean =>
  ids.length > 0 && ids.every((id) => Boolean(fromStore[id]));

/** Keeps the counter between one and ten, whole. */
export const clampCups = (n: number): number => Math.min(MAX_CUPS, Math.max(1, Math.trunc(Number.isFinite(n) ? n : 1)));

/** What the button charges: the tier's price, that many times. */
export const totalOf = (price: Money, cups: number): Money => ({
  minor: price.minor * clampCups(cups),
  currency: price.currency,
});
