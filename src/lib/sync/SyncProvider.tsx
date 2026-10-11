/**
 * Keeps the device's stores and the server in step.
 *
 * The stores stay what every screen reads and writes; nothing on a screen
 * waits on the network. This sits under them and, whenever there is a
 * signed-in backend user, runs the engine (`engine.ts`): shortly after any
 * local change, when the app comes to the foreground, every few minutes
 * while it is open, and when consent is recorded.
 *
 * With no backend configured (src/lib/supabase.ts), or no backend session —
 * which is every build until Apple and Google sign-in are real — it does
 * nothing at all, and the app runs on the device alone as before.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';

import { dropSentEvents, readEventQueue } from '../analytics/track';
import { dropSentConsent, onConsentQueued, readConsentQueue } from '../consent';
import { dropSentPrivacyRequests, onPrivacyRequestQueued, readPrivacyRequests } from '../privacy-request';
import { dateKey } from '../model-types';
import { usePeople } from '../people';
import { usePrefs } from '../prefs';
import { useSession } from '../session';
import { supabase } from '../supabase';
import { useTasks } from '../tasks';
import { useLanguage } from '@/i18n/LanguageProvider';
import { legacyIds, rewrite } from './adopt';
import { applyDelta, EMPTY_BASE, ORDER, syncOnce, type Base } from './engine';
import { supabaseRemote } from './remote';
import { sameRow } from './reconcile';

/** How long after a local change the sync waits, so a burst of edits is one sync. */
const SETTLE_MS = 2000;
/** How often it looks for changes made on other devices while the app is open. */
const POLL_MS = 5 * 60 * 1000;

const baseKey = (userId: string) => `ot.sync.base.${userId}`;
/** Set when "Delete my account" could not reach the server; retried until it does. */
export const PENDING_DELETE_KEY = 'ot.sync.pendingDelete';

export type SyncStatus = 'off' | 'idle' | 'syncing' | 'error';

type SyncValue = {
  status: SyncStatus;
  /** The backend user, when there is one. */
  userId: string | null;
  lastSyncedAt: string | null;
  /** Syncs now, or after the sync already running; resolves when done. */
  syncNow: () => Promise<void>;
};

const SyncContext = createContext<SyncValue>({
  status: 'off',
  userId: null,
  lastSyncedAt: null,
  syncNow: async () => {},
});

const byId = (item: { id: string }) => item.id;

/** "1.0.0 (iOS 19.1)" — what the admin panel's Troubleshoot shows. */
function appVersion(): string | null {
  const version = Constants.expoConfig?.version;
  if (!version) return null;
  if (Platform.OS === 'ios') return `${version} (iOS ${Platform.Version})`;
  // Platform.Version is the API level on Android (35); the release is "16".
  if (Platform.OS === 'android') {
    const release = (Platform.constants as { Release?: string }).Release ?? String(Platform.Version);
    return `${version} (Android ${release})`;
  }
  return version;
}

/** Whether the OS will deliver notifications; null on web, where it is not asked. */
async function notificationsAllowed(): Promise<boolean | null> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return null;
  try {
    return (await Notifications.getPermissionsAsync()).granted;
  } catch {
    return null;
  }
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const { session, update: updateSession } = useSession();
  const { lang } = useLanguage();
  const taskStore = useTasks();
  const people = usePeople();
  const prefStore = usePrefs();

  const [userId, setUserId] = useState<string | null>(null);
  const [status, setStatus] = useState<SyncStatus>('off');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  // The engine reads the stores as they are when it starts, not as they were
  // when the callback was made.
  const latest = useRef({ session, lang, taskStore, people, prefStore });
  latest.current = { session, lang, taskStore, people, prefStore };

  const ready = taskStore.ready && people.ready && prefStore.ready && Boolean(session);

  // ------------------------------------------------------ backend user ----
  useEffect(() => {
    const db = supabase();
    if (!db) return;
    let cancelled = false;
    db.auth
      .getSession()
      .then(({ data }) => {
        if (!cancelled) setUserId(data.session?.user.id ?? null);
      })
      .catch(() => {});
    const { data } = db.auth.onAuthStateChange((_event, next) => setUserId(next?.user.id ?? null));
    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, []);

  // --------------------------------------------------------------- run ----
  // One sync at a time. A request that arrives mid-sync is answered by one
  // more sync after it, however many requests arrive.
  const inflight = useRef<Promise<void> | null>(null);
  const again = useRef(false);

  const run = useCallback((): Promise<void> => {
    if (inflight.current) {
      again.current = true;
      return inflight.current;
    }
    const current = syncStep().finally(() => {
      inflight.current = null;
      if (again.current) {
        again.current = false;
        void run();
      }
    });
    inflight.current = current;
    return current;
  }, [userId, updateSession]);

  const syncStep = async () => {
    const db = supabase();
    if (!db || !userId) return;
    setStatus('syncing');
    try {
      // An account deletion that did not reach the server goes first, and
      // nothing is synced for an account that is being deleted.
      // A deletion pending for some other account is not this one's to run.
      if ((await AsyncStorage.getItem(PENDING_DELETE_KEY)) === userId) {
        await finishPendingDelete(userId);
        setStatus('idle');
        return;
      }

      const { session: s, lang: language, taskStore: t, people: p, prefStore: pr } = latest.current;
      if (!s) {
        setStatus('idle');
        return;
      }

      // Rows from before sync existed get keys the server can hold, and the
      // sync waits for the stores to take them.
      const lists = { tasks: t.tasks, contacts: p.contacts, history: p.history, followUps: p.followUps };
      const legacy = legacyIds(lists);
      if (legacy.size > 0) {
        t.applySync({ tasks: (list) => list.map((x) => rewrite.task(legacy, x)) });
        p.applySync({
          contacts: (list) => list.map((x) => rewrite.contact(legacy, x)),
          history: (list) => list.map((x) => rewrite.history(legacy, x)),
          followUps: (list) => list.map((x) => rewrite.followUp(legacy, x)),
        });
        // The stores re-render with the new ids, which schedules the sync.
        setStatus('idle');
        return;
      }

      // The session is the backend's user from here on.
      if (s.userId !== userId) await updateSession({ userId });

      const rawBase = await AsyncStorage.getItem(baseKey(userId));
      const base: Base = rawBase ? { ...EMPTY_BASE, ...(JSON.parse(rawBase) as Partial<Base>) } : EMPTY_BASE;
      const consent = await readConsentQueue();
      const events = await readEventQueue();
      const privacyRequests = await readPrivacyRequests();
      const { marketing: _marketing, ...syncedPrefs } = pr.prefs;

      const result = await syncOnce({
        remote: supabaseRemote(db),
        userId,
        base,
        consent,
        events,
        privacyRequests,
        today: dateKey(),
        local: {
          tasks: lists.tasks,
          contacts: lists.contacts,
          history: lists.history,
          followUps: lists.followUps,
          oneThing: t.oneThing,
          prefs: syncedPrefs,
          profile: {
            name: s.name,
            firstName: s.firstName,
            jobTitle: s.jobTitle,
            email: s.email,
            language,
            platform: Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : null,
            appVersion: appVersion(),
            notificationsAllowed: await notificationsAllowed(),
          },
          authProvider: s.authProvider,
        },
      });

      await AsyncStorage.setItem(baseKey(userId), JSON.stringify(result.base));
      await dropSentConsent(result.consentSent);
      await dropSentEvents(result.eventsSent);
      await dropSentPrivacyRequests(result.privacySent);

      // Into the stores, around anything the user changed meanwhile.
      const into = <T extends { id: string }>(before: T[], after: T[], order: (list: T[]) => T[]) =>
        (current: T[]) => {
          const next = applyDelta(current, before, after, byId);
          return next === current ? current : order(next);
        };
      t.applySync({
        tasks: into(lists.tasks, result.tasks, ORDER.tasks),
        oneThing: (current) => (current === t.oneThing ? result.oneThing : current),
      });
      p.applySync({
        contacts: into(lists.contacts, result.contacts, ORDER.contacts),
        history: into(lists.history, result.history, ORDER.history),
        followUps: into(lists.followUps, result.followUps, ORDER.followUps),
      });

      const prefsPatch = sameRow(result.prefs, syncedPrefs) ? {} : result.prefs;
      const marketingPatch =
        result.marketing !== null && result.marketing !== pr.prefs.marketing ? { marketing: result.marketing } : {};
      if (Object.keys(prefsPatch).length + Object.keys(marketingPatch).length > 0) {
        pr.setPrefs({ ...prefsPatch, ...marketingPatch });
      }

      const sessionPatch = {
        ...(result.plan && result.plan !== s.plan ? { plan: result.plan } : {}),
        ...(result.name.name !== s.name ? { name: result.name.name } : {}),
        ...(result.name.firstName !== s.firstName ? { firstName: result.name.firstName } : {}),
        ...(result.name.jobTitle !== s.jobTitle ? { jobTitle: result.name.jobTitle } : {}),
        ...(result.name.email !== s.email ? { email: result.name.email } : {}),
      };
      if (Object.keys(sessionPatch).length > 0) await updateSession(sessionPatch);

      setLastSyncedAt(new Date().toISOString());
      setStatus('idle');
    } catch (error) {
      // The base is untouched, so the next attempt starts from the same
      // place and pushes the same changes again. Nothing is lost.
      console.warn('[sync]', error instanceof Error ? error.message : error);
      setStatus('error');
    }
  };

  // A deletion left pending finishes as soon as the backend session is back,
  // signed into the app or not — "Delete my account" ended the app session.
  useEffect(() => {
    if (!userId) return;
    AsyncStorage.getItem(PENDING_DELETE_KEY)
      .then((pending) => (pending === userId ? finishPendingDelete(userId) : undefined))
      .catch(() => {});
  }, [userId]);

  // ---------------------------------------------------------- triggers ----
  const active = Boolean(userId) && ready;

  // First sync, and whenever the backend user changes.
  useEffect(() => {
    if (active) void run();
    else setStatus(userId ? 'idle' : 'off');
  }, [active, run, userId]);

  // Shortly after any local change.
  const { tasks, oneThing } = taskStore;
  const { contacts, history, followUps } = people;
  const { prefs } = prefStore;
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => void run(), SETTLE_MS);
    return () => clearTimeout(timer);
  }, [active, run, tasks, oneThing, contacts, history, followUps, prefs, session?.name, session?.jobTitle, lang]);

  // On coming back to the app, and every few minutes while it is open.
  useEffect(() => {
    if (!active) return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void run();
    });
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') void run();
    }, POLL_MS);
    return () => {
      subscription.remove();
      clearInterval(timer);
    };
  }, [active, run]);

  // When consent is recorded.
  useEffect(() => {
    onConsentQueued(active ? () => void run() : null);
    return () => onConsentQueued(null);
  }, [active, run]);

  /**
   * An export request is a promise to the user with a 30-day clock on it, so
   * it goes at once rather than waiting for the next change. Analytics events
   * do not: they ride along with whatever syncs next, because a sync per tap
   * would be a sync per tap.
   */
  useEffect(() => {
    onPrivacyRequestQueued(active ? () => void run() : null);
    return () => onPrivacyRequestQueued(null);
  }, [active, run]);


  const syncNow = useCallback(async () => {
    if (!active) return;
    await inflight.current;
    await run();
  }, [active, run]);

  const value = useMemo(
    () => ({ status, userId, lastSyncedAt, syncNow }),
    [status, userId, lastSyncedAt, syncNow]
  );
  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncValue {
  return useContext(SyncContext);
}

// ----------------------------------------------------- leaving the account ----

/**
 * Deletes the account on the server: every row, and the sign-in itself
 * (`delete_my_account`, supabase/migrations/0002_sync.sql). Returns false
 * when it could not be reached, so the caller can leave it pending.
 */
async function deleteOnServer(): Promise<boolean> {
  const db = supabase();
  if (!db) return true;
  const { error } = await db.rpc('delete_my_account');
  if (error) return false;
  await db.auth.signOut().catch(() => {});
  return true;
}

async function finishPendingDelete(userId: string) {
  if (await deleteOnServer()) {
    await AsyncStorage.multiRemove([PENDING_DELETE_KEY, baseKey(userId)]);
  }
}

/**
 * "Delete my account", the server's half. When the server cannot be reached
 * the deletion is remembered, and the backend session kept just long enough
 * to finish it on the next launch with a connection. The design has no
 * screen for "could not delete", and the person asked for it to be gone, so
 * the device is wiped either way (BUILD-REVIEW.md §2.36).
 */
export async function deleteAccountOnServer(): Promise<void> {
  const db = supabase();
  if (!db) return;
  const { data } = await db.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) return;
  if (await deleteOnServer()) await AsyncStorage.removeItem(baseKey(userId));
  else await AsyncStorage.setItem(PENDING_DELETE_KEY, userId);
}

/**
 * Signing out of the server. The device's copy of the account's data goes
 * too — it is all on the server — so whoever signs in next does not inherit
 * it, and the next sign-in starts from a clean base.
 */
export async function signOutOfServer(): Promise<boolean> {
  const db = supabase();
  if (!db) return false;
  const { data } = await db.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) return false;
  await db.auth.signOut().catch(() => {});
  await AsyncStorage.removeItem(baseKey(userId));
  return true;
}
