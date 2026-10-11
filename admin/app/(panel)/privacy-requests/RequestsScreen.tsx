'use client';
/** 11 · Privacy requests (ADMIN.md § 11): 30 days to delete or export. */
import { useRouter } from 'next/navigation';

import { completeRequest } from '@/actions';
import { day, daysAgo } from '@/data/format';
import type { PrivacyRequest } from '@/data/types';
import { Heading } from '@/ui/bits';
import { RED } from '@/ui/palette';
import { useToast } from '@/ui/Toast';

export function RequestsScreen({ requests, now: nowIso, canDelete, canExport }: { requests: PrivacyRequest[]; now: string; canDelete: boolean; canExport: boolean }) {
  const say = useToast();
  const router = useRouter();
  const now = new Date(nowIso);
  return (
    <>
      <Heading title="Privacy requests" sub="Deletion and data-export requests must be completed within 30 days (PDPL / GDPR, Google Play)." />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {requests.map((r) => {
          const del = r.type === 'Delete';
          const due = -daysAgo(r.deadlineAt, now);
          const allowed = del ? canDelete : canExport;
          return (
            <div key={r.id} style={{ background: '#fff', borderRadius: 18, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 999, background: del ? 'oklch(0.95 0.04 25)' : 'oklch(0.95 0.04 250)', color: del ? 'oklch(0.48 0.16 25)' : 'oklch(0.42 0.13 250)' }}>
                {del ? 'Delete account' : 'Export data'}
              </span>
              <div style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{r.name}</span>
                <span style={{ fontSize: 12, color: '#6b6b68' }}>
                  Requested {day(r.requestedAt, now)} · via {r.via} · {r.email}
                </span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 500, color: due <= 7 ? RED : '#55554f' }}>{r.done ? '' : `${due} days left`}</span>
              {!r.done && allowed ? (
                <button
                  onClick={async () => {
                    if (del && !window.confirm('Permanently delete ' + r.name + ' and all their data? This can’t be undone.')) return;
                    const result = await completeRequest(r.id, r.type, r.name);
                    if (result.error) return say(result.error);
                    if (result.toast) say(result.toast);
                    router.refresh();
                  }}
                  style={{ height: 38, padding: '0 16px', borderRadius: 999, border: 0, background: '#0b0b0b', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
                >
                  {del ? 'Delete now' : 'Send export'}
                </button>
              ) : null}
              {r.done ? <span style={{ fontSize: 13, color: 'oklch(0.45 0.12 150)', fontWeight: 500 }}>Completed</span> : null}
            </div>
          );
        })}
      </div>
    </>
  );
}
