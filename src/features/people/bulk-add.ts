/**
 * Adding a lot of people at once.
 *
 * Both ways into People take a crowd: a file of contacts
 * (`app/import.tsx`) and the phone's own book (`app/phone-book.tsx`),
 * where Select all adds everybody who is not here yet in one tap. What
 * this decides is only who *would* be added — the people already in
 * People are not among them — and how a tap changes the selection.
 *
 * It briefly also carried a line of warning above a hundred people; the
 * owner asked for it to come out before the change shipped
 * (BUILD-REVIEW §2.95).
 */
import type { Contact } from '@/lib/model-types';
import type { ContactDraft } from '@/lib/phone-contacts/draft';
import { alreadySaved } from './phone-book';

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
