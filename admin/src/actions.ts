'use server';
/**
 * Everything an admin can do, each checked against their role on the
 * server and written to the audit log in the prototype's words
 * (`admin-logic.js`: every `this.log(…)` and `this.say(…)`).
 *
 * Opening a user's record is an action too, not a page load: the record
 * only ever reaches the browser through `openUser`, which logs it first, so
 * there is no way to see a user without leaving a line in the log.
 *
 * Several actions need a service that does not exist yet — the stores'
 * APIs, an email provider, push. In live mode they change nothing, log
 * nothing, and say so (`NOT_YET`); BUILD-REVIEW.md §2.37 lists them. Demo
 * mode behaves as the prototype does.
 */
import { authorise } from '@/auth/session';
import { mode, source } from '@/config';
import { isUnavailable, type Unavailable } from '@/data/source';
import type { Plan, SubStatus, UserDetail, UserRow } from '@/data/types';

export type Outcome = { toast?: string; error?: string };
/** An action on one user hands back their record as it now is, under the action's own log line. */
export type UserOutcome = Outcome & { detail?: UserDetail; url?: string };

/** Stand-in wording for an action whose service is not connected (BUILD-REVIEW.md §2.37). */
const NOT_YET = (u: Unavailable) => ({ toast: `Not connected yet — ${u.unavailable}.` });

const failed = (error: unknown): Outcome => ({ error: error instanceof Error ? error.message : 'Something went wrong.' });

/** The record after an action that has just been logged — never on its own. */
async function after(userId: string): Promise<UserDetail | undefined> {
  return (await (await source()).user(userId)) ?? undefined;
}

async function named(userId: string): Promise<string> {
  const user = await (await source()).user(userId);
  if (!user) throw new Error('No such user.');
  return user.name;
}

// ------------------------------------------------------------ the drawer ----

export async function openUser(userId: string, via?: string): Promise<{ detail?: UserDetail; error?: string }> {
  try {
    const admin = await authorise('personal');
    const data = await source();
    const detail = await data.user(userId);
    if (!detail) return { error: 'No such user.' };
    await data.log(admin.id, 'Opened user record · ' + detail.name, via ?? 'Support / troubleshooting', userId);
    return { detail };
  } catch (e) {
    return failed(e);
  }
}

export async function listUsers(search: string, plan: Plan | 'all'): Promise<{ rows?: UserRow[]; total?: number; error?: string }> {
  try {
    await authorise('personal');
    return await (await source()).users(search, plan);
  } catch (e) {
    return failed(e);
  }
}

export async function listSubscriptions(filter: SubStatus | 'all') {
  try {
    await authorise('personal');
    return await (await source()).subscriptions(filter);
  } catch (e) {
    return failed(e);
  }
}

export async function viewTab(userId: string, label: string): Promise<Outcome> {
  try {
    const admin = await authorise('personal');
    await (await source()).log(admin.id, `Viewed ${label.toLowerCase()} · ${await named(userId)}`, 'Support / troubleshooting', userId);
    return {};
  } catch (e) {
    return failed(e);
  }
}

export async function fix(userId: string, kind: 'howto' | 'receipt' | 'resync'): Promise<UserOutcome> {
  try {
    const admin = await authorise('fix');
    const data = await source();
    const name = await named(userId);
    const result = await data.fix(userId, kind);
    if (isUnavailable(result)) return NOT_YET(result);
    const [what, toast] = {
      howto: ['Sent notification how-to · ', 'Sent the “turn on notifications” guide by email.'],
      receipt: ['Re-validated receipt · ', 'Receipt re-checked with the store.'],
      resync: ['Forced re-sync · ', 'Re-sync requested — the app refreshes on next open.'],
    }[kind];
    await data.log(admin.id, what + name, 'Troubleshooting', userId);
    return { toast, detail: await after(userId) };
  } catch (e) {
    return failed(e);
  }
}

export async function extendTrial(userId: string): Promise<UserOutcome> {
  try {
    const admin = await authorise('trial');
    const data = await source();
    const name = await named(userId);
    const result = await data.extendTrial(userId);
    if (isUnavailable(result)) return NOT_YET(result);
    await data.log(admin.id, 'Extended trial 7 days · ' + name, 'Support goodwill', userId);
    return { toast: 'Trial extended — the user gets a notification.', detail: await after(userId) };
  } catch (e) {
    return failed(e);
  }
}

export async function grantPro(userId: string): Promise<UserOutcome> {
  try {
    const admin = await authorise('grant');
    const data = await source();
    const name = await named(userId);
    const result = await data.grantPro(userId);
    if (isUnavailable(result)) return NOT_YET(result);
    await data.log(admin.id, 'Granted 1 month Pro · ' + name, 'Comp', userId);
    return { toast: 'Pro granted for 1 month.', detail: await after(userId) };
  } catch (e) {
    return failed(e);
  }
}

/** Refunds and cancellations happen in the store's own console. */
export async function openStore(userId: string): Promise<UserOutcome> {
  try {
    const admin = await authorise('personal');
    const data = await source();
    const user = await data.user(userId);
    if (!user) return { error: 'No such user.' };
    await data.log(admin.id, 'Opened store record · ' + user.name, 'Refund / billing', userId);
    return { toast: 'Refunds and cancellations are done in the store console.', url: user.storeConsoleUrl ?? undefined };
  } catch (e) {
    return failed(e);
  }
}

export async function exportUser(userId: string): Promise<UserOutcome> {
  try {
    const admin = await authorise('export-user');
    const data = await source();
    const name = await named(userId);
    const result = await data.exportUser(userId);
    if (isUnavailable(result)) return NOT_YET(result);
    await data.log(admin.id, 'Exported data · ' + name, 'Admin request', userId);
    return { toast: 'Export sent to the user’s email — not to you.' };
  } catch (e) {
    return failed(e);
  }
}

export async function setSuspended(userId: string, suspended: boolean): Promise<UserOutcome> {
  try {
    const admin = await authorise('suspend');
    const data = await source();
    const name = await named(userId);
    await data.setSuspended(userId, suspended);
    await data.log(admin.id, (suspended ? 'Suspended · ' : 'Restored · ') + name, 'Policy', userId);
    return { detail: await after(userId) };
  } catch (e) {
    return failed(e);
  }
}

export async function deleteUser(userId: string): Promise<Outcome> {
  try {
    const admin = await authorise('delete');
    const data = await source();
    const name = await named(userId);
    // The name is read first: once the account is gone there is none.
    await data.deleteUser(userId);
    await data.log(admin.id, 'Deleted account · ' + name, 'Admin', userId);
    return { toast: 'Account deleted.' };
  } catch (e) {
    return failed(e);
  }
}

// -------------------------------------------------------------- lists ----

export async function exportUsersCsv(): Promise<Outcome & { csv?: string }> {
  try {
    const admin = await authorise('personal');
    const data = await source();
    const csv = await data.usersCsv();
    await data.log(admin.id, 'Exported user list (CSV)', 'Monthly report');
    return { csv, toast: 'CSV exported.' };
  } catch (e) {
    return failed(e);
  }
}

export async function exportDataset(): Promise<Outcome & { files?: Record<string, string> }> {
  try {
    const admin = await authorise('dataset');
    const data = await source();
    const files = await data.dataset();
    await data.log(admin.id, 'Exported analytics dataset (pseudonymised)', 'Analysis');
    return { files, toast: 'Dataset exported: ' + Object.keys(files).join(', ') };
  } catch (e) {
    return failed(e);
  }
}

// ------------------------------------------------------------ support ----

export async function reply(ticketId: string, text: string, isReview: boolean, name: string): Promise<Outcome> {
  try {
    const admin = await authorise('reply');
    if (!text.trim()) return {};
    const data = await source();
    const result = await data.reply(ticketId, text.trim());
    if (isUnavailable(result)) return NOT_YET(result);
    await data.log(admin.id, (isReview ? 'Replied to store review · ' : 'Replied to ticket · ') + name, 'Support');
    return { toast: isReview ? 'Reply posted to the store.' : 'Reply sent.' };
  } catch (e) {
    return failed(e);
  }
}

export async function listTickets() {
  try {
    await authorise('personal');
    return await (await source()).tickets();
  } catch (e) {
    return failed(e);
  }
}

export async function resolve(ticketId: string): Promise<Outcome> {
  try {
    await authorise('reply');
    await (await source()).resolve(ticketId);
    return { toast: 'Marked resolved.' };
  } catch (e) {
    return failed(e);
  }
}

// ------------------------------------------------------------- growth ----

export async function toggleCode(code: string, active: boolean): Promise<Outcome> {
  try {
    const admin = await authorise('codes');
    const data = await source();
    const result = await data.toggleCode(code);
    if (isUnavailable(result)) return NOT_YET(result);
    await data.log(admin.id, (active ? 'Paused' : 'Activated') + ' offer code ' + code, 'Growth');
    return {};
  } catch (e) {
    return failed(e);
  }
}

export async function createCode(input: string): Promise<Outcome> {
  try {
    const admin = await authorise('codes');
    const code = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!code) return {};
    const data = await source();
    const result = await data.createCode(code);
    if (isUnavailable(result)) return NOT_YET(result);
    await data.log(admin.id, 'Created offer code ' + input.toUpperCase(), 'Growth');
    return { toast: 'Code created in App Store Connect and Play Console.' };
  } catch (e) {
    return failed(e);
  }
}

// ---------------------------------------------------- privacy requests ----

export async function completeRequest(requestId: string, type: 'Delete' | 'Export', name: string): Promise<Outcome> {
  try {
    const admin = await authorise(type === 'Delete' ? 'delete' : 'export-user');
    const data = await source();
    const result = await data.completeRequest(requestId);
    if (isUnavailable(result)) return NOT_YET(result);
    await data.log(admin.id, (type === 'Delete' ? 'Deleted account · ' : 'Sent data export · ') + name, 'User request');
    // Live, no confirmation email goes out yet (no email provider), so the
    // toast says only what happened — the Delete account toast.
    if (type === 'Delete') return { toast: mode() === 'live' ? 'Account deleted.' : 'Account deleted. Confirmation email sent.' };
    return { toast: 'Export emailed to the user.' };
  } catch (e) {
    return failed(e);
  }
}
