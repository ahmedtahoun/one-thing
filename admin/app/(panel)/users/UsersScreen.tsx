'use client';
/** 04 · Users (ADMIN.md § 04–07). */
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { exportUsersCsv, listUsers } from '@/actions';
import { count, day, initials, rel } from '@/data/format';
import type { Plan, UserRow } from '@/data/types';
import { Chip, download, Heading, tabular } from '@/ui/bits';
import { PLAN } from '@/ui/palette';
import { useToast } from '@/ui/Toast';
import { UserDrawer, type DrawerPermissions } from '@/ui/UserDrawer';

const COLUMNS = 'minmax(220px,2fr) 90px 90px 110px 110px 80px 80px 90px';
const PLANS: [Plan | 'all', string][] = [['all', 'All'], ['free', 'Free'], ['trial', 'Trial'], ['pro', 'Pro'], ['lapsed', 'Lapsed']];

export function UsersScreen({
  initialRows,
  total,
  now: nowIso,
  can,
  openId,
  openVia,
}: {
  initialRows: UserRow[];
  total: number;
  now: string;
  can: DrawerPermissions;
  openId: string | null;
  openVia?: string;
}) {
  const say = useToast();
  const router = useRouter();
  const now = new Date(nowIso);
  const [rows, setRows] = useState(initialRows);
  const [q, setQ] = useState('');
  const [plan, setPlan] = useState<Plan | 'all'>('all');
  const [open, setOpen] = useState<{ id: string; via?: string } | null>(openId ? { id: openId, via: openVia } : null);
  const first = useRef(true);

  const load = useCallback(async () => {
    const r = await listUsers(q, plan);
    if (r.rows) setRows(r.rows);
    else if (r.error) say(r.error);
  }, [q, plan, say]);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const timer = setTimeout(() => void load(), 150);
    return () => clearTimeout(timer);
  }, [load]);

  const close = () => {
    setOpen(null);
    if (openId) router.replace('/users');
  };

  return (
    <>
      <Heading title="Users" sub={`${rows.length} of ${count(total)} shown · every record you open is logged`}>
        <button
          onClick={async () => {
            const r = await exportUsersCsv();
            if (r.error) return say(r.error);
            if (r.csv) download('users.csv', r.csv);
            if (r.toast) say(r.toast);
          }}
          style={{ height: 40, padding: '0 16px', borderRadius: 999, border: '1px solid #e4e4e0', background: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: '#0b0b0b' }}
        >
          Export CSV
        </button>
      </Heading>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 240, display: 'flex', alignItems: 'center', gap: 8, height: 42, borderRadius: 12, background: '#fff', border: '1px solid #e4e4e0', padding: '0 14px' }}>
          <span style={{ color: '#8a8a86', fontSize: 14 }}>⌕</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, email, phone or user ID"
            style={{ flex: 1, minWidth: 0, border: 0, outline: 'none', fontSize: 14, background: 'transparent', color: '#0b0b0b' }}
          />
        </div>
        {PLANS.map(([k, label]) => (
          <Chip key={k} on={plan === k} label={label} onClick={() => setPlan(k)} nowrap />
        ))}
      </div>
      <div style={{ background: '#fff', borderRadius: 18, overflow: 'auto' }}>
        <div style={{ minWidth: 900 }}>
          <div style={{ display: 'grid', gridTemplateColumns: COLUMNS, gap: 12, padding: '12px 18px', fontSize: 12, color: '#6b6b68', borderBottom: '1px solid #efefec' }}>
            <span>User</span>
            <span>Platform</span>
            <span>Plan</span>
            <span>Signed up</span>
            <span>Last active</span>
            <span style={{ textAlign: 'end' }}>Contacts</span>
            <span style={{ textAlign: 'end' }}>Tasks</span>
            <span>Marketing</span>
          </div>
          {rows.map((u) => (
            <button
              key={u.id}
              className="row-hover"
              data-probe="user-row"
              onClick={() => setOpen({ id: u.id })}
              style={{ width: '100%', display: 'grid', gridTemplateColumns: COLUMNS, gap: 12, alignItems: 'center', padding: '12px 18px', border: 0, borderBottom: '1px solid #f3f2ee', background: u.suspended ? 'oklch(0.98 0.015 25)' : '#fff', cursor: 'pointer', textAlign: 'start', color: '#0b0b0b', fontSize: 13 }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <span style={{ width: 32, height: 32, borderRadius: '50%', background: '#efeee9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, flex: 'none' }}>{initials(u.name)}</span>
                <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</span>
                  <span style={{ fontSize: 12, color: '#6b6b68', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</span>
                </span>
              </span>
              <span>{u.platform ?? '—'}</span>
              <span>
                <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 9px', borderRadius: 999, background: PLAN[u.plan][1], color: PLAN[u.plan][2] }}>{PLAN[u.plan][0]}</span>
              </span>
              <span style={{ color: '#55554f' }}>{day(u.joinedAt, now)}</span>
              <span style={{ color: '#55554f' }}>{rel(u.lastActiveAt, now)}</span>
              <span style={{ textAlign: 'end', ...tabular }}>{u.contacts}</span>
              <span style={{ textAlign: 'end', ...tabular }}>{u.tasks}</span>
              <span style={{ color: u.marketing ? '#0b0b0b' : '#8a8a86' }}>{u.marketing ? 'Opted in' : 'No'}</span>
            </button>
          ))}
          {rows.length === 0 ? <div style={{ padding: 40, textAlign: 'center', fontSize: 14, color: '#6b6b68' }}>No users match.</div> : null}
        </div>
      </div>
      {open ? <UserDrawer userId={open.id} via={open.via} now={nowIso} can={can} onClose={close} onChanged={load} /> : null}
    </>
  );
}
