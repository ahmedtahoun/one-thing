/**
 * What to do next, worked out from what the app already knows.
 *
 * A to-do list makes the person sort, remember and decide. This does that
 * part: it reads tasks, follow-ups and people and returns a short, ranked set
 * of cards, each saying who it is about and why it is here. Pure and free of
 * language, so it can be tested on its own; the screen puts words to it.
 *
 * Three kinds of thing earn a card:
 *   - a task that is late, or due today;
 *   - a follow-up whose wait is over (somebody owes you a reply);
 *   - a person nobody has spoken to in as long as they should be: a favourite
 *     after two weeks, or whoever has a keep-in-touch rhythm of their own.
 * Everything else stays in the full list. The order is fixed and explainable:
 * late work, then replies owed, then today, then people going quiet.
 */
import { followUpStates } from '@/features/people/filters';
import {
  dateKey,
  displayName,
  followUpStatus,
  type Channel,
  type Contact,
  type FollowUp,
  type Task,
} from '@/lib/model-types';

/** How many cards lead the screen; the rest wait behind "show more". */
export const MAX_TOP = 3;
/** A favourite with no rhythm of their own is "going quiet" after this many days without contact. */
export const COLD_DAYS = 14;
/** At most this many "going quiet" cards at once, so they never flood the queue. */
export const MAX_COLD = 2;

export type Reason =
  | { kind: 'late'; minutes: number }
  | { kind: 'today'; at: string }
  | { kind: 'reply'; days: number }
  | { kind: 'quiet'; days: number };

export type NextCard = {
  /** Stable across renders: `task:<id>`, `followup:<id>`, `quiet:<contactId>`. */
  id: string;
  source: 'task' | 'followup' | 'quiet';
  /** How to reach them, when the card is a call, message or email. */
  channel: Channel | null;
  who: string;
  title: string;
  reason: Reason;
  score: number;
  taskId?: string;
  followUpId?: string;
  contactId?: string;
};

export type NextInput = {
  tasks: readonly Task[];
  followUps: readonly FollowUp[];
  contacts: readonly Contact[];
  favorites: ReadonlySet<string>;
  /** Contact id → days between contacts, for people with their own rhythm; 0 is off. */
  cadence?: ReadonlyMap<string, number>;
  /** Card id → ISO time before which it stays out of sight ("Later"). */
  hidden: ReadonlyMap<string, string>;
  now: Date;
};

export type NextResult = {
  /** Everything that needs doing, best first. */
  cards: NextCard[];
  /** How many of those are late or owed a nudge — the red number on the tab. */
  urgent: number;
};

const DAY = 86400000;
const CHANNELS: readonly string[] = ['call', 'email', 'whatsapp'];

const channelOf = (task: Task): Channel | null => (CHANNELS.includes(task.type) ? (task.type as Channel) : null);

/** The person a task is with: the one it links to, else the one it names. */
function personFor(task: Task, contacts: readonly Contact[]): Contact | undefined {
  const linked = task.contactIds[0];
  const byId = linked ? contacts.find((c) => c.id === linked) : undefined;
  if (byId || !task.who) return byId;
  const name = displayName(task.who).trim().toLowerCase();
  return contacts.find((c) => c.name.trim().toLowerCase() === name);
}

const isOpen = (task: Task, now: Date): boolean =>
  task.status === 'open' || (task.status === 'snoozed' && !!task.snoozedUntil && new Date(task.snoozedUntil) <= now);

export function buildNext({ tasks, followUps, contacts, favorites, cadence, hidden, now }: NextInput): NextResult {
  const nowMs = now.getTime();
  const today = dateKey(now);
  const out: NextCard[] = [];
  const seen = (id: string): boolean => {
    const until = hidden.get(id);
    return !!until && Date.parse(until) > nowMs;
  };

  const openTasks = tasks.filter((task) => isOpen(task, now));
  const openTaskIds = new Set(openTasks.map((task) => task.id));
  const withTask = new Set<string>();

  for (const task of openTasks) {
    if (!task.dueAt) continue;
    const due = new Date(task.dueAt);
    const late = due.getTime() < nowMs;
    if (!late && dateKey(due) !== today) continue;

    const id = `task:${task.id}`;
    const person = personFor(task, contacts);
    if (person) withTask.add(person.id);
    if (seen(id)) continue;

    const minutes = Math.max(0, Math.round((nowMs - due.getTime()) / 60000));
    const minuteOfDay = due.getHours() * 60 + due.getMinutes();
    out.push({
      id,
      source: 'task',
      channel: channelOf(task),
      who: task.who ? displayName(task.who) : person?.name ?? '',
      title: task.title,
      reason: late
        ? { kind: 'late', minutes }
        : { kind: 'today', at: `${String(due.getHours()).padStart(2, '0')}:${String(due.getMinutes()).padStart(2, '0')}` },
      // Late work outranks everything; the longer it has slipped the higher, up to a month.
      score: late ? 100 + Math.min(minutes / 1440, 30) : 70 + (1 - minuteOfDay / 1440) * 9,
      taskId: task.id,
      contactId: person?.id,
    });
  }

  for (const followUp of followUps) {
    if (followUpStatus(followUp, now) !== 'due') continue;
    // A nudge already drafted lives on as its task, which is what shows above.
    if (followUp.taskId && openTaskIds.has(followUp.taskId)) continue;

    const id = `followup:${followUp.id}`;
    const person = followUp.contactId ? contacts.find((c) => c.id === followUp.contactId) : undefined;
    if (person) withTask.add(person.id);
    if (seen(id)) continue;

    const since = Date.parse(followUp.nextAt ?? followUp.createdAt ?? '') || nowMs;
    const days = Math.max(0, Math.floor((nowMs - since) / DAY));
    out.push({
      id,
      source: 'followup',
      channel: followUp.channel,
      who: displayName(followUp.who),
      title: followUp.what,
      reason: { kind: 'reply', days },
      score: 90 + Math.min(days, 30) / 3,
      followUpId: followUp.id,
      contactId: person?.id,
    });
  }

  // People going quiet: those with a rhythm (a favourite's default is two weeks), and only if nothing else is open with them.
  const busy = followUpStates(contacts as Contact[], followUps as FollowUp[], now);
  const quiet: NextCard[] = [];
  for (const contact of contacts) {
    const every = cadence?.get(contact.id) ?? (favorites.has(contact.id) ? COLD_DAYS : 0);
    if (every <= 0 || busy.has(contact.id) || withTask.has(contact.id)) continue;
    const id = `quiet:${contact.id}`;
    if (seen(id)) continue;
    const last = Date.parse(contact.touchedAt ?? contact.createdAt);
    if (!Number.isFinite(last)) continue;
    const days = Math.floor((nowMs - last) / DAY);
    if (days < every) continue;
    quiet.push({
      id,
      source: 'quiet',
      channel: null,
      who: contact.name,
      title: contact.role ?? '',
      reason: { kind: 'quiet', days },
      score: 40 + Math.min(days - every, 60) / 4,
      contactId: contact.id,
    });
  }
  quiet.sort((a, b) => b.score - a.score);
  out.push(...quiet.slice(0, MAX_COLD));

  out.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  const urgent = out.filter((c) => c.reason.kind === 'late' || c.reason.kind === 'reply').length;
  return { cards: out, urgent };
}

/** Tomorrow at 09:00 in the device's own time zone: where "Later" puts something. */
export function tomorrowMorning(now: Date): Date {
  const d = new Date(now);
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d;
}
