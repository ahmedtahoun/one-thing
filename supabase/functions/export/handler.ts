/**
 * What `export` does with one request, with nothing in it that talks to
 * Postgres or to Storage (handler.test.ts).
 *
 * One request per call, claimed so two runs cannot do the same one twice. A
 * sweep is the caller's job: run it until it answers `idle`.
 */
import {
  exportDocument,
  exportPath,
  EXPORTED,
  THROUGH_PARENT,
  type ExportDocument,
} from '../_shared/export-contract.ts';

export type Claim = { id: string; userId: string; requestedAt: string };

export type Deps = {
  /** The oldest unclaimed export request, or null when there are none. */
  claim(): Promise<Claim | null>;
  /** Every row of `table` where `by` is this user. */
  rows(table: string, by: 'user_id' | 'id', userId: string): Promise<Record<string, unknown>[]>;
  /** Rows of a child table whose parent ids these are. */
  children(table: string, key: string, parentIds: string[]): Promise<Record<string, unknown>[]>;
  /** Writes the document; returns nothing, throws on failure. */
  store(path: string, document: ExportDocument): Promise<void>;
  complete(id: string, path: string): Promise<boolean>;
  /** Hands the request back so it is tried again. */
  release(id: string): Promise<void>;
  now(): Date;
};

export type Reply =
  | { status: 200; body: { done: string; path: string } }
  | { status: 200; body: { idle: true } }
  | { status: 500; body: { error: string } };

export async function handleExport(deps: Deps): Promise<Reply> {
  const claim = await deps.claim();
  if (!claim) return { status: 200, body: { idle: true } };

  try {
    const rows: Record<string, unknown[]> = {};
    const ids: Record<string, string[]> = {};
    for (const { table, as, by } of EXPORTED) {
      const found = await deps.rows(table, by, claim.userId);
      rows[as] = found;
      // Kept so the children below can be fetched by their parents.
      ids[table] = found.map((row) => String(row.id ?? '')).filter(Boolean);
    }
    for (const [table, child] of Object.entries(THROUGH_PARENT)) {
      const parents = ids[child.parent] ?? [];
      rows[child.as] = parents.length > 0 ? await deps.children(table, child.key, parents) : [];
    }

    const path = exportPath(claim.userId, claim.id);
    await deps.store(
      path,
      exportDocument({
        userId: claim.userId,
        requestedAt: claim.requestedAt,
        producedAt: deps.now().toISOString(),
        rows,
      })
    );
    // The file first, then the request: a request marked done with no file is
    // a promise broken silently, while a file with the request still open is
    // repeated work and nothing worse.
    await deps.complete(claim.id, path);
    return { status: 200, body: { done: claim.id, path } };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error('[export]', detail);
    // Otherwise it sits claimed forever and misses its 30-day deadline
    // without anyone being told.
    await deps.release(claim.id).catch(() => {});
    return { status: 500, body: { error: detail.slice(0, 300) } };
  }
}
