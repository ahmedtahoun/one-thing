/**
 * Pictures for people, kept on the device.
 *
 * A picture is a copy in the app's own folder, so it outlives the camera
 * roll's temporary file. Only the file name is remembered, never the full
 * path: iOS moves the app's folder when it updates, and a stored absolute path
 * would then point at nothing. Like favourites this is local to the phone,
 * because contacts sync and a field the server has never seen would be
 * dropped on the next sync.
 */
import { useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'one-thing.photos.v1';

/** The key for the account holder's own picture; contact ids are uuids, so it cannot clash. */
export const ME_PHOTO = 'me';
const FOLDER = 'avatars';

let names: Record<string, string> = {};
let loaded: Promise<void> | null = null;
const listeners = new Set<(m: Record<string, string>) => void>();

type FileSystem = typeof import('expo-file-system');
const files = (): FileSystem | null => {
  try {
    return require('expo-file-system') as FileSystem;
  } catch {
    return null;
  }
};

/** What an <Image> needs: a stored file name becomes the file's current address. */
export function photoUri(stored: string | undefined): string | undefined {
  if (!stored) return undefined;
  // The web build keeps the picked address itself.
  if (/^(data:|blob:|https?:)/.test(stored)) return stored;
  const fs = files();
  if (!fs) return undefined;
  try {
    return new fs.File(fs.Paths.document, FOLDER, stored).uri;
  } catch {
    return undefined;
  }
}

function load(): Promise<void> {
  loaded ??= AsyncStorage.getItem(KEY)
    .then((raw) => {
      if (!raw) return;
      try {
        const stored = JSON.parse(raw) as unknown;
        if (stored && typeof stored === 'object') {
          for (const [id, name] of Object.entries(stored as Record<string, unknown>)) {
            if (typeof name === 'string' && !(id in names)) names = { ...names, [id]: name };
          }
        }
      } catch {
        // A corrupt blob starts again.
      }
    })
    .catch(() => {})
    .then(() => listeners.forEach((l) => l(names)));
  return loaded;
}

function save(): void {
  AsyncStorage.setItem(KEY, JSON.stringify(names)).catch(() => {});
  listeners.forEach((l) => l(names));
}

function forget(stored: string | undefined): void {
  if (!stored || /^(data:|blob:|https?:)/.test(stored)) return;
  const fs = files();
  if (!fs) return;
  try {
    const file = new fs.File(fs.Paths.document, FOLDER, stored);
    if (file.exists) file.delete();
  } catch {
    // An old picture that will not delete is only wasted space.
  }
}

/** Makes `picked` (a temporary address from the picker) this person's picture. */
export async function setPhoto(contactId: string, picked: string): Promise<boolean> {
  await load();
  const fs = files();
  let stored = picked;
  if (fs && picked.startsWith('file:')) {
    try {
      const folder = new fs.Directory(fs.Paths.document, FOLDER);
      if (!folder.exists) folder.create();
      // A new name each time, so a changed picture is not served from the old cache.
      stored = `${contactId}-${Date.now()}.jpg`;
      new fs.File(picked).copy(new fs.File(folder, stored));
    } catch {
      return false;
    }
  }
  forget(names[contactId]);
  names = { ...names, [contactId]: stored };
  save();
  return true;
}

export async function removePhoto(contactId: string): Promise<void> {
  await load();
  forget(names[contactId]);
  const { [contactId]: _gone, ...rest } = names;
  names = rest;
  save();
}

export function clearPhotos(): void {
  for (const stored of Object.values(names)) forget(stored);
  names = {};
  loaded = Promise.resolve();
  AsyncStorage.removeItem(KEY).catch(() => {});
  listeners.forEach((l) => l(names));
}

/** Contact id → picture address, for every person who has one. */
export function usePhotos(): ReadonlyMap<string, string> {
  const [value, setValue] = useState(names);
  useEffect(() => {
    listeners.add(setValue);
    load().then(() => setValue(names));
    return () => void listeners.delete(setValue);
  }, []);
  return useMemo(() => {
    const map = new Map<string, string>();
    for (const [id, stored] of Object.entries(value)) {
      const uri = photoUri(stored);
      if (uri) map.set(id, uri);
    }
    return map;
  }, [value]);
}
