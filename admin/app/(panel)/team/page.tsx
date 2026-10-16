/** 13 · Team & roles (ADMIN.md § 13). */
import { can } from '@/auth/permissions';
import { requireAdmin } from '@/auth/session';
import { source } from '@/config';
import { Heading } from '@/ui/bits';
import { TeamList } from '@/ui/TeamList';

/** The prototype's role cards (`admin-logic.js`: ROLES). `src/auth/permissions.ts` is what enforces them. */
const ROLES: [string, string[]][] = [
  ['Owner', ['✓ Everything', '✓ Manage team & roles', '✓ Delete accounts', '✓ Reveal contact data (logged)']],
  ['Support', ['✓ View users & subscriptions', '✓ Reveal contact data with ticket', '✓ Grant trial extensions', '✕ Delete accounts']],
  ['Analyst', ['✓ Overview & usage', '✓ Export anonymised CSV', '✕ See emails or phones', '✕ Any account action']],
];

export default async function TeamPage() {
  const admin = await requireAdmin('team');
  const team = await (await source()).team();
  return (
    <>
      <Heading title="Team & roles" sub="Give each person the least access they need. 2-step verification is required for every admin." />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 12 }}>
        {ROLES.map(([name, can]) => (
          <div key={name} style={{ background: '#fff', borderRadius: 18, padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{name}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {can.map((c) => (
                <div key={c} style={{ display: 'flex', gap: 8, fontSize: 13, color: c[0] === '✓' ? '#0b0b0b' : '#a8a8a3' }}>
                  <span style={{ width: 14, flex: 'none' }}>{c[0]}</span>
                  {c.slice(2)}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <TeamList team={team} meId={admin.id} canReset={can(admin.role, 'reset-password')} />
    </>
  );
}
