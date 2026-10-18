/**
 * What Settings says about syncing.
 *
 * `SyncProvider` has always known when a sync failed — it sets `'error'` and
 * writes a line to the console — but nothing read it. A device whose token
 * had expired, or whose rows the server rejected, went on looking exactly
 * like one that was up to date: the writing stayed on the phone and the
 * person was never told (BUILD-REVIEW §2.98).
 *
 * The decision of *which* line to show is here so it can be tested; the
 * screen does the words and the colour, and `chatTime` does the clock.
 *
 * The status lives here rather than in `SyncProvider` so this module stays
 * free of React Native — `SyncProvider` imports AsyncStorage, and a test
 * that pulled it in could not run under `node --test`.
 */

export type SyncStatus = 'off' | 'idle' | 'syncing' | 'error';

export type SyncLine =
  /** No backend, or nobody signed in: there is nothing to say. */
  | { kind: 'off' }
  | { kind: 'syncing' }
  /** It failed. `lastAt` is when it last worked, which may be never. */
  | { kind: 'error'; lastAt: string | null }
  | { kind: 'synced'; at: string }
  /** Signed in, nothing has gone up yet. */
  | { kind: 'pending' };

export function syncLine(status: SyncStatus, lastSyncedAt: string | null): SyncLine {
  switch (status) {
    case 'off':
      return { kind: 'off' };
    case 'syncing':
      return { kind: 'syncing' };
    case 'error':
      // The failure is the news, but when it last worked is what tells
      // somebody whether to worry, so it is carried rather than dropped.
      return { kind: 'error', lastAt: lastSyncedAt };
    case 'idle':
      return lastSyncedAt ? { kind: 'synced', at: lastSyncedAt } : { kind: 'pending' };
  }
}

/** Reads as a problem rather than a state, and is coloured like one. */
export const isTrouble = (line: SyncLine): boolean => line.kind === 'error';

/**
 * Whether tapping the row should start a sync. Not while one is already
 * running, and not when there is no backend to sync with.
 */
export const canSyncNow = (line: SyncLine): boolean => line.kind !== 'off' && line.kind !== 'syncing';

/** Whether the row belongs on the screen at all. */
export const showsRow = (line: SyncLine): boolean => line.kind !== 'off';
