import type { Contact } from '@/lib/model-types';

/** The People search: name, email, or the digits of a phone number. */
export function matchContact(contact: Contact, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const digits = q.replace(/\D/g, '');
  return (
    contact.name.toLowerCase().includes(q) ||
    (contact.email ?? '').toLowerCase().includes(q) ||
    // A query with no digits must not match every phone number.
    (digits.length > 0 && (contact.phone ?? '').replace(/\D/g, '').includes(digits))
  );
}
