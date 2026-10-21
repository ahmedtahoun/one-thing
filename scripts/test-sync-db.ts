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
import { newId } from '../src/lib/ids';
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
    async sync(
      consent: Parameters<typeof syncOnce>[0]['consent'] = [],
      events: Parameters<typeof syncOnce>[0]['events'] = [],
      privacyRequests: Parameters<typeof syncOnce>[0]['privacyRequests'] = [],
      focus: Parameters<typeof syncOnce>[0]['focus'] = [],
      reviews: Parameters<typeof syncOnce>[0]['reviews'] = [],
      phrasings: Parameters<typeof syncOnce>[0]['phrasings'] = []
    ) {
      const result = await syncOnce({
        remote: postgresRemote(userId),
        userId,
        local: d.local,
        base,
        consent,
        events,
        privacyRequests,
        focus,
        reviews,
        phrasings,
        today: TODAY,
      });
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

  it('takes analytics events and an export request, and will not let them be rewritten', async () => {
    const phone = device(A);
    const result = await phone.sync(
      [],
      [
        { name: 'task_created', at: '2026-10-10T08:00:00.000Z', props: { type: 'call', via: 'quick' } },
        { name: 'task_done', at: '2026-10-10T09:00:00.000Z', props: null },
      ],
      [{ kind: 'export', at: '2026-10-10T09:30:00.000Z' }]
    );
    assert.equal(result.eventsSent, 2);
    assert.equal(result.privacySent, 1);
    assert.equal(count('analytics_event', A), 2);
    // The enum keeps a typo out, and jsonb keeps the properties queryable.
    assert.equal(
      psql(`select props->>'via' from public.analytics_event where name = 'task_created'`).trim(),
      'quick'
    );
    assert.equal(count('privacy_request', A), 1);
    // The 30-day clock the admin panel counts down starts itself.
    assert.equal(
      psql(`select (deadline_at > requested_at + interval '29 days') from public.privacy_request where user_id = '${A}'`).trim(),
      't'
    );

    // Both are records of something that happened: readable, never editable.
    assert.throws(() => asUser(A, `update public.analytics_event set name = 'purchase' where user_id = '${A}'`), /permission denied/);
    assert.throws(() => asUser(A, `delete from public.analytics_event where user_id = '${A}'`), /permission denied/);
    assert.throws(() => asUser(A, `delete from public.privacy_request where user_id = '${A}'`), /permission denied/);
    // And they are nobody else's to read or write.
    assert.equal(Number(asUser(B, `select count(*) from public.analytics_event`).trim()), 0);
    assert.throws(
      () => asUser(B, `insert into public.analytics_event (user_id, name) values ('${A}', 'signin')`),
      /row-level security/
    );
  });

  it('sends how somebody asked, already redacted, and keeps it to them', async () => {
    const phone = device(A);
    const result = await phone.sync(
      [],
      [],
      [],
      [],
      [],
      [
        { text: 'مين لازم ارد على {name}؟', verdict: 'waiting', source: 'typed', lang: 'ar', dialect: 'egypt', at: '2026-10-10T08:00:00.000Z' },
        { text: 'how is this month going?', verdict: 'unknown', source: 'spoken', lang: 'en', dialect: 'gulf', at: '2026-10-10T08:05:00.000Z' },
      ]
    );
    assert.equal(result.phrasingsSent, 2);
    assert.equal(count('assistant_phrasing', A), 2);
    assert.equal(
      psql(`select verdict from public.assistant_phrasing where source = 'spoken'`).trim(),
      'unknown'
    );

    // A record of something that happened: readable by its own author, never
    // editable, and nobody else's to read or to write on their behalf.
    assert.throws(() => asUser(A, `update public.assistant_phrasing set text = 'x' where user_id = '${A}'`), /permission denied/);
    assert.throws(() => asUser(A, `delete from public.assistant_phrasing where user_id = '${A}'`), /permission denied/);
    assert.equal(Number(asUser(B, `select count(*) from public.assistant_phrasing`).trim()), 0);
    assert.throws(
      () => asUser(B, `insert into public.assistant_phrasing (user_id, text, verdict, source, lang, dialect) values ('${A}', 'hi', 'smalltalk', 'typed', 'en', 'gulf')`),
      /row-level security/
    );

    // The device redacts; the table is the second lock. A client that forgot
    // is rejected rather than quietly storing somebody's number.
    assert.throws(
      () => psql(`insert into public.assistant_phrasing (user_id, text, verdict, source, lang, dialect) values ('${A}', 'call her on 01001234567', 'task', 'typed', 'en', 'gulf')`),
      /check constraint/
    );
  });

  it('writes focus sessions and closed reviews into their own tables, and nobody else’s', async () => {
    const task = bareTask();
    const phone = device(A, emptyLocal({ tasks: [task] }));
    await phone.sync();
    await phone.sync(
      [],
      [],
      [],
      [{ id: newId(), startedAt: '2026-10-10T08:00:00.000Z', plannedMin: 45, endedAt: '2026-10-10T08:45:00.000Z', completed: true }],
      [{ date: TODAY, oneThingDone: true, closedAt: '2026-10-10T20:00:00.000Z', items: [{ taskId: task.id, decision: 'drop' }] }]
    );
    assert.equal(count('focus_session', A), 1);
    assert.equal(count('review', A), 1);
    assert.equal(psql(`select decision from public.review_item where user_id = '${A}'`).trim(), 'drop');
    // Another user can neither read them nor file one under A.
    assert.equal(asUser(B, 'select count(*) from public.focus_session').trim(), '0');
    assert.throws(
      () => asUser(B, `insert into public.focus_session (user_id, planned_min) values ('${A}', 25)`),
      /row-level security/
    );
  });

  it('deletes every row of the account and nothing of anyone else’s', () => {
    asUser(A, 'select public.delete_my_account()');
    for (const table of ['task', 'contact', 'history', 'follow_up', 'one_thing', 'settings', 'consent', 'focus_session', 'review', 'review_item']) {
      assert.equal(count(table, A), 0, table);
    }
    assert.equal(Number(psql(`select count(*) from public.app_user where id = '${A}'`).trim()), 0);
    assert.equal(Number(psql(`select count(*) from auth.users where id = '${A}'`).trim()), 0);
    assert.equal(count('task', B), 1);
    assert.equal(Number(psql(`select count(*) from public.privacy_request where type = 'delete' and user_id is null`).trim()), 1);
    // The deletion event, and the events A had already sent, survive the hard
    // delete with no user_id — which is what lets the funnel keep its shape
    // without keeping who was in it.
    assert.equal(count('analytics_event', A), 0);
    assert.equal(
      Number(psql(`select count(*) from public.analytics_event where user_id is null and name = 'account_deleted'`).trim()),
      1
    );
    assert.equal(Number(psql(`select count(*) from public.analytics_event where user_id is null`).trim()), 3);
    assert.throws(() => psql(`begin; set local role anon; select public.delete_my_account(); commit;`), /permission denied/);
  });
});
