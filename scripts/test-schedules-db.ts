/**
 * The two scheduled jobs (0009_schedules.sql), against a real Postgres. Run
 * with `npm run test:db`.
 *
 * pg_cron and pg_net are not installed here, which is itself the first thing
 * proved: the migration applies without them. pg_net's `net.http_post` and
 * Vault's `vault.decrypted_secrets` are then stood in for with a table that
 * records each call, so what the export sweep would send — and when it sends
 * nothing — can be read back.
 */
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { startCluster, type Cluster } from './pg-cluster';

const PORT = 54336;
const A = '00000000-0000-4000-8000-0000000000f1';
const B = '00000000-0000-4000-8000-0000000000f2';

let cluster: Cluster;
const psql = (sql: string) => cluster.psql(sql).trim();
const asService = (sql: string) => psql(`begin; set local role service_role; ${sql}; commit;`);
const kick = () => Number(asService('select public.kick_export_sweep()'));
const sent = () => Number(psql('select count(*) from net.calls'));

const waiting = (n: number, who = A) =>
  psql(`insert into privacy_request (user_id, "type", source) select '${who}', 'export', 'app' from generate_series(1, ${n})`);

describe('the scheduled jobs', () => {
  before(() => {
    cluster = startCluster(PORT);
    psql(`
      insert into auth.users (id) values ('${A}'), ('${B}');
      insert into app_user (id, auth_provider, name, first_name) values
        ('${A}', 'apple', 'Ahmed Tahoun', 'Ahmed'), ('${B}', 'google', 'Someone Else', 'Someone');
    `);
  });

  after(() => cluster.stop());

  it('frees a claim left by a run that died, and only that', () => {
    psql(`
      insert into privacy_request (user_id, "type", source, claimed_at) values
        ('${A}', 'export', 'app', now() - interval '2 hours'),
        ('${B}', 'export', 'app', now() - interval '10 minutes');
      insert into privacy_request (user_id, "type", source, claimed_at, completed_at) values
        ('${A}', 'export', 'app', now() - interval '3 hours', now());
      insert into privacy_request (user_id, "type", source, claimed_at) values
        ('${A}', 'delete', 'app', now() - interval '3 hours');
    `);
    assert.equal(asService('select public.release_stale_export_claims()'), '1');
    // The dead run's request is open again; the live run keeps its own.
    assert.equal(psql(`select count(*) from privacy_request where "type" = 'export' and completed_at is null and claimed_at is null`), '1');
    assert.equal(psql(`select count(*) from privacy_request where user_id = '${B}' and claimed_at is not null`), '1');
    // An answered request and a deletion are none of its business.
    assert.equal(psql(`select count(*) from privacy_request where completed_at is not null and claimed_at is not null`), '1');
    assert.equal(psql(`select count(*) from privacy_request where "type" = 'delete' and claimed_at is not null`), '1');
    psql('delete from privacy_request');
  });

  it('calls nothing when nothing is waiting, and says why when it cannot call', () => {
    assert.equal(kick(), 0);
    waiting(1);
    // No pg_net and no Vault here yet: it waits rather than failing the job.
    assert.equal(kick(), 0);

    psql(`
      create schema net;
      create table net.calls (url text, headers jsonb, body jsonb);
      create function net.http_post(url text, headers jsonb, body jsonb) returns bigint
        language sql as $$ insert into net.calls values (url, headers, body) returning 1::bigint $$;
      create schema vault;
      create table vault.decrypted_secrets (name text, decrypted_secret text);
      grant usage on schema net, vault to service_role;
      grant all on all tables in schema net, vault to service_role;
    `);
    // pg_net is there now, but the secrets are not.
    assert.equal(kick(), 0);
    psql(`insert into vault.decrypted_secrets values ('project_url', 'https://ref.supabase.co/')`);
    assert.equal(kick(), 0, 'one secret is not enough');
    assert.equal(sent(), 0);
  });

  it('calls the export function once per waiting request, ten at most', () => {
    psql(`insert into vault.decrypted_secrets values ('service_role_key', 'service-key')`);
    assert.equal(kick(), 1);
    assert.deepEqual(
      JSON.parse(psql(`select json_build_object('url', url, 'auth', headers->>'Authorization') from net.calls`)),
      { url: 'https://ref.supabase.co/functions/v1/export', auth: 'Bearer service-key' }
    );

    psql('delete from net.calls');
    waiting(11, B);
    assert.equal(kick(), 10);
    assert.equal(sent(), 10);

    // A claimed request is being worked on, so it is not called for twice.
    psql('delete from net.calls');
    psql(`update privacy_request set claimed_at = now() where "type" = 'export'`);
    assert.equal(kick(), 0);
    assert.equal(sent(), 0);
  });

  it('lets nobody but the service role run either', () => {
    for (const call of ['public.kick_export_sweep()', 'public.release_stale_export_claims()']) {
      assert.throws(() => cluster.asUser(A, `select ${call}`), /permission denied/, call);
      assert.throws(() => psql(`begin; set local role anon; select ${call}; commit;`), /permission denied/, call);
    }
  });
});
