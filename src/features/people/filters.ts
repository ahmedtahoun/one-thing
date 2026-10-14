/**
 * The chips on People — All, Waiting, Favorites, Recent — and what each one
 * shows. The idea is a chat list's: the person you want is one tap away
 * without searching. Every filter is read from what the app already knows:
 * open follow-ups, when a message last went out, and a short list of starred
 * people.
 */
import { followUpStatus, type Contact, type FollowUp } from '@/lib/model-types';

export type PeopleFilter = 'all' | 'waiting' | 'favorites' | 'recent' | 'followups';

/** People's chips. "Follow-ups" is the whole follow-ups panel, not a filtered list. */
export const PEOPLE_CHIPS: readonly PeopleFilter[] = ['all', 'favorites', 'recent', 'followups'];
/** Send to many's chips: "Waiting" there picks the people who owe you a reply. */
export const BULK_CHIPS: readonly PeopleFilter[] = ['all', 'waiting', 'favorites', 'recent'];

/** "Recent" is the last week: long enough to include last Sunday's call, short enough to mean something. */
export const RECENT_DAYS = 7;

export type FilterContext = {
  followUps: readonly FollowUp[];
  favorites: ReadonlySet<string>;
  now: Date;
};

const nameKey = (s: string): string => (s.split(' ·')[0] ?? s).trim().toLowerCase();

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

export function isRecent(contact: Contact, now: Date): boolean {
  const at = Date.parse(contact.touchedAt ?? contact.createdAt);
  return Number.isFinite(at) && now.getTime() - at <= RECENT_DAYS * 86400000 && at <= now.getTime() + 60000;
}

/** The people a chip shows, in the order worth reading them in. */
export function filterPeople(filter: PeopleFilter, contacts: readonly Contact[], context: FilterContext): Contact[] {
  switch (filter) {
    case 'all':
      return [...contacts];
    case 'favorites':
      return contacts.filter((c) => context.favorites.has(c.id));
    case 'recent':
      return contacts
        .filter((c) => isRecent(c, context.now))
        .sort((a, b) => (b.touchedAt ?? b.createdAt).localeCompare(a.touchedAt ?? a.createdAt));
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

export type FilterCounts = { waiting: number; due: number; favorites: number; recent: number };

export function filterCounts(contacts: readonly Contact[], context: FilterContext): FilterCounts {
  const states = followUpStates(contacts, context.followUps, context.now);
  return {
    waiting: states.size,
    due: [...states.values()].filter((s) => s === 'due').length,
    favorites: contacts.filter((c) => context.favorites.has(c.id)).length,
    recent: contacts.filter((c) => isRecent(c, context.now)).length,
  };
}

/** Starred people first, everyone else after them in the order they came. */
export function floatFavorites(contacts: readonly Contact[], favorites: ReadonlySet<string>): Contact[] {
  return [...contacts.filter((c) => favorites.has(c.id)), ...contacts.filter((c) => !favorites.has(c.id))];
}
