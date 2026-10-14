/**
 * The Lock Screen bar (iPhone only): the native side is modules/today-bar,
 * the drawing is targets/today-bar. Elsewhere — Android, the web, an older
 * build without the module — every call here does nothing.
 *
 * Whether it shows is the person's choice in Settings, kept on the device.
 */
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { BarState } from '@/features/today-bar/build';

type Native = { isEnabled(): boolean; sync(json: string | null): Promise<void> };

const native = Platform.OS === 'ios' ? requireOptionalNativeModule<Native>('TodayBar') : null;

/** True where the bar can exist at all. */
export const barSupported = native !== null;

/** Shows, updates or (with null) removes the bar. */
export function syncBar(state: BarState | null): Promise<void> {
  if (!native) return Promise.resolve();
  return native.sync(state ? JSON.stringify(state) : null).catch(() => {});
}

const KEY = 'one-thing.today-bar.v1';
let on = true;
let loaded: Promise<void> | null = null;
const listeners = new Set<(v: boolean) => void>();

function load(): Promise<void> {
  loaded ??= AsyncStorage.getItem(KEY)
    .then((raw) => {
      if (raw === 'off') on = false;
    })
    .catch(() => {})
    .then(() => listeners.forEach((l) => l(on)));
  return loaded;
}

export async function setBarOn(next: boolean): Promise<void> {
  await load();
  on = next;
  AsyncStorage.setItem(KEY, next ? 'on' : 'off').catch(() => {});
  listeners.forEach((l) => l(on));
}

/** The Settings choice; null until it has been read, so nothing flashes on. */
export function useBarOn(): boolean | null {
  const [current, setCurrent] = useState<boolean | null>(loaded ? on : null);
  useEffect(() => {
    listeners.add(setCurrent);
    load().then(() => setCurrent(on));
    return () => void listeners.delete(setCurrent);
  }, []);
  return current;
}
