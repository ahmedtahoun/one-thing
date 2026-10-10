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
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';

import { EMPTY_BASE, syncOnce, type Base, type LocalState, type Remote } from '../src/lib/sync/engine';
import { bareTask, contact, emptyLocal, followUp, fullTask, historyFor } from '../src/lib/sync/fixtures';
import { contactToRow, followUpToRow, historyToRow, taskToRow } from '../src/lib/sync/rows';

const ROOT = path.join(__dirname, '..');
const PORT = '54329';
const TODAY = '2026-10-10';
const A = '00000000-0000-4000-8000-00000000000a';
const B = '00000000-0000-4000-8000-00000000000b';

// --------------------------------------------------------------- cluster ----

function binDir(): string {
  try {
    const dir = execFileSync('pg_config', ['--bindir'], { encoding: 'utf8' }).trim();
    if (fs.existsSync(path.join(dir, 'initdb'))) return dir;
  } catch {
    // Not on PATH; look where Debian and Ubuntu put it.
  }
  const versions = fs.existsSync('/usr/lib/postgresql') ? fs.readdirSync('/usr/lib/postgresql').sort().reverse() : [];
  for (const v of versions) {
    const dir = `/usr/lib/postgresql/${v}/bin`;
    if (fs.existsSync(path.join(dir, 'initdb'))) return dir;
  }
  throw new Error('No Postgres server binaries found (initdb). Install postgresql to run this test.');
}

const BIN = binDir();
const DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'one-thing-db-'));
const DATA = path.join(DIR, 'data');
// Postgres refuses to run as root; the CI runner is not root, a container may be.
const asRoot = process.getuid?.() === 0;

function server(command: string, args: string[]) {
  const full = path.join(BIN, command);
  if (asRoot) execFileSync('runuser', ['-u', 'postgres', '--', full, ...args], { stdio: 'pipe' });
  else execFileSync(full, args, { stdio: 'pipe' });
}

function psql(sql: string): string {
  return execFileSync(
    path.join(BIN, 'psql'),
    ['-X', '-q', '-t', '-A', '-v', 'ON_ERROR_STOP=1', '-h', DIR, '-p', PORT, '-U', 'postgres', '-d', 'postgres'],
    { input: sql, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
  );
}

/** Runs as a signed-in user, as PostgREST does. Throws Postgres's message. */
function asUser(userId: string, sql: string): string {
  try {
    return psql(
      `begin;\nset local role authenticated;\nset local "request.jwt.claim.sub" = '${userId}';\n${sql};\ncommit;\n`
    );
  } catch (error) {
    const stderr = (error as { stderr?: string }).stderr ?? String(error);
    throw new Error(stderr.trim());
  }
}

const SUPABASE_STUB = `
create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema public, auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
-- Supabase's defaults: the API roles get every table, and RLS decides.
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
alter default privileges in schema public grant execute on functions to anon, authenticated;
`;

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
         on conflict (${keys.join(', ')}) do update set ${set}`
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
      privacyRequests: Parameters<typeof syncOnce>[0]['privacyRequests'] = []
    ) {
      const result = await syncOnce({
        remote: postgresRemote(userId),
        userId,
        local: d.local,
        base,
        consent,
        events,
        privacyRequests,
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
    if (asRoot) execFileSync('chown', ['postgres', DIR]);
    server('initdb', ['-D', DATA, '-A', 'trust', '-U', 'postgres', '--no-instructions']);
    server('pg_ctl', ['-D', DATA, '-o', `-k ${DIR} -c listen_addresses= -p ${PORT}`, '-w', '-l', path.join(DIR, 'log'), 'start']);
    psql(SUPABASE_STUB);
    for (const file of fs.readdirSync(path.join(ROOT, 'supabase/migrations')).sort()) {
      psql(fs.readFileSync(path.join(ROOT, 'supabase/migrations', file), 'utf8'));
    }
    psql(`insert into auth.users (id) values ('${A}'), ('${B}')`);
  });

  after(() => {
    try {
      server('pg_ctl', ['-D', DATA, '-m', 'immediate', 'stop']);
    } finally {
      fs.rmSync(DIR, { recursive: true, force: true });
    }
  });

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

  it('lets nobody make themselves Pro', () => {
    assert.throws(() => asUser(A, `update public.app_user set plan = 'pro' where id = '${A}'`), /permission denied/);
    assert.throws(() => asUser(A, `update public.app_user set suspended = false where id = '${A}'`), /permission denied/);
    assert.throws(() => asUser(A, `update public.app_user set apple_sub = 'someone' where id = '${A}'`), /permission denied/);
    assert.throws(() => asUser(A, `insert into public.subscription (user_id, store, product_id, period, status, started_at)
      values ('${A}', 'app_store', 'pro.yearly', 'yearly', 'active', now())`), /row-level security/);
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

  it('deletes every row of the account and nothing of anyone else’s', () => {
    asUser(A, 'select public.delete_my_account()');
    for (const table of ['task', 'contact', 'history', 'follow_up', 'one_thing', 'settings', 'consent']) {
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
