/**
 * Who may do what — Team & roles (ADMIN.md § 13, and the prototype's role
 * cards). Checked on the server for every page and every action; the screens
 * only use it to leave out what the person cannot use.
 *
 * Where the handoff is silent, the role gets the narrower answer ("Give
 * each person the least access they need") — BUILD-REVIEW.md §2.37.
 */
import type { Role } from '@/data/types';

export type Permission =
  | 'overview' // Overview, Growth
  | 'dataset' // the pseudonymised export
  | 'personal' // Users, the drawer, Subscriptions, Support, Privacy requests
  | 'trial' // Extend trial 7 days
  | 'reply' // answer and resolve tickets
  | 'export-user' // Export their data, Send export
  | 'fix' // the Troubleshoot fixes
  | 'grant' // Grant Pro (comp)
  | 'suspend'
  | 'delete' // Delete account, Delete now
  | 'codes' // offer codes
  | 'audit' // read the audit log
  | 'transcripts' // read what people typed to Sanad, for the accounts offering it
  | 'team' // Team & roles
  | 'reset-password'; // set a teammate's password, shown once

const ROLE: Record<Role, Permission[]> = {
  // `transcripts` is the Owner's alone, and deliberately nobody else's: it is
  // personal data, so not the Analyst's, and reading everyone's sentences is
  // not support work, so not Support's either (§2.115).
  Owner: ['overview', 'dataset', 'personal', 'trial', 'reply', 'export-user', 'fix', 'grant', 'suspend', 'delete', 'codes', 'audit', 'transcripts', 'team', 'reset-password'],
  Support: ['overview', 'personal', 'trial', 'reply', 'export-user', 'fix'],
  Analyst: ['overview', 'dataset'],
};

export const can = (role: Role, permission: Permission) => ROLE[role].includes(permission);

/** The sidebar's sections and what each needs. */
export const SECTIONS = [
  ['overview', 'Overview', 'overview'],
  ['users', 'Users', 'personal'],
  ['subscriptions', 'Subscriptions', 'personal'],
  ['support', 'Support', 'personal'],
  ['growth', 'Growth', 'overview'],
  // Redacted phrasings, not personal data: an Analyst reads these to improve
  // Sanad, and there is nothing in them that says who asked (§2.114).
  ['phrasings', 'How people ask', 'dataset'],
  // The same sentences unredacted, from the accounts that offered them.
  // Personal data, so `personal` and audit-logged — §2.115.
  ['transcripts', 'What they told Sanad', 'transcripts'],
  ['privacy-requests', 'Privacy requests', 'personal'],
  ['audit-log', 'Audit log', 'audit'],
  ['team', 'Team & roles', 'team'],
] as const satisfies readonly (readonly [string, string, Permission])[];
