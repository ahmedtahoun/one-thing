/**
 * Which email addresses may be an admin's.
 *
 * One list, read by the sign-in gate (`actions.ts`), the session check
 * (`session.ts`), the one-time setup page (`setup.ts`) and the
 * `scripts/add-admin.ts` CLI. It deliberately lives outside `config.ts`,
 * which is `server-only` and so cannot be imported by the script: before
 * this module the domain was written out twice with a comment asking
 * whoever changed one to remember the other.
 *
 * `wheretospot.com` is here because the panel is served from that domain
 * (`admin.onething.wheretospot.com`, DEPLOY.md § 3) and its owner's mail is
 * there. `onlyonething.app` stays, because admins already signed in with it
 * and taking a domain off this list locks those people out at the gate —
 * before their password is even checked.
 *
 * Adding a domain hands anyone who controls an address there a way in, so
 * far as this check goes: they still need a Supabase Auth account, an
 * authenticator, and a row in `admin_member`, none of which they can give
 * themselves. Removing one is the dangerous direction.
 */
export const ADMIN_EMAIL_DOMAINS = ['onlyonething.app', 'wheretospot.com'] as const;

/** The first one: what the sign-in box shows as an example. */
export const ADMIN_EMAIL_DOMAIN = ADMIN_EMAIL_DOMAINS[0];

/**
 * Whether this address may sign in at all. Lower-cased and trimmed first,
 * because a person typing their own address capitalises it about as often
 * as not, and the domain half is case-insensitive everywhere that matters.
 */
export function isAdminEmail(email: string): boolean {
  const at = email.trim().toLowerCase();
  return ADMIN_EMAIL_DOMAINS.some((domain) => at.endsWith(`@${domain}`));
}

/** "@onlyonething.app or @wheretospot.com", for the message that refuses one. */
export function adminDomainList(): string {
  const at = ADMIN_EMAIL_DOMAINS.map((d) => `@${d}`);
  return at.length === 1 ? (at[0] as string) : `${at.slice(0, -1).join(', ')} or ${at[at.length - 1]}`;
}
