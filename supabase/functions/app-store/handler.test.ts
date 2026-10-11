/**
 * The App Store webhook's logic, with stand-ins for Apple's verifier and for
 * the database. Run with `npm test`.
 *
 * What a notification *means* is tested in
 * `../_shared/store-contract.test.ts`; this is about what the function answers
 * Apple, which decides whether it retries.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { handleApple, type Deps, type Verified } from './handler';

const USER = '11111111-1111-4111-8111-111111111111';
const NOW = new Date('2026-10-11T09:00:00.000Z');

const verified = (over: Partial<Verified> = {}): Verified => ({
  notification: { notificationType: 'SUBSCRIBED', subtype: 'INITIAL_BUY', notificationUUID: 'uuid-1' },
  transaction: {
    originalTransactionId: 'otx-1',
    transactionId: 'tx-1',
    productId: 'pro_yearly',
    appAccountToken: USER,
    originalPurchaseDate: Date.parse('2026-10-01T09:00:00.000Z'),
    expiresDate: Date.parse('2027-10-01T09:00:00.000Z'),
    offerDiscountType: 'FREE_TRIAL',
  },
  renewal: {},
  ...over,
});

function stand(over: { verify?: Deps['verify']; fail?: boolean; seen?: boolean } = {}) {
  const calls: { kind: string; externalId: string; type: string; plan?: string; detail?: string }[] = [];
  const deps: Deps = {
    verify: over.verify ?? (async () => verified()),
    record: {
      async subscription(externalId, type, event, plan) {
        if (over.fail) throw new Error('database is down');
        calls.push({ kind: 'subscription', externalId, type, plan });
        void event;
        return !over.seen;
      },
      async tip(externalId, type) {
        if (over.fail) throw new Error('database is down');
        calls.push({ kind: 'tip', externalId, type });
        return !over.seen;
      },
      async notice(externalId, type, outcome, detail) {
        calls.push({ kind: outcome, externalId, type, detail });
        return true;
      },
    },
    now: () => NOW,
  };
  return { deps, calls };
}

describe('the App Store webhook', () => {
  it('writes the subscription and the plan, and says 200', async () => {
    const { deps, calls } = stand();
    const reply = await handleApple({ signedPayload: 'ey...' }, deps);
    assert.deepEqual(reply, { status: 200, body: { ok: true } });
    assert.deepEqual(calls, [
      { kind: 'subscription', externalId: 'uuid-1', type: 'SUBSCRIBED / INITIAL_BUY', plan: 'trial' },
    ]);
  });

  it('says 200 and writes nothing the second time the same one arrives', async () => {
    const { deps } = stand({ seen: true });
    const reply = await handleApple({ signedPayload: 'ey...' }, deps);
    // Both stores redeliver on purpose; a replay must not walk a subscription
    // backwards or count a tip twice.
    assert.deepEqual(reply, { status: 200, body: { seen: true } });
  });

  it('refuses a payload that does not verify, and asks to be retried', async () => {
    const thrown = stand({
      verify: async () => {
        throw new Error('chain did not verify');
      },
    });
    assert.deepEqual(await handleApple({ signedPayload: 'ey...' }, thrown.deps), {
      status: 401,
      body: { error: 'unverified' },
    });
    // Nothing was written, not even a notice: an unverified payload is not
    // Apple's traffic to record.
    assert.deepEqual(thrown.calls, []);

    const refused = stand({ verify: async () => null });
    assert.equal((await handleApple({ signedPayload: 'ey...' }, refused.deps)).status, 401);
  });

  it('rejects a body with no signed payload', async () => {
    const { deps } = stand();
    for (const body of [null, {}, { signedPayload: 42 }, 'ey...']) {
      assert.equal((await handleApple(body, deps)).status, 400, JSON.stringify(body));
    }
  });

  it('rejects a notification with no UUID, since a replay could not be told apart', async () => {
    const { deps } = stand({
      verify: async () => verified({ notification: { notificationType: 'DID_RENEW' } }),
    });
    assert.equal((await handleApple({ signedPayload: 'ey...' }, deps)).status, 400);
  });

  it('records what it ignored, with the reason, and still says 200', async () => {
    const { deps, calls } = stand({
      verify: async () =>
        verified({ notification: { notificationType: 'TEST', notificationUUID: 'uuid-test' } }),
    });
    const reply = await handleApple({ signedPayload: 'ey...' }, deps);
    assert.equal(reply.status, 200);
    assert.match(String(reply.body.ignored), /nothing to change/);
    assert.deepEqual(calls, [
      { kind: 'ignored', externalId: 'uuid-test', type: 'TEST', detail: 'TEST: nothing to change' },
    ]);
  });

  it('records a tip through its own path', async () => {
    const { deps, calls } = stand({
      verify: async () =>
        verified({
          notification: { notificationType: 'ONE_TIME_CHARGE', notificationUUID: 'uuid-tip' },
          transaction: { ...verified().transaction!, productId: 'tip_regular' },
        }),
    });
    assert.deepEqual(await handleApple({ signedPayload: 'ey...' }, deps), { status: 200, body: { ok: true } });
    assert.deepEqual(calls, [{ kind: 'tip', externalId: 'uuid-tip', type: 'ONE_TIME_CHARGE' }]);
  });

  it('asks Apple to try again when the write fails, and records why', async () => {
    const { deps, calls } = stand({ fail: true });
    const reply = await handleApple({ signedPayload: 'ey...' }, deps);
    assert.deepEqual(reply, { status: 500, body: { error: 'write_failed' } });
    // A 200 here would lose a real purchase: Apple would never send it again.
    assert.deepEqual(calls, [
      { kind: 'failed', externalId: 'uuid-1', type: 'SUBSCRIBED / INITIAL_BUY', detail: 'database is down' },
    ]);
  });

  it('carries the plan the status earns, not the status', async () => {
    const cancelled = stand({
      verify: async () =>
        verified({
          notification: { notificationType: 'DID_CHANGE_RENEWAL_STATUS', subtype: 'AUTO_RENEW_DISABLED', notificationUUID: 'uuid-off' },
        }),
    });
    await handleApple({ signedPayload: 'ey...' }, cancelled.deps);
    // Auto-renew off, but the paid year still runs: still Pro.
    assert.equal(cancelled.calls[0]?.plan, 'pro');

    const expired = stand({
      verify: async () =>
        verified({
          notification: { notificationType: 'EXPIRED', subtype: 'VOLUNTARY', notificationUUID: 'uuid-end' },
        }),
    });
    await handleApple({ signedPayload: 'ey...' }, expired.deps);
    assert.equal(expired.calls[0]?.plan, 'lapsed');
  });
});
