/**
 * State that is mirrored to device storage under one key.
 *
 * The stores added after Tasks (contacts, follow-ups, preferences) all need
 * the same thing: read once on mount, write on every change, survive a
 * corrupt blob. When the backend lands, the persistence here is what changes
 * — screens keep talking to the store hooks.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function usePersisted<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [ready, setReady] = useState(false);
  const initialRef = useRef(initial);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(key)
      .then((raw) => {
        if (cancelled || raw === null) return;
        try {
          setValue(JSON.parse(raw) as T);
        } catch {
          // A corrupt blob keeps the initial value rather than crashing.
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  const set = useCallback(
    (next: T | ((current: T) => T)) => {
      setValue((current) => {
        const resolved = typeof next === 'function' ? (next as (c: T) => T)(current) : next;
        if (resolved === current) return current;
        AsyncStorage.setItem(key, JSON.stringify(resolved)).catch(() => {});
        return resolved;
      });
    },
    [key]
  );

  /** Back to the initial value, and off the device. */
  const reset = useCallback(() => {
    setValue(initialRef.current);
    AsyncStorage.removeItem(key).catch(() => {});
  }, [key]);

  return [value, set, ready, reset] as const;
}
