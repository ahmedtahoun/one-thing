/**
 * The order the "Who?" sheet puts people in, and what each row says under
 * the name.
 *
 * The sheet used to list favourites and then everyone in the order they were
 * added, with their phone number underneath. With ninety contacts that is a
 * scroll, and a phone number is not why anyone opened it.
 *
 * **It is ordered by what is owed, not by what is recent.** A chat app sorts
 * by recency because you reopen what you just closed. This app is for the
 * opposite: the person at the top of a recency list is the one you spoke to
 * an hour ago and could not forget if you tried, and the one slipping away
 * is the one who has been waiting since Tuesday. So:
 *
 *   1. they owe you a reply and it is overdue — longest wait first
 *   2. they owe you a reply
 *   3. you reached them lately — most recent first
 *   4. you have not reached them in a while — least cold first
 *   5. you never have
 *
 * A favourite does not jump the queue; it only breaks a tie inside its own
 * group. Starring somebody says "I deal with them often", which is not the
 * same as "they need me first", and a starred person with nothing owed used
 * to sit above somebody who had been waiting a week.
 *
 * Everything here is read from what the phone already holds — follow-ups,
 * contact history, favourites — so the sheet costs no request and works
 * offline. Pure: `PickSheet` does the formatting, `src/content/additions.ts`
 * holds the words.
 */
import { COLD_DAYS } from '@/features/next/build';
import { nameKey } from '@/features/people/filters';
import { followUpStatus, type Contact, type FollowUp, type HistoryEntry, type HistoryKind } from '@/lib/model-types';

/** What the row says under the name, as data rather than words. */
export type PickStatus =
  /** They owe you a reply. `due` once the follow-up's own date has passed. */
  | { kind: 'owed'; due: boolean; what: string; days: number }
  /** You reached them within the last `COLD_DAYS`. */
  | { kind: 'reached'; how: HistoryKind; days: number }
  /** You reached them, but not lately. */
  | { kind: 'cold'; days: number }
  /** Nothing has ever passed between you. */
  | { kind: 'never' };

export type PickRow = { contact: Contact; status: PickStatus };

export type PickContext = {
  followUps: readonly FollowUp[];
  history: readonly HistoryEntry[];
  favorites: ReadonlySet<string>;
  now: Date;
};

const DAY = 86400000;

/**
 * Whole days from `iso` to `now`, or null when the date is missing or
 * unreadable. Never negative: a date in the future reads as today, because
 * "you called them in -2 days" is not a thing to show anybody.
 */
export function daysSince(iso: string | null | undefined, now: Date): number | null {
  if (!iso) return null;
  const at = Date.parse(iso);
  if (!Number.isFinite(at)) return null;
  return Math.max(0, Math.floor((now.getTime() - at) / DAY));
}

/** The one follow-up still open for this person — the oldest — or null. */
function owedTo(contact: Contact, followUps: readonly FollowUp[], now: Date): FollowUp | null {
  const open = followUps.filter((f) => followUpStatus(f, now) !== 'done');
  const byId = open.filter((f) => f.contactId === contact.id);
  const mine = byId.length > 0 ? byId : open.filter((f) => !f.contactId && nameKey(f.who) === nameKey(contact.name));
  // The one waited on longest is the one worth naming.
  return mine.sort((a, b) => (a.createdAt ?? a.nextAt ?? '').localeCompare(b.createdAt ?? b.nextAt ?? ''))[0] ?? null;
}

/** The last thing that happened with this person, or null. */
function lastTouch(contact: Contact, history: readonly HistoryEntry[]): HistoryEntry | null {
  let latest: HistoryEntry | null = null;
  for (const entry of history) {
    if (entry.contactId !== contact.id) continue;
    if (!latest || entry.at > latest.at) latest = entry;
  }
  return latest;
}

/** What one row says, before anybody turns it into words. */
export function statusOf(contact: Contact, context: PickContext): PickStatus {
  const { followUps, history, now } = context;

  const owed = owedTo(contact, followUps, now);
  if (owed) {
    return {
      kind: 'owed',
      due: followUpStatus(owed, now) === 'due',
      what: owed.what,
      days: daysSince(owed.createdAt ?? owed.nextAt, now) ?? 0,
    };
  }

  const touch = lastTouch(contact, history);
  const touchDays = daysSince(touch?.at, now);
  if (touch && touchDays !== null) {
    return touchDays <= COLD_DAYS ? { kind: 'reached', how: touch.kind, days: touchDays } : { kind: 'cold', days: touchDays };
  }

  // No history entry, but the contact was touched — sent to, most likely,
  // before history recorded it. Worth more than "never".
  const seen = daysSince(contact.touchedAt, now);
  if (seen !== null) return seen <= COLD_DAYS ? { kind: 'reached', how: 'note', days: seen } : { kind: 'cold', days: seen };

  return { kind: 'never' };
}

/** Lower sorts first. */
function group(status: PickStatus): number {
  if (status.kind === 'owed') return status.due ? 0 : 1;
  if (status.kind === 'reached') return 2;
  if (status.kind === 'cold') return 3;
  return 4;
}

/**
 * Inside a group: the one who has waited longest first for the two owed
 * groups, the most recent first for the two reached ones. "Never" has no
 * days to sort by at all.
 */
function within(status: PickStatus): number {
  if (status.kind === 'never') return 0;
  return status.kind === 'owed' ? -status.days : status.days;
}

export function orderForPicking(contacts: readonly Contact[], context: PickContext): PickRow[] {
  const rows = contacts.map((contact) => ({ contact, status: statusOf(contact, context) }));
  return rows.sort((a, b) => {
    const byGroup = group(a.status) - group(b.status);
    if (byGroup !== 0) return byGroup;
    const byWithin = within(a.status) - within(b.status);
    if (byWithin !== 0) return byWithin;
    // A star breaks a tie, and only a tie.
    const star = Number(context.favorites.has(b.contact.id)) - Number(context.favorites.has(a.contact.id));
    if (star !== 0) return star;
    return a.contact.name.localeCompare(b.contact.name);
  });
}
