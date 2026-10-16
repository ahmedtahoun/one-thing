'use server';
/**
 * The one-time /setup page: makes the first Owner from the browser, so
 * nobody has to run scripts/add-admin.ts on their own computer for the first
 * account. It is open only when all three hold:
 *
 *   - the panel is live, not the demo;
 *   - ADMIN_SETUP_SECRET is set in the server's environment, and the person
 *     types it;
 *   - the team is empty.
 *
 * The moment the Owner exists it closes for good, whatever the secret. Later
 * teammates are added with scripts/add-admin.ts, as before. Not in the design:
 * it is an install step, not a screen of the panel (DEPLOY.md § 4).
 */
import { timingSafeEqual } from 'node:crypto';

import { createClient } from '@supabase/supabase-js';

import { mode, source } from '@/config';
import { adminDomainList, isAdminEmail } from './domains';
import { authClient } from './supabase';

export type SetupResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const MIN_PASSWORD = 10;

/** Whether /setup may be shown at all. */
export async function setupOpen(): Promise<boolean> {
  if (mode() !== 'live' || !process.env.ADMIN_SETUP_SECRET) return false;
  const { teamIsEmpty } = await import('@/data/db');
  return teamIsEmpty();
}

function secretMatches(typed: string): boolean {
  const expected = Buffer.from(process.env.ADMIN_SETUP_SECRET ?? '');
  const given = Buffer.from(typed);
  return expected.length > 0 && given.length === expected.length && timingSafeEqual(given, expected);
}

/** Checked at both steps: the page can sit open while someone else finishes. */
async function guard(secret: string): Promise<string | null> {
  if (!(await setupOpen())) return 'Setup is closed: the panel already has an Owner.';
  if (!secretMatches(secret)) return 'That setup secret is not right.';
  return null;
}

/**
 * Step 1: the account, signed in, with an authenticator factor started.
 * Returns the QR code to scan and the same key as text.
 */
export async function startSetup(
  secret: string,
  emailInput: string,
  password: string
): Promise<SetupResult<{ factorId: string; qr: string; key: string }>> {
  const blocked = await guard(secret);
  if (blocked) return { ok: false, error: blocked };
  const email = emailInput.trim().toLowerCase();
  if (!isAdminEmail(email)) return { ok: false, error: `Use your ${adminDomainList()} email.` };
  if (password.length < MIN_PASSWORD) return { ok: false, error: `Use a password of at least ${MIN_PASSWORD} characters.` };

  const made = await makeAccount(email, password);
  if (made) return { ok: false, error: made };
  const auth = await authClient();
  const { error: signInError } = await auth.auth.signInWithPassword({ email, password });
  if (signInError) return { ok: false, error: `Supabase would not sign this account in: ${signInError.message}` };

  // A factor left unverified by an earlier attempt would block a new one.
  const { data: factors } = await auth.auth.mfa.listFactors();
  for (const f of factors?.all ?? []) {
    if (f.factor_type === 'totp' && f.status !== 'verified') await auth.auth.mfa.unenroll({ factorId: f.id });
  }
  const { data: factor, error } = await auth.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'The One Thing admin' });
  if (error || !factor) return { ok: false, error: 'Could not start 2-step verification. Try again.' };
  return { ok: true, factorId: factor.id, qr: factor.totp.qr_code, key: factor.totp.secret };
}

/**
 * Makes the account, or sets the password on the one an earlier attempt
 * made. Returns an error to show, or null.
 *
 * With SUPABASE_SERVICE_ROLE_KEY set this goes through Supabase's admin API,
 * which creates the account already confirmed and sends no email. Without it,
 * it signs up like anyone else, and that only works when Supabase can send
 * (or is told not to send) the confirmation email: its built-in mailer sends
 * only to members of the Supabase team, so for a team address the sign-up
 * fails. DEPLOY.md § 4 sets the key for setup and removes it afterwards.
 */
async function makeAccount(email: string, password: string): Promise<string | null> {
  const { authUserIdByEmail, confirmEmail } = await import('@/data/db');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey) {
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL as string, serviceKey, { auth: { persistSession: false } });
    const existing = await authUserIdByEmail(email);
    const { error } = existing
      ? await admin.auth.admin.updateUserById(existing, { password, email_confirm: true })
      : await admin.auth.admin.createUser({ email, password, email_confirm: true });
    return error ? `Supabase would not create the account: ${error.message}` : null;
  }
  const auth = await authClient();
  const { error } = await auth.auth.signUp({ email, password });
  // "Already registered" is fine: the sign-in that follows decides.
  if (error && !(await authUserIdByEmail(email))) {
    return `Supabase would not create the account: ${error.message}. Add SUPABASE_SERVICE_ROLE_KEY in Vercel for setup (DEPLOY.md § 4), redeploy, and try again.`;
  }
  await confirmEmail(email);
  return null;
}

/** Step 2: the first code from the app, then the account becomes the Owner. */
export async function finishSetup(secret: string, factorId: string, code: string, nameInput: string): Promise<SetupResult> {
  const blocked = await guard(secret);
  if (blocked) return { ok: false, error: blocked };
  const name = nameInput.trim();
  if (!name) return { ok: false, error: 'Enter your name.' };
  if (!/^\d{6}$/.test(code)) return { ok: false, error: 'The code is 6 digits.' };

  const auth = await authClient();
  const { error } = await auth.auth.mfa.challengeAndVerify({ factorId, code });
  if (error) return { ok: false, error: 'That code didn’t work. Try the newest one.' };
  const { data } = await auth.auth.getUser();
  if (!data.user) return { ok: false, error: 'The session ended. Start again.' };

  const { addFirstOwner } = await import('@/data/db');
  if (!(await addFirstOwner(data.user.id, name))) {
    await auth.auth.signOut();
    return { ok: false, error: 'Setup is closed: the panel already has an Owner.' };
  }
  await (await source()).log(data.user.id, 'Set up the panel as Owner', 'First-time setup');
  return { ok: true };
}
