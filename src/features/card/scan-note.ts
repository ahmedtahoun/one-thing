/**
 * What to tell somebody after a card is read, which depends on the phone in
 * their hand.
 *
 * **Android cannot read Arabic off a card, and no setting changes that.**
 * `expo-text-extractor` uses Apple's Vision on iPhone — patched in
 * `patches/` to ask for `ar-SA` as well as `en-US` — and Google's ML Kit on
 * Android. ML Kit's text recognition v2 ships five scripts: Latin, Chinese,
 * Devanagari, Japanese and Korean. There is no Arabic recogniser to switch
 * to, so the Arabic lines are simply absent from the output.
 *
 * What was said about that was worse than the limitation. The screen told
 * Android users that for an Arabic card they should "fill the details in by
 * hand", which is wrong for the common case: Gulf business cards are
 * usually bilingual, and the Latin pass still returns the English name, the
 * job title, the company, the phone, the email and the address. Telling
 * somebody to type all of that by hand costs them a scan that would have
 * worked. A card that is Arabic *only* really does come back nearly empty,
 * and that case is worth naming separately — which is what this does.
 *
 * Pure, so both phones can be asked at once; `app/scan-card.tsx` turns the
 * answer into a line of copy.
 */
import type { CardFields } from './parse';

export type ScanOutcome =
  /** Nothing usable came off the photo. */
  | 'nothing'
  /** Everything the card says was read, in whatever language it says it. */
  | 'readInFull'
  /** Fields came back, but any Arabic on the card was not among them. */
  | 'latinOnly';

/** True where the reader knows Arabic: iPhone, with the patch. */
export function scanOutcome(readsArabic: boolean, fields: CardFields): ScanOutcome {
  const found = Object.values(fields).some((v) => typeof v === 'string' && v.trim() !== '');
  if (!found) return 'nothing';
  return readsArabic ? 'readInFull' : 'latinOnly';
}
