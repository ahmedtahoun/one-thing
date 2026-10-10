/**
 * Signing out and deleting the account — the two exits at the foot of
 * Settings (SCREENS.md § 21–23).
 */
import { useCallback } from 'react';

import { usePeople } from './people';
import { usePrefs } from './prefs';
import { useSession } from './session';
import { useTasks } from './tasks';

export function useAccount() {
  const { signOut } = useSession();
  const tasks = useTasks();
  const people = usePeople();
  const prefs = usePrefs();

  /**
   * "Delete my account": wipe everything on the device and sign out.
   *
   * DATA_MODEL § Key rules also requires a hard delete of every server row
   * within 30 days. There is no backend yet (src/lib/supabase.ts), so there
   * is nothing server-side to delete; when there is, the request goes here,
   * before the local wipe, so a failure can still be shown to the user.
   * The language is kept — it belongs to the device, not the account.
   */
  const deleteAccount = useCallback(async () => {
    tasks.reset();
    people.reset();
    prefs.reset();
    await signOut();
  }, [tasks, people, prefs, signOut]);

  return { signOut, deleteAccount };
}
