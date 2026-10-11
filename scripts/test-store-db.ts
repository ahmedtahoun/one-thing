/**
 * What the store webhooks write, in Postgres (0007_store_webhooks.sql). Run
 * with `npm run test:db`.
 *
 * These are the tests that matter most about the webhooks, because the
 * properties they check are the ones money depends on: a notification
 * delivered twice must not pay twice, a user must not be able to call any of
 * this, and the subscription and the plan must move together or not at all.
 */
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { startCluster, type Cluster } from './pg-cluster';

const PORT = 54334;
const A = '00000000-0000-4000-8000-0000000000a1';
const B = '00000000-0000-4000-8000-0000000000b1';

let cluster: Cluster;

/** As the edge functions call it: as the service role. */
const asService = (sql: string) => cluster.psql(`begin; set local role service_role; ${sql}; commit;`).trim();
/** As a signed-in app user, through PostgREST — `cluster.asUser` sets the claim. */
const asUser = (who: string, sql: string) => cluster.asUser(who, sql).trim();

const plan = (who: string) => cluster.psql(`select plan from app_user where id = '${who}'`).trim();
const one = (sql: string) => cluster.psql(`select ${sql}`).trim();

function subscription(args: {
  external: string;
  user?: string;
  status?: string;
  planKind?: string;
  product?: string;
  period?: string;
  ends?: string;
  original?: string;
  store?: string;
  type?: string;
}) {
  const {
    external, user = A, status = 'active', planKind = 'pro', product = 'pro_yearly', period = 'yearly',
    ends = '2027-10-01T09:00:00Z', original = 'otx-1', store = 'app_store', type = 'DID_RENEW',
  } = args;
  return asService(`select public.record_store_subscription(
    '${store}', '${external}', '${type}', '${user}', '${product}', '${period}', '${status}', '${planKind}',
    '2026-10-01T09:00:00Z', ${status === 'active' ? `'${ends}'` : 'null'}, '${ends}', '${original}')`);
}

describe('what the store webhooks write', () => {
  before(() => {
    cluster = startCluster(PORT);
    cluster.psql(`
      insert into auth.users (id) values ('${A}'), ('${B}');
      insert into app_user (id, auth_provider, name, first_name, plan) values
        ('${A}', 'apple', 'Ahmed Tahoun', 'Ahmed', 'free'),
        ('${B}', 'google', 'Someone Else', 'Someone', 'free');
    `);
  });

  after(() => cluster.stop());

  it('writes the subscription and the plan in one go', () => {
    assert.equal(subscription({ external: 'uuid-1' }), 't');
    assert.equal(plan(A), 'pro');
    assert.equal(one(`status || ' ' || period || ' ' || product_id from subscription where user_id = '${A}'`), 'active yearly pro_yearly');
    assert.equal(one(`outcome || ' ' || "type" from store_notification where external_id = 'uuid-1'`), 'subscription DID_RENEW');
  });

  it('does nothing at all the second time the same notification arrives', () => {
    // Both stores redeliver on purpose, and Apple retries anything that is
    // not 2xx — so this is the normal case, not an edge case.
    assert.equal(subscription({ external: 'uuid-1', status: 'expired', planKind: 'lapsed' }), 'f');
    assert.equal(plan(A), 'pro', 'a replay must not walk the plan backwards');
    assert.equal(one(`status from subscription where user_id = '${A}'`), 'active');
    assert.equal(one(`count(*) from store_notification where external_id = 'uuid-1'`), '1');
  });

  it('keeps one row per person and moves it, rather than adding a second', () => {
    assert.equal(subscription({ external: 'uuid-2', product: 'pro_monthly', period: 'monthly', type: 'DID_CHANGE_RENEWAL_PREF' }), 't');
    assert.equal(one(`count(*) from subscription where user_id = '${A}'`), '1');
    assert.equal(one(`period from subscription where user_id = '${A}'`), 'monthly');
    // The original start date is kept: a product change is not a new start.
    assert.equal(one(`to_char(started_at at time zone 'UTC', 'YYYY-MM-DD') from subscription where user_id = '${A}'`), '2026-10-01');
  });

  it('takes Pro away on an expiry', () => {
    assert.equal(subscription({ external: 'uuid-3', status: 'expired', planKind: 'lapsed', type: 'EXPIRED' }), 't');
    assert.equal(plan(A), 'lapsed');
    assert.equal(one(`status from subscription where user_id = '${A}'`), 'expired');
  });

  it('records a tip once, however many notifications mention it', () => {
    assert.equal(
      asService(`select public.record_store_tip('app_store', 'uuid-tip', 'ONE_TIME_CHARGE', '${A}', 'tip_regular', 'tx-99', now())`),
      't'
    );
    // A different notification id for the same purchase: the transaction id
    // is the second belt.
    assert.equal(
      asService(`select public.record_store_tip('app_store', 'uuid-tip-again', 'ONE_TIME_CHARGE', '${A}', 'tip_regular', 'tx-99', now())`),
      't'
    );
    assert.equal(one(`count(*) from tip where user_id = '${A}'`), '1');
  });

  it('records what it ignored, and what failed, with the reason', () => {
    assert.equal(asService(`select public.record_store_notice('app_store', 'uuid-test', 'TEST', 'ignored', 'TEST: nothing to change')`), 't');
    assert.equal(asService(`select public.record_store_notice('play', 'msg-9', 'Play RENEWED', 'failed', 'Play API 500')`), 't');
    // And will not record the same one twice.
    assert.equal(asService(`select public.record_store_notice('app_store', 'uuid-test', 'TEST', 'ignored', 'again')`), 'f');
    assert.equal(one(`count(*) from store_notification where outcome in ('ignored', 'failed')`), '2');
  });

  it('counts the two stores separately, so their ids cannot collide', () => {
    assert.equal(subscription({ external: 'shared-id', store: 'app_store', type: 'DID_RENEW' }), 't');
    assert.equal(subscription({ external: 'shared-id', store: 'play', user: B, original: 'token-1', type: 'Play RENEWED' }), 't');
    assert.equal(one(`count(*) from store_notification where external_id = 'shared-id'`), '2');
  });

  it('lets nobody but the service role touch any of it', () => {
    for (const call of [
      `public.record_store_subscription('app_store', 'hack-1', 'x', '${B}', 'pro_yearly', 'yearly', 'active', 'pro', now(), now(), now(), 'otx-x')`,
      `public.record_store_tip('app_store', 'hack-2', 'x', '${B}', 'tip_large', 'tx-x', now())`,
      `public.record_store_notice('app_store', 'hack-3', 'x', 'ignored', 'x')`,
      `public.lapse_expired_subscriptions()`,
    ]) {
      assert.throws(() => asUser(B, `select ${call}`), /permission denied/, call.slice(0, 40));
    }
    // Nor read the store's traffic.
    assert.equal(asUser(B, 'select count(*) from store_notification'), '0');
    // Their own tip is still theirs to read.
    assert.equal(asUser(A, `select count(*) from tip`), '1');
  });

  it('moves anyone whose paid period has passed off Pro, with no notification at all', () => {
    // The safety net for a lost EXPIRED: stores retry, but "unlikely" is not
    // "never", and a user keeping Pro for free is the expensive direction.
    // Set the stage directly: the point here is the function, not the path in.
    cluster.psql(`
      update subscription set status = 'cancelled', ends_at = now() - interval '1 day' where user_id = '${A}';
      update app_user set plan = 'pro' where id = '${A}';
      update subscription set status = 'active', ends_at = now() + interval '10 days' where user_id = '${B}';
      update app_user set plan = 'pro' where id = '${B}'`);

    assert.equal(asService('select public.lapse_expired_subscriptions()'), '1');
    assert.equal(plan(A), 'lapsed');
    // Still inside their paid month: untouched.
    assert.equal(plan(B), 'pro');
    // And running it again changes nothing.
    assert.equal(asService('select public.lapse_expired_subscriptions()'), '0');
  });
});
