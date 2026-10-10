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
  | 'team'; // Team & roles

const ROLE: Record<Role, Permission[]> = {
  Owner: ['overview', 'dataset', 'personal', 'trial', 'reply', 'export-user', 'fix', 'grant', 'suspend', 'delete', 'codes', 'audit', 'team'],
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
  ['privacy-requests', 'Privacy requests', 'personal'],
  ['audit-log', 'Audit log', 'audit'],
  ['team', 'Team & roles', 'team'],
] as const satisfies readonly (readonly [string, string, Permission])[];
