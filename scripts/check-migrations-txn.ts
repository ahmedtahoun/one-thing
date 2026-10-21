/**
 * Every migration, applied the way production applies it: one file per
 * execution, each wrapped in a single transaction.
 *
 * `npm run schema:check` and the db suites run each *statement* in its own
 * transaction, which is not what the Supabase SQL Editor does — it wraps an
 * execution whole. The difference is not cosmetic: Postgres refuses to let a
 * new enum value be used in the transaction that added it, so a migration
 * that adds one and then uses it passes every check here and fails on the
 * only machine that matters.
 *
 * That is exactly what 0015 did before it was split (BUILD-REVIEW §2.117).
 * This is the check that would have caught it.
 *
 *   npm run schema:txn
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = path.join(import.meta.dirname ?? __dirname, '..');
const DIR = path.join(ROOT, 'supabase/migrations');
const PORT = 54347;

const bin = (() => {
  for (const d of ['/usr/lib/postgresql/17/bin', '/usr/lib/postgresql/16/bin', '/usr/lib/postgresql/15/bin']) {
    if (fs.existsSync(path.join(d, 'initdb'))) return d;
  }
  return path.dirname(execFileSync('bash', ['-c', 'command -v psql'], { encoding: 'utf8' }).trim());
})();

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'one-thing-txn-'));
const data = path.join(dir, 'data');
const asPostgres = (cmd: string, args: string[]) =>
  execFileSync(process.getuid?.() === 0 ? 'su' : cmd, process.getuid?.() === 0 ? ['postgres', '-c', [path.join(bin, cmd), ...args].map((a) => `'${a}'`).join(' ')] : args, {
    stdio: 'pipe',
    encoding: 'utf8',
    ...(process.getuid?.() === 0 ? {} : { cwd: dir }),
  });

const url = `postgres://postgres@127.0.0.1:${PORT}/postgres`;
let started = false;
const failures: string[] = [];
try {
  if (process.getuid?.() === 0) execFileSync('chown', ['postgres', dir]);
  asPostgres('initdb', ['-D', data, '-A', 'trust', '-U', 'postgres', '--no-instructions']);
  asPostgres('pg_ctl', ['-D', data, '-o', `-k ${dir} -c listen_addresses=127.0.0.1 -p ${PORT}`, '-w', '-l', path.join(dir, 'log'), 'start']);
  started = true;

  const stub = fs.readFileSync(path.join(ROOT, 'scripts/pg-cluster.ts'), 'utf8').match(/const SUPABASE_STUB = `([\s\S]*?)`;/)?.[1];
  if (!stub) throw new Error('could not read the Supabase stub from scripts/pg-cluster.ts');
  execFileSync('psql', ['-X', '-q', '-v', 'ON_ERROR_STOP=1', '-d', url], { input: stub, encoding: 'utf8', stdio: 'pipe' });

  for (const file of fs.readdirSync(DIR).sort()) {
    const sql = fs.readFileSync(path.join(DIR, file), 'utf8');
    try {
      // -1: the whole file in one transaction, as the SQL Editor runs it.
      execFileSync('psql', ['-X', '-q', '-v', 'ON_ERROR_STOP=1', '-1', '-d', url], { input: sql, encoding: 'utf8', stdio: 'pipe' });
      console.log(`  ok    ${file}`);
    } catch (e) {
      const why = String((e as { stderr?: string }).stderr ?? e).split('\n').find((l) => l.startsWith('ERROR:')) ?? 'failed';
      console.log(`  FAIL  ${file}  ${why}`);
      failures.push(`${file}: ${why}`);
    }
  }
} finally {
  if (started) { try { asPostgres('pg_ctl', ['-D', data, '-m', 'immediate', '-w', 'stop']); } catch { /* going away anyway */ } }
  fs.rmSync(dir, { recursive: true, force: true });
}

console.log(JSON.stringify({ files: fs.readdirSync(DIR).length, failing: failures.length, failures }, null, 2));
process.exit(failures.length ? 1 : 0);
