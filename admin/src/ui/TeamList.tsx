'use client';
/**
 * 13 · The team list, with the Owner's "Reset password".
 *
 * A client island inside an otherwise server-rendered page, because the new
 * password is handed back by the action and shown once, in the browser,
 * without ever being stored.
 *
 * Nothing here moves until it is asked for: the confirm strip and the
 * password card open *underneath* a row rather than inside it, and the
 * button is 30 px inside a 34 px row, so the list keeps the prototype's
 * geometry (`npm run fidelity`, scene 13).
 */
import { useState } from 'react';

import * as act from '@/actions';
import type { TeamMember } from '@/data/types';
import { mono } from '@/ui/bits';
import { useToast } from '@/ui/Toast';

type Shown = { who: string; password: string };

export function TeamList({ team, meId, canReset }: { team: TeamMember[]; meId: string; canReset: boolean }) {
  const say = useToast();
  const [asking, setAsking] = useState<string | null>(null);
  const [shown, setShown] = useState<Shown | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = async (id: string) => {
    setBusy(true);
    const r = await act.resetAdminPassword(id);
    setBusy(false);
    setAsking(null);
    if (r.error) return say(r.error);
    if (r.password && r.who) setShown({ who: r.who, password: r.password });
    if (r.toast) say(r.toast);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ background: '#fff', borderRadius: 18, overflow: 'hidden' }}>
        {team.map((m) => (
          <div key={m.email}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: '1px solid #f3f2ee' }}>
              <span style={{ width: 34, height: 34, borderRadius: '50%', background: '#0b0b0b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600 }}>{m.name[0]}</span>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{m.name}</span>
                <span style={{ fontSize: 12, color: '#6b6b68' }}>{m.email}</span>
              </div>
              <span style={{ fontSize: 13 }}>{m.role}</span>
              {m.twoStep ? <span style={{ fontSize: 12, color: 'oklch(0.45 0.12 150)' }}>2FA on</span> : null}
              {/* Never on your own row: see the note on resetAdminPassword. */}
              {canReset && m.id !== meId ? (
                <button
                  onClick={() => setAsking(asking === m.id ? null : m.id)}
                  style={{ height: 30, padding: '0 12px', borderRadius: 999, border: '1px solid #e4e4e0', background: '#fff', fontSize: 12, cursor: 'pointer', color: '#0b0b0b', flex: 'none' }}
                >
                  Reset password
                </button>
              ) : null}
            </div>
            {asking === m.id ? (
              <div style={{ padding: '12px 18px', borderBottom: '1px solid #f3f2ee', background: '#faf9f6', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, flex: 1, minWidth: 220 }}>
                  Give {m.name.split(' ')[0]} a new password? Their old one stops working, and you hand the new one over yourself — it is shown once.
                </span>
                <button onClick={() => setAsking(null)} style={{ height: 32, padding: '0 12px', borderRadius: 999, border: 0, background: 'none', fontSize: 13, cursor: 'pointer', color: '#55554f' }}>
                  Cancel
                </button>
                <button
                  data-probe="confirm-reset"
                  onClick={() => void reset(m.id)}
                  disabled={busy}
                  style={{ height: 32, padding: '0 14px', borderRadius: 999, border: 0, background: '#0b0b0b', color: '#fff', fontSize: 13, fontWeight: 500, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}
                >
                  {busy ? 'Setting…' : 'Reset password'}
                </button>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {shown ? (
        <div style={{ background: '#fff', border: '1.5px solid #0b0b0b', borderRadius: 18, padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{shown.who}’s new password</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <code data-probe="new-password" style={{ fontFamily: mono, fontSize: 15, background: '#f3f2ee', borderRadius: 10, padding: '10px 12px', userSelect: 'all', wordBreak: 'break-all' }}>
              {shown.password}
            </code>
            <button
              onClick={() => {
                void navigator.clipboard?.writeText(shown.password).then(
                  () => say('Copied.'),
                  () => say('Could not copy — select it instead.')
                );
              }}
              style={{ height: 34, padding: '0 14px', borderRadius: 999, border: '1px solid #e4e4e0', background: '#fff', fontSize: 13, cursor: 'pointer', color: '#0b0b0b' }}
            >
              Copy
            </button>
          </div>
          <div style={{ fontSize: 12, color: '#6b6b68', lineHeight: 1.5 }}>
            Shown once — the panel did not keep it and cannot show it again. Hand it over in person or through a password manager, not by email. Their
            authenticator is untouched, so they sign in with this and the same 6-digit code. If the worry is a stolen account rather than a forgotten
            password, Suspend is the button for that.
          </div>
          <div>
            <button onClick={() => setShown(null)} style={{ height: 36, padding: '0 16px', borderRadius: 999, border: 0, background: '#0b0b0b', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
              Done
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
