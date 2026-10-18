/**
 * Keeps the operating system's pending notifications in step with the app,
 * and acts on what the user does with one.
 *
 * Mounted once, under the stores it reads. It re-syncs whenever the tasks,
 * the follow-ups or the settings change, which is also what cancels a
 * reminder: a task that is done or snoozed simply stops being planned.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import * as Notifications from 'expo-notifications';
import { AppState, Linking, Platform } from 'react-native';
import { router } from 'expo-router';

import { registerCategories, registerChannel, requestPermission, SNOOZE_MINUTES, sync, type NotificationPayload } from './scheduler';
import { added } from '@/content/additions';
import { useLanguage } from '@/i18n/LanguageProvider';
import { track } from '@/lib/analytics/track';
import { usePeople } from '@/lib/people';
import { usePrefs } from '@/lib/prefs';
import { useTasks } from '@/lib/tasks';

/** A notification arriving while the app is open still shows, silently. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

type NotificationsValue = {
  /**
   * Whether the OS will deliver notifications. Null means the question does
   * not apply: before the first check, and on web, which is a harness target
   * rather than a platform this ships on. Screens should treat null as "do
   * not claim either way" — only an explicit `false` means the user said no.
   */
  allowed: boolean | null;
  /** Asks the OS, and reports whether permission ended up granted. */
  ask: () => Promise<boolean>;
  /** The "turn on" button: asks if the OS still will, otherwise opens the app's settings. */
  turnOn: () => Promise<void>;
  /**
   * How many notifications the OS is actually holding, re-read after every
   * sync. Settings shows it, because an absence of reminders used to be
   * indistinguishable from having none to give (BUILD-REVIEW §2.101).
   */
  scheduled: number;
  /** Open tasks carrying a time, which is what should have produced them. */
  remindable: number;
};

const NotificationsContext = createContext<NotificationsValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { t, pfx, lang, inline } = useLanguage();
  const { tasks, oneThing, ready: tasksReady, toggleDone, snooze } = useTasks();
  const { followUps, ready: peopleReady } = usePeople();
  const { prefs, ready: prefsReady } = usePrefs();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [scheduled, setScheduled] = useState(0);
  // The OS has never been asked: the one chance to ask is worth choosing well.
  const [unasked, setUnasked] = useState(false);
  // Bumped each time the app comes to the front, so the plan is made again from "now":
  // that is what keeps the comeback nudges for someone who really has gone quiet.
  const [opened, setOpened] = useState(0);
  const asked = useRef(false);

  // Read inside the OS listener, which is registered once and would otherwise
  // close over the first render's values.
  const act = useRef({ toggleDone, snooze });
  act.current = { toggleDone, snooze };

  const ask = useCallback(async () => {
    if (Platform.OS === 'web') return false;
    const status = await requestPermission();
    const granted = status === Notifications.PermissionStatus.GRANTED;
    setAllowed(granted);
    return granted;
  }, []);

  const turnOn = useCallback(async () => {
    if (Platform.OS === 'web') return;
    // Ask first and read the answer, rather than deciding from
    // `canAskAgain` what the OS is willing to do. A device that has never
    // been asked gets the prompt; one that has refused returns the refusal
    // without drawing anything, and *then* Settings is the only way
    // forward, which is where this sends them (§2.101).
    if (await ask()) return;
    await Linking.openSettings().catch(() => {});
  }, [ask]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    Notifications.getPermissionsAsync()
      .then((status) => {
        setAllowed(status.granted);
        // Not `&& status.canAskAgain`. iOS has no honest answer to "may I
        // ask again" before it has been asked once, and asking when the
        // answer is already no is a no-op that returns the same no. Gating
        // the one automatic ask on it meant a device that reported it
        // wrongly never saw the prompt at all, and with no permission
        // `sync` returns early — so no reminder, no nudge, no follow-up,
        // and nothing anywhere saying why (BUILD-REVIEW §2.101).
        setUnasked(!status.granted);
      })
      // A rejection used to leave `unasked` false for the life of the app,
      // which killed the only ask the provider has.
      .catch(() => {
        setAllowed(false);
        setUnasked(true);
      });
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setOpened((n) => n + 1);
    });
    return () => subscription.remove();
  }, []);

  // The action buttons carry copy, so they are re-registered when the
  // language changes.
  useEffect(() => {
    if (!allowed) return;
    registerCategories(t, pfx).catch(() => {});
    // Android will not show a notification without a channel; naming it in
    // the reading language is what the person sees in the OS settings.
    registerChannel(inline.notifications).catch(() => {});
  }, [allowed, t, pfx, inline.notifications]);

  const ready = tasksReady && peopleReady && prefsReady;
  /** What *should* have produced a reminder, for the Settings row to compare against. */
  const remindable = tasks.filter((task) => task.status === 'open' && Boolean(task.dueAt)).length;

  // The first task is the moment a reminder means something: ask then, once,
  // rather than leaving the person to find a switch in Settings.
  useEffect(() => {
    if (!ready || !unasked || asked.current || tasks.length === 0) return;
    asked.current = true;
    ask().then(() => setUnasked(false));
  }, [ready, unasked, tasks.length, ask]);

  useEffect(() => {
    if (!allowed || !ready) return;
    let gone = false;
    sync({ tasks, followUps, prefs, habit: true }, t, { oneThing, nudge: added(lang).nudge })
      // What the OS is holding afterwards, not what we meant to give it: a
      // scheduling call that threw or was refused shows up here as a count
      // that did not move, which is what Settings reads.
      .then(() => Notifications.getAllScheduledNotificationsAsync())
      .then((pending) => {
        if (!gone) setScheduled(pending.length);
      })
      .catch(() => {
        // A scheduling failure must not take the app down with it; the next
        // change to the list tries again. It is no longer silent, though —
        // the count stays where it was and Settings says so.
        if (!gone) setScheduled(0);
      });
    return () => {
      gone = true;
    };
  }, [allowed, ready, tasks, followUps, prefs, t, oneThing, lang, opened]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as NotificationPayload | undefined;
      if (!data) return;
      const action = response.actionIdentifier;
      // Every notification the user came back through, whichever kind and
      // whichever button — the funnel step is "a nudge brought them back".
      track({ name: 'nudge_opened' });

      if (data.kind === 'task' || data.kind === 'task_repeat') {
        if (action === 'done') return void act.current.toggleDone(data.taskId);
        if (action === 'snooze') {
          const until = new Date(Date.now() + SNOOZE_MINUTES * 60000).toISOString();
          return void act.current.snooze(data.taskId, until);
        }
        return router.push(`/compose?id=${data.taskId}`);
      }

      // "Nudge (opens Compose)" — but the draft is written on Follow-ups, so
      // the notification lands there rather than guessing which task to open.
      if (data.kind === 'followup') return router.push('/followups');
      if (data.kind === 'evening') return router.push('/review');
      if (data.kind === 'focus_end' || data.kind === 'morning' || data.kind === 'comeback') return router.push('/today');
    });
    return () => subscription.remove();
  }, []);

  return (
    <NotificationsContext.Provider value={{ allowed, ask, turnOn, scheduled, remindable }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used inside <NotificationsProvider>');
  return ctx;
}
