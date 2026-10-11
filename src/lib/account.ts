/**
 * Signing out and deleting the account — the two exits at the foot of
 * Settings (SCREENS.md § 21–23).
 */
import { useCallback } from 'react';

import { clearActivityQueues } from './activity';
import { clearEventQueue } from './analytics/track';
import { clearConsentQueue } from './consent';
import { clearPrivacyRequests } from './privacy-request';
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
    // Anything still queued belongs to the session that is ending and can no
    // longer be attributed to it — the sync above was its last chance. Left
    // in place it would go up as the next account's, which is worse than
    // losing an event or an export request whose owner has just left.
    await clearEventQueue();
    await clearPrivacyRequests();
    await clearActivityQueues();
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
    await clearEventQueue();
    await clearPrivacyRequests();
    await clearActivityQueues();
    await endSession();
  }, [wipeDevice, endSession]);

  return { signOut, deleteAccount };
}
