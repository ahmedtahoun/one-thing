/**
 * What a Free account can and cannot do.
 *
 * OPEN PRODUCT DECISION — see BUILD-REVIEW.md §2.1. The paywall sells six
 * features, but the handoff states exactly one limit anywhere: "Free plan: 10
 * assistant requests a day" (DATA_MODEL.md § AI / parsing, and the paywall's
 * own feature copy). It never says what Free loses for client history, auto
 * follow-ups, brain dumps or the event types, and no screen in the design has
 * a locked or upsell state drawn for them.
 *
 * So everything except the documented assistant limit defaults to ALLOWED.
 * That is deliberate: shipping a lock the design never drew would be inventing
 * product, and a too-generous Free tier is recoverable where a wrongly-locked
 * screen is a support ticket. Every gate lives here, so turning one on is a
 * one-line change in this file plus the locked state in the one screen that
 * reads it — not a sweep through 21 screens.
 */

/** A user's billing state, from DATA_MODEL.md § Entities → User.plan. */
export type Plan = 'free' | 'trial' | 'pro' | 'lapsed';

/** Everything the paywall advertises, keyed to the feature list it shows. */
export type Capability =
  | 'assistant'
  | 'clientHistory'
  | 'autoFollowUps'
  | 'brainDump'
  | 'events'
  | 'weeklyRecap';

/** Treated as paying: an active trial has the full Pro experience. */
export function isPro(plan: Plan): boolean {
  return plan === 'pro' || plan === 'trial';
}

/**
 * The only limit the handoff actually specifies.
 * DATA_MODEL.md: "Free plan: 10 assistant requests/day; Pro: unlimited."
 */
export const FREE_ASSISTANT_REQUESTS_PER_DAY = 10;

type Limits = {
  /** `null` means unlimited. */
  assistantRequestsPerDay: number | null;
};

export function limitsFor(plan: Plan): Limits {
  return {
    assistantRequestsPerDay: isPro(plan) ? null : FREE_ASSISTANT_REQUESTS_PER_DAY,
  };
}

/**
 * Whether a capability is available at all on this plan.
 *
 * Only `assistant` is metered (see `assistantRequestsLeft`); everything else
 * is open on every plan until the gating matrix is decided. Do not add a
 * `plan === 'free'` check to a screen — add it here.
 */
export function can(_plan: Plan, capability: Capability): boolean {
  switch (capability) {
    case 'weeklyRecap':
      // Sold on the paywall, but no screen exists for it in the handoff
      // (BUILD-REVIEW.md §2.2). Off for everyone until it is designed, so we
      // never route to a screen that isn't there.
      return false;
    case 'assistant':
    case 'clientHistory':
    case 'autoFollowUps':
    case 'brainDump':
    case 'events':
      return true;
  }
}

/**
 * Assistant requests remaining today. Pro is unlimited, so this returns
 * `Infinity` — callers should check `Number.isFinite` rather than compare.
 */
export function assistantRequestsLeft(plan: Plan, usedToday: number): number {
  const limit = limitsFor(plan).assistantRequestsPerDay;
  if (limit === null) return Infinity;
  return Math.max(0, limit - usedToday);
}

/** Whether one more assistant request is allowed right now. */
export function canUseAssistant(plan: Plan, usedToday: number): boolean {
  return assistantRequestsLeft(plan, usedToday) > 0;
}
