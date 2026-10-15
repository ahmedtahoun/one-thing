/**
 * What a Free account can and cannot do.
 *
 * SETTLED, October 2026 (RELEASE.md §9.5.1). §2.1 left everything but the
 * assistant open, because shipping a lock the design never drew would have
 * been inventing product. That was right while the paywall was a mock-up and
 * wrong to launch from: Free had five of the six things Pro was sold on.
 *
 * The card is the contract. Its sub-line reads "Everything in Free, plus the
 * tools that keep every client warm", so anything it names has to be worth
 * paying for. Two bullets said "Unlimited", which only means something if
 * Free has a number; the rest named a feature outright.
 *
 * Two bullets were removed from the card instead of being locked — Weekly
 * recap, which does not exist (§2.56), and Client history, which is the
 * person's own notes about their own contacts. A window on your own data is
 * the lock most likely to produce a support ticket and the hardest to draw
 * well, and dropping a bullet costs one line of copy where building a lock
 * costs design time. Both capabilities stay here: unsold, not cancelled.
 *
 * A METER IS PREFERRED TO A LOCK wherever the choice exists. The assistant
 * proves the pattern end to end — the count runs out, the paywall opens,
 * nothing new had to be designed — and a generous meter costs forgone
 * revenue where a wrong lock costs trust. Every rule still lives in this one
 * file.
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
 * The one limit the handoff specifies.
 * DATA_MODEL.md: "Free plan: 10 assistant requests/day; Pro: unlimited."
 */
export const FREE_ASSISTANT_REQUESTS_PER_DAY = 10;

/** "Unlimited brain dumps" on the card; enough on Free to use it properly. */
export const FREE_BRAIN_DUMPS_PER_DAY = 3;

/**
 * Waiting follow-ups a Free account may hold at once. A cap, not a daily
 * count: what Pro sells is never losing track of anyone, so the limit is how
 * many people can be waiting, not how often you add one.
 */
export const FREE_ACTIVE_FOLLOW_UPS = 3;

/**
 * "Meetings, webinars & courses". A meeting is the ordinary case and stays
 * free, along with a visit; the two that make the bullet worth paying for do
 * not. This is the one real lock, and it is on a choice at the moment of
 * creation, where an upsell reads as an offer rather than a wall.
 */
export const PRO_EVENT_TYPES = ['webinar', 'course'] as const;
export type EventType = 'visit' | 'meeting' | 'webinar' | 'course';

type Limits = {
  /** `null` means unlimited. */
  assistantRequestsPerDay: number | null;
  brainDumpsPerDay: number | null;
  activeFollowUps: number | null;
};

export function limitsFor(plan: Plan): Limits {
  const pro = isPro(plan);
  return {
    assistantRequestsPerDay: pro ? null : FREE_ASSISTANT_REQUESTS_PER_DAY,
    brainDumpsPerDay: pro ? null : FREE_BRAIN_DUMPS_PER_DAY,
    activeFollowUps: pro ? null : FREE_ACTIVE_FOLLOW_UPS,
  };
}

/**
 * Whether a capability exists at all on this plan — not whether there is any
 * of it left today. `assistant`, `brainDump` and `autoFollowUps` are metered
 * rather than locked, so they answer `true` here and run out through the
 * functions below. Do not add a `plan === 'free'` check to a screen — add it
 * here.
 */
export function can(_plan: Plan, capability: Capability): boolean {
  switch (capability) {
    case 'weeklyRecap':
      // No screen exists for it, so nothing should route to one. Off the
      // paywall as well now (§2.56); this stays until it is built.
      return false;
    case 'assistant':
    case 'clientHistory':
    case 'autoFollowUps':
    case 'brainDump':
    case 'events':
      return true;
  }
}

/** Whether this kind of event can be created on this plan. */
export function canUseEventType(plan: Plan, type: EventType): boolean {
  return isPro(plan) || !(PRO_EVENT_TYPES as readonly string[]).includes(type);
}

/** Brain dumps left today. Pro is unlimited, so this returns `Infinity`. */
export function brainDumpsLeft(plan: Plan, usedToday: number): number {
  const limit = limitsFor(plan).brainDumpsPerDay;
  if (limit === null) return Infinity;
  return Math.max(0, limit - usedToday);
}

/** Whether one more brain dump is allowed right now. */
export function canBrainDump(plan: Plan, usedToday: number): boolean {
  return brainDumpsLeft(plan, usedToday) > 0;
}

/**
 * Whether another follow-up can be left waiting. `waiting` counts the ones
 * still open, so closing one makes room — which is the behaviour the limit
 * is meant to encourage.
 */
export function canAddFollowUp(plan: Plan, waiting: number): boolean {
  const limit = limitsFor(plan).activeFollowUps;
  return limit === null || waiting < limit;
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
