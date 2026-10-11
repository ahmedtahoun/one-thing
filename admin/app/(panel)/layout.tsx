/**
 * The panel's frame: the 232 pt ink sidebar and the main column
 * (ADMIN.md § Layout). Every page under it is signed-in only.
 */
import type { ReactNode } from 'react';

import { can, SECTIONS } from '@/auth/permissions';
import { requireAdmin } from '@/auth/session';
import { source } from '@/config';
import { Sidebar } from '@/ui/Sidebar';

// Never cached: everything here is per-admin and changes as people act.
export const dynamic = 'force-dynamic';

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();
  const data = await source();
  const badges = can(admin.role, 'personal') ? await data.badges() : { support: 0, requests: 0 };
  const items = SECTIONS.filter(([, , need]) => can(admin.role, need)).map(([slug, label]) => ({
    href: `/${slug}`,
    label,
    badge: slug === 'support' ? badges.support : slug === 'privacy-requests' ? badges.requests : 0,
  }));

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: "'IBM Plex Sans Arabic',system-ui,sans-serif", color: '#0b0b0b', background: '#f6f6f3' }}>
      <Sidebar items={items} who={`${admin.first} · ${admin.role}`} />
      <main style={{ flex: 1, minWidth: 0, padding: '28px 32px 60px', display: 'flex', flexDirection: 'column', gap: 24, boxSizing: 'border-box' }}>{children}</main>
    </div>
  );
}
