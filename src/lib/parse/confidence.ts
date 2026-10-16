/**
 * Whether the on-device rules are enough for this note, so the backend — and
 * one of the day's Assistant requests — is only spent where it helps.
 *
 * The router used to ask the server first and fall back to the rules only when
 * it could not answer (./index.ts). That was the wrong way round, and not
 * only on cost:
 *
 *   `AssistTask` on the wire has no `kind` field
 *   (supabase/functions/_shared/assist-contract.ts), so a reply from the
 *   server can never say "this is a promise" or "this is a waiting". Only
 *   ./promise.ts finds those, and it runs here. With the server asked first,
 *   "Waiting for Sara to reply about the quote" came back as an ordinary task
 *   and `app/capture.tsx` never reached its `addFollowUp` branch — the
 *   feature worked offline and did nothing in production.
 *
 * So a note the rules can read confidently is read here, and that is also the
 * only way the promise and waiting shapes survive. The question this file
 * answers is narrow: *was the sentence explicit enough that the rules cannot
 * be guessing?* It never judges whether the answer is good — the screens
 * still show every proposal for confirmation, and ./clarify.ts still asks
 * about whatever is missing, whichever parser produced it.
 */
import { dayOf, partOf, timeOf, typeOf, whoOf } from './local';
import { loopOf } from './promise';
import type { ParseContext } from './types';

/**
 * Why the rules are enough, or null when they are not. The reason is carried
 * rather than a bare boolean so the tests — and anyone reading a decision
 * later — can see which signal settled it.
 */
export type Enough =
  /** A promise or a waiting. The server cannot express either, so this is not a preference. */
  | 'loop'
  /** A day or a time was actually said, so nothing about "when" is invented. */
  | 'time'
  /** A channel word and somebody already in People: "email Sara", "كلم عمر". */
  | 'channel-and-who'
  | null;

/** What the rules can be sure of in one sentence. */
export function enoughFor(text: string, ctx: ParseContext): Enough {
  const t = text.trim();
  if (t === '') return null;
  if (loopOf(t, ctx.contacts)) return 'loop';
  if (dayOf(t, ctx.now).said || timeOf(t) !== null || partOf(t) !== null) return 'time';
  if (typeOf(t) !== 'reminder' && whoOf(t, ctx.contacts).contactId !== null) return 'channel-and-who';
  return null;
}

export const localIsEnough = (text: string, ctx: ParseContext): boolean => enoughFor(text, ctx) !== null;

/**
 * A brain dump is messy by definition and splitting it is the one thing the
 * server is plainly better at, so this is deliberately stricter: the rules
 * take the whole dump only when every piece is explicit — or when any piece
 * is a promise or a waiting, because then going to the server would throw
 * that away, which is worse than a clumsier split.
 */
export function dumpIsEnough(pieces: readonly string[], ctx: ParseContext): boolean {
  if (pieces.length === 0) return false;
  if (pieces.some((piece) => enoughFor(piece, ctx) === 'loop')) return true;
  return pieces.every((piece) => localIsEnough(piece, ctx));
}
