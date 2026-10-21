/**
 * When Sanad asks whether it may keep the words, and when it does not.
 *
 * The switch for this lives in Settings → Privacy, where nobody will find
 * it. Asking is the honest way to raise that — but *when* decides whether
 * the question is fair. Asked on the first screen it is a toll gate in front
 * of an app somebody has not used; asked after a few real conversations it
 * is a question about something they now understand, and they can say no.
 *
 * So: not before they have met Sanad, not before they have asked it enough
 * to know what it does, and never twice. A no is kept as firmly as a yes —
 * there is no second asking, because the first one was the ask.
 * BUILD-REVIEW §2.118.
 */

/** What the device knows when the screen draws. */
export type HelpState = {
  /** Sentences this person has sent Sanad, ever, on this device. */
  sent: number;
  /** True once they have answered — either way. */
  decided: boolean;
  /** False until Sanad has introduced itself (src/lib/assistant-met.ts). */
  met: boolean;
  /** True when it is already on; there is nothing to ask. */
  on: boolean;
};

/**
 * Enough conversations to know what Sanad is.
 *
 * Five, not one: the question is "may I keep what you type", and somebody
 * who has typed one thing has no idea what they would be agreeing to. Five
 * is a handful of real errands — past the introduction's examples, which do
 * not count towards it because tapping a card is not choosing a sentence.
 */
export const ENOUGH = 5;

/** Whether to put the question in front of them now. */
export function shouldAskToHelp(state: HelpState): boolean {
  if (state.decided || state.on) return false;
  if (!state.met) return false;
  return state.sent >= ENOUGH;
}

/** What a sentence adds to the count: only one they chose themselves. */
export function countsTowardsAsking(source: 'typed' | 'spoken' | 'chip' | 'intro'): boolean {
  return source === 'typed' || source === 'spoken';
}
