/**
 * A throwaway Postgres cluster with just enough of Supabase stubbed for the
 * migrations to apply and their row-level security to run: the `auth` schema
 * (users, MFA factors, `auth.uid()` reading the request's user) and the
 * `anon` / `authenticated` roles with Supabase's default grants.
 *
 * Used by the sync test (scripts/test-sync-db.ts) and the admin panel's
 * (admin/scripts/test-admin-db.ts).
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = path.join(__dirname, '..');

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

const SUPABASE_STUB = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key, email text, banned_until timestamptz, created_at timestamptz not null default now());
create table auth.mfa_factors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  factor_type text not null,
  status text not null
);
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

export type Cluster = {
  /** postgres://… for a client library. */
  url: string;
  /** Runs SQL as the superuser; returns psql's unaligned output. */
  psql: (sql: string) => string;
  /** Runs SQL as a signed-in user, as PostgREST does. Throws Postgres's message. */
  asUser: (userId: string, sql: string) => string;
  stop: () => void;
};

/** Starts a cluster on `port`, applies the stub and every migration. */
export function startCluster(port: number): Cluster {
  const bin = binDir();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'one-thing-db-'));
  const data = path.join(dir, 'data');
  // Postgres refuses to run as root; the CI runner is not root, a container may be.
  const asRoot = process.getuid?.() === 0;
  const server = (command: string, args: string[]) => {
    const full = path.join(bin, command);
    if (asRoot) execFileSync('runuser', ['-u', 'postgres', '--', full, ...args], { stdio: 'pipe' });
    else execFileSync(full, args, { stdio: 'pipe' });
  };
  const psql = (sql: string) =>
    execFileSync(path.join(bin, 'psql'), ['-X', '-q', '-t', '-A', '-v', 'ON_ERROR_STOP=1', '-h', dir, '-p', String(port), '-U', 'postgres', '-d', 'postgres'], {
      input: sql,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

  if (asRoot) execFileSync('chown', ['postgres', dir]);
  server('initdb', ['-D', data, '-A', 'trust', '-U', 'postgres', '--no-instructions']);
  server('pg_ctl', ['-D', data, '-o', `-k ${dir} -c listen_addresses=127.0.0.1 -p ${port}`, '-w', '-l', path.join(dir, 'log'), 'start']);
  psql(SUPABASE_STUB);
  for (const file of fs.readdirSync(path.join(ROOT, 'supabase/migrations')).sort()) {
    psql(fs.readFileSync(path.join(ROOT, 'supabase/migrations', file), 'utf8'));
  }

  return {
    url: `postgres://postgres@127.0.0.1:${port}/postgres`,
    psql,
    asUser(userId, sql) {
      try {
        return psql(`begin;\nset local role authenticated;\nset local "request.jwt.claim.sub" = '${userId}';\n${sql};\ncommit;\n`);
      } catch (error) {
        const stderr = (error as { stderr?: string }).stderr ?? String(error);
        throw new Error(stderr.trim());
      }
    },
    stop() {
      try {
        server('pg_ctl', ['-D', data, '-m', 'immediate', 'stop']);
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    },
  };
}
