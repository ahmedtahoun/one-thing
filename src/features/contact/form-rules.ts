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
import { splitDialled } from '@/lib/parse/contact';
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

type Reach = { name: string; phone?: string; phone2?: string; email?: string; email2?: string };

/** Why two contacts are the same person, or null. Either number and either email count. */
export function sameContact(a: Reach, b: Reach): 'phone' | 'email' | 'name' | null {
  const phones = (c: Reach) => [phoneKey(c.phone ?? ''), phoneKey(c.phone2 ?? '')].filter((p) => p.length > 6);
  const emails = (c: Reach) => [c.email, c.email2].map((e) => (e ?? '').trim().toLowerCase()).filter(Boolean);
  const theirPhones = phones(b);
  if (phones(a).some((p) => theirPhones.includes(p))) return 'phone';
  const theirEmails = emails(b);
  if (emails(a).some((e) => theirEmails.includes(e))) return 'email';
  const na = nameKey(a.name);
  if (na.length > 2 && na === nameKey(b.name)) return 'name';
  return null;
}

export function findDuplicate(
  form: { name: string; phone: string; email: string; phone2?: string; email2?: string },
  contacts: Contact[],
  selfId?: string
): Contact | undefined {
  return contacts.find((c) => c.id !== selfId && sameContact(form, c) !== null);
}

/**
 * The country a typed number names itself, and the number without it.
 *
 * Found on a phone: an Egyptian owner typed an Egyptian number into a form
 * sitting on +966, and nothing noticed. The picker is only a *default*, and
 * a number that carries its own country should move it — a flag that
 * contradicts the number in front of it is worse than no flag at all,
 * because it is saved and dialled later.
 *
 * Null when the number does not say, which is most of the time: "0501234567"
 * is local to wherever its owner is, and guessing a country from a local
 * number would be the same mistake in the other direction. The picker keeps
 * whatever it has and the digits are left exactly as typed, so nothing moves
 * under the cursor mid-word.
 *
 * Four shapes do say, and `splitDialled` knows all four — written with a
 * plus, with 00, as a bare international number, and the Egyptian mobile
 * (01[0125] and eight more), which is the one local shape that names its own
 * country whatever phone it is typed on.
 */
export function dialFromTyped(typed: string, region?: string): { dial: string; phone: string } | null {
  const digits = typed.replace(/[^\d+]/g, '');
  const international = /^(\+|00)/.test(digits);
  const egyptianMobile = /^01[0125]\d{8}$/.test(digits);
  const bareInternational = !digits.startsWith('0') && !digits.startsWith('+') && digits.length >= 11;
  if (!international && !egyptianMobile && !bareInternational) return null;
  const found = splitDialled(digits, region);
  return found.dial ? { dial: found.dial, phone: found.phone } : null;
}
