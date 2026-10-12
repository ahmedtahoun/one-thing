/**
 * "Help & feedback": a message to support, started from Settings.
 *
 * The one address the app already promises to read is the privacy one
 * (`src/content/strings.ts`), so support uses it until there is a separate
 * mailbox — change SUPPORT_EMAIL, and RELEASE.md §7 lists what must receive
 * mail before submission.
 */
export const SUPPORT_EMAIL = 'privacy@onlyonething.app';

/** A `mailto:` link with the subject and a body that already says which build wrote in. */
export function supportMailUrl(subject: string, body: string): string {
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
