/**
 * The week, read off what the app already recorded.
 *
 * Weekly recap was sold on the paywall before it existed, and taken off the
 * card rather than faked (§2.56). Nothing in SCREENS.md ever described it, so
 * what it *is* had to be decided; the rule followed here is that every number
 * comes from something the app genuinely dates, and nothing is estimated to
 * fill a row.
 *
 * That rules a few obvious things out. `Task` has no "finished at" — only a
 * status — so the number of tasks closed this week cannot be known, and is
 * not claimed. What *is* dated: the days a win was recorded
 * (src/lib/wins.ts), every history entry (`at`), when a follow-up was last
 * acted on (`lastActionAt`), and when a person was last messaged
 * (`touchedAt`). The recap is those four and nothing else.
 *
 * Pure, so the week can be tested without a clock or a screen.
 */
import { dateKey, followUpStatus, type Contact, type FollowUp, type HistoryEntry, type Task } from '@/lib/model-types';
import { streakOf, type Streak } from '@/lib/streak';

const DAY_MS = 86_400_000;

/** How many days the recap covers. A week, counted back from today inclusive. */
export const RECAP_DAYS = 7;

export type Reached = { contact: Contact; times: number };

export type Week = {
  /** The first and last day the recap covers, as `dateKey` strings. */
  from: string;
  to: string;
  /** Days in the week something was finished, and how the streak stands. */
  activeDays: number;
  streak: Streak;
  /** What went out, counted by what it was. */
  sent: { calls: number; messages: number; emails: number; meetings: number; notes: number };
  /** Everything that went out, for the headline. */
  sentTotal: number;
  /** People who heard from you, most often first. */
  reached: Reached[];
  /** Follow-ups closed in the week. */
  closed: number;
  /** Still waiting on a reply as the week ends. */
  waiting: number;
  /** Open tasks already past their time, which carry into next week. */
  carrying: Task[];
};

const KIND_OF: Record<HistoryEntry['kind'], keyof Week['sent'] | null> = {
  call: 'calls',
  whatsapp: 'messages',
  email: 'emails',
  meeting: 'meetings',
  visit: 'meetings',
  note: 'notes',
  // A closed follow-up is counted as `closed`, not as something sent.
  followup_closed: null,
};

export type WeekInput = {
  tasks: readonly Task[];
  followUps: readonly FollowUp[];
  contacts: readonly Contact[];
  history: readonly HistoryEntry[];
  /** The days a win was recorded, as `dateKey` strings (src/lib/wins.ts). */
  wins: readonly string[];
  now: Date;
};

/** Midnight at the start of the week the recap covers. */
function startOf(now: Date): Date {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (RECAP_DAYS - 1));
  return start;
}

export function weekOf({ tasks, followUps, contacts, history, wins, now }: WeekInput): Week {
  const start = startOf(now);
  const startMs = start.getTime();
  const nowMs = now.getTime();
  const within = (iso: string | null | undefined): boolean => {
    if (!iso) return false;
    const at = Date.parse(iso);
    return Number.isFinite(at) && at >= startMs && at <= nowMs;
  };

  const days: string[] = [];
  for (let i = 0; i < RECAP_DAYS; i += 1) days.push(dateKey(new Date(startMs + i * DAY_MS)));
  const winDays = new Set(wins);

  const sent: Week['sent'] = { calls: 0, messages: 0, emails: 0, meetings: 0, notes: 0 };
  const times = new Map<string, number>();
  for (const entry of history) {
    if (!within(entry.at)) continue;
    const bucket = KIND_OF[entry.kind];
    if (bucket) {
      sent[bucket] += 1;
      times.set(entry.contactId, (times.get(entry.contactId) ?? 0) + 1);
    }
  }

  const byId = new Map(contacts.map((c) => [c.id, c]));
  const reached: Reached[] = [...times.entries()]
    .map(([id, count]) => {
      const contact = byId.get(id);
      return contact ? { contact, times: count } : null;
    })
    .filter((r): r is Reached => r !== null)
    .sort((a, b) => b.times - a.times || a.contact.name.localeCompare(b.contact.name));

  return {
    from: days[0] ?? dateKey(now),
    to: dateKey(now),
    activeDays: days.filter((day) => winDays.has(day)).length,
    streak: streakOf(wins, now),
    sent,
    sentTotal: Object.values(sent).reduce((total, n) => total + n, 0),
    reached,
    closed: followUps.filter((f) => f.lastAction === 'closed' && within(f.lastActionAt)).length,
    waiting: followUps.filter((f) => followUpStatus(f, now) !== 'done').length,
    carrying: tasks
      .filter((task) => task.status === 'open' && task.dueAt !== null && Date.parse(task.dueAt) < nowMs)
      .sort((a, b) => Date.parse(a.dueAt ?? '') - Date.parse(b.dueAt ?? '')),
  };
}

/** Whether there is anything to show, so an empty week says so instead of printing noughts. */
export function hasAnything(week: Week): boolean {
  return week.activeDays > 0 || week.sentTotal > 0 || week.closed > 0 || week.carrying.length > 0 || week.waiting > 0;
}
