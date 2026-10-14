/**
 * Reading text off a photo — Apple's Vision on iPhone, Google's ML Kit on
 * Android — through `expo-text-extractor`, patched on iPhone to read Arabic as
 * well as English (patches/). Everything happens on the phone: the photo is
 * never uploaded.
 *
 * Required lazily, so the web build and a build without the module simply
 * report that they cannot read, and the screen falls back to typing.
 */
import { Platform } from 'react-native';

type Extractor = { isSupported: boolean; extractTextFromImage: (uri: string) => Promise<string[]> };

function extractor(): Extractor | null {
  if (Platform.OS === 'web') return null;
  try {
    return require('expo-text-extractor') as Extractor;
  } catch {
    return null;
  }
}

export const canReadCards = (): boolean => extractor()?.isSupported === true;

/** The lines found on the photo, top to bottom; empty when nothing could be read. */
export async function readCard(uri: string): Promise<string[]> {
  const module = extractor();
  if (!module?.isSupported) return [];
  const lines = await module.extractTextFromImage(uri);
  return lines.map((l) => l.trim()).filter(Boolean);
}
