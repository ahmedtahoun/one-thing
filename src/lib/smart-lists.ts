/**
 * The smart lists a person has made, kept on the device.
 *
 * On the device for the same reason favourites and keep-in-touch rhythms are
 * (./cadence.ts): a smart list is not part of a contact, and a table the
 * server has never seen would be dropped on the next sync. The rule itself is
 * tiny — a name and a handful of conditions — and what it selects is computed
 * fresh every time it is drawn (src/features/people/smart-lists.ts), so
 * nothing here can go stale.
 */
import { useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Condition, SmartList } from '@/features/people/smart-lists';

const KEY = 'one-thing.smartLists.v1';

let lists: SmartList[] = [];
let loaded: Promise<void> | null = null;
const listeners = new Set<(l: SmartList[]) => void>();

const announce = () => listeners.forEach((l) => l(lists));

/** Keeps only what has the shape of a list, so a hand-edited blob cannot crash People. */
function readStored(raw: string): SmartList[] {
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(
    (item): item is SmartList =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as SmartList).id === 'string' &&
      typeof (item as SmartList).name === 'string' &&
      Array.isArray((item as SmartList).all),
  );
}

function load(): Promise<void> {
  loaded ??= AsyncStorage.getItem(KEY)
    .then((raw) => {
      if (!raw) return;
      try {
        lists = readStored(raw);
      } catch {
        // A corrupt blob starts again rather than taking the screen with it.
      }
    })
    .catch(() => {})
    .then(announce);
  return loaded;
}

const save = () => void AsyncStorage.setItem(KEY, JSON.stringify(lists)).catch(() => {});

export async function addSmartList(name: string, all: readonly Condition[]): Promise<SmartList> {
  await load();
  const made: SmartList = { id: `sl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, name: name.trim(), all: [...all], createdAt: new Date().toISOString() };
  lists = [...lists, made];
  save();
  announce();
  return made;
}

export async function updateSmartList(id: string, patch: Partial<Pick<SmartList, 'name' | 'all'>>): Promise<void> {
  await load();
  lists = lists.map((l) => (l.id === id ? { ...l, ...patch, name: (patch.name ?? l.name).trim() } : l));
  save();
  announce();
}

export async function removeSmartList(id: string): Promise<void> {
  await load();
  lists = lists.filter((l) => l.id !== id);
  save();
  announce();
}

export function clearSmartLists(): void {
  lists = [];
  loaded = Promise.resolve();
  AsyncStorage.removeItem(KEY).catch(() => {});
  announce();
}

/** The lists as they stand, oldest first, so the chips do not reorder themselves. */
export function useSmartLists(): readonly SmartList[] {
  const [value, setValue] = useState(lists);
  useEffect(() => {
    listeners.add(setValue);
    load().then(() => setValue(lists));
    return () => void listeners.delete(setValue);
  }, []);
  return useMemo(() => [...value].sort((a, b) => a.createdAt.localeCompare(b.createdAt)), [value]);
}
