/**
 * Cards put off with "Later", kept on the device: card id → the time it comes
 * back. Tasks and follow-ups are put off by moving their own date; this is
 * for the cards that have nothing to move, like a favourite going quiet.
 */
import { useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'one-thing.next-hidden.v1';

let map: Record<string, string> = {};
let loaded: Promise<void> | null = null;
const listeners = new Set<(m: Record<string, string>) => void>();

function load(): Promise<void> {
  loaded ??= AsyncStorage.getItem(KEY)
    .then((raw) => {
      if (!raw) return;
      try {
        const stored = JSON.parse(raw) as unknown;
        if (stored && typeof stored === 'object') {
          const now = Date.now();
          for (const [id, until] of Object.entries(stored as Record<string, unknown>)) {
            if (typeof until === 'string' && Date.parse(until) > now) map = { ...map, [id]: until };
          }
        }
      } catch {
        // A corrupt blob starts again.
      }
    })
    .catch(() => {})
    .then(() => listeners.forEach((l) => l(map)));
  return loaded;
}

/** Keeps a card out of sight until `until`. */
export async function hideUntil(id: string, until: Date): Promise<void> {
  await load();
  map = { ...map, [id]: until.toISOString() };
  AsyncStorage.setItem(KEY, JSON.stringify(map)).catch(() => {});
  listeners.forEach((l) => l(map));
}

/** Brings a card back — Undo. */
export async function unhide(id: string): Promise<void> {
  await load();
  const { [id]: _gone, ...rest } = map;
  map = rest;
  AsyncStorage.setItem(KEY, JSON.stringify(map)).catch(() => {});
  listeners.forEach((l) => l(map));
}

export function clearNextState(): void {
  map = {};
  loaded = Promise.resolve();
  AsyncStorage.removeItem(KEY).catch(() => {});
  listeners.forEach((l) => l(map));
}

export function useHiddenCards(): ReadonlyMap<string, string> {
  const [value, setValue] = useState(map);
  useEffect(() => {
    listeners.add(setValue);
    load().then(() => setValue(map));
    return () => void listeners.delete(setValue);
  }, []);
  return useMemo(() => new Map(Object.entries(value)), [value]);
}
