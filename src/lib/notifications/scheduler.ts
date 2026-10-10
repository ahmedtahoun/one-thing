/**
 * Hands the plan to the operating system.
 *
 * Everything that decides *what* and *when* is in `plan.ts`, which is tested;
 * this file is the thin part that cannot be, because it needs a device. Keep
 * it that way — logic added here is logic that stops being checked.
 *
 * Notifications are local, not pushed. Every trigger in SCREENS.md §
 * Notifications is something the device already knows about, so none of it
 * waits on a server.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { focusEndNotification, planNotifications, type PlanInput, type PlannedNotification } from './plan';
import { eveningText, followUpText, focusEndText, taskText } from './copy';
import type { Copy, PFX } from '@/content/strings';
import type { Prefs } from '@/lib/model-types';

/** The action buttons on a task reminder. SCREENS.md § Notifications. */
export const TASK_CATEGORY = 'task';
export const FOLLOWUP_CATEGORY = 'followup';

/** Identifies what a notification is about when the user taps one. */
export type NotificationPayload =
  | { kind: 'task' | 'task_repeat'; taskId: string }
  | { kind: 'followup'; followUpId: string }
  | { kind: 'evening' }
  | { kind: 'focus_end' };

export const SNOOZE_MINUTES = 10;

/** Notifications never fire on web, so every call here is a no-op there. */
const supported = Platform.OS !== 'web';

/**
 * Asks once, and reports what the answer was.
 *
 * Settings' "Allow notifications" row opens the OS settings instead when
 * permission has already been refused, because iOS only shows the prompt once
 * (SCREENS.md § 21–23).
 */
export async function requestPermission(): Promise<Notifications.PermissionStatus> {
  if (!supported) return Notifications.PermissionStatus.DENIED;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return Notifications.PermissionStatus.GRANTED;
  if (!current.canAskAgain) return current.status;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.status;
}

export async function hasPermission(): Promise<boolean> {
  if (!supported) return false;
  return (await Notifications.getPermissionsAsync()).granted;
}

/** Registers the Done / Snooze / Open buttons the two action rows carry. */
export async function registerCategories(t: Copy, pfx: (typeof PFX)['en']): Promise<void> {
  if (!supported) return;
  await Notifications.setNotificationCategoryAsync(TASK_CATEGORY, [
    { identifier: 'done', buttonTitle: t.nDone, options: { opensAppToForeground: false } },
    { identifier: 'snooze', buttonTitle: t.nSnooze, options: { opensAppToForeground: false } },
    // "Open task" lives in the contact-profile block, the only place the
    // handoff writes it.
    { identifier: 'open', buttonTitle: pfx.open, options: { opensAppToForeground: true } },
  ]);
  await Notifications.setNotificationCategoryAsync(FOLLOWUP_CATEGORY, [
    { identifier: 'nudge', buttonTitle: t.nudgeBtn, options: { opensAppToForeground: true } },
  ]);
}

function textFor(
  planned: PlannedNotification,
  { tasks, followUps }: Pick<PlanInput, 'tasks' | 'followUps'>,
  t: Copy
) {
  if (planned.kind === 'evening') return eveningText(t);
  if (planned.kind === 'followup') {
    const followUp = followUps.find((f) => f.id === planned.followUpId);
    return followUp ? followUpText(followUp, t) : null;
  }
  const task = tasks.find((candidate) => candidate.id === planned.taskId);
  return task ? taskText(task, t) : null;
}

function payloadFor(planned: PlannedNotification): NotificationPayload {
  if (planned.kind === 'evening') return { kind: 'evening' };
  if (planned.kind === 'focus_end') return { kind: 'focus_end' };
  if (planned.kind === 'followup') return { kind: 'followup', followUpId: planned.followUpId as string };
  return { kind: planned.kind, taskId: planned.taskId as string };
}

/**
 * Brings the OS's pending notifications in line with the plan.
 *
 * Only the difference is applied: a reminder whose instant has not changed
 * keeps its scheduled notification, so editing one task does not churn the
 * other sixty. The focus-session notification is left alone — it is scheduled
 * by the Focus screen, not derived from state.
 */
export async function sync(input: PlanInput, t: Copy): Promise<PlannedNotification[]> {
  if (!supported || !(await hasPermission())) return [];

  const planned = planNotifications(input);
  const wanted = new Map(planned.map((n) => [`${n.id}@${n.at}`, n]));

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const keep = new Set<string>();

  for (const existing of scheduled) {
    const key = existing.content.data?.key as string | undefined;
    if (existing.identifier === 'focus:end' || (key && key.startsWith('focus:'))) continue;
    if (key && wanted.has(key)) keep.add(key);
    else await Notifications.cancelScheduledNotificationAsync(existing.identifier);
  }

  for (const [key, notification] of wanted) {
    if (keep.has(key)) continue;
    const text = textFor(notification, input, t);
    if (!text) continue;
    await schedule(key, notification, text, input.prefs);
  }

  return planned;
}

async function schedule(
  key: string,
  notification: PlannedNotification,
  text: { title: string; body: string },
  prefs: Prefs
) {
  const category =
    notification.kind === 'followup'
      ? FOLLOWUP_CATEGORY
      : notification.kind === 'task' || notification.kind === 'task_repeat'
        ? TASK_CATEGORY
        : undefined;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: text.title,
      body: text.body,
      // `alert` is false under the Quiet style and inside quiet hours; the two
      // toggles in Settings narrow it further.
      sound: notification.alert && prefs.sound,
      vibrate: notification.alert && prefs.vibration ? undefined : [],
      ...(category ? { categoryIdentifier: category } : null),
      data: { key, ...payloadFor(notification) },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(notification.at),
    },
  });
}

/** SCREENS.md § 15: the focus notification is scheduled when the session starts. */
export async function scheduleFocusEnd(endsAt: Date, minutes: number, prefs: Prefs, t: Copy): Promise<void> {
  if (!supported || !(await hasPermission())) return;
  await cancelFocusEnd();
  const planned = focusEndNotification(endsAt, prefs);
  await schedule('focus:end', planned, focusEndText(minutes, t), prefs);
}

export async function cancelFocusEnd(): Promise<void> {
  if (!supported) return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const existing of scheduled) {
    if ((existing.content.data?.key as string | undefined)?.startsWith('focus:')) {
      await Notifications.cancelScheduledNotificationAsync(existing.identifier);
    }
  }
}

export async function cancelAll(): Promise<void> {
  if (!supported) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}
