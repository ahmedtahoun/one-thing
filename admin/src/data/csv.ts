/** The Users screen's CSV export. */
import type { UserRow } from './types';

export function usersToCsv(rows: UserRow[]): string {
  const cell = (v: unknown) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = ['id', 'name', 'email', 'phone', 'platform', 'plan', 'signed_up', 'last_active', 'contacts', 'tasks', 'marketing'];
  const lines = rows.map((u) =>
    [u.id, u.name, u.email, u.phone, u.platform, u.plan, u.joinedAt, u.lastActiveAt, u.contacts, u.tasks, u.marketing ? 'yes' : 'no'].map(cell).join(',')
  );
  return [head.join(','), ...lines].join('\n') + '\n';
}
