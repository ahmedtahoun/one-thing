/**
 * The user's Settings: reminder style, focus length, quiet hours, channels,
 * sound and vibration, and the marketing choice.
 *
 * Defaults are DATA_MODEL.md's — and the column defaults in
 * supabase/migrations/0001_init.sql — which is also what Account setup
 * applies silently (SCREENS.md § 02).
 */
import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';

import type { Prefs } from './model-types';
import { usePersisted } from './persisted';

const STORAGE_KEY = 'ot.prefs';

export const DEFAULT_PREFS: Prefs = {
  nudgeStyle: 'gentle',
  focusMinutes: 45,
  quietHours: { start: '22:00', end: '08:00' },
  channels: { whatsapp: true, email: true, call: true },
  sound: true,
  vibration: true,
  marketing: false,
  // Off until asked for. Nothing anybody typed leaves the phone unredacted
  // until this is true.
  helpSanad: false,
};

type PrefsValue = {
  prefs: Prefs;
  ready: boolean;
  setPrefs: (patch: Partial<Prefs>) => void;
  reset: () => void;
};

const PrefsContext = createContext<PrefsValue | null>(null);

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [stored, setStored, ready, reset] = usePersisted<Prefs>(STORAGE_KEY, DEFAULT_PREFS);
  /**
   * Merged over the defaults on the way *out* as well as in. `usePersisted`
   * hands back what it parsed, cast to `Prefs` — so a blob written before a
   * field existed reads back missing it, and nothing in TypeScript says so.
   * `planNotifications` reads `prefs.quietHours.start` unguarded, which
   * throws, and `NotificationsProvider` swallows the throw: the whole
   * reminder system would go quiet with nothing to show for it
   * (BUILD-REVIEW §2.101).
   */
  const prefs = useMemo<Prefs>(() => ({ ...DEFAULT_PREFS, ...stored }), [stored]);

  const setPrefs = useCallback<PrefsValue['setPrefs']>(
    // Merged over the defaults too, so a blob written before a field existed
    // still reads complete.
    (patch) => setStored((current) => ({ ...DEFAULT_PREFS, ...current, ...patch })),
    [setStored]
  );

  const value = useMemo(
    () => ({ prefs: { ...DEFAULT_PREFS, ...prefs }, ready, setPrefs, reset }),
    [prefs, ready, setPrefs, reset]
  );
  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs(): PrefsValue {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error('usePrefs must be used inside <PrefsProvider>');
  return ctx;
}
