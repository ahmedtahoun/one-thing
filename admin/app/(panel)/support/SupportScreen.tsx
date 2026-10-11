'use client';
/** 09 · Support (ADMIN.md § 09): in-app "Contact us" and store reviews, one inbox. */
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { listTickets, reply, resolve } from '@/actions';
import { clock, day, daysAgo } from '@/data/format';
import type { Ticket } from '@/data/types';
import { Chip, Heading } from '@/ui/bits';
import { GREEN, PLAN, RED, SRC } from '@/ui/palette';
import { useToast } from '@/ui/Toast';

type Filter = 'open' | 'reviews' | 'done' | 'all';
const FILTERS: [Filter, string][] = [['open', 'Open'], ['reviews', 'Store reviews'], ['done', 'Resolved'], ['all', 'All']];

const MACROS: [string, string][] = [
  ['Notifications fix', 'Sorry about that! Please open Settings → Notifications on your phone and make sure The One Thing is allowed, then reopen the app. We’ve also shipped a fix in 1.0.1.'],
  ['Refund how-to', 'Refunds are handled by the store. On iPhone: reportaproblem.apple.com. On Android: Google Play → Payments & subscriptions → Budget & history.'],
  ['Thanks!', 'Thank you so much for the kind words — it means a lot to a small team. 🙏'],
  ['New phone', 'Just sign in on the new phone with the same Apple or Google account — everything syncs automatically.'],
];

const firstReply = (minutes: number) => `${Math.floor(minutes / 60)} h ${Math.round(minutes % 60)} min`;

export function SupportScreen({
  initial,
  avgFirstReplyMinutes,
  now: nowIso,
  selected,
  canReply,
}: {
  initial: Ticket[];
  avgFirstReplyMinutes: number | null;
  now: string;
  selected: string | null;
  canReply: boolean;
}) {
  const say = useToast();
  const router = useRouter();
  const now = new Date(nowIso);
  const [tickets, setTickets] = useState(initial);
  const [filter, setFilter] = useState<Filter>('open');
  const [current, setCurrent] = useState<string | null>(selected ?? initial[0]?.id ?? null);
  const [text, setText] = useState('');

  const list = tickets.filter((t) => filter === 'all' || (filter === 'open' ? !t.resolved : filter === 'reviews' ? t.source !== 'app' : t.resolved));
  const cur = tickets.find((t) => t.id === current) ?? list[0];
  const isReview = cur ? cur.source !== 'app' : false;

  const reload = async () => {
    const r = await listTickets();
    if ('tickets' in r && r.tickets) setTickets(r.tickets);
    router.refresh(); // the sidebar's badge
  };

  const when = (t: Ticket) => {
    const n = daysAgo(t.at, now);
    return n <= 0 ? clock(t.at) : n === 1 ? 'Yesterday' : day(t.at, now);
  };

  return (
    <>
      <Heading
        title="Support"
        sub={`Messages from the app’s “Contact us” and store reviews in one place.${avgFirstReplyMinutes === null ? '' : ` Average first reply: ${firstReply(avgFirstReplyMinutes)}.`}`}
      />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {FILTERS.map(([k, label]) => (
          <Chip key={k} on={filter === k} label={label} onClick={() => setFilter(k)} nowrap />
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.4fr)', gap: 12, alignItems: 'start' }}>
        <div style={{ background: '#fff', borderRadius: 18, overflow: 'hidden' }}>
          {list.map((t) => {
            const [src, sBg, sFg] = SRC[t.source];
            const last = t.thread[t.thread.length - 1];
            const st = t.resolved ? 'Resolved' : t.thread.length > 1 ? 'Replied' : 'Waiting for reply';
            const stC = t.resolved ? GREEN : t.thread.length > 1 ? '#6b6b68' : RED;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setCurrent(t.id);
                  setText('');
                }}
                style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 4, padding: '14px 16px', border: 0, borderBottom: '1px solid #f3f2ee', background: cur && t.id === cur.id ? '#f6f6f3' : '#fff', cursor: 'pointer', textAlign: 'start', color: '#0b0b0b' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999, background: sBg, color: sFg }}>{src}</span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</span>
                  <span style={{ fontSize: 11, color: '#8a8a86' }}>{when(t)}</span>
                </div>
                <div style={{ fontSize: 13, color: '#3a3a37', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{last?.text}</div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: stC, fontWeight: 500 }}>{st}</span>
                  <span style={{ fontSize: 12, color: '#c9a227', letterSpacing: 1 }}>{t.stars ? '★'.repeat(t.stars) + '☆'.repeat(5 - t.stars) : ''}</span>
                </div>
              </button>
            );
          })}
        </div>
        {cur ? (
          <div style={{ background: '#fff', borderRadius: 18, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 16, fontWeight: 600 }}>{cur.name}</span>
                <span style={{ fontSize: 12, color: '#6b6b68' }}>
                  {SRC[cur.source][0] + (cur.stars ? ' · ' + cur.stars + '★ review' : cur.userId ? ' · ' + (cur.userPlatform ?? '—') + ' · ' + (cur.userPlan ? PLAN[cur.userPlan][0] : '—') : '')}
                </span>
              </div>
              {cur.userId ? (
                <button
                  onClick={() => router.push(`/users?user=${encodeURIComponent(cur.userId!)}&via=${encodeURIComponent('Ticket #' + cur.id)}`)}
                  style={{ height: 34, padding: '0 14px', borderRadius: 999, border: '1px solid #e4e4e0', background: '#fff', fontSize: 12, cursor: 'pointer', color: '#0b0b0b' }}
                >
                  Open user
                </button>
              ) : null}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {cur.thread.map((m, i) => (
                <div
                  key={i}
                  style={{ alignSelf: m.fromUser ? 'flex-start' : 'flex-end', maxWidth: '85%', background: m.fromUser ? '#f3f2ee' : '#0b0b0b', color: m.fromUser ? '#0b0b0b' : '#fff', padding: '11px 14px', borderRadius: 16, fontSize: 14, lineHeight: 1.5, display: 'flex', flexDirection: 'column', gap: 4 }}
                >
                  <span>{m.text}</span>
                  <span style={{ fontSize: 11, opacity: 0.6 }}>{m.fromUser ? (daysAgo(m.at, now) <= 0 ? 'Today ' + clock(m.at) : day(m.at, now)) : 'You · support'}</span>
                </div>
              ))}
            </div>
            {canReply ? (
              <>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {MACROS.map(([label, macro]) => (
                    <button key={label} onClick={() => setText(macro)} style={{ height: 30, padding: '0 12px', borderRadius: 999, border: '1px solid #e4e4e0', background: '#f6f6f3', fontSize: 12, cursor: 'pointer', color: '#0b0b0b' }}>
                      {label}
                    </button>
                  ))}
                </div>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={4}
                  placeholder={isReview ? 'Public reply — shows under the review in the store' : 'Reply — the user gets it in the app and by email'}
                  style={{ border: '1px solid #e4e4e0', borderRadius: 14, padding: '12px 14px', fontSize: 14, lineHeight: 1.5, outline: 'none', resize: 'none', color: '#0b0b0b' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, color: '#8a8a86' }}>{isReview ? 'Public. Keep it short, kind and specific.' : 'Private to this user.'}</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={async () => {
                        const r = await resolve(cur.id);
                        if (r.error) return say(r.error);
                        if (r.toast) say(r.toast);
                        await reload();
                      }}
                      style={{ height: 38, padding: '0 14px', borderRadius: 999, border: '1px solid #e4e4e0', background: '#fff', fontSize: 13, cursor: 'pointer', color: '#0b0b0b' }}
                    >
                      Mark resolved
                    </button>
                    <button
                      onClick={async () => {
                        if (!text.trim()) return;
                        const r = await reply(cur.id, text, isReview, cur.name);
                        if (r.error) return say(r.error);
                        if (r.toast) say(r.toast);
                        if (!r.toast?.startsWith('Not connected')) setText('');
                        await reload();
                      }}
                      style={{ height: 38, padding: '0 16px', borderRadius: 999, border: 0, background: text.trim() ? '#0b0b0b' : '#b5b5b0', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
                    >
                      {isReview ? 'Post public reply' : 'Send reply'}
                    </button>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </>
  );
}
