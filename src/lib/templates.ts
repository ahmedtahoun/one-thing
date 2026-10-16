/**
 * The person's saved messages, kept on this phone (a list of their own words
 * the server has no use for). A change tells every screen showing them.
 */
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Saved } from '@/features/compose/saved';

const KEY = 'one-thing.saved-messages.v1';

let list: Saved[] = [];
let loaded: Promise<void> | null = null;
const listeners = new Set<(l: Saved[]) => void>();

const newId = () => `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function load(): Promise<void> {
  loaded ??= AsyncStorage.getItem(KEY)
    .then((raw) => {
      if (!raw) return;
      try {
        const stored = JSON.parse(raw) as unknown;
        if (Array.isArray(stored)) {
          const known = new Set(list.map((s) => s.id));
          list = [...list, ...(stored as Saved[]).filter((s) => s && typeof s.id === 'string' && typeof s.body === 'string' && !known.has(s.id))];
        }
      } catch {
        // A corrupt list starts again.
      }
    })
    .catch(() => {})
    .then(() => listeners.forEach((l) => l(list)));
  return loaded;
}

function save(next: Saved[]): void {
  list = next;
  AsyncStorage.setItem(KEY, JSON.stringify(list)).catch(() => {});
  listeners.forEach((l) => l(list));
}

/** Adds one (marking it for follow-ups takes that mark off any other). Returns it. */
export async function addSaved(input: Omit<Saved, 'id'>): Promise<Saved> {
  await load();
  const made: Saved = { ...input, id: newId() };
  save([...(made.chase ? list.map((s) => ({ ...s, chase: false })) : list), made]);
  return made;
}

export async function updateSaved(id: string, patch: Partial<Omit<Saved, 'id'>>): Promise<void> {
  await load();
  save(list.map((s) => (s.id === id ? { ...s, ...patch } : patch.chase ? { ...s, chase: false } : s)));
}

export async function removeSaved(id: string): Promise<void> {
  await load();
  save(list.filter((s) => s.id !== id));
}

export function clearSaved(): void {
  list = [];
  loaded = Promise.resolve();
  AsyncStorage.removeItem(KEY).catch(() => {});
  listeners.forEach((l) => l(list));
}

export function useSaved(): Saved[] {
  const [value, setValue] = useState(list);
  useEffect(() => {
    listeners.add(setValue);
    load().then(() => setValue(list));
    return () => void listeners.delete(setValue);
  }, []);
  return value;
}

/** The message used when a follow-up comes due, if the person wrote one. */
export const chaseMessage = (saved: readonly Saved[]): Saved | undefined => saved.find((s) => s.chase);
