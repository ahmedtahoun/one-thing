/**
 * The welcome, in three steps. Which one is showing, what the button says,
 * and where "done" goes.
 *
 * **The handoff did not run this on first use.** SCREENS.md § 04 says the
 * prototype "keeps it reachable but first-run skips it (defaults applied)",
 * and `app/setup.tsx` did exactly that: Gentle, all three channels, 45
 * minutes, written by nobody and asked of no one. The product owner asked
 * for a welcome, which overrides that — so it is recorded in
 * BUILD-REVIEW.md as a departure rather than slipped in as a fix.
 *
 * **Not the prototype's third step.** Its markup has one (`ob3_t`, channels
 * as toggle rows), but `dots: [0, 1]` and `obCta: step < 1 ? cont : start`
 * mean nothing could ever reach it, and its question is the one step 2
 * already asks with tiles. Building that would have been building a screen
 * the designer had stopped using.
 *
 * **The third step is the one the product owner asked for**: whether Sanad
 * may keep what you write. It was asked only by a card in the chat, after
 * five conversations, which meant most people were never asked at all — the
 * card needs somebody to come back and keep typing. Asked here it is asked
 * of everybody, once, in the run of questions they are already answering,
 * and it is the last step so that an answer either way finishes the welcome.
 * Skip leaves it *unanswered* rather than answered no, so Sanad's card can
 * still ask later — src/features/assistant/ask-to-help.ts. BUILD-REVIEW
 * §2.119.
 *
 * Pure: `app/onboarding.tsx` draws it, `src/content/strings.ts` already
 * carries every word in both languages (`ob1_*`, `ob2_*`, `nudges`, `skip`,
 * `cont`, `start` — all ported, none of it written for this) and the third
 * step reuses the question's own words from `meet.help*`, so it is asked in
 * the same wording wherever it is asked.
 */
export const STEPS = 3;

export type Step = 0 | 1 | 2;

export function isLast(step: Step): boolean {
  return step >= STEPS - 1;
}

/**
 * Which copy key the button uses: "Continue", then "Let's start".
 *
 * The last step has no button — it has the question's two answers instead,
 * and one of them is how it is left. So `start` now belongs to the step
 * before it, which is the last one a single CTA can finish.
 */
export function ctaKey(step: Step): 'cont' | 'start' {
  return step >= STEPS - 2 ? 'start' : 'cont';
}

/** True on the step that asks rather than tells, which draws its own pair. */
export function asks(step: Step): boolean {
  return step === STEPS - 1;
}

/** The width of each progress pip, the active one stretched. */
export function pips(step: Step): { width: number; active: boolean }[] {
  return Array.from({ length: STEPS }, (_, i) => ({ width: i === step ? 22 : 6, active: i === step }));
}

/** Forward one, or null when there is nowhere left to go and it should finish. */
export function next(step: Step): Step | null {
  return isLast(step) ? null : ((step + 1) as Step);
}

/**
 * At least one channel has to stay on, or the app has no way to reach
 * anybody and every Quick action on Today leads nowhere. Turning the last
 * one off is refused rather than warned about — the tile simply does not
 * respond, the way a radio group will not let you choose nothing.
 */
export function canTurnOff(channels: Record<string, boolean>, key: string): boolean {
  if (!channels[key]) return true;
  return Object.values(channels).filter(Boolean).length > 1;
}
