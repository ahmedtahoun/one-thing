/**
 * Everything the screens read and change, behind one interface.
 *
 * `db.ts` is the real one: a direct Postgres connection, server-only, used
 * when DATABASE_URL is set. `demo.ts` is the handoff's seed data, used when
 * it is not — so the panel runs, and can be compared with the prototype,
 * before any database exists. A deployment must never fall into demo mode by
 * accident: `config.ts` refuses to serve demo data unless ADMIN_DEMO=1.
 */
import type {
  AuditEntry,
  Badges,
  Growth,
  Overview,
  Plan,
  PrivacyRequest,
  SubStatus,
  SubscriptionRow,
  SubscriptionStats,
  TeamMember,
  Ticket,
  UserDetail,
  UserRow,
  Phrasings,
  Transcripts,
} from './types';

/** Why an action cannot happen yet: the integration it needs does not exist. */
export type Unavailable = { unavailable: string };

export interface DataSource {
  /** "Now" for every relative date. The demo's is fixed to the prototype's day. */
  now(): Date;

  overview(): Promise<Overview>;
  users(search: string, plan: Plan | 'all'): Promise<{ rows: UserRow[]; total: number }>;
  user(id: string): Promise<UserDetail | null>;
  subscriptions(filter: SubStatus | 'all'): Promise<{ rows: SubscriptionRow[]; stats: SubscriptionStats }>;
  tickets(): Promise<{ tickets: Ticket[]; avgFirstReplyMinutes: number | null }>;
  growth(): Promise<Growth>;
  requests(): Promise<PrivacyRequest[]>;
  audit(): Promise<AuditEntry[]>;
  /** How people phrase things to Sanad, redacted on their own device. */
  phrasings(filter: 'all' | 'unanswered'): Promise<Phrasings>;
  /** What they typed, from the accounts that offered it. Personal data. */
  transcripts(filter: 'all' | 'unanswered'): Promise<Transcripts>;
  team(): Promise<TeamMember[]>;
  badges(): Promise<Badges>;

  /** Appends to the audit log. There is no way to change or remove an entry. */
  log(adminId: string, what: string, why: string, targetUserId?: string | null): Promise<void>;

  setSuspended(userId: string, suspended: boolean): Promise<void>;
  deleteUser(userId: string): Promise<void>;
  completeRequest(requestId: string): Promise<void | Unavailable>;
  reply(ticketId: string, text: string): Promise<void | Unavailable>;
  resolve(ticketId: string): Promise<void>;
  toggleCode(code: string): Promise<void | Unavailable>;
  createCode(code: string): Promise<void | Unavailable>;
  extendTrial(userId: string): Promise<void | Unavailable>;
  /**
   * Gives Pro for a number of months, free. Stacks on a comp already
   * running rather than replacing it, so granting twice adds up.
   */
  grantComp(userId: string, months: number, reason: string, adminId: string): Promise<void>;
  /** Ends every comp running for this person, now. */
  revokeComp(userId: string): Promise<void>;
  /** Emails the user their data. */
  exportUser(userId: string): Promise<void | Unavailable>;
  /** The drawer's Troubleshoot fixes. */
  fix(userId: string, kind: 'howto' | 'receipt' | 'resync'): Promise<void | Unavailable>;
  /** The user list as CSV. */
  usersCsv(): Promise<string>;
  /**
   * One user's saved contacts as CSV, for the drawer's Contacts tab. The
   * whole list, not the hundred the tab shows.
   */
  contactsCsv(userId: string): Promise<string>;
  /** The pseudonymised analytics dataset: file name → CSV. */
  dataset(): Promise<Record<string, string>>;
  /**
   * Sets a new password on a teammate's account and hands it back, once, for
   * the Owner to pass on. Unavailable without the service role key.
   */
  resetAdminPassword(memberId: string): Promise<{ password: string } | Unavailable>;
}

export const isUnavailable = (x: unknown): x is Unavailable =>
  typeof x === 'object' && x !== null && 'unavailable' in x;
