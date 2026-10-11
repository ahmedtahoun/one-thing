/**
 * The Play webhook's logic, with stand-ins for the Play Developer API and for
 * the database. Run with `npm test`.
 *
 * The mapping from Google's states to ours is tested in
 * `../_shared/store-contract.test.ts`; this is about the lookup Google forces
 * on every notification, and about what Pub/Sub is told, which decides
 * whether it retries.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { handlePlay, type Deps } from './handler';
import type { PlaySubscriptionState } from '../_shared/store-contract';

const USER = '11111111-1111-4111-8111-111111111111';
const NOW = new Date('2026-10-11T09:00:00.000Z');

const push = (notification: unknown, messageId = 'msg-1') => ({
  message: { data: Buffer.from(JSON.stringify(notification)).toString('base64'), messageId, publishTime: NOW.toISOString() },
});

const renewed = {
  packageName: 'app.onlyonething',
  subscriptionNotification: { notificationType: 2, purchaseToken: 'token-1', subscriptionId: 'pro' },
};

const active: PlaySubscriptionState = {
  subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE',
  externalAccountIdentifiers: { obfuscatedExternalAccountId: USER },
  startTime: '2026-10-01T09:00:00.000Z',
  lineItems: [{ productId: 'pro', expiryTime: '2026-11-01T09:00:00.000Z', offerDetails: { basePlanId: 'monthly' } }],
};

function stand(over: Partial<Deps> & { fail?: boolean; seen?: boolean } = {}) {
  const calls: { kind: string; externalId: string; type: string; plan?: string; detail?: string }[] = [];
  const looked: string[] = [];
  const deps: Deps = {
    async subscription(token) {
      looked.push(token);
      if (over.fail) throw new Error('Play API 500: upstream');
      return active;
    },
    async product(productId, token) {
      looked.push(`${productId}/${token}`);
      return { obfuscatedExternalAccountId: USER, purchaseState: 0, orderId: 'order-1', purchaseTimeMillis: String(NOW.getTime()) };
    },
    record: {
      async subscription(externalId, type, event, plan) {
        calls.push({ kind: 'subscription', externalId, type, plan });
        void event;
        return !over.seen;
      },
      async tip(externalId, type) {
        calls.push({ kind: 'tip', externalId, type });
        return !over.seen;
      },
      async notice(externalId, type, outcome, detail) {
        calls.push({ kind: outcome, externalId, type, detail });
        return true;
      },
    },
    now: () => NOW,
    ...over,
  };
  return { deps, calls, looked };
}

describe('the Play webhook', () => {
  it('looks the purchase up, because the notification carries no state', async () => {
    const { deps, calls, looked } = stand();
    const reply = await handlePlay(push(renewed), deps);
    assert.deepEqual(reply, { status: 200, body: { ok: true } });
    assert.deepEqual(looked, ['token-1']);
    assert.deepEqual(calls, [{ kind: 'subscription', externalId: 'msg-1', type: 'Play RENEWED', plan: 'pro' }]);
  });

  it('keys idempotency on the Pub/Sub message id', async () => {
    const { deps } = stand({ seen: true });
    assert.deepEqual(await handlePlay(push(renewed), deps), { status: 200, body: { seen: true } });
  });

  it('rejects a push with no data or no message id', async () => {
    const { deps } = stand();
    for (const body of [null, {}, { message: {} }, { message: { data: 'not base64 json', messageId: 'm' } }]) {
      assert.equal((await handlePlay(body, deps)).status, 400, JSON.stringify(body));
    }
    // Data but no id: a replay could not be told from a new event.
    assert.equal((await handlePlay({ message: { data: Buffer.from('{}').toString('base64') } }, deps)).status, 400);
  });

  it('records a test ping without looking anything up', async () => {
    const { deps, calls, looked } = stand();
    const reply = await handlePlay(push({ testNotification: { version: '1.0' } }, 'msg-test'), deps);
    assert.equal(reply.status, 200);
    assert.deepEqual(looked, []);
    assert.deepEqual(calls, [{ kind: 'ignored', externalId: 'msg-test', type: 'Play notification', detail: 'Play test notification' }]);
  });

  it('turns a voided purchase into a refund, and takes Pro away', async () => {
    const { deps, calls } = stand();
    const reply = await handlePlay(push({ voidedPurchaseNotification: { purchaseToken: 'token-1', orderId: 'o' } }, 'msg-void'), deps);
    assert.equal(reply.status, 200);
    // The API still reports the subscription as active; a refund overrides it.
    assert.deepEqual(calls, [{ kind: 'subscription', externalId: 'msg-void', type: 'Play VOIDED_PURCHASE', plan: 'lapsed' }]);
  });

  it('records a tip from the one-time product feed', async () => {
    const { deps, calls, looked } = stand();
    const reply = await handlePlay(
      push({ oneTimeProductNotification: { notificationType: 1, purchaseToken: 'token-2', sku: 'tip_small' } }, 'msg-tip'),
      deps
    );
    assert.deepEqual(reply, { status: 200, body: { ok: true } });
    assert.deepEqual(looked, ['tip_small/token-2']);
    assert.deepEqual(calls, [{ kind: 'tip', externalId: 'msg-tip', type: 'Play ONE_TIME_PRODUCT_PURCHASED' }]);
  });

  it('will not record a tip that was never paid for', async () => {
    const { deps, calls } = stand({
      // 2 is PENDING: the money has not moved.
      async product() {
        return { obfuscatedExternalAccountId: USER, purchaseState: 2 };
      },
    });
    const reply = await handlePlay(
      push({ oneTimeProductNotification: { notificationType: 1, purchaseToken: 'token-2', sku: 'tip_small' } }, 'msg-pending'),
      deps
    );
    assert.equal(reply.status, 200);
    assert.equal(calls[0]?.kind, 'ignored');
    assert.match(String(calls[0]?.detail), /purchase state 2/);
  });

  it('ignores a one-time product that is not one of the tips, without looking it up', async () => {
    const { deps, calls, looked } = stand();
    await handlePlay(push({ oneTimeProductNotification: { notificationType: 1, purchaseToken: 't', sku: 'sticker_pack' } }, 'msg-x'), deps);
    assert.deepEqual(looked, []);
    assert.match(String(calls[0]?.detail), /not a tip/);
  });

  it('asks Pub/Sub to try again when the lookup fails', async () => {
    const { deps, calls } = stand({ fail: true });
    const reply = await handlePlay(push(renewed), deps);
    assert.deepEqual(reply, { status: 500, body: { error: 'write_failed' } });
    assert.deepEqual(calls, [
      { kind: 'failed', externalId: 'msg-1', type: 'Play RENEWED', detail: 'Play API 500: upstream' },
    ]);
  });

  it('records a state it will not act on, rather than writing a guess', async () => {
    const { deps, calls } = stand({
      async subscription() {
        return { ...active, subscriptionState: 'SUBSCRIPTION_STATE_PENDING' };
      },
    });
    const reply = await handlePlay(push(renewed, 'msg-pend'), deps);
    assert.equal(reply.status, 200);
    assert.equal(calls[0]?.kind, 'ignored');
    assert.match(String(calls[0]?.detail), /PENDING/);
  });
});
