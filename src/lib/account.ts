/**
 * Signing out and deleting the account — the two exits at the foot of
 * Settings (SCREENS.md § 21–23).
 */
import { useCallback } from 'react';

import { clearConsentQueue } from './consent';
import { usePeople } from './people';
import { usePrefs } from './prefs';
import { useSession } from './session';
import { deleteAccountOnServer, signOutOfServer, useSync } from './sync/SyncProvider';
import { useTasks } from './tasks';

export function useAccount() {
  const { signOut: endSession } = useSession();
  const { syncNow } = useSync();
  const tasks = useTasks();
  const people = usePeople();
  const prefs = usePrefs();

  const wipeDevice = useCallback(() => {
    tasks.reset();
    people.reset();
    prefs.reset();
  }, [tasks, people, prefs]);

  /**
   * With a backend, the last changes go up first, and the device's copy is
   * cleared once they have: it is all on the server, and whoever signs in
   * next must not inherit it. Without one, the device is the only copy, so
   * it stays for the next sign-in, as before.
   */
  const signOut = useCallback(async () => {
    await syncNow();
    if (await signOutOfServer()) wipeDevice();
    await endSession();
  }, [syncNow, wipeDevice, endSession]);

  /**
   * "Delete my account": every row on the server (DATA_MODEL § Key rules: a
   * hard delete), then everything on the device, then sign out. The server
   * goes first; if it cannot be reached the deletion is kept and finished on
   * the next launch that can (src/lib/sync/SyncProvider.tsx). The language
   * is kept — it belongs to the device, not the account.
   */
  const deleteAccount = useCallback(async () => {
    await deleteAccountOnServer();
    wipeDevice();
    await clearConsentQueue();
    await endSession();
  }, [wipeDevice, endSession]);

  return { signOut, deleteAccount };
}
