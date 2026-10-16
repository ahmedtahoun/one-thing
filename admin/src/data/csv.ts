/** The panel's CSV exports: the Users screen's list, and one user's contacts. */
import type { UserDetail, UserRow } from './types';

/** A CSV cell: quoted only when it has to be, doubling any quote inside. */
export function cell(v: unknown): string {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function usersToCsv(rows: UserRow[]): string {
  const head = ['id', 'name', 'email', 'phone', 'platform', 'plan', 'signed_up', 'last_active', 'contacts', 'tasks', 'marketing'];
  const lines = rows.map((u) =>
    [u.id, u.name, u.email, u.phone, u.platform, u.plan, u.joinedAt, u.lastActiveAt, u.contacts, u.tasks, u.marketing ? 'yes' : 'no'].map(cell).join(',')
  );
  return [head.join(','), ...lines].join('\n') + '\n';
}

/**
 * One user's saved contacts, for the Contacts tab's Download CSV.
 *
 * The columns are the ones the Privacy Policy says our team can see — "name,
 * position, company, phone and email" — plus the channel the user chose and
 * how many times they have been in touch, which are the app's own data about
 * the user rather than details about the contact. The contact's address, the
 * user's labels and the user's note about them are left out on purpose; see
 * the comment on `UserDetail['contactList']`.
 *
 * Position and company share one field in the app ("Client · Al-Saadi
 * Trading"), so they are written as one column under the name the form uses.
 */
export function contactsToCsv(rows: UserDetail['contactList']): string {
  const head = ['name', 'position_company', 'phone', 'phone_2', 'email', 'email_2', 'preferred_channel', 'times_in_touch'];
  const lines = rows.map((c) => [c.name, c.role, c.phone, c.phone2, c.email, c.email2, c.channel ?? '', c.history].map(cell).join(','));
  return [head.join(','), ...lines].join('\n') + '\n';
}
