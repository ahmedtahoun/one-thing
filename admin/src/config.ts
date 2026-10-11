/**
 * Which data the panel serves, decided once from the environment.
 *
 * - DATABASE_URL set: the real tables, through `data/db.ts`, and real
 *   sign-in through Supabase Auth (NEXT_PUBLIC_SUPABASE_URL and
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY must be set too).
 * - ADMIN_DEMO=1: the handoff's seed data and the prototype's own sign-in
 *   rules. Nothing real is reachable in this mode.
 * - Neither: refuse to start serving. A misconfigured deployment must fail
 *   closed, never fall back to something that looks like it works.
 */
import 'server-only';

import { demoSource } from './data/demo';
import type { DataSource } from './data/source';

export const ADMIN_EMAIL_DOMAIN = 'onlyonething.app';

export type Mode = 'demo' | 'live';

export function mode(): Mode {
  const live = Boolean(process.env.DATABASE_URL);
  const demo = process.env.ADMIN_DEMO === '1';
  if (live && demo) throw new Error('Set either DATABASE_URL or ADMIN_DEMO=1, not both.');
  if (demo) return 'demo';
  if (!live) throw new Error('No data source: set DATABASE_URL (or ADMIN_DEMO=1 for the seed data).');
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error('DATABASE_URL is set but Supabase Auth is not: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }
  return 'live';
}

let live: DataSource | null = null;

export async function source(): Promise<DataSource> {
  if (mode() === 'demo') return demoSource;
  if (!live) live = (await import('./data/db')).dbSource(process.env.DATABASE_URL as string);
  return live;
}
