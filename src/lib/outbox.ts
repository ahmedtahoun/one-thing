/**
 * An append-only queue of rows waiting to go to the server.
 *
 * Analytics events and privacy requests are both facts that have already
 * happened: they cannot be merged, re-derived or dropped, so they do not
 * belong in the three-way sync (src/lib/sync/engine.ts) that reconciles
 * mutable lists. They wait here instead, and a sync sends them in order and
 * trims what it sent from the front.
 *
 * `src/lib/consent.ts` does the same thing by hand; it was written first.
 * Nothing here changes it, so the two live side by side until there is a
 * reason to touch consent again.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * The slice of AsyncStorage a queue uses. Injectable so the queue's own
 * behaviour — order, trimming, the cap — can be tested without a device or a
 * browser: AsyncStorage's web implementation reaches for `window`, which
 * `npm test` does not have.
 */
export type Store = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

export type Outbox<T> = {
  /** Everything waiting, oldest first. */
  read: () => Promise<T[]>;
  /** Appends one row and tells the sync there is something to send. */
  add: (row: T) => Promise<void>;
  /** Drops the first `count` rows, once the server has them. */
  dropSent: (count: number) => Promise<void>;
  /** Forgets everything unsent. Account deletion only. */
  clear: () => Promise<void>;
  /** The sync registers here to hear that there is something to send. */
  onQueued: (fn: (() => void) | null) => void;
};

/**
 * @param key   where the queue lives in AsyncStorage
 * @param limit the most rows to keep. Past it the oldest go, because a device
 *              that has been offline for a month must not grow without bound
 *              and recent rows are the useful ones.
 * @param store defaults to AsyncStorage; the tests pass their own.
 */
export function outbox<T>(key: string, limit: number, store: Store = AsyncStorage): Outbox<T> {
  let listener: (() => void) | null = null;

  const read = async (): Promise<T[]> => {
    try {
      const raw = await store.getItem(key);
      return raw ? (JSON.parse(raw) as T[]) : [];
    } catch {
      // A corrupt blob loses the queue rather than the app.
      return [];
    }
  };

  const write = async (rows: T[]): Promise<void> => {
    if (rows.length > 0) await store.setItem(key, JSON.stringify(rows));
    else await store.removeItem(key);
  };

  return {
    read,
    onQueued: (fn) => {
      listener = fn;
    },
    add: async (row) => {
      const rows = [...(await read()), row];
      await write(rows.length > limit ? rows.slice(rows.length - limit) : rows);
      listener?.();
    },
    dropSent: async (count) => {
      if (count <= 0) return;
      await write((await read()).slice(count));
    },
    clear: async () => {
      await store.removeItem(key);
    },
  };
}
