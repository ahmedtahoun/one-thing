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

/**
 * Whether the reader on this phone knows Arabic.
 *
 * iPhone yes, through the patch that asks Vision for `ar-SA` alongside
 * `en-US`. Android no, and not for want of asking: ML Kit's text
 * recognition v2 ships Latin, Chinese, Devanagari, Japanese and Korean, and
 * there is no Arabic recogniser to switch on. The Latin pass still returns
 * the English half of a bilingual card, which is most of them here — see
 * `src/features/card/scan-note.ts`.
 */
export const readsArabicCards = Platform.OS === 'ios';

/** The lines found on the photo, top to bottom; empty when nothing could be read. */
export async function readCard(uri: string): Promise<string[]> {
  const module = extractor();
  if (!module?.isSupported) return [];
  const lines = await module.extractTextFromImage(uri);
  return lines.map((l) => l.trim()).filter(Boolean);
}
