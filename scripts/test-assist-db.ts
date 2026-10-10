/**
 * The Assistant's daily meter in Postgres (0005_assist.sql). Run with
 * `npm run test:db`.
 */
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { startCluster, type Cluster } from './pg-cluster';

const PORT = 54333;
const FREE = '00000000-0000-4000-8000-0000000000f1';
const PRO = '00000000-0000-4000-8000-0000000000f2';
const TRIAL = '00000000-0000-4000-8000-0000000000f3';

let cluster: Cluster;

/** Calls the meter as the edge function does: as the service role. */
const asService = (sql: string) => cluster.psql(`begin; set local role service_role; ${sql}; commit;`).trim();
const spend = (who: string, meter = 'assistant', zone = 'Asia/Riyadh') =>
  asService(`select public.spend_assist_request('${who}', '${meter}', '${zone}')`);
const refund = (who: string, meter = 'assistant') => asService(`select public.refund_assist_request('${who}', '${meter}', 'Asia/Riyadh')`);

describe('the Assistant’s meter', () => {
  before(() => {
    cluster = startCluster(PORT);
    cluster.psql(`
      insert into auth.users (id) values ('${FREE}'), ('${PRO}'), ('${TRIAL}');
      insert into app_user (id, auth_provider, name, first_name, plan) values
        ('${FREE}', 'apple', 'Free Person', 'Free', 'free'),
        ('${PRO}', 'apple', 'Pro Person', 'Pro', 'pro'),
        ('${TRIAL}', 'google', 'Trial Person', 'Trial', 'trial');
    `);
  });

  after(() => cluster.stop());

  it('allows ten Assistant requests a day on Free, and not an eleventh', () => {
    for (let i = 1; i <= 10; i++) assert.equal(spend(FREE), 't', `request ${i}`);
    assert.equal(spend(FREE), 'f');
    assert.equal(cluster.psql(`select used from assist_usage where user_id = '${FREE}' and meter = 'assistant'`).trim(), '10');
  });

  it('gives a request back when no answer came of it', () => {
    refund(FREE);
    assert.equal(spend(FREE), 't');
    assert.equal(spend(FREE), 'f');
  });

  it('keeps no Assistant limit on Pro or trial', () => {
    for (let i = 0; i < 15; i++) {
      assert.equal(spend(PRO), 't');
      assert.equal(spend(TRIAL), 't');
    }
  });

  it('counts parsing separately, with a guard every plan shares', () => {
    assert.equal(spend(FREE, 'parse'), 't', 'Quick capture is open even when the Assistant is used up');
    for (let i = 2; i <= 200; i++) spend(PRO, 'parse');
    assert.equal(spend(PRO, 'parse'), 't', 'the 200th');
    assert.equal(spend(PRO, 'parse'), 'f', 'the 201st');
  });

  it('counts the day in the person’s own time zone', () => {
    // Somewhere it is already tomorrow, or still yesterday, for at least one
    // of these two zones; whichever differs from Riyadh starts a fresh day.
    const fresh = ['Pacific/Kiritimati', 'Pacific/Pago_Pago'].some((zone) => spend(FREE, 'assistant', zone) === 't');
    assert.ok(fresh);
  });

  it('refuses an unknown meter or time zone', () => {
    assert.throws(() => spend(FREE, 'chat'), /unknown meter/);
    assert.throws(() => spend(FREE, 'assistant', 'Mars/Olympus'), /time zone/);
  });

  it('cannot be called from a user’s own session', () => {
    assert.throws(() => cluster.asUser(FREE, `select public.refund_assist_request('${FREE}', 'assistant', 'UTC')`), /permission denied/);
    assert.throws(() => cluster.asUser(FREE, `select public.spend_assist_request('${FREE}', 'assistant', 'UTC')`), /permission denied/);
    assert.throws(() => cluster.asUser(FREE, `update assist_usage set used = 0`), /permission denied|row-level security/);
    // They can read their own count, and only theirs.
    assert.equal(cluster.asUser(FREE, `select count(*) from assist_usage where user_id <> '${FREE}'`).trim(), '0');
    assert.ok(Number(cluster.asUser(FREE, `select count(*) from assist_usage`).trim()) > 0);
  });
});
