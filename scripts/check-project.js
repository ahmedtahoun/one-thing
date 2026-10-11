/**
 * What is actually set up on the live Supabase project, and what is not.
 *
 *   node scripts/check-project.js          # reads .env
 *   EXPO_PUBLIC_SUPABASE_URL=… EXPO_PUBLIC_SUPABASE_ANON_KEY=… node scripts/check-project.js
 *
 * Only the anon key, which is publishable: no secret is needed to run this
 * and none should be given to it. Everything it asks is something any client
 * could ask.
 *
 * It reports rather than asserts where it cannot be sure — a missing table
 * and a table the anon role cannot see look different, and the difference is
 * printed instead of guessed at. The one thing it fails on is row-level
 * security being off, because that is the failure that cannot wait.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function env() {
  const out = { ...process.env };
  const file = path.join(ROOT, '.env');
  if (fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
      if (m && !out[m[1]]) out[m[1]] = m[2];
    }
  }
  return out;
}

/** The 24 tables the eight migrations create. */
const TABLES = [
  'active_day', 'admin_audit_log', 'admin_member', 'admin_sign_in_failure', 'analytics_event',
  'app_user', 'assist_usage', 'consent', 'contact', 'focus_session', 'follow_up', 'history',
  'one_thing', 'privacy_request', 'review', 'review_item', 'settings', 'store_notification',
  'subscription', 'support_message', 'support_ticket', 'task', 'task_contact', 'tip',
];

/**
 * Tables a signed-out client is refused outright, rather than handed an empty
 * list. Each is a `revoke` in a migration, not an accident:
 *   admin_*             the team's own tables, reached only by the panel
 *   store_notification  the stores' delivery traffic
 *   analytics_event     0006 revokes all from anon; signed-in users insert
 *                       through `authenticated`, which keeps its grants
 * Any *other* table refusing a signed-out client is worth looking at — and
 * all of them refusing means the key is not being read as the anon role.
 */
const EXPECTED_CLOSED = ['admin_audit_log', 'admin_member', 'admin_sign_in_failure', 'store_notification', 'analytics_event'];

/** Ours, as opposed to pgcrypto's. None may be reachable by the anon role. */
const FUNCTIONS = [
  'claim_export_request', 'complete_export_request', 'delete_my_account',
  'lapse_expired_subscriptions', 'record_store_notice', 'record_store_subscription',
  'record_store_tip', 'refund_assist_request', 'release_export_request', 'spend_assist_request',
];

const EDGE = [
  { name: 'assist', expect: 'a token', ok: [401, 400, 503] },
  { name: 'export', expect: 'the service role', ok: [401, 400, 503] },
  { name: 'app-store', expect: "Apple's certificate", ok: [401, 400, 503, 405] },
  { name: 'play-rtdn', expect: 'a Play service account', ok: [401, 400, 503, 405] },
];

const tick = (ok) => (ok ? '✓' : '✗');

async function main() {
  const e = env();
  const url = (e.EXPO_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
  const key = e.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (or put them in .env).');
  // Some terminals mask anything that looks like a secret when it is pasted,
  // and substitute the characters rather than only hiding them. The failure
  // then surfaces as a ByteString error from deep inside fetch, which says
  // nothing useful.
  const odd = [...key].find((c) => c.charCodeAt(0) > 126);
  if (odd) {
    throw new Error(
      `The anon key contains ${JSON.stringify(odd)} (character ${odd.charCodeAt(0)}), which a JWT never does — ` +
        'your terminal most likely masked it while pasting.\nPut it in a .env file with a text editor instead: ' +
        'this script reads .env, and nothing has to go through the command line.'
    );
  }
  // A secret key is the one thing that must never be given to this, so it is
  // named before anything else.
  const payload = (() => {
    try {
      return Buffer.from(key.split('.')[1] ?? '', 'base64url').toString('utf8');
    } catch {
      return '';
    }
  })();
  if (/^sb_secret_/.test(key) || /"role"\s*:\s*"service_role"/.test(payload)) {
    throw new Error('That is the SECRET key, which this never needs and should not have seen. Rotate it in Supabase, then use the publishable one.');
  }
  // Supabase issues two publishable shapes: the legacy anon JWT, and the
  // newer `sb_publishable_…`. Both work.
  if (key.split('.').length !== 3 && !/^sb_publishable_/.test(key)) {
    throw new Error(
      'That does not look like a publishable key: it is neither a JWT (three dot-separated parts) ' +
        'nor an sb_publishable_… key. Copy the anon / publishable key from Supabase → Project Settings → API.'
    );
  }

  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const lines = [];
  /** Things open that should be shut. Only these can say "open to the world". */
  let fatal = 0;
  /** Things shut that were expected open, or otherwise odd. Not exposures. */
  let surprises = 0;

  const get = async (p, init = {}) => {
    try {
      return await fetch(`${url}${p}`, { ...init, headers: { ...headers, ...(init.headers || {}) } });
    } catch (cause) {
      // Worth saying plainly: the usual reason is a network that will not
      // reach the host, not anything wrong with the project.
      throw new Error(
        `Could not reach ${new URL(url).host}${p} — ${cause instanceof Error ? cause.message : cause}.\n` +
          'Check the URL, and that this machine is allowed to reach it.'
      );
    }
  };

  // The key is checked once, against a request that must succeed, before
  // anything is reported. A rejected key makes every later answer look the
  // same — every table "present but closed", every row hidden — which reads
  // like a well-locked project and means nothing at all.
  //
  // The probe is an ordinary table read, which is exactly what the app does.
  // It must not be `/rest/v1/` — the API description — because a project may
  // restrict that to the secret key, and a publishable key being refused
  // there says nothing about the key.
  const probe = await get(`/rest/v1/${TABLES[0]}?select=*&limit=1`);
  if (probe.status === 401 || probe.status === 403) {
    const why = (await probe.text().catch(() => '')).slice(0, 200);
    throw new Error(
      `The project rejected this key (HTTP ${probe.status})${why ? `: ${why}` : ''}.\n` +
        'Nothing below would mean anything, so nothing is reported. Copy the anon / publishable key ' +
        'again from Supabase → Project Settings → API.'
    );
  }

  // ---------------------------------------------------------- the schema ----
  lines.push(`Project ${url}`, '', 'Schema');
  const missing = [];
  const denied = [];
  for (const table of TABLES) {
    const r = await get(`/rest/v1/${table}?select=*&limit=1`);
    if (r.status === 404) missing.push(table);
    else if (r.status === 401 || r.status === 403) denied.push(table);
    else if (!r.ok) missing.push(`${table} (HTTP ${r.status})`);
  }
  lines.push(`  ${tick(missing.length === 0)} ${TABLES.length - missing.length}/${TABLES.length} tables present`);
  if (missing.length) lines.push(`      missing: ${missing.join(', ')}`);
  if (denied.length) {
    const intended = denied.filter((t) => EXPECTED_CLOSED.includes(t));
    const rest = denied.filter((t) => !EXPECTED_CLOSED.includes(t));
    if (intended.length) lines.push(`      closed to a signed-out client, as the migrations intend: ${intended.join(', ')}`);
    if (rest.length) {
      // Not an exposure — the opposite — so it is a surprise to look at,
      // never a reason to say anything is open.
      surprises++;
      lines.push(`      · unexpectedly closed: ${rest.join(', ')}`);
      lines.push('        A signed-out client should get an empty list from these, not a refusal.');
      if (rest.length > 3) lines.push('        This many usually means the key is not being read as the anon role.');
    }
  }

  // Row-level security: a signed-out client must see nothing at all.
  if (missing.length < TABLES.length) {
    const leaks = [];
    for (const table of ['app_user', 'task', 'contact', 'subscription', 'analytics_event']) {
      const r = await get(`/rest/v1/${table}?select=*&limit=1`);
      if (!r.ok) continue;
      const rows = await r.json().catch(() => []);
      if (Array.isArray(rows) && rows.length > 0) leaks.push(table);
    }
    const ok = leaks.length === 0;
    if (!ok) fatal++;
    lines.push(`  ${tick(ok)} row-level security hides every row from a signed-out client`);
    if (!ok) lines.push(`      READABLE WITHOUT SIGNING IN: ${leaks.join(', ')} — stop and fix this first`);
  }

  // The privileged functions must not be reachable by the anon role at all.
  // PostgREST only keeps functions the role may execute in its schema cache,
  // so a revoked one answers 404 — which is the result we want. Anything
  // else means the anon role can see it, and that is worth looking at even
  // though a granted function called with the wrong arguments can also 404.
  const exposed = [];
  for (const fn of FUNCTIONS) {
    const r = await get(`/rest/v1/rpc/${fn}`, {
      method: 'POST',
      body: '{}',
      headers: { 'Content-Type': 'application/json' },
    });
    if (r.status !== 404 && r.status !== 401 && r.status !== 403) exposed.push(`${fn} (HTTP ${r.status})`);
  }
  const grantsOk = exposed.length === 0;
  if (!grantsOk) fatal++;
  lines.push(`  ${tick(grantsOk)} none of the ${FUNCTIONS.length} privileged functions answers a signed-out caller`);
  if (!grantsOk) lines.push(`      REACHABLE WITHOUT SIGNING IN: ${exposed.join(', ')}`);

  // ------------------------------------------------------------- sign-in ----
  lines.push('', 'Sign-in');
  const settings = await get('/auth/v1/settings').then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (!settings) lines.push('  · could not read the auth settings');
  else {
    const ext = settings.external || {};
    for (const provider of ['apple', 'google']) {
      lines.push(`  ${tick(Boolean(ext[provider]))} ${provider} ${ext[provider] ? 'enabled' : 'not enabled — the whole sync layer waits on this'}`);
    }
  }
  for (const [name, label] of [['EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID', 'Google web client ID'], ['EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID', 'Google iOS client ID']]) {
    lines.push(`  ${tick(Boolean(e[name]))} ${label}${e[name] ? '' : ' missing from .env'}`);
  }

  // ------------------------------------------------------ edge functions ----
  lines.push('', 'Edge functions');
  for (const fn of EDGE) {
    const r = await get(`/functions/v1/${fn.name}`, { method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json' } });
    const deployed = r.status !== 404;
    const note = !deployed ? 'not deployed' : r.status === 503 ? `deployed, unconfigured (needs ${fn.expect})` : `deployed (HTTP ${r.status})`;
    lines.push(`  ${tick(deployed)} ${fn.name} — ${note}`);
  }

  // ------------------------------------------------------------- storage ----
  lines.push('', 'Storage');
  const bucket = await get('/storage/v1/object/list/exports', {
    method: 'POST',
    body: JSON.stringify({ prefix: '', limit: 1 }),
    headers: { 'Content-Type': 'application/json' },
  });
  const body = await bucket.text().catch(() => '');
  if (bucket.status === 401 || bucket.status === 403) {
    lines.push('  · storage refused the key, so the bucket was not checked');
  } else {
    const exists = !/bucket not found/i.test(body);
    lines.push(`  ${tick(exists)} exports bucket ${exists ? 'exists' : 'not found — the export job has nowhere to write'}`);
  }

  console.log(lines.join('\n'));
  if (fatal) {
    console.log(`\n${fatal} thing(s) above are reachable without signing in. Nothing else matters until they are closed.`);
    process.exitCode = 1;
  } else if (surprises) {
    console.log(`\n${surprises} thing(s) above are shut tighter than expected. Not an exposure — worth understanding, not fixing in a hurry.`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
