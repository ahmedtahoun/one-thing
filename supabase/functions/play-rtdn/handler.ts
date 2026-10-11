/**
 * What `play-rtdn` does with a Pub/Sub push, with nothing in it that talks to
 * Google or to Postgres (handler.test.ts).
 *
 * Google's notification says only "something happened to this purchase
 * token" — no state, no account, no expiry. So every one of them costs a
 * lookup against the Play Developer API, which is the only authority on what
 * a purchase is currently worth. That is Google's design, not a choice here.
 *
 * Pub/Sub retries anything that is not 2xx for as long as the subscription's
 * retention allows, so, as with Apple, a notification we understood answers
 * 200 even when we decide not to act on it, and only a failed lookup or write
 * answers 500.
 */
import {
  planFor,
  readPlayNotification,
  readPlaySubscription,
  tipProductOf,
  voidedPlayPurchase,
  type PlayNotification,
  type PlaySubscriptionState,
  type StoreEvent,
} from '../_shared/store-contract.ts';
import type { Recorder } from '../app-store/handler.ts';

/** What a one-time purchase looks like from `purchases.products.get`. */
export type PlayProductPurchase = {
  obfuscatedExternalAccountId?: string;
  purchaseTimeMillis?: string;
  orderId?: string;
  purchaseState?: number;
};

export type Deps = {
  /** `purchases.subscriptionsv2.get`. */
  subscription(purchaseToken: string): Promise<PlaySubscriptionState>;
  /** `purchases.products.get`, for the tips. */
  product(productId: string, purchaseToken: string): Promise<PlayProductPurchase>;
  record: Recorder;
  now(): Date;
};

export type Reply = { status: number; body: { ok?: true; seen?: true; ignored?: string; error?: string } };

/** The Pub/Sub push envelope. */
type Push = { message?: { data?: unknown; messageId?: unknown; publishTime?: unknown } };

function decode(data: string): PlayNotification | null {
  try {
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(data), (c) => c.charCodeAt(0)))) as PlayNotification;
  } catch {
    return null;
  }
}

export async function handlePlay(body: unknown, deps: Deps): Promise<Reply> {
  const message = (body as Push | null)?.message;
  const data = message?.data;
  const messageId = message?.messageId;
  // The message id is what makes a redelivery a no-op, and Pub/Sub always
  // sends one.
  if (typeof data !== 'string' || typeof messageId !== 'string') return { status: 400, body: { error: 'bad_request' } };

  const notification = decode(data);
  if (!notification) return { status: 400, body: { error: 'bad_request' } };

  const lookup = readPlayNotification(notification);
  const type =
    lookup.kind === 'subscription' ? `Play ${lookup.notification}`
    : lookup.kind === 'voided' ? 'Play VOIDED_PURCHASE'
    : lookup.kind === 'one-time' ? 'Play ONE_TIME_PRODUCT_PURCHASED'
    : 'Play notification';

  try {
    if (lookup.kind === 'ignored') {
      await deps.record.notice(messageId, type, 'ignored', lookup.why);
      return { status: 200, body: { ignored: lookup.why } };
    }

    if (lookup.kind === 'one-time') {
      const tip = tipProductOf(lookup.sku);
      if (!tip) {
        const why = `${lookup.sku} is not a tip`;
        await deps.record.notice(messageId, type, 'ignored', why);
        return { status: 200, body: { ignored: why } };
      }
      const purchase = await deps.product(lookup.sku, lookup.purchaseToken);
      // 0 is PURCHASED; 1 is CANCELED and 2 is PENDING, neither of which paid.
      if (purchase.purchaseState !== 0 || !purchase.obfuscatedExternalAccountId) {
        const why = purchase.obfuscatedExternalAccountId
          ? `purchase state ${purchase.purchaseState}`
          : 'one-time purchase with no obfuscatedExternalAccountId';
        await deps.record.notice(messageId, type, 'ignored', why);
        return { status: 200, body: { ignored: why } };
      }
      const fresh = await deps.record.tip(messageId, type, {
        kind: 'tip',
        store: 'play',
        userId: purchase.obfuscatedExternalAccountId,
        productId: tip,
        at: purchase.purchaseTimeMillis
          ? new Date(Number(purchase.purchaseTimeMillis)).toISOString()
          : deps.now().toISOString(),
        // Google's own handle on the purchase, so two notifications about one
        // tip cannot become two tips.
        transactionId: purchase.orderId ?? lookup.purchaseToken,
      });
      return { status: 200, body: fresh ? { ok: true } : { seen: true } };
    }

    // Both remaining cases need the subscription's current state. A voided
    // purchase is the same subscription with the refund applied.
    const state = await deps.subscription(lookup.purchaseToken);
    const subscriptionId = lookup.kind === 'subscription' ? lookup.subscriptionId : '';
    const event: StoreEvent =
      lookup.kind === 'voided'
        ? voidedPlayPurchase(state, subscriptionId, lookup.purchaseToken, deps.now())
        : readPlaySubscription(state, subscriptionId, lookup.purchaseToken, deps.now());

    if (event.kind !== 'subscription') {
      const why = event.kind === 'ignored' ? event.why : 'not a subscription';
      await deps.record.notice(messageId, type, 'ignored', why);
      return { status: 200, body: { ignored: why } };
    }

    const plan = planFor(event.status, event.endsAt, deps.now());
    const fresh = await deps.record.subscription(messageId, type, event, plan);
    return { status: 200, body: fresh ? { ok: true } : { seen: true } };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error('[play-rtdn]', detail);
    await deps.record.notice(messageId, type, 'failed', detail).catch(() => {});
    // Pub/Sub will try again. A 200 here would lose a real purchase.
    return { status: 500, body: { error: 'write_failed' } };
  }
}
