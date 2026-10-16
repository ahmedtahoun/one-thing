/**
 * "If there is no reply, remind me": how long after sending to check back.
 * Kept on the device, with the other small preferences. The app cannot see a
 * reply, so this only ever makes a person a "waiting" item that comes back on
 * its date; one tap on "Replied" closes it.
 */
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Lang } from '@/content/strings';
import type { Channel } from '@/lib/model-types';

const KEY = 'one-thing.chase.v1';

/** Auto picks a sensible time for the channel; the others are the person's own choice. */
export type ChaseSetting = 'auto' | 'off' | 1 | 2 | 3 | 7;
export const CHASE_SETTINGS: readonly ChaseSetting[] = ['auto', 'off', 1, 2, 3, 7];
/** What the "Change" row offers after sending, in days; 0 is no follow-up. */
export const CHASE_CHOICES = [1, 2, 3, 7, 0] as const;

/** Days to wait for this channel under this setting; 0 means do not ask me to follow up. */
export function chaseDays(setting: ChaseSetting, channel: Channel): number {
  if (setting === 'off') return 0;
  if (setting === 'auto') return channel === 'email' ? 3 : channel === 'whatsapp' ? 2 : 0;
  return setting;
}

/** "tomorrow", "in 3 days", "next week", for a sentence. */
export function inDays(days: number, lang: Lang): string {
  if (lang === 'ar') {
    if (days === 1) return 'بكرة';
    if (days === 2) return 'بعد يومين';
    if (days === 7) return 'الأسبوع الجاي';
    return `بعد ${days} أيام`;
  }
  if (days === 1) return 'tomorrow';
  if (days === 7) return 'next week';
  return `in ${days} days`;
}

let value: ChaseSetting = 'auto';
let loaded: Promise<void> | null = null;
const listeners = new Set<(v: ChaseSetting) => void>();

function load(): Promise<void> {
  loaded ??= AsyncStorage.getItem(KEY)
    .then((raw) => {
      if (!raw) return;
      try {
        const stored = JSON.parse(raw) as unknown;
        if (CHASE_SETTINGS.includes(stored as ChaseSetting)) value = stored as ChaseSetting;
      } catch {
        // A corrupt value starts again at Auto.
      }
    })
    .catch(() => {})
    .then(() => listeners.forEach((l) => l(value)));
  return loaded;
}

export async function setChase(next: ChaseSetting): Promise<void> {
  await load();
  value = next;
  AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  listeners.forEach((l) => l(value));
}

export function useChase(): ChaseSetting {
  const [current, setCurrent] = useState(value);
  useEffect(() => {
    listeners.add(setCurrent);
    load().then(() => setCurrent(value));
    return () => void listeners.delete(setCurrent);
  }, []);
  return current;
}
