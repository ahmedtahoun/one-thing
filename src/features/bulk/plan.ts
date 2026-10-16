/**
 * Sending one message to many people, without the app ever sending it.
 *
 * WhatsApp has no way to message several people from an app, and the app's
 * rule is that the person presses send — so a bulk send is a *queue*: one
 * prepared message per person, opened one after another, each sent by the
 * person themselves. Email is the one place a single message can reach
 * everyone, but people answer an email that is written to them, so email is a
 * queue too: one each, opened in the mail app, and the run moves on by itself
 * once it is sent.
 *
 * Pure: who can be reached, the personalised text, the links.
 */
import { DEFAULT_DIAL } from '@/content/countries';
import { greetingName } from '@/features/compose/drafts';
import { emailValid, mailtoUrl, phoneValid, whatsAppUrl } from '@/features/compose/recipient';
import type { Contact } from '@/lib/model-types';

export type BulkChannel = 'whatsapp' | 'email';

/** A run is kept small: it is a person pressing send, one at a time. */
export const MAX_RECIPIENTS = 100;
/** Addresses per `mailto:` link where the mail composer is not available; longer links get cut off. */
export const MAILTO_CHUNK = 40;

const NAME_TOKEN = /\{(?:name|الاسم)\}/gi;

/** Whether this person can be reached on this channel. */
export function reachable(channel: BulkChannel, contact: Contact): boolean {
  return channel === 'whatsapp' ? phoneValid(contact.phone ?? '') : emailValid((contact.email ?? '').trim());
}

/** "Sara" for Sara Khan, "Dr. Haddad" for Dr. Sara Haddad: what a person would write after Dear. */
const firstName = (contact: Contact): string => greetingName(contact.name, /[\u0600-\u06FF]/.test(contact.name) ? 'ar' : 'en');

/** Whether the message addresses people by name, which rules out one shared email. */
export function usesName(template: string): boolean {
  return new RegExp(NAME_TOKEN.source, 'i').test(template);
}

/** "Hi {name}," → "Hi Sara,". With no name to use, the gap closes: "Hi ,", → "Hi,". */
export function personalise(template: string, contact: Contact): string {
  return template
    .replace(NAME_TOKEN, firstName(contact))
    .replace(/[ \t]+([,.!؟?،:])/g, '$1')
    .replace(/[ \t]{2,}/g, ' ');
}

export function whatsAppLink(contact: Contact, template: string): string {
  return whatsAppUrl(contact.dial ?? DEFAULT_DIAL, contact.phone ?? '', personalise(template, contact));
}

/** One link to many addresses, all hidden from each other. */
export function bccMailto(addresses: string[], subject: string, body: string): string {
  const base = mailtoUrl('', subject, body);
  return base.replace('mailto:?', `mailto:?bcc=${addresses.map(encodeURIComponent).join(',')}&`);
}

export function chunk<T>(list: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

/** The reachable people, in the order given. */
export function recipientsOf(channel: BulkChannel, contacts: Contact[], selected: ReadonlySet<string>): Contact[] {
  return contacts.filter((c) => selected.has(c.id) && reachable(channel, c)).slice(0, MAX_RECIPIENTS);
}

/**
 * Whether files attached to this run will actually arrive.
 *
 * Three ways they do not, and the screen has to say which:
 *
 *   - **WhatsApp**: a `wa.me` link carries text and nothing else. There is
 *     no deep link that attaches a file, so the channel can never do it.
 *   - **No mail composer**: the run falls back to a `mailto:` link, and no
 *     mail link of any kind carries a file (`app/compose.tsx` has the same
 *     fork, and the same reason).
 *   - Nothing attached, in which case there is nothing to warn about.
 *
 * Returning the *reason* rather than a boolean is the point: a run that
 * quietly drops an attachment is the failure worth designing against,
 * because the sender thinks it went and the recipient never knew there was
 * one. BUILD-REVIEW §2.59 made that call once already, for the share sheet.
 */
export type FileOutcome = 'none' | 'willGo' | 'notOnWhatsApp' | 'needsComposer';

export function fileOutcome(channel: BulkChannel, fileCount: number, mailAvailable: boolean): FileOutcome {
  if (fileCount === 0) return 'none';
  if (channel === 'whatsapp') return 'notOnWhatsApp';
  return mailAvailable ? 'willGo' : 'needsComposer';
}
