/**
 * Who is signed in, what plan they are on, and whether this is their first run.
 *
 * Persisted locally so the app opens straight onto Today. The backend is the
 * source of truth once it is configured; until then this is the whole store.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Plan } from '@/policy/entitlements';

const STORAGE_KEY = 'ot.session';

export type Session = {
  userId: string;
  /** Full name as typed in Account setup. */
  name: string;
  /** Used in the greeting, the assistant, the paywall title and the avatar. */
  firstName: string;
  jobTitle?: string;
  email?: string;
  authProvider: 'apple' | 'google';
  plan: Plan;
  /** True until the user sets or skips their first One Thing. */
  firstRun: boolean;
};

type SessionValue = {
  session: Session | null;
  /** False until the stored session has been read — routing waits on this. */
  ready: boolean;
  signIn: (s: Omit<Session, 'plan' | 'firstRun'> & Partial<Pick<Session, 'plan' | 'firstRun'>>) => Promise<void>;
  update: (patch: Partial<Session>) => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (cancelled) return;
        if (raw) {
          try {
            setSession(JSON.parse(raw) as Session);
          } catch {
            // A corrupt blob is treated as signed out rather than crashing.
          }
        }
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(async (next: Session | null) => {
    setSession(next);
    if (next) await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  const signIn = useCallback<SessionValue['signIn']>(
    async (s) => {
      await persist({ plan: 'free', firstRun: true, ...s });
    },
    [persist]
  );

  const update = useCallback<SessionValue['update']>(
    async (patch) => {
      setSession((current) => {
        if (!current) return current;
        const next = { ...current, ...patch };
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    []
  );

  const signOut = useCallback(async () => {
    await persist(null);
  }, [persist]);

  const value = useMemo(
    () => ({ session, ready, signIn, update, signOut }),
    [session, ready, signIn, update, signOut]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>');
  return ctx;
}
