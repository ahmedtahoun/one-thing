/**
 * What a store notification means, with nothing in it that talks to a store.
 *
 * The two webhooks (`app-store/`, `play-rtdn/`) verify a payload and hand the
 * decoded shape to this file; everything that decides what a notification
 * *means* lives here, so it can be tested exhaustively without a store
 * account, a certificate or a network (store-contract.test.ts).
 *
 * DATA_MODEL § Integrations fixes the products: StoreKit 2 `pro_monthly`
 * $4.99 and `pro_yearly` $35.88 with a 7-day introductory offer; Play Billing
 * monthly and yearly base plans with a 7-day free-trial offer; and three
 * consumable tips. § Entities → Subscription fixes the row this produces.
 *
 * The rule the whole file follows: **never guess**. A notification type we do
 * not know, a product we do not sell, a payload with no account on it — all
 * come back as `ignored` with a reason, and the webhook records them rather
 * than writing a subscription nobody bought.
 */

// --------------------------------------------------------------- our rows ----

/** `store_kind`, `sub_period`, `sub_status`, `plan_kind` from 0001_init.sql. */
export type StoreKind = 'app_store' | 'play';
export type Period = 'monthly' | 'yearly';
export type Status = 'trial' | 'active' | 'grace' | 'cancelled' | 'refunded' | 'expired';
export type Plan = 'free' | 'trial' | 'pro' | 'lapsed';
export type TipProduct = 'tip_small' | 'tip_regular' | 'tip_large';

/** A subscription row to write, as the webhook will send it to the database. */
export type SubscriptionEvent = {
  kind: 'subscription';
  store: StoreKind;
  /** Our own user id, which the client sent to the store at purchase time. */
  userId: string;
  productId: string;
  period: Period;
  status: Status;
  startedAt: string;
  renewsAt: string | null;
  endsAt: string | null;
  /** The store's stable id for this subscription, for idempotency. */
  originalTransactionId: string;
};

export type TipEvent = {
  kind: 'tip';
  store: StoreKind;
  userId: string;
  productId: TipProduct;
  at: string;
  /** One row per purchase, so the same transaction cannot be counted twice. */
  transactionId: string;
};

/** Everything else: recorded, acted on by nobody. */
export type IgnoredEvent = { kind: 'ignored'; why: string };

export type StoreEvent = SubscriptionEvent | TipEvent | IgnoredEvent;

const ignore = (why: string): IgnoredEvent => ({ kind: 'ignored', why });

// -------------------------------------------------------------- products ----

/** The subscription products we sell, and the period each one bills on. */
export const SUBSCRIPTION_PERIODS: Record<string, Period> = {
  pro_monthly: 'monthly',
  pro_yearly: 'yearly',
  // Play's base plan ids, under one subscription product.
  monthly: 'monthly',
  yearly: 'yearly',
};

export const TIP_PRODUCTS: readonly TipProduct[] = ['tip_small', 'tip_regular', 'tip_large'];

/**
 * The period a purchase bills on, or null when we do not sell it.
 *
 * Apple names the product itself (`pro_yearly`); Play names a base plan
 * (`yearly`) inside one subscription product, so the base plan is checked
 * first and the product id is the fallback.
 */
export function periodOf(productId: string, basePlanId?: string | null): Period | null {
  return SUBSCRIPTION_PERIODS[basePlanId ?? ''] ?? SUBSCRIPTION_PERIODS[productId] ?? null;
}

export function tipProductOf(productId: string): TipProduct | null {
  return TIP_PRODUCTS.includes(productId as TipProduct) ? (productId as TipProduct) : null;
}

// ------------------------------------------------------------------ plan ----

/**
 * The access a status buys, which is the only thing the app reads
 * (`src/policy/entitlements.ts` → `isPro`).
 *
 * `cancelled` and `grace` both still have access: turning auto-renew off does
 * not end a paid period, and a billing problem inside the grace window has
 * not ended it either. Both are `pro` until `ends_at` has passed, which is
 * why this takes `now` — if the store's `EXPIRED` notification never arrives,
 * the date still moves them off Pro the next time anything writes the row.
 *
 * `refunded` is `lapsed` rather than `free`: they did pay once, and the
 * difference matters to the admin panel's Subscriptions screen. Neither grants
 * access.
 */
export function planFor(status: Status, endsAt: string | null, now: Date): Plan {
  const over = endsAt !== null && new Date(endsAt).getTime() <= now.getTime();
  switch (status) {
    case 'trial':
      return over ? 'lapsed' : 'trial';
    case 'active':
      return over ? 'lapsed' : 'pro';
    case 'grace':
    case 'cancelled':
      return over ? 'lapsed' : 'pro';
    case 'refunded':
    case 'expired':
      return 'lapsed';
  }
}

// ----------------------------------------------------------------- Apple ----

/**
 * Apple's `notificationType` and `subtype`, as
 * `@apple/app-store-server-library` spells them. Kept as plain strings so
 * this file loads without the library (and its `node:crypto`); a test asserts
 * the two lists stay identical.
 */
export type AppleNotificationType =
  | 'SUBSCRIBED' | 'DID_CHANGE_RENEWAL_PREF' | 'DID_CHANGE_RENEWAL_STATUS' | 'OFFER_REDEEMED'
  | 'DID_RENEW' | 'EXPIRED' | 'DID_FAIL_TO_RENEW' | 'GRACE_PERIOD_EXPIRED' | 'PRICE_INCREASE'
  | 'REFUND' | 'REFUND_DECLINED' | 'CONSUMPTION_REQUEST' | 'RENEWAL_EXTENDED' | 'REVOKE'
  | 'TEST' | 'RENEWAL_EXTENSION' | 'REFUND_REVERSED' | 'EXTERNAL_PURCHASE_TOKEN'
  | 'ONE_TIME_CHARGE' | 'RESCIND_CONSENT' | 'METADATA_UPDATE' | 'MIGRATION' | 'PRICE_CHANGE';

export type AppleSubtype =
  | 'INITIAL_BUY' | 'RESUBSCRIBE' | 'DOWNGRADE' | 'UPGRADE' | 'AUTO_RENEW_ENABLED'
  | 'AUTO_RENEW_DISABLED' | 'VOLUNTARY' | 'BILLING_RETRY' | 'PRICE_INCREASE' | 'GRACE_PERIOD'
  | 'PENDING' | 'ACCEPTED' | 'BILLING_RECOVERY' | 'PRODUCT_NOT_FOR_SALE' | 'SUMMARY'
  | 'FAILURE' | 'UNREPORTED';

/** The fields this file reads from a verified App Store notification. */
export type AppleNotification = {
  notificationType: string;
  subtype?: string;
  notificationUUID?: string;
};

/** The fields it reads from the notification's signed transaction. */
export type AppleTransaction = {
  originalTransactionId?: string;
  transactionId?: string;
  productId?: string;
  /** The UUID the app sent at purchase: our own user id. */
  appAccountToken?: string;
  purchaseDate?: number;
  originalPurchaseDate?: number;
  expiresDate?: number;
  revocationDate?: number;
  /** 1 is Apple's introductory offer, which is how the 7-day trial ships. */
  offerType?: number;
  offerDiscountType?: string;
  type?: string;
};

/** And from the signed renewal info, when there is one. */
export type AppleRenewal = {
  autoRenewStatus?: number;
  gracePeriodExpiresDate?: number;
  autoRenewProductId?: string;
};

const iso = (ms: number | undefined | null): string | null =>
  ms === undefined || ms === null ? null : new Date(ms).toISOString();

/** Whether this transaction is running on the 7-day free trial. */
function onTrial(tx: AppleTransaction): boolean {
  // `offerDiscountType` is the newer, explicit field; `offerType === 1`
  // (introductory) is what older notifications carry.
  if (tx.offerDiscountType) return tx.offerDiscountType === 'FREE_TRIAL';
  return tx.offerType === 1;
}

/**
 * One verified App Store Server Notification V2 as a row to write, a tip, or
 * a reason it was ignored.
 */
export function readAppleNotification(
  notification: AppleNotification,
  transaction: AppleTransaction | null,
  renewal: AppleRenewal | null,
  now: Date
): StoreEvent {
  const type = notification.notificationType as AppleNotificationType;
  const subtype = notification.subtype as AppleSubtype | undefined;

  if (!transaction) return ignore(`${type}: no transaction`);
  const userId = transaction.appAccountToken;
  // Without the token there is no way to know whose purchase this is, and
  // guessing from an email or a receipt is not a thing we will do. The client
  // must set it (src/features/paywall/purchases.ts).
  if (!userId) return ignore(`${type}: no appAccountToken`);
  const productId = transaction.productId;
  if (!productId) return ignore(`${type}: no productId`);

  if (type === 'ONE_TIME_CHARGE') {
    const tip = tipProductOf(productId);
    if (!tip) return ignore(`ONE_TIME_CHARGE: ${productId} is not a tip`);
    return {
      kind: 'tip',
      store: 'app_store',
      userId,
      productId: tip,
      at: iso(transaction.purchaseDate) ?? now.toISOString(),
      transactionId: transaction.transactionId ?? transaction.originalTransactionId ?? '',
    };
  }

  const status = appleStatus(type, subtype, transaction);
  if (status === null) return ignore(`${type}${subtype ? ` / ${subtype}` : ''}: nothing to change`);

  const period = periodOf(productId);
  if (!period) return ignore(`${type}: ${productId} is not a subscription we sell`);

  const originalTransactionId = transaction.originalTransactionId;
  if (!originalTransactionId) return ignore(`${type}: no originalTransactionId`);

  // A grace period runs past the paid period, so while one is open it is the
  // date access really ends.
  const grace = iso(renewal?.gracePeriodExpiresDate);
  const expires = iso(transaction.expiresDate);
  const endsAt = status === 'grace' && grace ? grace : expires;

  return {
    kind: 'subscription',
    store: 'app_store',
    userId,
    productId,
    period,
    status,
    startedAt: iso(transaction.originalPurchaseDate) ?? iso(transaction.purchaseDate) ?? now.toISOString(),
    // Only a subscription that is going to renew has a renewal date.
    renewsAt: status === 'active' || status === 'trial' ? expires : null,
    endsAt,
    originalTransactionId,
  };
}

/** Apple's taxonomy, narrowed to the six statuses `sub_status` allows. */
function appleStatus(
  type: AppleNotificationType,
  subtype: AppleSubtype | undefined,
  tx: AppleTransaction
): Status | null {
  switch (type) {
    case 'SUBSCRIBED':
    case 'OFFER_REDEEMED':
      return onTrial(tx) ? 'trial' : 'active';
    case 'DID_RENEW':
      // A renewal after a billing problem is a recovery; either way it is paid
      // and running, and a renewal is never still on the introductory offer.
      return 'active';
    case 'DID_CHANGE_RENEWAL_PREF':
      // An upgrade or downgrade: same subscription, different product. The
      // product id on the transaction is already the new one.
      return onTrial(tx) ? 'trial' : 'active';
    case 'DID_CHANGE_RENEWAL_STATUS':
      // Turning auto-renew off does not end the paid period — `planFor` keeps
      // access until `ends_at`.
      if (subtype === 'AUTO_RENEW_DISABLED') return 'cancelled';
      if (subtype === 'AUTO_RENEW_ENABLED') return onTrial(tx) ? 'trial' : 'active';
      return null;
    case 'DID_FAIL_TO_RENEW':
      // With a grace period they still have access; without one, billing
      // retry happens with the subscription already expired.
      return subtype === 'GRACE_PERIOD' ? 'grace' : 'expired';
    case 'EXPIRED':
    case 'GRACE_PERIOD_EXPIRED':
      return 'expired';
    case 'REFUND':
      return 'refunded';
    case 'REFUND_REVERSED':
      // Apple took the refund back, so the subscription stands again.
      return 'active';
    case 'REVOKE':
      // Family Sharing access withdrawn: not a refund, but it is over.
      return 'expired';
    // Everything below tells us something we do not store: a price change the
    // user has or has not agreed to, a refund request, Apple extending a
    // renewal date it will also send DID_RENEW for, a test ping. Recorded by
    // the webhook, acted on by nobody.
    case 'PRICE_INCREASE':
    case 'PRICE_CHANGE':
    case 'REFUND_DECLINED':
    case 'CONSUMPTION_REQUEST':
    case 'RENEWAL_EXTENDED':
    case 'RENEWAL_EXTENSION':
    case 'METADATA_UPDATE':
    case 'MIGRATION':
    case 'RESCIND_CONSENT':
    case 'EXTERNAL_PURCHASE_TOKEN':
    case 'TEST':
      return null;
    default:
      // A type Apple added after this was written. Recorded, not guessed at.
      return null;
  }
}

// ------------------------------------------------------------------ Play ----

/** Google's `subscriptionNotification.notificationType` numbers. */
export const PLAY_NOTIFICATION = {
  1: 'RECOVERED',
  2: 'RENEWED',
  3: 'CANCELED',
  4: 'PURCHASED',
  5: 'ON_HOLD',
  6: 'IN_GRACE_PERIOD',
  7: 'RESTARTED',
  8: 'PRICE_CHANGE_CONFIRMED',
  9: 'DEFERRED',
  10: 'PAUSED',
  11: 'PAUSE_SCHEDULE_CHANGED',
  12: 'REVOKED',
  13: 'EXPIRED',
  20: 'PENDING_PURCHASE_CANCELED',
} as const;

/** The decoded body of a Play RTDN Pub/Sub message. */
export type PlayNotification = {
  packageName?: string;
  eventTimeMillis?: string;
  subscriptionNotification?: { notificationType?: number; purchaseToken?: string; subscriptionId?: string };
  oneTimeProductNotification?: { notificationType?: number; purchaseToken?: string; sku?: string };
  voidedPurchaseNotification?: { purchaseToken?: string; orderId?: string; productType?: number; refundType?: number };
  testNotification?: { version?: string };
};

/** What a Play notification asks us to go and look up. */
export type PlayLookup =
  | { kind: 'subscription'; purchaseToken: string; subscriptionId: string; notification: string }
  | { kind: 'one-time'; purchaseToken: string; sku: string }
  | { kind: 'voided'; purchaseToken: string }
  | IgnoredEvent;

/**
 * Play's notification carries no state — only "something happened to this
 * token" — so this says what to look up, and `readPlaySubscription` reads the
 * answer. That is Google's design, not a choice: the API is the only
 * authority on what a purchase is worth.
 */
export function readPlayNotification(message: PlayNotification): PlayLookup {
  if (message.testNotification) return ignore('Play test notification');

  const sub = message.subscriptionNotification;
  if (sub) {
    const name = PLAY_NOTIFICATION[sub.notificationType as keyof typeof PLAY_NOTIFICATION];
    if (!sub.purchaseToken || !sub.subscriptionId) return ignore('subscription notification without a token');
    // Nothing has been bought yet, so there is nothing to write.
    if (name === 'PENDING_PURCHASE_CANCELED' || name === 'DEFERRED' || name === 'PRICE_CHANGE_CONFIRMED' || name === 'PAUSE_SCHEDULE_CHANGED') {
      return ignore(`Play ${name}: nothing to change`);
    }
    return {
      kind: 'subscription',
      purchaseToken: sub.purchaseToken,
      subscriptionId: sub.subscriptionId,
      notification: name ?? `type ${sub.notificationType}`,
    };
  }

  const voided = message.voidedPurchaseNotification;
  if (voided?.purchaseToken) return { kind: 'voided', purchaseToken: voided.purchaseToken };

  const once = message.oneTimeProductNotification;
  // 1 is ONE_TIME_PRODUCT_PURCHASED; 2 is CANCELED, which never granted
  // anything.
  if (once?.purchaseToken && once.sku && once.notificationType === 1) {
    return { kind: 'one-time', purchaseToken: once.purchaseToken, sku: once.sku };
  }

  return ignore('nothing we act on');
}

/** The part of `purchases.subscriptionsv2.get` this file reads. */
export type PlaySubscriptionState = {
  subscriptionState?: string;
  externalAccountIdentifiers?: { obfuscatedExternalAccountId?: string };
  startTime?: string;
  lineItems?: {
    productId?: string;
    expiryTime?: string;
    autoRenewingPlan?: { autoRenewEnabled?: boolean };
    offerDetails?: { basePlanId?: string; offerId?: string };
  }[];
};

/**
 * The authoritative state of a Play subscription as a row to write.
 *
 * Google has no "in trial" state. The 7-day free trial is an *offer* on the
 * base plan (DATA_MODEL § Integrations), and it is the only offer these base
 * plans carry, so an `offerId` on the current line item is what a trial looks
 * like. If a second offer is ever configured, this is the line to revisit.
 */
export function readPlaySubscription(
  state: PlaySubscriptionState,
  subscriptionId: string,
  purchaseToken: string,
  now: Date
): StoreEvent {
  const userId = state.externalAccountIdentifiers?.obfuscatedExternalAccountId;
  if (!userId) return ignore('Play subscription with no obfuscatedExternalAccountId');

  const line = state.lineItems?.[0];
  if (!line) return ignore('Play subscription with no line items');
  const period = periodOf(line.productId ?? subscriptionId, line.offerDetails?.basePlanId);
  if (!period) return ignore(`Play base plan ${line.offerDetails?.basePlanId ?? line.productId} is not one we sell`);

  const status = playStatus(state.subscriptionState, Boolean(line.offerDetails?.offerId));
  if (status === null) return ignore(`Play ${state.subscriptionState ?? 'state missing'}: nothing to change`);

  const endsAt = line.expiryTime ?? null;
  return {
    kind: 'subscription',
    store: 'play',
    userId,
    productId: line.productId ?? subscriptionId,
    period,
    status,
    startedAt: state.startTime ?? now.toISOString(),
    renewsAt: status === 'active' || status === 'trial' ? endsAt : null,
    endsAt,
    // Play's stable handle for the subscription is the purchase token.
    originalTransactionId: purchaseToken,
  };
}

function playStatus(state: string | undefined, hasOffer: boolean): Status | null {
  switch (state) {
    case 'SUBSCRIPTION_STATE_ACTIVE':
      return hasOffer ? 'trial' : 'active';
    case 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD':
      return 'grace';
    case 'SUBSCRIPTION_STATE_CANCELED':
      // Cancelled but not yet expired: access runs to `expiryTime`.
      return 'cancelled';
    case 'SUBSCRIPTION_STATE_ON_HOLD':
    case 'SUBSCRIPTION_STATE_PAUSED':
      // Both mean no access right now, and both can come back — the next
      // notification says so.
      return 'expired';
    case 'SUBSCRIPTION_STATE_EXPIRED':
      return 'expired';
    case 'SUBSCRIPTION_STATE_PENDING':
    case 'SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED':
      // Never paid for, so never granted.
      return null;
    default:
      return null;
  }
}

/** A refund or chargeback Google reports through the voided-purchase feed. */
export function voidedPlayPurchase(state: PlaySubscriptionState, subscriptionId: string, purchaseToken: string, now: Date): StoreEvent {
  const event = readPlaySubscription(state, subscriptionId, purchaseToken, now);
  if (event.kind !== 'subscription') return event;
  return { ...event, status: 'refunded', renewsAt: null };
}
