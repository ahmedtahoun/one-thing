'use server';
/**
 * 01 · Sign in and 02 · Two-step verification (ADMIN.md § 01–02).
 *
 * The prototype's own checks come first and use its words: the email must
 * be @onlyonething.app, the password at least six characters, the code six
 * digits. Live, Supabase then checks the password and the TOTP code, and
 * five failures in 15 minutes lock the email for 15 minutes.
 *
 * The prototype accepts any password and any code, so it has no words for
 * a wrong one, for a locked account, or for an admin with no authenticator
 * set up. Those messages are stand-ins — BUILD-REVIEW.md §2.37.
 */
import { cookies } from 'next/headers';

import { ADMIN_EMAIL_DOMAIN, mode, source } from '@/config';
import { DEMO_COOKIE, demoAdminFor } from './session';
import { authClient } from './supabase';

export type StepResult = { ok: true } | { ok: false; error: string };

/** The prototype's messages. */
const SAYS = {
  domain: `Use your @${ADMIN_EMAIL_DOMAIN} email.`,
  password: 'Enter your password.',
  code: 'The code is 6 digits.',
};

/** Stand-ins, until the product owner words them (BUILD-REVIEW.md §2.37). */
const STAND_IN = {
  wrong: 'That email and password don’t match.',
  wrongCode: 'That code didn’t work. Try the newest one.',
  locked: 'Too many attempts. Try again in 15 minutes.',
  noFactor: 'Your 2-step verification isn’t set up. Ask the Owner.',
};

const LOCK_AFTER = 5;
const LOCK_MINUTES = 15;

async function locked(email: string): Promise<boolean> {
  const { recentFailures } = await import('@/data/db');
  return (await recentFailures(email, LOCK_MINUTES)) >= LOCK_AFTER;
}

async function fail(email: string, error: string): Promise<StepResult> {
  const { recordFailure } = await import('@/data/db');
  await recordFailure(email);
  return { ok: false, error };
}

export async function passwordStep(emailInput: string, password: string): Promise<StepResult> {
  const email = emailInput.trim().toLowerCase();
  if (!new RegExp(`@${ADMIN_EMAIL_DOMAIN.replace('.', '\\.')}$`).test(email)) return { ok: false, error: SAYS.domain };
  if (password.length < 6) return { ok: false, error: SAYS.password };
  if (mode() === 'demo') return { ok: true };

  if (await locked(email)) return { ok: false, error: STAND_IN.locked };
  const auth = await authClient();
  const { data, error } = await auth.auth.signInWithPassword({ email, password });
  if (error || !data.user) return fail(email, STAND_IN.wrong);

  // Signed in at level 1. Without a member row or a verified TOTP factor
  // there is no level 2 to reach, so the session goes straight away.
  const { memberById } = await import('@/data/db');
  const member = await memberById(data.user.id);
  const { data: factors } = await auth.auth.mfa.listFactors();
  const totp = factors?.totp.find((f) => f.status === 'verified');
  if (!member) {
    await auth.auth.signOut();
    return fail(email, STAND_IN.wrong);
  }
  if (!totp) {
    await auth.auth.signOut();
    return { ok: false, error: STAND_IN.noFactor };
  }
  return { ok: true };
}

export async function codeStep(emailInput: string, code: string): Promise<StepResult> {
  const email = emailInput.trim().toLowerCase();
  if (!/^\d{6}$/.test(code)) return { ok: false, error: SAYS.code };
  const data = await source();

  if (mode() === 'demo') {
    const who = demoAdminFor(email);
    (await cookies()).set(DEMO_COOKIE, who, { httpOnly: true, sameSite: 'strict', path: '/' });
    await data.log(`demo-${who}`, 'Signed in to admin', '2-step verified');
    return { ok: true };
  }

  if (await locked(email)) return { ok: false, error: STAND_IN.locked };
  const auth = await authClient();
  const { data: factors } = await auth.auth.mfa.listFactors();
  const totp = factors?.totp.find((f) => f.status === 'verified');
  if (!totp) return { ok: false, error: STAND_IN.noFactor };
  const { error } = await auth.auth.mfa.challengeAndVerify({ factorId: totp.id, code });
  if (error) return fail(email, STAND_IN.wrongCode);

  const { data: user } = await auth.auth.getUser();
  if (user.user) await data.log(user.user.id, 'Signed in to admin', '2-step verified');
  return { ok: true };
}

export async function signOut(): Promise<void> {
  if (mode() === 'demo') {
    (await cookies()).delete(DEMO_COOKIE);
    return;
  }
  const auth = await authClient();
  await auth.auth.signOut();
}
