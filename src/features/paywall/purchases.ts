/**
 * Starting the Pro trial — StoreKit 2 (`pro_yearly` / `pro_monthly` with the
 * 7-day introductory offer) and Play Billing (DATA_MODEL § Integrations).
 *
 * Neither store can be reached yet: there are no App Store Connect or Play
 * Console accounts, so no products to buy (BUILD-REVIEW.md §3). Until there
 * are, this answers "unavailable", the paywall changes nothing, and in
 * particular nobody becomes Pro. The prototype flips the plan to Pro and says
 * "Welcome to Pro 🎉"; that would be a purchase that never happened.
 * When the stores exist, the plan comes from the store's receipt through the
 * webhooks — supabase/functions/app-store and supabase/functions/play-rtdn,
 * which are written — and never from this call's return value. See the note
 * on `startTrial` for the one thing a purchase must carry.
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

/**
 * **Whoever implements this must send the Supabase user id to the store.**
 *
 * It is the one piece of a purchase that cannot be recovered afterwards. The
 * webhooks (supabase/functions/app-store, supabase/functions/play-rtdn) read
 * it to know whose purchase a notification is about, and they refuse to guess
 * from anything else — not an email, not a receipt. A purchase made without
 * it is money taken for a Pro account nobody gets, and the only trace is an
 * "ignored" row in `store_notification` saying the token was missing.
 *
 *   StoreKit 2   `Product.PurchaseOption.appAccountToken(uuid)` — must be a
 *                UUID, which a Supabase user id already is.
 *   Play Billing `setObfuscatedAccountId(userId)` on the BillingFlowParams.
 *
 * The id to send is the backend session's (`db.auth.getUser()`), not
 * `session.userId` from `src/lib/session.tsx`, which is a device-local
 * placeholder until the first sync (src/lib/sync/SyncProvider.tsx).
 */
export async function startTrial(_period: Period): Promise<TrialResult> {
  return 'unavailable';
}
