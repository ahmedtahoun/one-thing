/**
 * What each notification says, in the active language.
 *
 * SCREENS.md § Notifications gives the wording in English only, and three of
 * its five rows have no Arabic anywhere in the handoff ("Focus session done",
 * "{who} hasn't replied", "Close the day?"). Rather than translate them here,
 * each falls back to the nearest copy that does exist in both languages, and
 * BUILD-REVIEW.md §2.25 asks for the real strings.
 */
import type { Copy } from '@/content/strings';
import type { FollowUp, Task } from '@/lib/model-types';
import { dateKey, displayName, type OneThing } from '@/lib/model-types';
import type { Added } from '@/content/additions';

export type NotificationText = { title: string; body: string };

/** "Call · Contract terms" / "Faisal · Lawyer" — SCREENS.md § Notifications. */
export function taskText(task: Task, t: Copy): NotificationText {
  return { title: `${t.types[task.type]} · ${task.title}`, body: task.who ?? '' };
}

/**
 * SCREENS.md gives "{who} hasn't replied". With no Arabic for it, the title
 * is the status the Follow-ups screen already shows for the same state
 * ("Needs a nudge" / "يحتاج متابعة") and the person is the body.
 */
export function followUpText(followUp: FollowUp, t: Copy): NotificationText {
  return { title: t.st.due, body: `${displayName(followUp.who)} · ${followUp.what}` };
}

/** SCREENS.md gives "Close the day?"; Today's own card says it bilingually. */
export function eveningText(t: Copy): NotificationText {
  return { title: t.review, body: t.reviewSub };
}

/**
 * SCREENS.md gives "Focus session done". The nearest bilingual copy is the
 * Focus screen's own session label, with the length filled in.
 */
export function focusEndText(minutes: number, t: Copy): NotificationText {
  return { title: t.focusMeta.replace('{n}', String(minutes)), body: t.rv_close };
}

/**
 * The morning nudge names the day's one thing when there is one, else the
 * first thing due that day, else asks for it — so it is a reason to open the
 * app and decide, not a generic ping.
 */
export function morningText(at: Date, tasks: Task[], oneThing: OneThing | null | undefined, nudge: Added['nudge']): NotificationText {
  const key = dateKey(at);
  const chosen = oneThing && !oneThing.done && oneThing.date === key ? oneThing.title : null;
  const first = tasks
    .filter((task) => task.status === 'open' && task.dueAt && dateKey(new Date(task.dueAt)) === key)
    .sort((a, b) => (a.dueAt ?? '').localeCompare(b.dueAt ?? ''))[0];
  return { title: nudge.morningTitle, body: chosen ?? first?.title ?? nudge.morningAsk };
}

export function comebackText(nudge: Added['nudge']): NotificationText {
  return { title: nudge.comebackTitle, body: nudge.comebackBody };
}
