/**
 * Starting the Pro trial — StoreKit 2 (`pro_yearly` / `pro_monthly` with the
 * 7-day introductory offer) and Play Billing (DATA_MODEL § Integrations).
 *
 * Neither store can be reached yet: there are no App Store Connect or Play
 * Console accounts, so no products to buy (BUILD-REVIEW.md §3). Until there
 * are, this answers "unavailable", the paywall changes nothing, and in
 * particular nobody becomes Pro. The prototype flips the plan to Pro and says
 * "Welcome to Pro 🎉"; that would be a purchase that never happened.
 * When the stores exist, the plan comes from the store's receipt via the
 * backend (App Store Server Notifications / Play RTDN), not from this call's
 * return value.
 */
export type Period = 'year' | 'month';

/** The store product behind each plan card. */
export const PRODUCT: Record<Period, string> = { year: 'pro_yearly', month: 'pro_monthly' };

/**
 * The tip jar's three consumables, in the order the sheet shows them
 * (DATA_MODEL § Integrations: tip_small 0.99, tip_regular 2.99, tip_large 4.99).
 */
export const TIP_PRODUCTS = ['tip_small', 'tip_regular', 'tip_large'] as const;

export type TrialResult = 'started' | 'cancelled' | 'unavailable';

export async function startTrial(_period: Period): Promise<TrialResult> {
  return 'unavailable';
}
