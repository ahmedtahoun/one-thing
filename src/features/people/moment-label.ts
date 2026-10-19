/**
 * "Just now" and "Added today" were written into a contact's `lastLabel` as
 * text, at the moment they were true and in the language of the moment. A
 * day later People still said "Added today" beside "Yesterday", and an
 * Arabic screen still said "Just now". The date beside the row is worked
 * out from `touchedAt` every time it is drawn, so a stored word about *when*
 * has nothing to add and can only go stale: these are passed over, and the
 * row falls back to who the person is.
 */
import { C } from '@/content/strings';
import { INLINE } from '@/content/inline-copy';

const MOMENTS = new Set([C.en.justNow, C.ar.justNow, INLINE.en.addedToday, INLINE.ar.addedToday, 'انضاف اليوم', 'Just now', 'Added today']);

/** True for a stored label that only ever said when, not what. */
export function isMomentLabel(label: string | null | undefined): boolean {
  return Boolean(label) && MOMENTS.has(label!.trim());
}
