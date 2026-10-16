/**
 * Starred people, kept on the device.
 *
 * Its own small record rather than a field on the contact: contacts sync, and
 * a field the server has never heard of would be dropped the next time a sync
 * replaced the list. The cost is that favorites stay on this phone, which is
 * the right trade for a first version.
 */
import { useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'one-thing.favorites.v1';

let ids: string[] = [];
let loaded: Promise<void> | null = null;
const listeners = new Set<(ids: string[]) => void>();

function load(): Promise<void> {
  loaded ??= AsyncStorage.getItem(KEY)
    .then((raw) => {
      if (!raw) return;
      try {
        const stored = JSON.parse(raw) as unknown;
        if (Array.isArray(stored)) ids = [...new Set([...stored.filter((i): i is string => typeof i === 'string'), ...ids])];
      } catch {
        // A corrupt blob starts the list again.
      }
    })
    .catch(() => {})
    .then(() => listeners.forEach((l) => l(ids)));
  return loaded;
}

/** Stars or unstars a person; resolves to whether they are now a favorite. */
export async function toggleFavorite(id: string): Promise<boolean> {
  await load();
  const now = !ids.includes(id);
  ids = now ? [...ids, id] : ids.filter((i) => i !== id);
  AsyncStorage.setItem(KEY, JSON.stringify(ids)).catch(() => {});
  listeners.forEach((l) => l(ids));
  return now;
}

export function clearFavorites(): void {
  ids = [];
  loaded = Promise.resolve();
  AsyncStorage.removeItem(KEY).catch(() => {});
  listeners.forEach((l) => l(ids));
}

export function useFavorites(): ReadonlySet<string> {
  const [value, setValue] = useState<string[]>(ids);
  useEffect(() => {
    listeners.add(setValue);
    load().then(() => setValue(ids));
    return () => void listeners.delete(setValue);
  }, []);
  return useMemo(() => new Set(value), [value]);
}
