/**
 * Smart lists: "groups that keep themselves up to date as people change",
 * which is what the Pro+ card promises.
 *
 * A smart list is not a folder people are put into — nothing is copied and
 * nothing goes stale. It is a **rule**, stored and evaluated every time the
 * list is drawn, so somebody who answers an email leaves "waiting on a reply"
 * by answering it, and somebody who goes thirty days without a word joins
 * "quiet clients" without anyone filing them there.
 *
 * Every condition reads something the app already holds: a label, a
 * favourite, when they were last messaged (`touchedAt`), an open follow-up, a
 * missing number or email. Nothing here needs a server, a lookup or a new
 * field on `Contact` — which matters, because a field the server has never
 * seen would be dropped on the next sync, the same reason favourites and
 * keep-in-touch rhythms live on the device (src/lib/cadence.ts).
 *
 * Conditions are joined with **and**, deliberately. "Clients I have not
 * spoken to in a month" is `label:Client` and `quiet:30`, which is the shape
 * real questions take; mixing and with or needs a query builder, and a query
 * builder is a different product from an app whose whole argument is fewer
 * taps.
 */
import { followUpStates, nameKey } from './filters';
import { type Contact, type FollowUp } from '@/lib/model-types';

/** One thing that must be true of a person. */
export type Condition =
  /** Tagged with this label, as typed. */
  | { kind: 'label'; label: string }
  | { kind: 'favourite' }
  /** No word sent for this many days. */
  | { kind: 'quiet'; days: number }
  /** They owe a reply: a follow-up of theirs is still open. */
  | { kind: 'waiting' }
  /** Nothing has ever been sent to them. */
  | { kind: 'never' }
  | { kind: 'noPhone' }
  | { kind: 'noEmail' };

export type SmartList = {
  id: string;
  /** What the person called it; shown as the chip. */
  name: string;
  /** All of these must hold. An empty rule matches nobody, not everybody. */
  all: readonly Condition[];
  createdAt: string;
};

export type ListWorld = {
  favorites: ReadonlySet<string>;
  followUps: readonly FollowUp[];
  now: Date;
};

/** The days of silence a "quiet" condition can be set to. */
export const QUIET_DAYS = [7, 14, 30, 90] as const;

const DAY_MS = 86_400_000;

/** How long since anything was sent to them, or null when nothing ever was. */
export function silentFor(contact: Contact, now: Date): number | null {
  if (!contact.touchedAt) return null;
  const at = Date.parse(contact.touchedAt);
  if (!Number.isFinite(at)) return null;
  return Math.floor((now.getTime() - at) / DAY_MS);
}

/**
 * Whether one condition holds. `states` is passed in rather than computed
 * here so a list of five hundred people walks the follow-ups once.
 */
export function holds(condition: Condition, contact: Contact, world: ListWorld, states: ReadonlyMap<string, 'due' | 'waiting'>): boolean {
  switch (condition.kind) {
    case 'label':
      return (contact.labels ?? []).some((l) => nameKey(l) === nameKey(condition.label));
    case 'favourite':
      return world.favorites.has(contact.id);
    case 'quiet': {
      const days = silentFor(contact, world.now);
      // Never contacted is not "quiet for 30 days" — it is its own condition,
      // so a brand-new contact does not appear in a list about going cold.
      return days !== null && days >= condition.days;
    }
    case 'waiting':
      return states.has(contact.id);
    case 'never':
      return !contact.touchedAt;
    case 'noPhone':
      return !contact.phone?.trim();
    case 'noEmail':
      return !contact.email?.trim();
  }
}

/**
 * The people a list holds, right now. An empty rule holds nobody: a list that
 * matched everyone the moment its last condition was deleted would be a
 * surprise, and the builder has nothing to show for it either.
 */
export function peopleIn(list: SmartList, contacts: readonly Contact[], world: ListWorld): Contact[] {
  if (list.all.length === 0) return [];
  const states = followUpStates(contacts, world.followUps, world.now);
  return contacts
    .filter((contact) => list.all.every((condition) => holds(condition, contact, world, states)))
    .sort((a, b) => (b.touchedAt ?? b.createdAt).localeCompare(a.touchedAt ?? a.createdAt));
}

/** How many each list holds, for the chips, walking the follow-ups once. */
export function countsFor(lists: readonly SmartList[], contacts: readonly Contact[], world: ListWorld): Map<string, number> {
  const states = followUpStates(contacts, world.followUps, world.now);
  const counts = new Map<string, number>();
  for (const list of lists) {
    counts.set(
      list.id,
      list.all.length === 0 ? 0 : contacts.filter((c) => list.all.every((condition) => holds(condition, c, world, states))).length,
    );
  }
  return counts;
}

/** A list's rule as a sentence, for the builder and the empty state. */
export function describe(list: SmartList, words: Record<Condition['kind'], string>, join: string, daysWord: string): string {
  return list.all
    .map((condition) => {
      if (condition.kind === 'label') return condition.label;
      if (condition.kind === 'quiet') return `${words.quiet} ${daysWord.replace('{n}', String(condition.days))}`;
      return words[condition.kind];
    })
    .join(` ${join} `);
}

/** Whether a rule already holds this condition, so the builder can toggle rather than repeat. */
export function hasCondition(list: SmartList, condition: Condition): boolean {
  return list.all.some((c) => c.kind === condition.kind && (c.kind !== 'label' || c.label === (condition as { label: string }).label) && (c.kind !== 'quiet' || c.days === (condition as { days: number }).days));
}
