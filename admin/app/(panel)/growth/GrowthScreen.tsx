'use client';
/** 10 · Growth (ADMIN.md § 10): the funnel, retention by sign-up week, offer codes. */
import { useRouter } from 'next/navigation';

import { createCode, toggleCode } from '@/actions';
import { count } from '@/data/format';
import type { Growth } from '@/data/types';
import { Heading, mono, tabular } from '@/ui/bits';
import { RED } from '@/ui/palette';
import { useToast } from '@/ui/Toast';

const MINUS = '−';
const HEAD = ['Week 0', 'Week 1', 'Week 2', 'Week 3', 'Week 4'];

/**
 * The prototype's line names the biggest drop, then suggests what to try.
 * The first half is worked out from the funnel; the suggestion is written
 * by a person, so it comes from the data source — BUILD-REVIEW.md §2.37.
 */
export function biggestDrop(funnel: Growth['funnel']): string {
  let worst = -1;
  let at = 0;
  for (let i = 1; i < funnel.length; i++) {
    const prev = funnel[i - 1]!.count;
    const drop = prev > 0 ? 1 - funnel[i]!.count / prev : 0;
    if (drop > worst) {
      worst = drop;
      at = i;
    }
  }
  if (worst < 0 || funnel.length < 2) return '';
  return `Biggest drop: “${funnel[at - 1]!.label}” → “${funnel[at]!.label}” (${MINUS}${Math.round(worst * 100)}%).`;
}

export function GrowthScreen({ growth, canCodes }: { growth: Growth; canCodes: boolean }) {
  const say = useToast();
  const router = useRouter();
  const top = growth.funnel[0]?.count ?? 0;
  const tip = biggestDrop(growth.funnel);

  return (
    <>
      <Heading title="Growth" sub="Where people drop off, and offers to bring them in. Last 30 days." />
      <div style={{ background: '#fff', borderRadius: 18, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: 16, fontWeight: 600 }}>Funnel</div>
        {growth.funnel.map((f, i, a) => {
          const prev = i ? a[i - 1]!.count : 0;
          const drop = i && prev ? 1 - f.count / prev : 0;
          return (
            <div key={f.label} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,200px) minmax(0,1fr) 70px 80px', gap: 14, alignItems: 'center' }}>
              <span style={{ fontSize: 14 }}>{f.label}</span>
              <div style={{ height: 28, borderRadius: 8, background: '#f3f2ee', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: (top ? Math.round((f.count / top) * 100) : 0) + '%', background: i === a.length - 1 ? 'oklch(0.48 0.15 300)' : '#0b0b0b', borderRadius: 8 }} />
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, textAlign: 'end', ...tabular }}>{count(f.count)}</span>
              <span style={{ fontSize: 12, textAlign: 'end', color: i && drop > 0.4 ? RED : '#8a8a86' }}>{i && prev ? `${MINUS}${Math.round(drop * 100)}%` : ''}</span>
            </div>
          );
        })}
        <div style={{ fontSize: 13, color: '#55554f', lineHeight: 1.5, paddingTop: 4, borderTop: '1px solid #f0efeb' }}>
          {[tip, growth.advice].filter(Boolean).join(' ')}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1fr)', gap: 12, alignItems: 'start' }}>
        <div style={{ background: '#fff', borderRadius: 18, padding: 20, display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Retention by sign-up week</div>
          <div style={{ overflow: 'auto' }}>
            <div style={{ minWidth: 420, display: 'grid', gridTemplateColumns: '90px repeat(5,minmax(0,1fr))', gap: 4, fontSize: 12 }}>
              <span style={{ color: '#6b6b68' }}>Week</span>
              {HEAD.map((h) => (
                <span key={h} style={{ color: '#6b6b68', textAlign: 'center' }}>
                  {h}
                </span>
              ))}
              {growth.cohorts.map((r) => [
                <span key={r.week} style={{ padding: '8px 0', color: '#3a3a37' }}>
                  {r.week}
                </span>,
                ...r.values.map((v, i) => (
                  <span
                    key={r.week + i}
                    style={{ padding: '8px 0', textAlign: 'center', borderRadius: 6, background: v == null ? 'transparent' : `oklch(${0.97 - (v / 100) * 0.55} 0.04 260)`, color: v != null && v > 55 ? '#fff' : '#0b0b0b', ...tabular }}
                  >
                    {v == null ? '' : v + '%'}
                  </span>
                )),
              ])}
            </div>
          </div>
        </div>
        <div style={{ background: '#fff', borderRadius: 18, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Offer codes</div>
            {canCodes ? (
              <button
                onClick={async () => {
                  const c = window.prompt('Code name (letters and numbers)', 'WELCOME30');
                  if (!c) return;
                  const r = await createCode(c);
                  if (r.error) return say(r.error);
                  if (r.toast) say(r.toast);
                  router.refresh();
                }}
                style={{ height: 32, padding: '0 12px', borderRadius: 999, border: 0, background: '#0b0b0b', color: '#fff', fontSize: 12, cursor: 'pointer' }}
              >
                New code
              </button>
            ) : null}
          </div>
          {growth.codes.map((c) => (
            <div key={c.code} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: '1px solid #f0efeb' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontFamily: mono, fontSize: 14, fontWeight: 500 }}>{c.code}</span>
                <span style={{ fontSize: 12, color: '#6b6b68' }}>{c.description}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                <span style={{ fontSize: 13, ...tabular }}>{c.used} used</span>
                {canCodes ? (
                  <button
                    onClick={async () => {
                      const r = await toggleCode(c.code, c.active);
                      if (r.error) return say(r.error);
                      if (r.toast) say(r.toast);
                      router.refresh();
                    }}
                    style={{ border: 0, background: 'none', padding: 0, fontSize: 12, cursor: 'pointer', color: c.active ? '#55554f' : '#0b0b0b' }}
                  >
                    {c.active ? 'Pause' : 'Activate'}
                  </button>
                ) : null}
              </div>
            </div>
          ))}
          <div style={{ fontSize: 12, color: '#8a8a86', lineHeight: 1.5 }}>Codes are created as App Store offer codes and Google Play promo codes, so redemption happens in the store.</div>
        </div>
      </div>
    </>
  );
}
