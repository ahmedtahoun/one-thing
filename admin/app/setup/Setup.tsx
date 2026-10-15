'use client';
/**
 * First-time setup: makes the panel's first Owner (src/auth/setup.ts).
 * Styled as the sign-in card, since it is the same kind of moment.
 */
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { finishSetup, startSetup } from '@/auth/setup';

const field = { height: 48, border: '1px solid #e4e4e0', borderRadius: 12, padding: '0 14px', fontSize: 15, outline: 'none' } as const;

export function Setup() {
  const router = useRouter();
  const [secret, setSecret] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [factor, setFactor] = useState<{ factorId: string; qr: string; key: string } | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, start] = useTransition();

  const next = () =>
    start(async () => {
      if (!factor) {
        if (!name.trim()) return setError('Enter your name.');
        const result = await startSetup(secret, email, password);
        if (!result.ok) return setError(result.error);
        setError('');
        setFactor({ factorId: result.factorId, qr: result.qr, key: result.key });
      } else {
        const result = await finishSetup(secret, factor.factorId, code, name);
        if (!result.ok) return setError(result.error);
        setPassword('');
        router.replace('/overview');
        router.refresh();
      }
    });

  const edit = (set: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    set(e.target.value);
    setError('');
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#f6f6f3', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'IBM Plex Sans Arabic',system-ui,sans-serif", color: '#0b0b0b', overflowY: 'auto' }}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!busy) next();
        }}
        style={{ width: 'min(400px,100%)', background: '#fff', borderRadius: 24, padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: 18, boxShadow: '0 20px 60px rgba(0,0,0,.08)' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 22, fontWeight: 600 }}>{factor ? 'Link your authenticator' : 'Set up the admin panel'}</div>
          <div style={{ fontSize: 14, color: '#6b6b68', lineHeight: 1.5 }}>
            {factor
              ? 'Scan this with Google Authenticator, Authy or 1Password, then enter the 6-digit code it shows.'
              : 'Create the first Owner account. This page works once and then closes.'}
          </div>
        </div>

        {!factor ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input value={secret} onChange={edit(setSecret)} placeholder="Setup secret (from Vercel)" type="password" autoComplete="off" data-probe="secret" style={field} />
            <input value={name} onChange={edit(setName)} placeholder="Your full name" autoComplete="name" data-probe="name" style={field} />
            <input value={email} onChange={edit(setEmail)} placeholder="you@onlyonething.app" type="email" autoComplete="username" data-probe="email" style={field} />
            <input value={password} onChange={edit(setPassword)} placeholder="Choose a password (10+ characters)" type="password" autoComplete="new-password" data-probe="password" style={field} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
            {/* Supabase returns the QR code as an SVG data URL. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={factor.qr} alt="QR code for your authenticator app" width={180} height={180} data-probe="qr" />
            <div style={{ fontSize: 12, color: '#6b6b68', textAlign: 'center', lineHeight: 1.5 }}>
              Can’t scan? Enter this key instead:
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, color: '#0b0b0b', wordBreak: 'break-all', marginTop: 4 }}>{factor.key}</div>
            </div>
            <input
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                setError('');
              }}
              placeholder="6-digit code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              autoFocus
              data-probe="code"
              style={{ width: '100%', height: 56, border: '1.5px solid #0b0b0b', borderRadius: 14, padding: '0 14px', fontSize: 24, letterSpacing: '.3em', textAlign: 'center', fontFamily: "'IBM Plex Mono',monospace", outline: 'none' }}
            />
          </div>
        )}

        {error ? <div style={{ fontSize: 13, color: 'oklch(0.5 0.17 25)' }} data-probe="error">{error}</div> : null}
        <button type="submit" disabled={busy} data-probe="cta" style={{ height: 50, borderRadius: 25, border: 0, background: '#0b0b0b', color: '#fff', fontSize: 15, fontWeight: 500, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
          {busy ? 'One moment…' : factor ? 'Finish setup' : 'Continue'}
        </button>
      </form>
    </div>
  );
}
