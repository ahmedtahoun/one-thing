/**
 * What should be delivered, and when.
 *
 * Kept pure — tasks, follow-ups and settings in, a list of instants out — for
 * two reasons. It is the only part of notifications that can be tested
 * without a device, and it is where every rule in SCREENS.md § Notifications
 * actually lives: the per-offset firing, the Firm style's three repeats,
 * quiet hours, and the evening nudge.
 *
 * `src/lib/notifications/scheduler.ts` takes this list and hands it to the OS.
 */
import { dateKey, type FollowUp, type Prefs, type Task } from '@/lib/model-types';
import { remindAt } from '@/lib/reminders';

/** Which row of SCREENS.md § Notifications a planned item comes from. */
export type NotificationKind = 'task' | 'task_repeat' | 'followup' | 'evening' | 'focus_end' | 'morning' | 'comeback';

export type PlannedNotification = {
  /**
   * Stable across re-plans, so an unchanged reminder is not cancelled and
   * re-created every time the task list changes.
   */
  id: string;
  kind: NotificationKind;
  /** ISO instant to fire at. */
  at: string;
  /** What the notification is about, so tapping it can go there. */
  taskId?: string;
  followUpId?: string;
  /** False inside quiet hours, or under the Quiet style: badge and list only. */
  alert: boolean;
};

/** SCREENS.md § 21–23: Firm repeats every 10 minutes, up to three times. */
const FIRM_REPEAT_MINUTES = 10;
const FIRM_REPEAT_COUNT = 3;

/** SCREENS.md § Notifications: the evening nudge. */
export const EVENING_NUDGE = { hour: 18, minute: 30 };

/** The morning "what's your one thing?" nudge: after quiet hours end, before the day gets away. */
export const MORNING_NUDGE = { hour: 9, minute: 0 };
/** How many days ahead the morning nudge is scheduled; the task reminders need the rest of the 60 slots. */
const MORNING_DAYS = 7;
/** When a person who has gone quiet is called back: after two days, and again after five, at 10:00. */
export const COMEBACK_AFTER_DAYS = [2, 5];
const COMEBACK_HOUR = 10;

/** Minutes past midnight, from "HH:MM". */
function minutesOfDay(hhmm: string): number {
  const [h = '0', m = '0'] = hhmm.split(':');
  return Number(h) * 60 + Number(m);
}

/**
 * True when an instant falls inside quiet hours.
 *
 * The window wraps midnight (22:00–08:00 by default), so it is "after the
 * start OR before the end" rather than a plain between.
 */
export function inQuietHours(at: Date, quiet: Prefs['quietHours']): boolean {
  const start = minutesOfDay(quiet.start);
  const end = minutesOfDay(quiet.end);
  const now = at.getHours() * 60 + at.getMinutes();
  return start <= end ? now >= start && now < end : now >= start || now < end;
}

/**
 * Whether a notification at this instant may make a sound or vibrate.
 *
 * Two separate rules land in the same place. The **Quiet style** is silent
 * always ("no sound/vibration; badge + list only"). **Quiet hours** silence
 * everything inside the window — the handoff says to respect them but never
 * says whether a reminder due at 03:00 should be held until 08:00 instead, so
 * it fires on time and silently. BUILD-REVIEW.md §2.24.
 */
export function shouldAlert(at: Date, prefs: Prefs): boolean {
  if (prefs.nudgeStyle === 'quiet') return false;
  return !inQuietHours(at, prefs.quietHours);
}

/** The evening "Close the day?" nudge for the day `now` falls in. */
export function eveningNudgeAt(now: Date): Date {
  const at = new Date(now);
  at.setHours(EVENING_NUDGE.hour, EVENING_NUDGE.minute, 0, 0);
  return at;
}

export type PlanInput = {
  tasks: Task[];
  followUps: FollowUp[];
  prefs: Prefs;
  now?: Date;
  /**
   * The habit nudges — a morning "your one thing" and a comeback after a quiet
   * spell. Off unless asked for, so the plan for tasks alone stays what it was.
   */
  habit?: boolean;
  /** How far ahead to schedule. The OS caps how many can be pending. */
  horizonDays?: number;
};

/**
 * iOS allows 64 pending local notifications per app, so the plan is capped
 * and the soonest win. Anything beyond the horizon is scheduled on a later
 * pass, which happens whenever the task list or the settings change.
 */
export const MAX_PENDING = 60;
const DEFAULT_HORIZON_DAYS = 14;

export function planNotifications({
  tasks,
  followUps,
  prefs,
  now = new Date(),
  habit = false,
  horizonDays = DEFAULT_HORIZON_DAYS,
}: PlanInput): PlannedNotification[] {
  const horizon = new Date(now.getTime() + horizonDays * 86400000);
  const planned: PlannedNotification[] = [];

  const within = (at: Date) => at > now && at <= horizon;

  for (const task of tasks) {
    if (task.status !== 'open' || !task.remind || !task.dueAt) continue;

    // A custom reminder carries its own instant; the rest are derived.
    const fireAt = task.remind === 'custom' ? task.remindAt ?? null : remindAt(task);
    if (!fireAt) continue;
    const at = new Date(fireAt);
    if (!within(at)) continue;

    planned.push({
      id: `task:${task.id}`,
      kind: 'task',
      at: at.toISOString(),
      taskId: task.id,
      alert: shouldAlert(at, prefs),
    });

    // Firm: "on time, then every 10 min up to 3× until done/snoozed". Done and
    // snoozed both leave `status === 'open'` behind, so a task that is no
    // longer open never reaches here and its repeats are dropped on re-plan.
    if (prefs.nudgeStyle === 'firm') {
      for (let n = 1; n <= FIRM_REPEAT_COUNT; n++) {
        const repeat = new Date(at.getTime() + n * FIRM_REPEAT_MINUTES * 60000);
        if (!within(repeat)) continue;
        planned.push({
          id: `task:${task.id}:repeat:${n}`,
          kind: 'task_repeat',
          at: repeat.toISOString(),
          taskId: task.id,
          alert: shouldAlert(repeat, prefs),
        });
      }
    }
  }

  // "{who} hasn't replied" — when a waiting follow-up comes due.
  for (const followUp of followUps) {
    if (followUp.status !== 'waiting' || !followUp.nextAt) continue;
    const at = new Date(followUp.nextAt);
    if (!within(at)) continue;
    planned.push({
      id: `followup:${followUp.id}`,
      kind: 'followup',
      at: at.toISOString(),
      followUpId: followUp.id,
      alert: shouldAlert(at, prefs),
    });
  }

  // "Close the day?" at 18:30, for each day in the horizon that has anything
  // on it — there is nothing to close on an empty day.
  const daysWithTasks = new Set(
    tasks
      .filter((task) => task.dueAt && task.status !== 'cancelled')
      .map((task) => dateKey(new Date(task.dueAt as string)))
  );
  for (let day = 0; day <= horizonDays; day++) {
    const at = eveningNudgeAt(new Date(now.getTime() + day * 86400000));
    if (!within(at) || !daysWithTasks.has(dateKey(at))) continue;
    planned.push({
      id: `evening:${dateKey(at)}`,
      kind: 'evening',
      at: at.toISOString(),
      alert: shouldAlert(at, prefs),
    });
  }

  if (habit) {
    // Each morning, a reason to open the app and name the one thing.
    for (let day = 0; day <= MORNING_DAYS; day++) {
      const at = new Date(now);
      at.setDate(at.getDate() + day);
      at.setHours(MORNING_NUDGE.hour, MORNING_NUDGE.minute, 0, 0);
      if (!within(at)) continue;
      planned.push({ id: `morning:${dateKey(at)}`, kind: 'morning', at: at.toISOString(), alert: shouldAlert(at, prefs) });
    }
    // Re-planned every time the app opens, so these only ever fire for someone who has not been back.
    for (const days of COMEBACK_AFTER_DAYS) {
      const at = new Date(now);
      at.setDate(at.getDate() + days);
      at.setHours(COMEBACK_HOUR, 0, 0, 0);
      if (!within(at)) continue;
      planned.push({ id: `comeback:${days}`, kind: 'comeback', at: at.toISOString(), alert: shouldAlert(at, prefs) });
    }
  }

  return planned.sort((a, b) => a.at.localeCompare(b.at)).slice(0, MAX_PENDING);
}

/**
 * The focus timer's own notification. Scheduled when a session starts rather
 * than planned from state, because nothing persists a running timer —
 * SCREENS.md § 15 says to schedule it on start.
 */
export function focusEndNotification(endsAt: Date, prefs: Prefs): PlannedNotification {
  return {
    id: 'focus:end',
    kind: 'focus_end',
    at: endsAt.toISOString(),
    alert: shouldAlert(endsAt, prefs),
  };
}
