/**
 * The contact form's rules. SCREENS.md § 12, DATA_MODEL § Key rules.
 *
 *   - a name of at least two characters is required;
 *   - an email, if given, must look like one;
 *   - a phone number, if given, needs at least seven digits;
 *   - a duplicate is the same name (ignoring case), the same phone digits
 *     (seven or more), or the same email (ignoring case).
 */
import type { Contact } from '@/lib/model-types';

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

export function findDuplicate(
  form: { name: string; phone: string; email: string },
  contacts: Contact[],
  selfId?: string
): Contact | undefined {
  const name = form.name.trim().toLowerCase();
  const digits = form.phone.replace(/\D/g, '');
  const email = form.email.trim().toLowerCase();
  return contacts.find(
    (c) =>
      c.id !== selfId &&
      ((name.length > 2 && c.name.toLowerCase() === name) ||
        (digits.length > 6 && (c.phone ?? '').replace(/\D/g, '') === digits) ||
        (email.length > 0 && (c.email ?? '').toLowerCase() === email))
  );
}
