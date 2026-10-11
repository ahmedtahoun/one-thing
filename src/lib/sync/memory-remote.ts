/**
 * A server in memory, for the engine's tests: one user's tables, the same
 * keys as the schema, and the same cascades its foreign keys declare, so a
 * deletion here leaves what Postgres would leave. The database test
 * (scripts/test-sync-db.ts) runs the same engine against the real thing.
 */
import type { Remote } from './engine';

type Raw = Record<string, unknown>;

const KEYS: Record<string, string[]> = {
  app_user: ['id'],
  task: ['id'],
  task_contact: ['task_id', 'contact_id'],
  contact: ['id'],
  history: ['id'],
  follow_up: ['id'],
  one_thing: ['user_id', 'date'],
  settings: ['user_id'],
  consent: ['id'],
  active_day: ['user_id', 'day'],
  focus_session: ['id'],
  review: ['user_id', 'date'],
  review_item: ['user_id', 'date', 'task_id'],
};

export type MemoryServer = Remote & {
  tables: Map<string, Raw[]>;
  /** Every call, in order — "upsert task", "remove contact" — for asserting on. */
  log: string[];
};

export function memoryRemote(): MemoryServer {
  const tables = new Map<string, Raw[]>(Object.keys(KEYS).map((t) => [t, []]));
  const log: string[] = [];
  const rows = (table: string) => tables.get(table) ?? [];
  const keyOf = (table: string, row: Raw, columns = KEYS[table] ?? ['id']) => columns.map((c) => String(row[c])).join('|');

  const cascade = (table: string, ids: Set<string>) => {
    if (table === 'contact') {
      tables.set('history', rows('history').filter((h) => !ids.has(String(h.contact_id))));
      tables.set('task_contact', rows('task_contact').filter((l) => !ids.has(String(l.contact_id))));
      tables.set(
        'follow_up',
        rows('follow_up').map((f) => (ids.has(String(f.contact_id)) ? { ...f, contact_id: null } : f))
      );
    }
    if (table === 'task') {
      tables.set('task_contact', rows('task_contact').filter((l) => !ids.has(String(l.task_id))));
      tables.set('follow_up', rows('follow_up').map((f) => (ids.has(String(f.task_id)) ? { ...f, task_id: null } : f)));
    }
  };

  return {
    tables,
    log,
    async select(table) {
      return rows(table).map((row) => ({ ...row }));
    },
    async upsert(table, incoming, onConflict) {
      log.push(`upsert ${table}`);
      const columns = onConflict.split(',');
      const list = [...rows(table)];
      for (const row of incoming) {
        const at = list.findIndex((existing) => keyOf(table, existing, columns) === keyOf(table, row, columns));
        if (at >= 0) list[at] = { ...list[at], ...row };
        else list.push({ ...row });
      }
      tables.set(table, list);
    },
    async insert(table, incoming) {
      log.push(`insert ${table}`);
      const extra = table === 'consent' ? incoming.map((r, i) => ({ id: `consent-${rows(table).length + i}`, ...r })) : incoming;
      tables.set(table, [...rows(table), ...extra.map((r) => ({ ...r }))]);
    },
    async update(table, match, patch) {
      log.push(`update ${table}`);
      tables.set(
        table,
        rows(table).map((row) => (Object.entries(match).every(([k, v]) => row[k] === v) ? { ...row, ...patch } : row))
      );
    },
    async remove(table, column, values) {
      if (values.length === 0) return;
      log.push(`remove ${table}`);
      const gone = new Set(values);
      const removed = new Set(rows(table).filter((row) => gone.has(String(row[column]))).map((row) => String(row.id)));
      tables.set(table, rows(table).filter((row) => !gone.has(String(row[column]))));
      cascade(table, removed);
    },
  };
}
