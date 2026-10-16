/**
 * Whether to explain the microphone before asking for it.
 *
 * Google's Prominent Disclosure & Consent requirement is not satisfied by
 * the operating system's own permission dialog: before an app requests
 * access to the microphone it has to say, in the app itself, what it will
 * collect and what it will do with it, and the wording has to agree with
 * the privacy policy. Apple does not require this, but a line of
 * explanation before a permission prompt is the thing that makes people
 * grant it, so the notice is the same on both phones — the only sheet in
 * this app that exists because of a store policy.
 *
 * The copy is not paraphrased: `added().micNotice.body` is the Voice notes
 * paragraph of the published policy word for word, in both languages, so
 * the two can never drift apart.
 *
 * One decision, kept pure and tested, because the three screens with a mic
 * must make it identically — Quick capture, Brain dump and the Assistant.
 */

/**
 * `agreed` is the stored answer; `ready` says whether storage has been read
 * yet.
 *
 * An unread flag shows the notice. The two failure modes are not equal:
 * showing it twice is a moment's friction, and skipping it is the thing the
 * policy forbids. Same reasoning as `src/lib/onboarded.ts`.
 */
export const needsMicNotice = (agreed: boolean, ready: boolean): boolean => !(agreed && ready);
