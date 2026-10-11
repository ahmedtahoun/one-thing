/**
 * Every notification either store can send, and what it does to the
 * subscription row and the plan. Run with `npm test`.
 *
 * These are the tests that stand in for a store account: the webhooks
 * themselves cannot be exercised without Apple's certificates and Google's
 * service account, but what a notification *means* is decided here, and that
 * can be pinned exactly.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NotificationTypeV2 } from '@apple/app-store-server-library/dist/models/NotificationTypeV2.js';
import { Subtype } from '@apple/app-store-server-library/dist/models/Subtype.js';

import {
  periodOf,
  planFor,
  readAppleNotification,
  readPlayNotification,
  readPlaySubscription,
  tipProductOf,
  voidedPlayPurchase,
  type AppleNotificationType,
  type AppleSubtype,
  type AppleTransaction,
  type PlaySubscriptionState,
  type Status,
  type StoreEvent,
} from './store-contract';

const NOW = new Date('2026-10-11T09:00:00.000Z');
const USER = '11111111-1111-4111-8111-111111111111';
const ms = (iso: string) => new Date(iso).getTime();

const tx = (over: Partial<AppleTransaction> = {}): AppleTransaction => ({
  originalTransactionId: 'otx-1',
  transactionId: 'tx-1',
  productId: 'pro_yearly',
  appAccountToken: USER,
  originalPurchaseDate: ms('2026-10-01T09:00:00.000Z'),
  purchaseDate: ms('2026-10-01T09:00:00.000Z'),
  expiresDate: ms('2027-10-01T09:00:00.000Z'),
  ...over,
});

const apple = (type: string, subtype?: string, over: Partial<AppleTransaction> = {}, renewal = {}) =>
  readAppleNotification({ notificationType: type, subtype }, tx(over), renewal, NOW);

const sub = (event: StoreEvent) => {
  assert.equal(event.kind, 'subscription', `expected a subscription, got ${event.kind === 'ignored' ? event.why : event.kind}`);
  return event as Extract<StoreEvent, { kind: 'subscription' }>;
};

describe('the product list', () => {
  it('knows the two subscriptions and the three tips, and nothing else', () => {
    assert.equal(periodOf('pro_monthly'), 'monthly');
    assert.equal(periodOf('pro_yearly'), 'yearly');
    // Play names a base plan inside one product, and it wins over the product.
    assert.equal(periodOf('pro', 'yearly'), 'yearly');
    assert.equal(periodOf('pro', 'monthly'), 'monthly');
    assert.equal(periodOf('pro_lifetime'), null);
    assert.equal(tipProductOf('tip_regular'), 'tip_regular');
    assert.equal(tipProductOf('pro_yearly'), null);
  });
});

describe('what a status buys', () => {
  const future = '2027-01-01T00:00:00.000Z';
  const past = '2026-01-01T00:00:00.000Z';

  it('gives Pro to the three statuses that still have access', () => {
    assert.equal(planFor('active', future, NOW), 'pro');
    // Auto-renew off does not end a paid period.
    assert.equal(planFor('cancelled', future, NOW), 'pro');
    // Nor does a billing problem inside the grace window.
    assert.equal(planFor('grace', future, NOW), 'pro');
    assert.equal(planFor('trial', future, NOW), 'trial');
  });

  it('takes it away once the date has passed, even with no expiry notification', () => {
    assert.equal(planFor('active', past, NOW), 'lapsed');
    assert.equal(planFor('cancelled', past, NOW), 'lapsed');
    assert.equal(planFor('grace', past, NOW), 'lapsed');
    assert.equal(planFor('trial', past, NOW), 'lapsed');
  });

  it('never gives access to a refund or an expiry', () => {
    assert.equal(planFor('refunded', future, NOW), 'lapsed');
    assert.equal(planFor('expired', future, NOW), 'lapsed');
  });
});

describe('the App Store', () => {
  it('starts a trial on the introductory offer, and a paid run without it', () => {
    const trial = sub(apple('SUBSCRIBED', 'INITIAL_BUY', { offerDiscountType: 'FREE_TRIAL' }));
    assert.equal(trial.status, 'trial');
    assert.equal(trial.period, 'yearly');
    assert.equal(trial.userId, USER);
    assert.equal(trial.renewsAt, '2027-10-01T09:00:00.000Z');
    assert.equal(trial.originalTransactionId, 'otx-1');

    // Older notifications carry offerType 1 rather than the discount type.
    assert.equal(sub(apple('SUBSCRIBED', 'INITIAL_BUY', { offerType: 1 })).status, 'trial');
    assert.equal(sub(apple('SUBSCRIBED', 'RESUBSCRIBE')).status, 'active');
  });

  it('treats a renewal as paid, never as still on the trial', () => {
    // The offer fields can still be set on the renewing transaction.
    assert.equal(sub(apple('DID_RENEW', undefined, { offerType: 1 })).status, 'active');
    assert.equal(sub(apple('DID_RENEW', 'BILLING_RECOVERY')).status, 'active');
  });

  it('reads auto-renew being turned off as cancelled, not as over', () => {
    const off = sub(apple('DID_CHANGE_RENEWAL_STATUS', 'AUTO_RENEW_DISABLED'));
    assert.equal(off.status, 'cancelled');
    // No renewal date, but access runs to the end of what was paid for.
    assert.equal(off.renewsAt, null);
    assert.equal(off.endsAt, '2027-10-01T09:00:00.000Z');
    assert.equal(planFor(off.status, off.endsAt, NOW), 'pro');

    assert.equal(sub(apple('DID_CHANGE_RENEWAL_STATUS', 'AUTO_RENEW_ENABLED')).status, 'active');
    // A status change with no subtype says nothing we can act on.
    assert.equal(apple('DID_CHANGE_RENEWAL_STATUS').kind, 'ignored');
  });

  it('distinguishes a grace period from a billing retry without one', () => {
    const grace = sub(apple('DID_FAIL_TO_RENEW', 'GRACE_PERIOD', {}, { gracePeriodExpiresDate: ms('2026-10-20T09:00:00.000Z') }));
    assert.equal(grace.status, 'grace');
    // While a grace period is open, it is the date access really ends.
    assert.equal(grace.endsAt, '2026-10-20T09:00:00.000Z');
    assert.equal(planFor(grace.status, grace.endsAt, NOW), 'pro');

    const retry = sub(apple('DID_FAIL_TO_RENEW'));
    assert.equal(retry.status, 'expired');
    assert.equal(planFor(retry.status, retry.endsAt, NOW), 'lapsed');
  });

  it('ends it on expiry, refund and revocation, and puts a reversal back', () => {
    assert.equal(sub(apple('EXPIRED', 'VOLUNTARY')).status, 'expired');
    assert.equal(sub(apple('GRACE_PERIOD_EXPIRED')).status, 'expired');
    assert.equal(sub(apple('REFUND')).status, 'refunded');
    assert.equal(sub(apple('REVOKE')).status, 'expired');
    assert.equal(sub(apple('REFUND_REVERSED')).status, 'active');
  });

  it('follows an upgrade to the new product', () => {
    const upgraded = sub(apple('DID_CHANGE_RENEWAL_PREF', 'UPGRADE', { productId: 'pro_monthly' }));
    assert.equal(upgraded.productId, 'pro_monthly');
    assert.equal(upgraded.period, 'monthly');
  });

  it('records a tip as a tip', () => {
    const event = apple('ONE_TIME_CHARGE', undefined, { productId: 'tip_large' });
    assert.equal(event.kind, 'tip');
    if (event.kind !== 'tip') return;
    assert.equal(event.productId, 'tip_large');
    assert.equal(event.store, 'app_store');
    assert.equal(event.transactionId, 'tx-1');
  });

  it('refuses to guess whose purchase it is', () => {
    const event = readAppleNotification({ notificationType: 'SUBSCRIBED' }, tx({ appAccountToken: undefined }), {}, NOW);
    assert.equal(event.kind, 'ignored');
    if (event.kind === 'ignored') assert.match(event.why, /appAccountToken/);
  });

  it('ignores a product we do not sell rather than writing it', () => {
    const event = apple('SUBSCRIBED', 'INITIAL_BUY', { productId: 'pro_decade' });
    assert.equal(event.kind, 'ignored');
    if (event.kind === 'ignored') assert.match(event.why, /not a subscription we sell/);
  });

  it('ignores everything informational, including a type added after this was written', () => {
    for (const type of ['TEST', 'PRICE_INCREASE', 'PRICE_CHANGE', 'REFUND_DECLINED', 'CONSUMPTION_REQUEST',
      'RENEWAL_EXTENDED', 'RENEWAL_EXTENSION', 'METADATA_UPDATE', 'MIGRATION', 'RESCIND_CONSENT',
      'EXTERNAL_PURCHASE_TOKEN', 'SOMETHING_APPLE_ADDS_IN_2027']) {
      assert.equal(apple(type).kind, 'ignored', type);
    }
  });

  /**
   * The strings above are copied from Apple's library rather than its enums,
   * so this file loads without `node:crypto`. If Apple adds a type, this
   * fails and someone has to decide what it means.
   */
  it('matches Apple’s own list of types and subtypes', () => {
    const mine: AppleNotificationType[] = [
      'SUBSCRIBED', 'DID_CHANGE_RENEWAL_PREF', 'DID_CHANGE_RENEWAL_STATUS', 'OFFER_REDEEMED',
      'DID_RENEW', 'EXPIRED', 'DID_FAIL_TO_RENEW', 'GRACE_PERIOD_EXPIRED', 'PRICE_INCREASE',
      'REFUND', 'REFUND_DECLINED', 'CONSUMPTION_REQUEST', 'RENEWAL_EXTENDED', 'REVOKE',
      'TEST', 'RENEWAL_EXTENSION', 'REFUND_REVERSED', 'EXTERNAL_PURCHASE_TOKEN',
      'ONE_TIME_CHARGE', 'RESCIND_CONSENT', 'METADATA_UPDATE', 'MIGRATION', 'PRICE_CHANGE',
    ];
    assert.deepEqual([...mine].sort(), Object.values(NotificationTypeV2).sort());

    const mySubtypes: AppleSubtype[] = [
      'INITIAL_BUY', 'RESUBSCRIBE', 'DOWNGRADE', 'UPGRADE', 'AUTO_RENEW_ENABLED',
      'AUTO_RENEW_DISABLED', 'VOLUNTARY', 'BILLING_RETRY', 'PRICE_INCREASE', 'GRACE_PERIOD',
      'PENDING', 'ACCEPTED', 'BILLING_RECOVERY', 'PRODUCT_NOT_FOR_SALE', 'SUMMARY',
      'FAILURE', 'UNREPORTED',
    ];
    assert.deepEqual([...mySubtypes].sort(), Object.values(Subtype).sort());
  });
});

describe('Google Play', () => {
  const state = (over: Partial<PlaySubscriptionState> = {}): PlaySubscriptionState => ({
    subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE',
    externalAccountIdentifiers: { obfuscatedExternalAccountId: USER },
    startTime: '2026-10-01T09:00:00.000Z',
    lineItems: [
      { productId: 'pro', expiryTime: '2027-10-01T09:00:00.000Z', offerDetails: { basePlanId: 'yearly' } },
    ],
    ...over,
  });

  const read = (over: Partial<PlaySubscriptionState> = {}) => readPlaySubscription(state(over), 'pro', 'token-1', NOW);

  it('says what to look up, because the notification carries no state', () => {
    const lookup = readPlayNotification({
      subscriptionNotification: { notificationType: 2, purchaseToken: 'token-1', subscriptionId: 'pro' },
    });
    assert.deepEqual(lookup, { kind: 'subscription', purchaseToken: 'token-1', subscriptionId: 'pro', notification: 'RENEWED' });
  });

  it('ignores a test ping, a pending purchase and a deferral', () => {
    assert.equal(readPlayNotification({ testNotification: { version: '1.0' } }).kind, 'ignored');
    for (const type of [20, 9, 8, 11]) {
      const lookup = readPlayNotification({ subscriptionNotification: { notificationType: type, purchaseToken: 't', subscriptionId: 'pro' } });
      assert.equal(lookup.kind, 'ignored', String(type));
    }
  });

  it('picks up a voided purchase and a one-time tip', () => {
    assert.deepEqual(readPlayNotification({ voidedPurchaseNotification: { purchaseToken: 't', orderId: 'o' } }), {
      kind: 'voided',
      purchaseToken: 't',
    });
    assert.deepEqual(readPlayNotification({ oneTimeProductNotification: { notificationType: 1, purchaseToken: 't', sku: 'tip_small' } }), {
      kind: 'one-time',
      purchaseToken: 't',
      sku: 'tip_small',
    });
    // A cancelled one-time purchase granted nothing.
    assert.equal(readPlayNotification({ oneTimeProductNotification: { notificationType: 2, purchaseToken: 't', sku: 'tip_small' } }).kind, 'ignored');
  });

  it('reads the base plan as the period, and the token as the subscription id', () => {
    const row = sub(read());
    assert.equal(row.store, 'play');
    assert.equal(row.period, 'yearly');
    assert.equal(row.userId, USER);
    assert.equal(row.originalTransactionId, 'token-1');
    assert.equal(row.endsAt, '2027-10-01T09:00:00.000Z');
  });

  it('calls an offer on the base plan a trial, since the trial is the only offer', () => {
    const row = sub(read({ lineItems: [{ productId: 'pro', expiryTime: '2026-10-18T09:00:00.000Z', offerDetails: { basePlanId: 'monthly', offerId: 'free-trial' } }] }));
    assert.equal(row.status, 'trial');
    assert.equal(row.period, 'monthly');
  });

  it('maps every state Google can report', () => {
    const cases: [string, Status | null][] = [
      ['SUBSCRIPTION_STATE_ACTIVE', 'active'],
      ['SUBSCRIPTION_STATE_IN_GRACE_PERIOD', 'grace'],
      ['SUBSCRIPTION_STATE_CANCELED', 'cancelled'],
      ['SUBSCRIPTION_STATE_ON_HOLD', 'expired'],
      ['SUBSCRIPTION_STATE_PAUSED', 'expired'],
      ['SUBSCRIPTION_STATE_EXPIRED', 'expired'],
      ['SUBSCRIPTION_STATE_PENDING', null],
      ['SUBSCRIPTION_STATE_UNSPECIFIED', null],
    ];
    for (const [subscriptionState, expected] of cases) {
      const event = read({ subscriptionState });
      if (expected === null) assert.equal(event.kind, 'ignored', subscriptionState);
      else assert.equal(sub(event).status, expected, subscriptionState);
    }
  });

  it('refuses to guess whose purchase it is', () => {
    const event = read({ externalAccountIdentifiers: {} });
    assert.equal(event.kind, 'ignored');
    if (event.kind === 'ignored') assert.match(event.why, /obfuscatedExternalAccountId/);
  });

  it('ignores a base plan we do not sell', () => {
    const event = read({ lineItems: [{ productId: 'pro', offerDetails: { basePlanId: 'weekly' } }] });
    assert.equal(event.kind, 'ignored');
    if (event.kind === 'ignored') assert.match(event.why, /not one we sell/);
  });

  it('turns a voided purchase into a refund', () => {
    const row = sub(voidedPlayPurchase(state(), 'pro', 'token-1', NOW));
    assert.equal(row.status, 'refunded');
    assert.equal(row.renewsAt, null);
    assert.equal(planFor(row.status, row.endsAt, NOW), 'lapsed');
  });
});
