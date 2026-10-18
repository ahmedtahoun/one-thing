/**
 * The chips on People — All, Waiting, Favorites, Recent — and what each one
 * shows. The idea is a chat list's: the person you want is one tap away
 * without searching. Every filter is read from what the app already knows:
 * open follow-ups, when a message last went out, and a short list of starred
 * people.
 */
import { followUpStatus, type Contact, type FollowUp, type HistoryEntry } from '@/lib/model-types';
import { normalizeArabic } from '@/lib/parse/names';
import { peopleIn, type SmartList } from './smart-lists';

export type BaseFilter = 'all' | 'waiting' | 'favorites' | 'recent' | 'followups' | 'untouched';
/**
 * A label is a chip too: `label:Client` shows everyone labelled Client. So is
 * a smart list — `smart:<id>` — which is a saved rule rather than a field, and
 * is re-read every time the chip is tapped (./smart-lists.ts).
 */
export type PeopleFilter = BaseFilter | `label:${string}` | `smart:${string}`;

export const labelFilter = (label: string): PeopleFilter => `label:${label}`;
export const isLabelFilter = (filter: PeopleFilter): filter is `label:${string}` => filter.startsWith('label:');
export const smartFilter = (id: string): PeopleFilter => `smart:${id}`;
export const isSmartFilter = (filter: PeopleFilter): filter is `smart:${string}` => filter.startsWith('smart:');

/** Every label in use, the most used first. */
export function labelsIn(contacts: readonly Contact[]): string[] {
  const counts = new Map<string, number>();
  for (const c of contacts) for (const l of c.labels ?? []) counts.set(l, (counts.get(l) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([l]) => l);
}

/** People's chips. "Follow-ups" is the whole follow-ups panel, not a filtered list. */
export const PEOPLE_CHIPS: readonly BaseFilter[] = ['all', 'favorites', 'recent', 'untouched', 'followups'];
/** Send to many's chips: "Waiting" there picks the people who owe you a reply. */
export const BULK_CHIPS: readonly BaseFilter[] = ['all', 'waiting', 'favorites', 'recent'];
/**
 * The "Who?" sheet's chips. Recent sits second here, where it is last on
 * People: somebody who taps Call usually wants the person they were just
 * dealing with, and the sheet's own order is deliberately *not* recency
 * (src/features/today/pick-order.ts), so the chip is how that person is
 * reached in one tap instead of a scroll.
 */
export const PICK_CHIPS: readonly BaseFilter[] = ['all', 'recent', 'favorites', 'waiting'];

/** "Recent" is the last week: long enough to include last Sunday's call, short enough to mean something. */
export const RECENT_DAYS = 7;

export type FilterContext = {
  followUps: readonly FollowUp[];
  favorites: ReadonlySet<string>;
  now: Date;
  /** The person's smart lists, so a `smart:` chip can resolve its rule. */
  smartLists?: readonly SmartList[];
  /**
   * What has been logged against each person, which "Not contacted" needs
   * and nothing else does. The sheets that never show that chip leave it
   * out, and an absent history is read as nothing logged.
   */
  history?: readonly HistoryEntry[];
};

/**
 * A name reduced to what two spellings of it share, for matching a person
 * written down somewhere against a contact.
 *
 * The part before " ·" because a follow-up's `who` carries a role after it
 * ("Sara · Buyer"), and `normalizeArabic` because محمّد and محمد are one
 * name to the person who typed either — the same folding the parser has
 * always done (lib/parse/names.ts). Without it a task spoken with
 * diacritics never finds its contact, so it never folds into that person's
 * card and never stops them being listed as having gone quiet.
 */
export const nameKey = (s: string): string => normalizeArabic((s.split(' ·')[0] ?? s).trim().toLowerCase());

/**
 * Who has a follow-up still open, and whether it needs a nudge now (`due`) or
 * is still waiting. A follow-up is matched to its contact by id, or by name
 * for older ones saved without an id.
 */
export function followUpStates(
  contacts: readonly Contact[],
  followUps: readonly FollowUp[],
  now: Date
): Map<string, 'due' | 'waiting'> {
  const states = new Map<string, 'due' | 'waiting'>();
  for (const followUp of followUps) {
    const status = followUpStatus(followUp, now);
    if (status === 'done') continue;
    const byId = followUp.contactId ? contacts.find((c) => c.id === followUp.contactId) : undefined;
    const person = byId ?? contacts.find((c) => nameKey(c.name) === nameKey(followUp.who));
    if (!person) continue;
    states.set(person.id, status === 'due' || states.get(person.id) === 'due' ? 'due' : 'waiting');
  }
  return states;
}

/**
 * Everyone something has actually happened with, by id.
 *
 * Three things count, because all three are the person doing something
 * rather than the app: a message that went out (`touchedAt`, which
 * `saveContact` stamps), anything written into their history — a call, a
 * note, a visit — and a follow-up, open or closed, since promising to come
 * back to somebody is dealing with them.
 *
 * What is deliberately *not* here is `createdAt`. Being added is not an
 * action: it is the thing the chip exists to separate out. A follow-up
 * saved before contacts carried ids is matched by name, the way
 * `followUpStates` does it.
 */
export function actedOn(
  contacts: readonly Contact[],
  history: readonly HistoryEntry[],
  followUps: readonly FollowUp[]
): Set<string> {
  const ids = new Set<string>();
  for (const contact of contacts) if (contact.touchedAt) ids.add(contact.id);
  for (const entry of history) if (entry.contactId) ids.add(entry.contactId);
  for (const followUp of followUps) {
    const byId = followUp.contactId ? contacts.find((c) => c.id === followUp.contactId) : undefined;
    const person = byId ?? contacts.find((c) => nameKey(c.name) === nameKey(followUp.who));
    if (person) ids.add(person.id);
  }
  return ids;
}

/** Added and then left alone: nothing sent, nothing logged, nothing promised. */
export function isUntouched(contact: Contact, acted: ReadonlySet<string>): boolean {
  return !acted.has(contact.id);
}

export function isRecent(contact: Contact, now: Date): boolean {
  const at = Date.parse(contact.touchedAt ?? contact.createdAt);
  return Number.isFinite(at) && now.getTime() - at <= RECENT_DAYS * 86400000 && at <= now.getTime() + 60000;
}

/** The people a chip shows, in the order worth reading them in. */
export function filterPeople(filter: PeopleFilter, contacts: readonly Contact[], context: FilterContext): Contact[] {
  if (isSmartFilter(filter)) {
    const list = context.smartLists?.find((l) => l.id === filter.slice('smart:'.length));
    // A chip whose list has been deleted shows nobody rather than everybody.
    return list ? peopleIn(list, contacts, { favorites: context.favorites, followUps: context.followUps, now: context.now }) : [];
  }
  if (isLabelFilter(filter)) {
    const label = filter.slice('label:'.length);
    return contacts.filter((c) => c.labels?.includes(label));
  }
  switch (filter) {
    case 'all':
      return [...contacts];
    case 'favorites':
      return contacts.filter((c) => context.favorites.has(c.id));
    case 'recent':
      return contacts
        .filter((c) => isRecent(c, context.now))
        .sort((a, b) => (b.touchedAt ?? b.createdAt).localeCompare(a.touchedAt ?? a.createdAt));
    case 'untouched': {
      // Newest first: these are the people just brought in from a phone,
      // and the ones added a minute ago are the ones being worked through.
      const acted = actedOn(contacts, context.history ?? [], context.followUps);
      return contacts.filter((c) => isUntouched(c, acted)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    case 'followups':
    case 'waiting': {
      const states = followUpStates(contacts, context.followUps, context.now);
      // Those who need a nudge first, then those still being waited on.
      return contacts
        .filter((c) => states.has(c.id))
        .sort((a, b) => Number(states.get(b.id) === 'due') - Number(states.get(a.id) === 'due'));
    }
  }
}

export type FilterCounts = { waiting: number; due: number; favorites: number; recent: number; untouched: number };

export function filterCounts(contacts: readonly Contact[], context: FilterContext): FilterCounts {
  const states = followUpStates(contacts, context.followUps, context.now);
  const acted = actedOn(contacts, context.history ?? [], context.followUps);
  return {
    waiting: states.size,
    due: [...states.values()].filter((s) => s === 'due').length,
    favorites: contacts.filter((c) => context.favorites.has(c.id)).length,
    recent: contacts.filter((c) => isRecent(c, context.now)).length,
    untouched: contacts.filter((c) => isUntouched(c, acted)).length,
  };
}

/** Starred people first, everyone else after them in the order they came. */
export function floatFavorites(contacts: readonly Contact[], favorites: ReadonlySet<string>): Contact[] {
  return [...contacts.filter((c) => favorites.has(c.id)), ...contacts.filter((c) => !favorites.has(c.id))];
}
