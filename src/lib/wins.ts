/**
 * The days something was finished, kept on the device for the streak.
 *
 * Its own small record rather than a field on tasks: it is only ever local,
 * so it cannot disturb what syncs. `recordWin` is called wherever a task is
 * marked done; screens read it with `useWins`.
 */
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { dateKey } from './model-types';

const KEY = 'one-thing.wins.v1';
/** A year of days is plenty to tell a lapse from a first day. */
const KEEP = 400;

let days: string[] = [];
let loaded: Promise<void> | null = null;
const listeners = new Set<(days: string[]) => void>();

function load(): Promise<void> {
  loaded ??= AsyncStorage.getItem(KEY)
    .then((raw) => {
      if (!raw) return;
      try {
        const stored = JSON.parse(raw) as unknown;
        if (Array.isArray(stored)) days = [...new Set([...stored.filter((d): d is string => typeof d === 'string'), ...days])].sort();
      } catch {
        // A corrupt blob starts the record again.
      }
    })
    .catch(() => {})
    .then(() => listeners.forEach((l) => l(days)));
  return loaded;
}

export async function recordWin(now: Date = new Date()): Promise<void> {
  await load();
  const today = dateKey(now);
  if (days.includes(today)) return;
  days = [...days, today].sort().slice(-KEEP);
  AsyncStorage.setItem(KEY, JSON.stringify(days)).catch(() => {});
  listeners.forEach((l) => l(days));
}

export function clearWins(): void {
  days = [];
  loaded = Promise.resolve();
  AsyncStorage.removeItem(KEY).catch(() => {});
  listeners.forEach((l) => l(days));
}

export function useWins(): string[] {
  const [value, setValue] = useState<string[]>(days);
  useEffect(() => {
    listeners.add(setValue);
    load().then(() => setValue(days));
    return () => void listeners.delete(setValue);
  }, []);
  return value;
}
