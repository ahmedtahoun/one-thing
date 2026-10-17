/**
 * Reading the phone's address book into something worth showing: ordered,
 * searchable, and marked where somebody is already in People.
 *
 * Pure, so the awkward parts — a phone with two entries for one person, a
 * name that differs only by its diacritics, a number written three ways —
 * are tested in Node rather than discovered on somebody's phone with nine
 * hundred contacts in it. `src/lib/phone-contacts/all.ts` does the reading.
 */
import type { ContactDraft } from '@/lib/phone-contacts/draft';
import type { Contact } from '@/lib/model-types';
import { normalizeArabic } from '@/lib/parse/names';

/** Digits only, so "+966 50 123 4567" and "0501234567" are one number. */
export const digitsOf = (value: string): string => value.replace(/\D/g, '').replace(/^00/, '').slice(-9);

const fold = (value: string): string => normalizeArabic(value.trim().toLowerCase());

/**
 * One row per person. A phone holds the same person twice more often than
 * anybody expects — once from the SIM, once from an account — and two rows
 * with one name and one number is a list nobody trusts.
 */
export function dedupe(people: readonly ContactDraft[]): ContactDraft[] {
  const seen = new Map<string, ContactDraft>();
  for (const person of people) {
    const key = person.phone.trim() ? digitsOf(person.phone) : `${fold(person.name)}|${fold(person.email)}`;
    const had = seen.get(key);
    // The fuller record wins: a name with an email beats the same name alone.
    if (!had || (had.email.trim() === '' && person.email.trim() !== '')) seen.set(key, person);
  }
  const kept = [...seen.values()];
  // And a row with nothing on it but a name goes, if somebody of that name
  // has a number — one phone, the same person entered twice.
  const named = new Set(kept.filter((p) => p.phone.trim() !== '').map((p) => fold(p.name)));
  return kept.filter((person) => person.phone.trim() !== '' || !named.has(fold(person.name)));
}

/** Alphabetical by name, in the person's own collation. */
export const byName = (people: readonly ContactDraft[], lang: string): ContactDraft[] =>
  [...people].sort((a, b) => a.name.localeCompare(b.name, lang === 'ar' ? 'ar' : 'en'));

/** Whether a row matches what was typed: any part of the name, or the digits. */
export function matchesQuery(person: ContactDraft, query: string): boolean {
  const asked = query.trim();
  if (asked === '') return true;
  const digits = asked.replace(/\D/g, '');
  if (digits.length >= 3 && digitsOf(person.phone).includes(digits)) return true;
  const folded = fold(asked);
  return fold(person.name).includes(folded) || fold(person.email).includes(folded);
}

/**
 * The id of the person in People this row already is, or null.
 *
 * By number first, because a number is the same person however their name
 * is spelled; then by name, for somebody saved without one.
 */
export function alreadySaved(person: ContactDraft, contacts: readonly Contact[]): string | null {
  const digits = digitsOf(person.phone);
  if (digits) {
    const byNumber = contacts.find((c) => c.phone && digitsOf(c.phone) === digits);
    if (byNumber) return byNumber.id;
  }
  if (person.email.trim()) {
    const byEmail = contacts.find((c) => c.email && fold(c.email) === fold(person.email));
    if (byEmail) return byEmail.id;
  }
  const byName = contacts.find((c) => fold(c.name) === fold(person.name));
  return byName ? byName.id : null;
}
