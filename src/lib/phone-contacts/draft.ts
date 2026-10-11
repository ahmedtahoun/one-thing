/**
 * What a contact picked from the phone fills the New contact form with —
 * pure, so it is tested without a device (draft.test.ts). The picker itself
 * is ./index.ts.
 */
import { COUNTRIES } from '@/content/countries';

/** What the New contact form is filled with. Empty strings for what the phone did not have. */
export type ContactDraft = { name: string; role: string; dial: string | null; phone: string; email: string };

/** The phone's contact, as far as this needs it (expo-contacts' legacy shape). */
export type PhoneContact = {
  name?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  jobTitle?: string;
  phoneNumbers?: { number?: string; label?: string; isPrimary?: boolean; countryCode?: string }[];
  emails?: { email?: string; label?: string; isPrimary?: boolean }[];
};

/** The primary one, else a mobile one, else the first. */
function choose<T extends { label?: string; isPrimary?: boolean }>(list: T[] | undefined, mobile?: RegExp): T | undefined {
  if (!list?.length) return undefined;
  return list.find((x) => x.isPrimary) ?? (mobile ? list.find((x) => mobile.test(x.label ?? '')) : undefined) ?? list[0];
}

/** Longest dial codes first, so +1 268 wins over +1. */
const DIALS = [...new Set(COUNTRIES.map((c) => c.dial))].sort((a, b) => b.length - a.length);

/**
 * "+966 50 123 4567" → +966 and "501234567". A number written without its
 * country code keeps the form's own (null), dropping the trunk 0 that a
 * local number starts with ("050…" → "50…"), unless the phone knew its
 * country.
 */
export function splitNumber(raw: string, countryCode?: string): { dial: string | null; phone: string } {
  const compact = raw.replace(/[^\d+]/g, '').replace(/^00/, '+');
  if (compact.startsWith('+')) {
    const dial = DIALS.find((d) => compact.startsWith(d));
    if (dial) return { dial, phone: compact.slice(dial.length) };
    return { dial: null, phone: compact.slice(1) };
  }
  const local = compact.replace(/^0/, '');
  const country = countryCode ? COUNTRIES.find((c) => c.iso.toLowerCase() === countryCode.toLowerCase()) : undefined;
  return { dial: country?.dial ?? null, phone: local };
}

export function draftFromPhone(contact: PhoneContact): ContactDraft {
  const name = (contact.name?.trim() || [contact.firstName, contact.lastName].filter(Boolean).join(' ')).trim();
  const job = contact.jobTitle?.trim() ?? '';
  const company = contact.company?.trim() ?? '';
  // "Company or role" on the form; both, in the order People shows them.
  const role = job && company ? `${job} · ${company}` : job || company;
  const number = choose(contact.phoneNumbers, /mobile|cell|iphone|جوال|محمول/i);
  const { dial, phone } = number?.number ? splitNumber(number.number, number.countryCode) : { dial: null, phone: '' };
  const email = choose(contact.emails)?.email?.trim() ?? '';
  return { name: name || company, role: name ? role : job, dial, phone, email };
}
