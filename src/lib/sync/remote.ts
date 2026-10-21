/**
 * The engine's `Remote`, over Supabase.
 *
 * Every call runs as the signed-in user through PostgREST, so row-level
 * security is what limits it to their rows — nothing here filters by user.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Remote } from './engine';

/** PostgREST caps a response (1,000 rows by default), so reads page. */
const PAGE = 1000;

/** The key each table pages in order of, so no row is skipped or repeated. */
const ORDER_BY: Record<string, string> = {
  app_user: 'id',
  task_contact: 'task_id',
  one_thing: 'date',
  settings: 'user_id',
  consent: 'id',
};

export function supabaseRemote(db: SupabaseClient): Remote {
  const fail = (table: string, what: string, error: { message: string } | null) => {
    if (error) throw new Error(`${what} ${table}: ${error.message}`);
  };

  return {
    async select(table) {
      const rows: Record<string, unknown>[] = [];
      for (let from = 0; ; from += PAGE) {
        const order = ORDER_BY[table] ?? 'id';
        let query = db.from(table).select('*').order(order).range(from, from + PAGE - 1);
        if (table === 'task_contact') query = query.order('contact_id');
        const { data, error } = await query;
        fail(table, 'read', error);
        rows.push(...(data ?? []));
        if (!data || data.length < PAGE) return rows;
      }
    },
    async upsert(table, rows, onConflict) {
      const { error } = await db.from(table).upsert(rows, { onConflict, defaultToNull: true });
      fail(table, 'write', error);
    },
    async insert(table, rows) {
      const { error } = await db.from(table).insert(rows);
      fail(table, 'write', error);
    },
    async update(table, match, patch) {
      const { error } = await db.from(table).update(patch).match(match);
      fail(table, 'update', error);
    },
    async remove(table, column, values) {
      // The keys travel in the URL, so a long list goes in several requests.
      for (let i = 0; i < values.length; i += 100) {
        const { error } = await db.from(table).delete().in(column, values.slice(i, i + 100));
        fail(table, 'delete', error);
      }
    },
    async call(fn) {
      const { error } = await db.rpc(fn);
      fail(fn, 'call', error);
    },
  };
}
