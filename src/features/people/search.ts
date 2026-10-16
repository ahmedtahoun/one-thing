import type { Contact } from '@/lib/model-types';

/** The People search: name, email, or the digits of a phone number. */
export function matchContact(contact: Contact, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const digits = q.replace(/\D/g, '');
  // Only a query that looks like a number is matched against numbers: "family1"
  // has a digit in it, and would otherwise match every phone containing a 1.
  const numberLike = /^[\d\s+()-]+$/.test(q);
  return (
    contact.name.toLowerCase().includes(q) ||
    (contact.email ?? '').toLowerCase().includes(q) ||
    // A query with no digits must not match every phone number.
    (numberLike && digits.length > 0 && (contact.phone ?? '').replace(/\D/g, '').includes(digits))
  );
}
