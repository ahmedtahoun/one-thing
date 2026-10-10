'use client';
/** 03 · Overview (ADMIN.md § 03). */
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { exportDataset } from '@/actions';
import { count, longDate, weekday } from '@/data/format';
import type { Overview } from '@/data/types';
import { card, download, tabular } from '@/ui/bits';
import { GREEN, TONE } from '@/ui/palette';
import { useToast } from '@/ui/Toast';

const GREY = '#6b6b68';
const RANGES = ['Today', '7 days', '30 days'];
const SCHEMA = 'user_id · event · type · created_at · channel · status · contact_role · company — no raw names, numbers or emails';
const MINUS = '−';

const signed = (n: number) => (n < 0 ? MINUS : '+') + String(Math.abs(n));
const oneDecimal = (n: number) => String(Math.round(n * 10) / 10);

export function OverviewScreen({ overview: o, now, canExport, canQueue }: { overview: Overview; now: string; canExport: boolean; canQueue: boolean }) {
  const say = useToast();
  const router = useRouter();
  const [range, setRange] = useState(1);

  const change = o.activeChange[range] ?? null;
  const kpis: [string, string, string, string][] = [
    ['Total users', count(o.totalUsers), `+${count(o.usersThisMonth)} this month`, GREEN],
    ['Active users', count(o.active[range] ?? 0), change === null ? '' : `${signed(change)}% vs previous`, change !== null && change < 0 ? GREY : GREEN],
    ['Pro subscribers', count(o.pro), `+${count(o.proThisMonth)} this month`, GREEN],
    ['On trial', count(o.trial), o.trialConversion === null ? '' : `${o.trialConversion}% convert to Pro`, GREY],
    ['Monthly revenue', o.revenue === null ? '—' : '$' + count(o.revenue), o.revenueAfterFees === null ? '' : `after store fees ≈ $${count(o.revenueAfterFees)}`, GREY],
    [
      'Cancelled · 30 days',
      o.cancelled === null ? '—' : oneDecimal(o.cancelled) + '%',
      o.cancelledChange === null ? '' : `${signed(Number(oneDecimal(o.cancelledChange)))} pts`,
      o.cancelledChange !== null && o.cancelledChange > 0 ? GREY : GREEN,
    ],
  ];
  const max = Math.max(1, ...o.signups.map((s) => s.count));
  const total = o.signups.reduce((sum, s) => sum + s.count, 0);

  const dataset = async () => {
    const result = await exportDataset();
    if (result.error) return say(result.error);
    for (const [name, text] of Object.entries(result.files ?? {})) download(name, text);
    if (result.toast) say(result.toast);
  };

  const dsBtns = [
    ...(canExport ? [{ label: 'Export dataset (pseudonymised)', bd: '0', bg: '#fff', fg: '#0b0b0b', go: dataset }] : []),
    { label: 'Schema', bd: '1px solid #3a3a38', bg: 'transparent', fg: '#fff', go: () => say(SCHEMA) },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 13, color: GREY }}>{longDate(new Date(now))}</div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600 }}>Overview</h1>
        </div>
        <div style={{ display: 'flex', background: '#fff', border: '1px solid #e4e4e0', borderRadius: 999, padding: 3, gap: 2 }}>
          {RANGES.map((label, i) => (
            <button
              key={label}
              onClick={() => setRange(i)}
              style={{ border: 0, borderRadius: 999, padding: '7px 14px', fontSize: 13, cursor: 'pointer', background: range === i ? '#0b0b0b' : '#fff', color: range === i ? '#fff' : '#0b0b0b' }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12 }}>
        {kpis.map(([label, value, delta, colour]) => (
          <div key={label} data-probe="kpi" style={{ ...card, padding: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 13, color: GREY }}>{label}</div>
            <div style={{ fontSize: 28, fontWeight: 600, ...tabular }}>{value}</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: colour }}>{delta}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)', gap: 12 }}>
        <div style={{ ...card, padding: 20, display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>New sign-ups</div>
            <div style={{ fontSize: 12, color: GREY }}>Last 14 days · {count(total)} sign-ups</div>
          </div>
          <div style={{ height: 180, display: 'flex', alignItems: 'flex-end', gap: 6 }}>
            {o.signups.map((s, i) => (
              <div key={s.date} title={`${s.count} sign-ups`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
                <div style={{ width: '100%', height: Math.round((s.count / max) * 100) + '%', background: i >= o.signups.length - 7 ? '#0b0b0b' : '#d6d6d2', borderRadius: '6px 6px 2px 2px', minHeight: 4 }} />
                <span style={{ fontSize: 10, color: '#8a8a86' }}>{weekday(s.date)}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ ...card, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Where they come from</div>
          {o.sources.map((p) => (
            <div key={p.label} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span>{p.label}</span>
                <span style={{ ...tabular, color: '#55554f' }}>{p.share}%</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: '#efeee9', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: p.share + '%', background: '#0b0b0b', borderRadius: 3 }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: '#0b0b0b', color: '#fff', borderRadius: 18, padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 260, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Analytics dataset</div>
          <div style={{ fontSize: 13, color: '#c9c9c5', lineHeight: 1.5 }}>
            Every user’s tasks, contacts (with position and company), messages and activity in one export — users replaced with stable IDs, phone numbers and emails hashed. Safe to share with analysts.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {dsBtns.map((b) => (
            <button key={b.label} onClick={b.go} style={{ height: 40, padding: '0 16px', borderRadius: 999, border: b.bd, background: b.bg, color: b.fg, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
              {b.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 12 }}>
        <div style={{ ...card, padding: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: 6 }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Needs attention</div>
            {canQueue ? (
              <button onClick={() => router.push('/privacy-requests')} style={{ border: 0, background: 'none', fontSize: 13, color: '#55554f', cursor: 'pointer' }}>
                Open queue
              </button>
            ) : null}
          </div>
          {o.attention.map((a) => (
            <div key={a.text} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: '1px solid #f0efeb' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: TONE[a.tone], flex: 'none' }} />
              <span style={{ flex: 1, fontSize: 14 }}>{a.text}</span>
              <span style={{ fontSize: 12, color: GREY }}>{a.meta}</span>
            </div>
          ))}
        </div>
        <div style={{ ...card, padding: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: 6 }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Feature usage · 7 days</div>
          </div>
          {o.usage.map((u) => (
            <div key={u.label} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 120px 48px', gap: 12, alignItems: 'center', padding: '7px 0' }}>
              <span style={{ fontSize: 14 }}>{u.label}</span>
              <div style={{ height: 6, borderRadius: 3, background: '#efeee9', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: u.share + '%', background: u.colour, borderRadius: 3 }} />
              </div>
              <span style={{ fontSize: 13, textAlign: 'end', ...tabular, color: '#55554f' }}>{u.share}%</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
