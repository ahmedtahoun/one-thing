/**
 * The contact form's rules. SCREENS.md § 12, DATA_MODEL § Key rules.
 *
 *   - a name of at least two characters is required;
 *   - an email, if given, must look like one;
 *   - a phone number, if given, needs at least seven digits;
 *   - a duplicate is the same name (ignoring case, accents and word order),
 *     the same phone number (seven or more digits, ignoring zeros in front),
 *     or the same email (ignoring case).
 */
import type { Contact } from '@/lib/model-types';
import { normalizeArabic } from '@/lib/parse/names';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function nameValid(name: string): boolean {
  return name.trim().length > 1;
}

export function emailInvalid(email: string): boolean {
  return email.trim().length > 0 && !EMAIL.test(email.trim());
}

/**
 * SCREENS.md asks for "phone ≥7 digits if entered". The prototype never
 * checks the number at all; the spec is followed (BUILD-REVIEW.md §2.23).
 */
export function phoneInvalid(phone: string): boolean {
  const digits = phone.replace(/\D/g, '').length;
  return digits > 0 && digits < 7;
}

/** A name as it is compared: any case, accents and Arabic spellings merged, the words in any order. */
export function nameKey(name: string): string {
  return normalizeArabic(name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(' ');
}

/** A number as it is compared: its digits without the zeros in front, so 055… and 55… are one. */
export function phoneKey(phone: string): string {
  return phone.replace(/\D/g, '').replace(/^0+/, '');
}

/** Why two contacts are the same person, or null. */
export function sameContact(
  a: { name: string; phone?: string; email?: string },
  b: { name: string; phone?: string; email?: string }
): 'phone' | 'email' | 'name' | null {
  const pa = phoneKey(a.phone ?? '');
  if (pa.length > 6 && pa === phoneKey(b.phone ?? '')) return 'phone';
  const ea = (a.email ?? '').trim().toLowerCase();
  if (ea.length > 0 && ea === (b.email ?? '').trim().toLowerCase()) return 'email';
  const na = nameKey(a.name);
  if (na.length > 2 && na === nameKey(b.name)) return 'name';
  return null;
}

export function findDuplicate(
  form: { name: string; phone: string; email: string },
  contacts: Contact[],
  selfId?: string
): Contact | undefined {
  return contacts.find((c) => c.id !== selfId && sameContact(form, c) !== null);
}
