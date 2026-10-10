'use client';
/** 08 · Subscriptions (ADMIN.md § 08). */
import { useCallback, useState } from 'react';

import { listSubscriptions } from '@/actions';
import { day } from '@/data/format';
import type { SubStatus, SubscriptionRow, SubscriptionStats } from '@/data/types';
import { Chip, Heading, tabular } from '@/ui/bits';
import { SUB } from '@/ui/palette';
import { useToast } from '@/ui/Toast';
import { UserDrawer, type DrawerPermissions } from '@/ui/UserDrawer';

const COLUMNS = 'minmax(200px,2fr) 110px 100px 100px 120px 120px';
const FILTERS: [SubStatus | 'all', string][] = [['all', 'All'], ['active', 'Active'], ['trial', 'Trial'], ['grace', 'Billing issue'], ['cancelled', 'Cancelling'], ['refunded', 'Refunded']];

export function SubscriptionsScreen({ initialRows, stats, now: nowIso, can }: { initialRows: SubscriptionRow[]; stats: SubscriptionStats; now: string; can: DrawerPermissions }) {
  const say = useToast();
  const now = new Date(nowIso);
  const [rows, setRows] = useState(initialRows);
  const [filter, setFilter] = useState<SubStatus | 'all'>('all');
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(
    async (next: SubStatus | 'all') => {
      const r = await listSubscriptions(next);
      if ('rows' in r && r.rows) setRows(r.rows);
      else if ('error' in r && r.error) say(r.error);
    },
    [say]
  );

  const kpis: [string, string][] = [
    ['Active', String(stats.active)],
    ['On trial', String(stats.trial)],
    ['Billing issue', String(stats.grace)],
    ['Cancelling', String(stats.cancelling)],
    ['Yearly share', stats.yearlyShare === null ? '—' : stats.yearlyShare + '%'],
  ];

  return (
    <>
      <Heading title="Subscriptions" sub="Billing is handled by the App Store and Google Play. Refunds and cancellations open in the store console." />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12 }}>
        {kpis.map(([label, value]) => (
          <div key={label} style={{ background: '#fff', borderRadius: 18, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 13, color: '#6b6b68' }}>{label}</div>
            <div style={{ fontSize: 24, fontWeight: 600, ...tabular }}>{value}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {FILTERS.map(([k, label]) => (
          <Chip
            key={k}
            on={filter === k}
            label={label}
            onClick={() => {
              setFilter(k);
              void load(k);
            }}
          />
        ))}
      </div>
      <div style={{ background: '#fff', borderRadius: 18, overflow: 'auto' }}>
        <div style={{ minWidth: 820 }}>
          <div style={{ display: 'grid', gridTemplateColumns: COLUMNS, gap: 12, padding: '12px 18px', fontSize: 12, color: '#6b6b68', borderBottom: '1px solid #efefec' }}>
            <span>User</span>
            <span>Status</span>
            <span>Billing</span>
            <span>Store</span>
            <span>Started</span>
            <span>Renews / ends</span>
          </div>
          {rows.map((u) => (
            <button
              key={u.id}
              className="row-hover"
              onClick={() => setOpen(u.id)}
              style={{ width: '100%', display: 'grid', gridTemplateColumns: COLUMNS, gap: 12, alignItems: 'center', padding: '12px 18px', border: 0, borderBottom: '1px solid #f3f2ee', background: '#fff', cursor: 'pointer', textAlign: 'start', color: '#0b0b0b', fontSize: 13 }}
            >
              <span style={{ fontSize: 14, fontWeight: 500 }}>{u.name}</span>
              <span>
                <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 9px', borderRadius: 999, background: SUB[u.sub][1], color: SUB[u.sub][2] }}>{SUB[u.sub][0]}</span>
              </span>
              <span>{u.billing ?? '—'}</span>
              <span>{u.platform ?? '—'}</span>
              <span style={{ color: '#55554f' }}>{day(u.startedAt, now)}</span>
              <span style={{ color: '#55554f' }}>{u.endsAt ? 'Ends ' + day(u.endsAt, now) : u.renewsAt ? day(u.renewsAt, now) : '—'}</span>
            </button>
          ))}
        </div>
      </div>
      {open ? <UserDrawer userId={open} now={nowIso} can={can} onClose={() => setOpen(null)} onChanged={() => void load(filter)} /> : null}
    </>
  );
}
