/**
 * The three-way merge every synced list goes through.
 *
 * Three versions of a list meet: what is on the device now (local), what the
 * server holds now (remote), and what the server held when this device last
 * finished a sync (base). Comparing each side with the base says who changed
 * what since then, without clocks — device clocks disagree, and the schema
 * keeps no edit times.
 *
 * Per row:
 *   changed here only          → push it
 *   changed there only         → take it
 *   changed on both            → this device's version wins and is pushed
 *   deleted here, untouched there → delete it there
 *   deleted there, untouched here → drop it here
 *   deleted on one side, edited on the other → the edit survives
 *
 * "Last device to sync wins" on a true conflict is crude, but the data is
 * one person's, edited on one device at a time in practice; BUILD-REVIEW.md
 * §2.36 says what would replace it.
 */

export type Reconciled<R> = {
  /** The list both sides should hold once the pushes land. */
  merged: R[];
  /** Rows the server needs: new here, or changed here. */
  upsert: R[];
  /** Keys the server should delete. */
  remove: string[];
};

/** Rows are plain JSON, so equality is equality of their JSON. */
export function sameRow(a: unknown, b: unknown): boolean {
  return stable(a) === stable(b);
}

function stable(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : v
  );
}

export function reconcile<R>(local: R[], base: R[], remote: R[], key: (row: R) => string): Reconciled<R> {
  const L = new Map(local.map((r) => [key(r), r]));
  const B = new Map(base.map((r) => [key(r), r]));
  const R = new Map(remote.map((r) => [key(r), r]));

  const merged: R[] = [];
  const upsert: R[] = [];
  const remove: string[] = [];

  const ids = new Set([...L.keys(), ...B.keys(), ...R.keys()]);
  for (const id of ids) {
    const l = L.get(id);
    const b = B.get(id);
    const r = R.get(id);

    if (l !== undefined) {
      const changedHere = b === undefined || !sameRow(l, b);
      if (r !== undefined) {
        if (changedHere) {
          merged.push(l);
          if (!sameRow(l, r)) upsert.push(l);
        } else {
          merged.push(r);
        }
      } else if (b !== undefined && !changedHere) {
        // Deleted there, untouched here: it goes.
      } else {
        // New here, or edited here after being deleted there.
        merged.push(l);
        upsert.push(l);
      }
    } else if (r !== undefined) {
      if (b !== undefined && sameRow(r, b)) {
        remove.push(id);
      } else {
        // New there, or edited there after being deleted here.
        merged.push(r);
      }
    }
    // Neither side has it: deleted on both, nothing to do.
  }

  return { merged, upsert, remove };
}

/**
 * The same rule for a single row — Settings, the profile — with one
 * difference: a device that has never synced takes the server's row. Its
 * own is the defaults a fresh install starts with, not a choice the user
 * made, and must not overwrite the one they made on another device.
 */
export function reconcileOne<R>(local: R, base: R | null, remote: R | null): { merged: R; push: boolean } {
  if (remote === null) return { merged: local, push: true };
  if (base === null) return { merged: remote, push: false };
  if (base !== null && sameRow(local, base)) return { merged: remote, push: false };
  return { merged: local, push: !sameRow(local, remote) };
}

/**
 * Brings what the sync decided into a list the user may have changed while
 * it ran. `before` is the list the sync read; `after` is what it decided.
 * Anything the user touched since `before` — tracked by object identity, as
 * the stores replace an object whenever they change it — is left as the user
 * left it, and the next sync takes it from there.
 *
 * Returns `current` itself when nothing changes, so a sync that finds
 * nothing to do re-renders nothing.
 */
export function applyDelta<T>(current: T[], before: T[], after: T[], key: (item: T) => string): T[] {
  const was = new Map(before.map((item) => [key(item), item]));
  const will = new Map(after.map((item) => [key(item), item]));
  const now = new Map(current.map((item) => [key(item), item]));

  let changed = false;
  const next: T[] = [];
  for (const item of current) {
    const id = key(item);
    const touchedSince = was.get(id) !== item;
    if (touchedSince) {
      next.push(item);
      continue;
    }
    const decided = will.get(id);
    if (decided === undefined) {
      changed = true; // removed by the sync
      continue;
    }
    if (decided !== item) changed = true;
    next.push(decided);
  }
  for (const [id, item] of will) {
    if (!was.has(id) && !now.has(id)) {
      next.push(item);
      changed = true;
    }
  }
  return changed ? next : current;
}
