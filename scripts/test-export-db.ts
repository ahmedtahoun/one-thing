/**
 * Whether "Download my data" really covers everything we hold, asked of the
 * database rather than of a list someone maintains by hand. Run with
 * `npm run test:db`.
 *
 * This is the test that keeps the promise true a year from now: a migration
 * that adds a table holding someone's rows fails it, until the table is
 * either exported or written down as excluded with a reason.
 */
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { EXCLUDED, EXPORTED, THROUGH_PARENT } from '../supabase/functions/_shared/export-contract';
import { startCluster, type Cluster } from './pg-cluster';

const PORT = 54335;
const A = '00000000-0000-4000-8000-0000000000e1';
const B = '00000000-0000-4000-8000-0000000000e2';

let cluster: Cluster;

const asService = (sql: string) => cluster.psql(`begin; set local role service_role; ${sql}; commit;`).trim();
const asUser = (who: string, sql: string) => cluster.asUser(who, sql).trim();

describe('the data export', () => {
  before(() => {
    cluster = startCluster(PORT);
    cluster.psql(`
      insert into auth.users (id) values ('${A}'), ('${B}');
      insert into app_user (id, auth_provider, name, first_name) values
        ('${A}', 'apple', 'Ahmed Tahoun', 'Ahmed'),
        ('${B}', 'google', 'Someone Else', 'Someone');
    `);
  });

  after(() => cluster.stop());

  /**
   * The point of the whole file. Ask Postgres which tables carry a person's
   * rows, and hold the export to that list.
   */
  it('covers every table that holds a person’s rows', () => {
    const rows = cluster
      .psql(`
        select c.table_name from information_schema.columns c
        join information_schema.tables t
          on t.table_schema = c.table_schema and t.table_name = c.table_name and t.table_type = 'BASE TABLE'
        where c.table_schema = 'public' and c.column_name = 'user_id'
        order by 1`)
      .trim()
      .split('\n')
      .filter(Boolean);

    const exported = new Set(EXPORTED.map((e) => e.table));
    const excluded = new Set(Object.keys(EXCLUDED));
    const unaccounted = rows.filter((table) => !exported.has(table) && !excluded.has(table));
    assert.deepEqual(
      unaccounted,
      [],
      `these tables hold a user_id and are neither exported nor excluded: ${unaccounted.join(', ')}. ` +
        'Add them to EXPORTED in supabase/functions/_shared/export-contract.ts, or to EXCLUDED with a reason.'
    );

    // And the other way: nothing in the list has quietly stopped existing.
    const present = new Set([...rows, 'app_user']);
    for (const { table } of EXPORTED) assert.ok(present.has(table), `${table} is exported but has no user_id column`);
    for (const table of excluded) assert.ok(present.has(table), `${table} is excluded but does not exist`);
    for (const [table, child] of Object.entries(THROUGH_PARENT)) {
      assert.equal(
        cluster.psql(`select count(*) from information_schema.columns
          where table_schema='public' and table_name='${table}' and column_name='${child.key}'`).trim(),
        '1',
        `${table}.${child.key} is gone`
      );
    }
  });

  it('every excluded table says why', () => {
    for (const [table, why] of Object.entries(EXCLUDED)) {
      assert.ok(why.length > 20, `${table}'s reason is too short to be a reason: "${why}"`);
    }
  });

  it('takes one request at a time, oldest first', () => {
    cluster.psql(`
      insert into privacy_request (user_id, "type", source, requested_at) values
        ('${A}', 'export', 'app', now() - interval '2 days'),
        ('${B}', 'export', 'app', now() - interval '1 day'),
        ('${A}', 'delete', 'app', now() - interval '3 days')`);

    const first = asService('select user_id from public.claim_export_request()');
    assert.equal(first, A, 'the oldest export request, and not the deletion');
    const second = asService('select user_id from public.claim_export_request()');
    assert.equal(second, B);
    // Both are claimed, so a third run finds nothing rather than repeating.
    assert.equal(asService('select count(*) from public.claim_export_request()'), '0');
  });

  it('answers a request once, and only while it is open', () => {
    const id = cluster.psql(`select id from privacy_request where user_id = '${A}' and "type" = 'export'`).trim();
    assert.equal(asService(`select public.complete_export_request('${id}', '${A}/${id}.json')`), 't');
    assert.equal(
      cluster.psql(`select export_path from privacy_request where id = '${id}'`).trim(),
      `${A}/${id}.json`
    );
    // A second call changes nothing: the deadline was already met.
    assert.equal(asService(`select public.complete_export_request('${id}', 'somewhere/else.json')`), 'f');
    assert.equal(cluster.psql(`select export_path from privacy_request where id = '${id}'`).trim(), `${A}/${id}.json`);
  });

  it('hands a failed request back, so it is tried again rather than lost', () => {
    const id = cluster.psql(`select id from privacy_request where user_id = '${B}' and "type" = 'export'`).trim();
    asService(`select public.release_export_request('${id}')`);
    assert.equal(asService('select user_id from public.claim_export_request()'), B);
    // A request already answered cannot be reopened this way.
    const done = cluster.psql(`select id from privacy_request where completed_at is not null limit 1`).trim();
    asService(`select public.release_export_request('${done}')`);
    assert.equal(cluster.psql(`select claimed_at is not null from privacy_request where id = '${done}'`).trim(), 't');
  });

  it('lets nobody but the service role run any of it', () => {
    for (const call of [
      'public.claim_export_request()',
      `public.complete_export_request('${A}', 'x')`,
      `public.release_export_request('${A}')`,
    ]) {
      assert.throws(() => asUser(B, `select * from ${call}`), /permission denied/, call);
    }
    // Asking for an export is still theirs to do, and to read back.
    asUser(B, `insert into privacy_request (user_id, "type", source) values ('${B}', 'export', 'app')`);
    assert.equal(asUser(B, `select count(*) from privacy_request where user_id = '${B}'`), '2');
    // And still nobody else's to see.
    assert.equal(asUser(B, `select count(*) from privacy_request where user_id = '${A}'`), '0');
  });
});
