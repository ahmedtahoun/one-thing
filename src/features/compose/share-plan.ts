/**
 * What the "Zoho, Spark or another app" row can actually hand over, which
 * is not the same on the two platforms.
 *
 * Three share mechanisms, none of which does everything:
 *
 *   - React Native's `Share.share({ message, url })` carries the message
 *     and, **on iOS only**, one file. On Android `url` is ignored, so the
 *     file was silently lost — the bug §2.59 described and told the truth
 *     about rather than fixed.
 *   - `expo-sharing`'s `shareAsync(uri)` carries **one file and no text**,
 *     on both platforms. It is the only way a file reaches an Android mail
 *     app from here.
 *   - A `mailto:` link carries neither a file nor, in Zoho's case when it
 *     starts cold, the body.
 *
 * So on Android with something attached there is a straight choice, and
 * this picks the file. The message is the part a person can paste from the
 * clipboard in one tap; a file is the part they would have to go and find
 * again. The address is read out in the toast instead of being copied,
 * because the clipboard can only hold one of the two and the draft is the
 * longer thing to retype.
 *
 * Pure so the choice can be tested on both platforms at once, which no
 * device test can do. `app/compose.tsx` performs it.
 */
export type SharePlatform = 'ios' | 'android' | 'web';

export type SharePlan = {
  /**
   * `text` — the message goes, no file (nothing attached, or no way to send
   * one). `textAndFile` — both, which only iOS can do. `file` — the file
   * goes and the message does not, Android's choice.
   */
  kind: 'text' | 'textAndFile' | 'file';
  /** Files that will not arrive, so the screen can say how many. */
  left: number;
  /** What stays on the clipboard afterwards. */
  clipboard: 'address' | 'draft';
};

export function sharePlan(platform: SharePlatform, fileCount: number, sharingAvailable: boolean): SharePlan {
  if (fileCount === 0) return { kind: 'text', left: 0, clipboard: 'address' };

  // A share carries one file wherever it carries any.
  if (platform === 'ios') return { kind: 'textAndFile', left: fileCount - 1, clipboard: 'address' };

  if (platform === 'android' && sharingAvailable) return { kind: 'file', left: fileCount - 1, clipboard: 'draft' };

  // Android without the module, and the web build: as before, text alone.
  return { kind: 'text', left: fileCount, clipboard: 'address' };
}
