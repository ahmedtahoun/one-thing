/**
 * The sync engine against a real Postgres, with the real migrations and the
 * real row-level security. `npm run test:db`.
 *
 * Starts a throwaway cluster in a temporary directory, stubs the parts of
 * Supabase the schema leans on — the `auth` schema, `auth.uid()` reading the
 * request's user, the `anon` and `authenticated` roles with Supabase's
 * default grants — and applies supabase/migrations/*.sql. Every engine call
 * then runs the way PostgREST runs it: as `authenticated`, with the user's
 * id set for the transaction, so a policy that is wrong fails here.
 *
 * What it proves that the in-memory tests cannot: every row the app makes
 * fits the columns, types, enums and constraints; the foreign keys accept
 * the order the engine writes in; one user can neither see nor write
 * another's rows; nobody can make themselves Pro; and "Delete my account"
 * removes every row.
 */
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { EMPTY_BASE, syncOnce, type Base, type LocalState, type Remote } from '../src/lib/sync/engine';
import { bareTask, contact, emptyLocal, followUp, fullTask, historyFor } from '../src/lib/sync/fixtures';
import { contactToRow, followUpToRow, historyToRow, taskToRow } from '../src/lib/sync/rows';
import { startCluster, type Cluster } from './pg-cluster';

const PORT = 54329;
const TODAY = '2026-10-10';
const A = '00000000-0000-4000-8000-00000000000a';
const B = '00000000-0000-4000-8000-00000000000b';

// --------------------------------------------------------------- cluster ----

let cluster: Cluster;
const psql = (sql: string) => cluster.psql(sql);
const asUser = (userId: string, sql: string) => cluster.asUser(userId, sql);

// ---------------------------------------------------------------- remote ----

/** One SQL literal for a JSON payload. */
const json = (value: unknown) => `$json$${JSON.stringify(value)}$json$::json`;

function postgresRemote(userId: string): Remote {
  return {
    async select(table) {
      const out = asUser(userId, `select coalesce(json_agg(t), '[]'::json) from public.${table} t`);
      return JSON.parse(out.trim()) as Record<string, unknown>[];
    },
    async upsert(table, rows, onConflict) {
      if (rows.length === 0) return;
      const columns = Object.keys(rows[0]!);
      const keys = onConflict.split(',');
      const cols = columns.map((c) => `"${c}"`).join(', ');
      const set = columns.filter((c) => !keys.includes(c)).map((c) => `"${c}" = excluded."${c}"`).join(', ');
      asUser(
        userId,
        `insert into public.${table} (${cols}) select ${cols} from json_populate_recordset(null::public.${table}, ${json(rows)})
         on conflict (${keys.join(', ')}) ${set ? `do update set ${set}` : 'do nothing'}`
      );
    },
    async insert(table, rows) {
      if (rows.length === 0) return;
      const cols = Object.keys(rows[0]!).map((c) => `"${c}"`).join(', ');
      asUser(userId, `insert into public.${table} (${cols}) select ${cols} from json_populate_recordset(null::public.${table}, ${json(rows)})`);
    },
    async update(table, match, patch) {
      const cols = Object.keys(patch).map((c) => `"${c}"`).join(', ');
      const where = Object.entries(match).map(([k, v]) => `"${k}" = '${String(v)}'`).join(' and ');
      asUser(
        userId,
        `update public.${table} set (${cols}) = (select ${cols} from json_populate_record(null::public.${table}, ${json(patch)})) where ${where}`
      );
    },
    async remove(table, column, values) {
      if (values.length === 0) return;
      asUser(userId, `delete from public.${table} where "${column}"::text in (select json_array_elements_text(${json(values)}))`);
    },
  };
}

/** A phone signed in as `userId`, holding its own stores and base. */
function device(userId: string, local: LocalState = emptyLocal()) {
  let base: Base = EMPTY_BASE;
  const d = {
    local,
    async sync(consent: Parameters<typeof syncOnce>[0]['consent'] = []) {
      const result = await syncOnce({ remote: postgresRemote(userId), userId, local: d.local, base, consent, today: TODAY });
      base = result.base;
      d.local = {
        ...d.local,
        tasks: result.tasks,
        contacts: result.contacts,
        history: result.history,
        followUps: result.followUps,
        oneThing: result.oneThing,
        prefs: result.prefs,
      };
      return result;
    },
  };
  return d;
}

const count = (table: string, userId: string) =>
  Number(psql(`select count(*) from public.${table} where user_id = '${userId}'`).trim());

// ----------------------------------------------------------------- tests ----

describe('sync against Postgres', () => {
  before(() => {
    cluster = startCluster(PORT);
    psql(`insert into auth.users (id) values ('${A}'), ('${B}')`);
  });

  after(() => cluster.stop());

  it('writes every kind of row the app makes, and a second device reads them back unchanged', async () => {
    const noura = contact();
    const phone = device(
      A,
      emptyLocal({
        tasks: [fullTask({ contactIds: [noura.id] }), bareTask(), bareTask({ status: 'snoozed', snoozedUntil: '2026-10-12T08:00:00.000Z' })],
        contacts: [noura, contact({ name: 'Faisal', role: undefined, email: undefined, touchedAt: undefined })],
        history: [historyFor(noura.id), historyFor(noura.id, { kind: 'followup_closed' })],
        followUps: [followUp({ contactId: noura.id }), followUp({ nextAt: null, lastAction: 'closed', lastActionAt: '2026-10-12T09:00:00.000Z', createdAt: undefined })],
        oneThing: { date: TODAY, title: 'Send the proposal', done: false, focusMinutes: 45 },
      })
    );
    await phone.sync([
      { kind: 'terms_privacy', granted: true, version: '2026-10-09', at: '2026-10-10T08:00:00.000Z', source: 'signin' },
      { kind: 'marketing', granted: false, version: '2026-10-09', at: '2026-10-10T08:00:00.000Z', source: 'signin' },
    ]);
    assert.equal(count('task', A), 3);
    assert.equal(count('contact', A), 2);
    assert.equal(count('history', A), 2);
    assert.equal(count('follow_up', A), 2);
    assert.equal(count('consent', A), 2);
    assert.equal(count('settings', A), 1);

    const tablet = device(A, emptyLocal({ profile: { name: '', firstName: '', language: 'ar', platform: 'android' } }));
    await tablet.sync();
    // Compared as rows: the same data, whichever way its absent fields are spelled.
    const rows = <T, R extends { id: string }>(list: T[], toRow: (x: T) => R) =>
      list.map(toRow).sort((x, y) => x.id.localeCompare(y.id));
    assert.deepEqual(rows(tablet.local.tasks, taskToRow), rows(phone.local.tasks, taskToRow));
    assert.deepEqual(rows(tablet.local.contacts, contactToRow), rows(phone.local.contacts, contactToRow));
    assert.deepEqual(rows(tablet.local.history, historyToRow), rows(phone.local.history, historyToRow));
    assert.deepEqual(rows(tablet.local.followUps, followUpToRow), rows(phone.local.followUps, followUpToRow));
    assert.deepEqual(tablet.local.oneThing, phone.local.oneThing);

    // Postgres hands back the same rows, so nothing looks changed.
    const again = await phone.sync();
    assert.equal(again.pushed, 0);
    assert.equal(again.deleted, 0);
  });

  it('carries a deleted contact across, in the order the foreign keys accept', async () => {
    const faisal = contact({ name: 'Faisal Two' });
    const task = bareTask({ contactIds: [faisal.id] });
    const phone = device(A, emptyLocal({ contacts: [faisal], tasks: [task], followUps: [followUp({ contactId: faisal.id, taskId: task.id })] }));
    await phone.sync();
    const tablet = device(A);
    await tablet.sync();

    phone.local = { ...phone.local, contacts: phone.local.contacts.filter((c) => c.id !== faisal.id) };
    await phone.sync();
    // The tablet logs a call with him before it hears he is gone.
    tablet.local = { ...tablet.local, history: [historyFor(faisal.id), ...tablet.local.history] };
    await tablet.sync();

    assert.equal(tablet.local.contacts.some((c) => c.id === faisal.id), false);
    assert.equal(tablet.local.history.some((h) => h.contactId === faisal.id), false);
    assert.deepEqual(tablet.local.tasks.find((t) => t.id === task.id)?.contactIds, []);
    assert.equal(Number(psql(`select count(*) from public.task_contact where contact_id = '${faisal.id}'`).trim()), 0);
  });

  it("keeps each user's rows to themselves", async () => {
    const other = device(B, emptyLocal({ tasks: [bareTask({ title: 'B only' })] }));
    await other.sync();
    const seenByB = await postgresRemote(B).select('task');
    assert.deepEqual(seenByB.map((t) => t.title), ['B only']);
    assert.equal((await postgresRemote(B).select('contact')).length, 0);

    // Writing a row into A's account as B is refused.
    await assert.rejects(
      postgresRemote(B).upsert('task', [{ id: bareTask().id, user_id: A, type: 'call', title: 'x', created_via: 'quick' }], 'id'),
      /row-level security/
    );
  });

  it('lets nobody make themselves Pro, or record a tip they did not pay for', () => {
    assert.throws(() => asUser(A, `update public.app_user set plan = 'pro' where id = '${A}'`), /permission denied/);
    assert.throws(() => asUser(A, `update public.app_user set suspended = false where id = '${A}'`), /permission denied/);
    assert.throws(() => asUser(A, `update public.app_user set apple_sub = 'someone' where id = '${A}'`), /permission denied/);
    assert.throws(() => asUser(A, `insert into public.subscription (user_id, store, product_id, period, status, started_at)
      values ('${A}', 'app_store', 'pro.yearly', 'yearly', 'active', now())`), /row-level security/);
    // Nor record a tip the store never sold.
    assert.throws(() => asUser(A, `insert into public.tip (user_id, store, product_id) values ('${A}', 'app_store', 'tip_large')`), /row-level security/);
    // The fields the user does own still update.
    asUser(A, `update public.app_user set job_title = 'Founder' where id = '${A}'`);
  });

  it('deletes every row of the account and nothing of anyone else’s', () => {
    asUser(A, 'select public.delete_my_account()');
    for (const table of ['task', 'contact', 'history', 'follow_up', 'one_thing', 'settings', 'consent']) {
      assert.equal(count(table, A), 0, table);
    }
    assert.equal(Number(psql(`select count(*) from public.app_user where id = '${A}'`).trim()), 0);
    assert.equal(Number(psql(`select count(*) from auth.users where id = '${A}'`).trim()), 0);
    assert.equal(count('task', B), 1);
    assert.equal(Number(psql(`select count(*) from public.privacy_request where type = 'delete' and user_id is null`).trim()), 1);
    assert.throws(() => psql(`begin; set local role anon; select public.delete_my_account(); commit;`), /permission denied/);
  });
});
