'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { signOut } from '@/auth/actions';

type Item = { href: string; label: string; badge: number };

export function Sidebar({ items, who }: { items: Item[]; who: string }) {
  const path = usePathname();
  const router = useRouter();
  return (
    <aside style={{ width: 232, flex: 'none', background: '#0b0b0b', color: '#fff', display: 'flex', flexDirection: 'column', padding: '22px 14px', gap: 22, position: 'sticky', top: 0, height: '100vh', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px' }}>
        <div style={{ width: 30, height: 30, borderRadius: '50%', border: '1.5px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#fff' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>The One Thing</span>
          <span style={{ fontSize: 11, color: '#8a8a86' }}>Admin</span>
        </div>
      </div>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {items.map((n) => {
          const on = path === n.href || path.startsWith(n.href + '/');
          return (
            <Link
              key={n.href}
              href={n.href}
              prefetch={false}
              data-probe={`nav-${n.href.slice(1)}`}
              style={{ display: 'flex', alignItems: 'center', gap: 10, border: 0, borderRadius: 10, padding: '10px 12px', background: on ? '#fff' : 'transparent', color: on ? '#0b0b0b' : '#c9c9c5', fontSize: 14, cursor: 'pointer', textAlign: 'start', textDecoration: 'none', lineHeight: 'normal' }}
            >
              <span style={{ flex: 1 }}>{n.label}</span>
              {n.badge > 0 ? (
                <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 999, background: 'oklch(0.6 0.18 25)', color: '#fff' }}>{n.badge}</span>
              ) : null}
            </Link>
          );
        })}
      </nav>
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, borderRadius: 12, background: '#1a1a19' }}>
        <div style={{ fontSize: 11, color: '#8a8a86', letterSpacing: '.08em' }}>SIGNED IN AS</div>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{who}</div>
        <div style={{ fontSize: 11, color: '#8a8a86', lineHeight: 1.4 }}>Every view of personal data is logged.</div>
        <button
          onClick={async () => {
            await signOut();
            router.replace('/sign-in');
            router.refresh();
          }}
          style={{ alignSelf: 'flex-start', border: 0, background: 'none', padding: '2px 0', color: '#fff', fontSize: 12, textDecoration: 'underline', cursor: 'pointer' }}
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
