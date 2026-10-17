/**
 * Adding a lot of people at once — which the app allows, and says one
 * sentence about.
 *
 * Both ways into People take a crowd: a file of contacts (`app/import.tsx`)
 * and now the phone's own book (`app/phone-book.tsx`), where somebody can
 * select all and add eight hundred in a tap. That is the owner's decision
 * and it is a normal thing for a CRM to do.
 *
 * What it is not is a thing to do *silently*. Everyone added is a real
 * person who did not install anything, their details sync to the account
 * and are visible to support, and the policy's own words for it are "you
 * are telling us you are allowed to hold them". Above a crowd's worth, the
 * screen says so before the button — no extra tap, no blocking, just the
 * sentence on the screen while the decision is being made. A regulator
 * asking later finds a user who was told; a user asking later finds they
 * were not tricked.
 *
 * Pure, and the threshold lives here so both screens use the same one.
 */
import type { Contact } from '@/lib/model-types';
import type { ContactDraft } from '@/lib/phone-contacts/draft';
import { alreadySaved } from './phone-book';

/**
 * Where "a few people" becomes "a list of people".
 *
 * A hundred is a judgement, not a rule from anywhere: it is past any
 * plausible hand-picked selection — a team, a client list, the people at a
 * conference — and well under a whole address book, so the sentence
 * appears when somebody is importing a *population* rather than choosing
 * colleagues.
 */
export const MANY = 100;

export const isMany = (count: number): boolean => count >= MANY;

/** The rows that would actually add somebody: the rest are already here. */
export function addable(rows: readonly ContactDraft[], contacts: readonly Contact[]): ContactDraft[] {
  return rows.filter((row) => alreadySaved(row, contacts) === null);
}

/** A tap: in if it was out, out if it was in. */
export function toggle(chosen: ReadonlySet<string>, key: string): Set<string> {
  const next = new Set(chosen);
  if (!next.delete(key)) next.add(key);
  return next;
}
