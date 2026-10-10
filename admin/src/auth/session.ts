/**
 * Who is signed in to the panel, checked on the server for every page and
 * every action.
 *
 * Live: a Supabase session at assurance level 2 (password and the TOTP
 * code), an @theonething.app email, and a row in admin_member — all three,
 * or nobody. Demo: the cookie the demo sign-in sets, with the prototype's
 * own team.
 */
import 'server-only';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { ADMIN_EMAIL_DOMAIN, mode } from '@/config';
import type { Role } from '@/data/types';
import { can, type Permission } from './permissions';
import { authClient } from './supabase';

export type Admin = { id: string; name: string; first: string; email: string; role: Role };

export const DEMO_COOKIE = 'ot_admin_demo';

const DEMO_TEAM: Record<string, Admin> = {
  owner: { id: 'demo-owner', name: 'Khalid Al-Mansouri', first: 'Khalid', email: 'khalid@theonething.app', role: 'Owner' },
  support: { id: 'demo-support', name: 'Dana Al-Anazi', first: 'Dana', email: 'dana@theonething.app', role: 'Support' },
  analyst: { id: 'demo-analyst', name: 'Turki Al-Ghamdi', first: 'Turki', email: 'turki@theonething.app', role: 'Analyst' },
};

/** The demo admin a demo sign-in becomes: Khalid, unless the email is Dana's or Turki's. */
export function demoAdminFor(email: string): string {
  const found = Object.entries(DEMO_TEAM).find(([, a]) => a.email === email.trim().toLowerCase());
  return found ? found[0] : 'owner';
}

export async function currentAdmin(): Promise<Admin | null> {
  if (mode() === 'demo') {
    const key = (await cookies()).get(DEMO_COOKIE)?.value;
    return (key && DEMO_TEAM[key]) || null;
  }
  const auth = await authClient();
  const { data } = await auth.auth.getUser();
  const user = data.user;
  if (!user?.email || !user.email.toLowerCase().endsWith('@' + ADMIN_EMAIL_DOMAIN)) return null;
  const { data: level } = await auth.auth.mfa.getAuthenticatorAssuranceLevel();
  if (level?.currentLevel !== 'aal2') return null;
  const { memberById } = await import('@/data/db');
  const member = await memberById(user.id);
  if (!member) return null;
  return { id: user.id, name: member.name, first: member.name.split(' ')[0] ?? member.name, email: user.email, role: member.role };
}

/** For pages: the admin, or off to sign in; without the permission, back to Overview. */
export async function requireAdmin(permission?: Permission): Promise<Admin> {
  const admin = await currentAdmin();
  if (!admin) redirect('/sign-in');
  if (permission && !can(admin.role, permission)) redirect('/overview');
  return admin;
}

/** For actions: the admin, or an error. An action is never redirected around. */
export async function authorise(permission: Permission): Promise<Admin> {
  const admin = await currentAdmin();
  if (!admin) throw new Error('Not signed in.');
  if (!can(admin.role, permission)) throw new Error('Not allowed.');
  return admin;
}
