'use client';
/**
 * The prototype's toast: one line, bottom centre, 2.6 seconds.
 */
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

const ToastContext = createContext<(message: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const say = useCallback((next: string) => {
    if (timer.current) clearTimeout(timer.current);
    setMessage(next);
    timer.current = setTimeout(() => setMessage(null), 2600);
  }, []);
  return (
    <ToastContext.Provider value={say}>
      {children}
      {message ? (
        <div
          role="status"
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#0b0b0b',
            color: '#fff',
            padding: '12px 18px',
            borderRadius: 999,
            fontSize: 13,
            zIndex: 60,
            boxShadow: '0 10px 30px rgba(0,0,0,.2)',
          }}
        >
          {message}
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
