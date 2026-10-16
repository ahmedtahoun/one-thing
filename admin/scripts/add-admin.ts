/**
 * Adds someone to the team: their Supabase Auth account, their TOTP
 * authenticator, and their admin_member row with a role.
 *
 * The design has no screen for this (Team & roles lists the team but adds
 * nobody), and a TOTP factor can only be enrolled by the person signed in,
 * so the Owner runs this with the new admin beside them, who scans the code
 * into their authenticator app. BUILD-REVIEW.md §2.37.
 *
 *   SUPABASE_SERVICE_ROLE_KEY=… DATABASE_URL=… NEXT_PUBLIC_SUPABASE_URL=… NEXT_PUBLIC_SUPABASE_ANON_KEY=… \
 *     npx tsx scripts/add-admin.ts dana@onlyonething.app "Dana Al-Anazi" Support
 *
 * Not yet run against a real project — there is none (BUILD-REVIEW.md §2.37).
 */
import readline from 'node:readline/promises';

import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';

import { adminDomainList, isAdminEmail } from '../src/auth/domains';
import { newPassword } from '../src/auth/password';

const [email, name, role] = process.argv.slice(2);
const ROLES = ['Owner', 'Support', 'Analyst'];

async function main() {
  if (!email || !name || !role || !ROLES.includes(role)) throw new Error('Usage: add-admin.ts <email> "<full name>" <Owner|Support|Analyst>');
  // One list, shared with the panel: src/auth/domains.ts.
  if (!isAdminEmail(email)) throw new Error(`Admins sign in with an ${adminDomainList()} address.`);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const database = process.env.DATABASE_URL;
  if (!url || !anon || !service || !database) throw new Error('Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY and DATABASE_URL.');

  // A one-time password, shown once, for the new admin to sign in with.
  const password = newPassword();
  const adminApi = createClient(url, service, { auth: { persistSession: false } });
  const { data: created, error: createError } = await adminApi.auth.admin.createUser({ email, password, email_confirm: true });
  if (createError || !created.user) throw createError ?? new Error('Could not create the account.');

  const asThem = createClient(url, anon, { auth: { persistSession: false } });
  const { error: signInError } = await asThem.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  const { data: factor, error: enrollError } = await asThem.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'The One Thing admin' });
  if (enrollError || !factor) throw enrollError ?? new Error('Could not start 2-step enrolment.');

  console.log('\nScan this into the authenticator app (or type the secret):\n');
  console.log('  ' + factor.totp.uri);
  console.log('  secret: ' + factor.totp.secret + '\n');
  const ask = readline.createInterface({ input: process.stdin, output: process.stdout });
  const code = (await ask.question('The 6-digit code it now shows: ')).trim();
  ask.close();
  const { error: verifyError } = await asThem.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
  if (verifyError) throw verifyError;

  const sql = postgres(database, { max: 1 });
  await sql`insert into admin_member (user_id, name, role) values (${created.user.id}, ${name}, ${role})`;
  await sql.end();

  console.log(`\n${name} is an admin (${role}). Their password, shown once — it goes straight into their password manager:\n  ${password}\n`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
