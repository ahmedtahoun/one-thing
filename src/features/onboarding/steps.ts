/**
 * The welcome, in two steps. Which one is showing, what the button says,
 * and where "done" goes.
 *
 * **The handoff did not run this on first use.** SCREENS.md § 04 says the
 * prototype "keeps it reachable but first-run skips it (defaults applied)",
 * and `app/setup.tsx` did exactly that: Gentle, all three channels, 45
 * minutes, written by nobody and asked of no one. The product owner asked
 * for a welcome, which overrides that — so it is recorded in
 * BUILD-REVIEW.md as a departure rather than slipped in as a fix.
 *
 * Two steps and not three. The prototype's markup has a third (`ob3_t`,
 * channels as toggle rows), but `dots: [0, 1]` and
 * `obCta: step < 1 ? cont : start` mean nothing can ever reach it, and its
 * question is the one step 2 already asks with tiles. Building the dead
 * step would have been building a screen the designer had stopped using.
 *
 * Pure: `app/onboarding.tsx` draws it, `src/content/strings.ts` already
 * carries every word in both languages (`ob1_*`, `ob2_*`, `nudges`, `skip`,
 * `cont`, `start` — all ported, none of it written for this).
 */
export const STEPS = 2;

export type Step = 0 | 1;

export function isLast(step: Step): boolean {
  return step >= STEPS - 1;
}

/** Which copy key the button uses: "Continue", then "Let's start". */
export function ctaKey(step: Step): 'cont' | 'start' {
  return isLast(step) ? 'start' : 'cont';
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
