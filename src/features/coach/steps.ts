/**
 * The tour: three marks on Today, in the order somebody actually uses the
 * screen.
 *
 * Three and not eight. A tour is a toll on the first run, and everything on
 * it has to earn its tap — so it covers only what is not obvious from
 * looking: that the big card is *the* one thing rather than a to-do, that
 * the tiles start a message rather than opening a list, and that the mic
 * does two different things depending on how long you hold it. The tab bar
 * is not on it, because a tab bar explains itself.
 *
 * Each step names an anchor registered by `useCoachAnchor`. A step whose
 * anchor has not been measured yet — the One Thing card is a different
 * component before anything is set — is skipped rather than pointed at
 * nothing, which `visibleSteps` does.
 */
export type CoachStep = {
  /** The anchor name, as passed to `useCoachAnchor`. */
  anchor: string;
  /** Key into `added(lang).coach.steps`. */
  copy: 'oneThing' | 'actions' | 'mic';
};

export const COACH_STEPS: readonly CoachStep[] = [
  { anchor: 'oneThing', copy: 'oneThing' },
  { anchor: 'actions', copy: 'actions' },
  { anchor: 'mic', copy: 'mic' },
];

/** The steps whose target is actually on screen, in order. */
export function visibleSteps(anchors: Record<string, unknown>, steps: readonly CoachStep[] = COACH_STEPS): CoachStep[] {
  return steps.filter((s) => anchors[s.anchor] !== undefined);
}

/**
 * Whether the tour should run at all.
 *
 * It needs somebody who came through the front door and has not seen it.
 * `onboarded` is deliberately part of the question: a session seeded
 * straight into storage — every screenshot, every drift probe, every smoke
 * suite that does not walk the welcome — has never been onboarded, so the
 * overlay never appears over a screen being measured. That is not a trick
 * to dodge the harness; it is the same rule a person gets. You do not coach
 * somebody who never arrived.
 */
export function shouldRun(onboarded: boolean, seen: boolean, stepsOnScreen: number): boolean {
  return onboarded && !seen && stepsOnScreen > 0;
}
