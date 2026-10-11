'use client';
/**
 * 01 · Admin sign in, 02 · Two-step verification. The prototype's locked
 * overlay, as its own page.
 */
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { codeStep, passwordStep } from '@/auth/actions';

const STEPS = {
  1: {
    title: 'Admin sign in',
    sub: 'For The One Thing team only.',
    cta: 'Continue',
    note: 'Access is limited to approved team emails. Too many attempts locks the account for 15 minutes.',
  },
  2: {
    title: 'Two-step verification',
    sub: 'Enter the 6-digit code from your authenticator app.',
    cta: 'Verify',
    note: 'Lost your device? Ask the Owner to reset your 2-step verification.',
  },
} as const;

const field = { height: 48, border: '1px solid #e4e4e0', borderRadius: 12, padding: '0 14px', fontSize: 15, outline: 'none' } as const;

export function SignIn({ initialEmail }: { initialEmail: string }) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, start] = useTransition();
  const lg = STEPS[step];

  const next = () =>
    start(async () => {
      if (step === 1) {
        const result = await passwordStep(email, password);
        if (!result.ok) return setError(result.error);
        setError('');
        setStep(2);
      } else {
        const result = await codeStep(email, code);
        if (!result.ok) return setError(result.error);
        setPassword('');
        setCode('');
        router.replace('/overview');
        router.refresh();
      }
    });

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 80, background: '#f6f6f3', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'IBM Plex Sans Arabic',system-ui,sans-serif", color: '#0b0b0b' }}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!busy) next();
        }}
        style={{ width: 'min(380px,100%)', background: '#fff', borderRadius: 24, padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: 18, boxShadow: '0 20px 60px rgba(0,0,0,.08)' }}
      >
        <div style={{ width: 44, height: 44, borderRadius: '50%', border: '1.5px solid #0b0b0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#0b0b0b' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 22, fontWeight: 600 }}>{lg.title}</div>
          <div style={{ fontSize: 14, color: '#6b6b68', lineHeight: 1.5 }}>{lg.sub}</div>
        </div>
        {step === 1 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
              }}
              placeholder="you@theonething.app"
              type="email"
              autoComplete="username"
              data-probe="email"
              style={field}
            />
            <input
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder="Password"
              type="password"
              autoComplete="current-password"
              data-probe="password"
              style={field}
            />
          </div>
        ) : (
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
            style={{ height: 56, border: '1.5px solid #0b0b0b', borderRadius: 14, padding: '0 14px', fontSize: 24, letterSpacing: '.3em', textAlign: 'center', fontFamily: "'IBM Plex Mono',monospace", outline: 'none' }}
          />
        )}
        {error ? <div style={{ fontSize: 13, color: 'oklch(0.5 0.17 25)' }}>{error}</div> : null}
        <button type="submit" data-probe="cta" style={{ height: 50, borderRadius: 25, border: 0, background: '#0b0b0b', color: '#fff', fontSize: 15, fontWeight: 500, cursor: 'pointer' }}>
          {lg.cta}
        </button>
        <div style={{ fontSize: 12, color: '#8a8a86', lineHeight: 1.5, textAlign: 'center' }}>{lg.note}</div>
      </form>
    </div>
  );
}
