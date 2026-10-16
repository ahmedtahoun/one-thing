/**
 * How often someone should hear from you: "every two weeks". Kept on the
 * device, as favourites are — contacts sync and a field the server has never
 * seen would be dropped on the next sync. A value of 0 means "never remind me
 * about this person", even for a favourite.
 */
import { useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'one-thing.cadence.v1';

/** The rhythms on offer, in days; 0 is off. */
export const CADENCES = [0, 7, 14, 30, 90] as const;
export type Cadence = (typeof CADENCES)[number];

let map: Record<string, number> = {};
let loaded: Promise<void> | null = null;
const listeners = new Set<(m: Record<string, number>) => void>();

function load(): Promise<void> {
  loaded ??= AsyncStorage.getItem(KEY)
    .then((raw) => {
      if (!raw) return;
      try {
        const stored = JSON.parse(raw) as unknown;
        if (stored && typeof stored === 'object') {
          for (const [id, days] of Object.entries(stored as Record<string, unknown>)) {
            if (typeof days === 'number' && days >= 0 && !(id in map)) map = { ...map, [id]: days };
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

/** Sets how often to be reminded about a person; `null` goes back to the default. */
export async function setCadence(contactId: string, days: number | null): Promise<void> {
  await load();
  if (days === null) {
    const { [contactId]: _gone, ...rest } = map;
    map = rest;
  } else {
    map = { ...map, [contactId]: days };
  }
  AsyncStorage.setItem(KEY, JSON.stringify(map)).catch(() => {});
  listeners.forEach((l) => l(map));
}

export function clearCadence(): void {
  map = {};
  loaded = Promise.resolve();
  AsyncStorage.removeItem(KEY).catch(() => {});
  listeners.forEach((l) => l(map));
}

/** Contact id → days between contacts, for everyone who has a rhythm of their own. */
export function useCadence(): ReadonlyMap<string, number> {
  const [value, setValue] = useState(map);
  useEffect(() => {
    listeners.add(setValue);
    load().then(() => setValue(map));
    return () => void listeners.delete(setValue);
  }, []);
  return useMemo(() => new Map(Object.entries(value)), [value]);
}
