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
 * Three bullets were removed from the card instead of being locked. Weekly
 * recap does not exist (§2.56). Client history is the person's own notes
 * about their own contacts — a window on your own data is the lock most
 * likely to produce a support ticket and the hardest to draw well. And
 * "Meetings, webinars & courses" sold two things with no way in: the event
 * form builds all four types, but every route into it passes `meeting`
 * since Today went from eight tiles to four (§2.57). All three capabilities
 * stay here: unsold, not cancelled.
 *
 * A METER IS PREFERRED TO A LOCK wherever the choice exists. The assistant
 * proves the pattern end to end — the count runs out, the paywall opens,
 * nothing new had to be designed — and a generous meter costs forgone
 * revenue where a wrong lock costs trust. Every rule still lives in this one
 * file.
 */

/** A user's billing state, from DATA_MODEL.md § Entities → User.plan. */
export type Plan = 'free' | 'trial' | 'pro' | 'pro_plus' | 'lapsed';

/**
 * Everything the paywall advertises, keyed to the feature list it shows.
 *
 * The last three are what Pro+ is for. `bulkCardScan` is built and metered
 * (below); the other two are not built and answer false. `FOR_SALE` in
 * src/features/paywall/plans.ts still does not include the tier. Note what
 * is *not* here: bulk email. Send to many already exists and is ungated
 * (app/bulk.tsx), and sending to a *segment* is that screen plus
 * `smartLists` — giving it a capability of its own would put a lock on a
 * feature everyone already has.
 */
export type Capability =
  | 'assistant'
  | 'clientHistory'
  | 'autoFollowUps'
  | 'brainDump'
  | 'events'
  | 'weeklyRecap'
  | 'bulkCardScan'
  | 'smartLists'
  | 'enrichment';

/**
 * Treated as paying. An active trial has the full Pro experience, and Pro+
 * is Pro plus more, so it answers true here as well — every existing check
 * for "has this person paid" keeps working without being told about the new
 * tier.
 */
export function isPro(plan: Plan): boolean {
  return plan === 'pro' || plan === 'trial' || plan === 'pro_plus';
}

/**
 * The higher tier specifically. The trial is of Pro, not Pro+, so it is not
 * included: a trial that quietly handed out the dearer tier would be a
 * surprise in the wrong direction on the day it ended.
 */
export function isProPlus(plan: Plan): boolean {
  return plan === 'pro_plus';
}

/**
 * The one limit the handoff specifies.
 * DATA_MODEL.md: "Free plan: 10 assistant requests/day; Pro: unlimited."
 */
export const FREE_ASSISTANT_REQUESTS_PER_DAY = 10;

/** "Unlimited brain dumps" on the card; enough on Free to use it properly. */
export const FREE_BRAIN_DUMPS_PER_DAY = 3;

/**
 * How many cards one bulk scan saves below Pro+.
 *
 * Bulk scanning is sold as Pro+, and the meter is how it is sold rather than
 * locked: the button is there for everyone, the camera and the batch review
 * run in full, and the cap lands at the end on how many are kept. That is
 * deliberate — the feature exists for the hour someone is standing at a
 * conference, which is both when a new account most needs it to work and
 * when five is most obviously not enough. A lock there would be a dead end
 * at the exact moment the app had earned the sale.
 *
 * It applies to Pro as well, since the tier list puts bulk scanning in Pro+
 * alone. Only Pro+ is uncapped.
 */
export const FREE_BULK_CARDS_PER_BATCH = 5;

/**
 * How many smart lists are kept below Pro+.
 *
 * One, because one is enough to see what they are for and not enough to run a
 * pipeline on. The first is where the idea lands — "clients I have not spoken
 * to in a month" — and wanting a second is the moment the tier is worth
 * paying for. A lock would instead hide the idea entirely, which sells
 * nothing.
 */
export const FREE_SMART_LISTS = 1;

type Limits = {
  /** `null` means unlimited. */
  assistantRequestsPerDay: number | null;
  brainDumpsPerDay: number | null;
  /** Cards kept from one bulk scan. Pro+ only is unlimited. */
  bulkCardsPerBatch: number | null;
  /** Smart lists kept at once. Pro+ only is unlimited. */
  smartLists: number | null;
};

export function limitsFor(plan: Plan): Limits {
  const pro = isPro(plan);
  return {
    assistantRequestsPerDay: pro ? null : FREE_ASSISTANT_REQUESTS_PER_DAY,
    brainDumpsPerDay: pro ? null : FREE_BRAIN_DUMPS_PER_DAY,
    bulkCardsPerBatch: isProPlus(plan) ? null : FREE_BULK_CARDS_PER_BATCH,
    smartLists: isProPlus(plan) ? null : FREE_SMART_LISTS,
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
      // Built now (app/recap.tsx, §2.70) and free, because it came off the
      // paywall when it did not exist (§2.56) and putting it back on the card
      // is a pricing decision rather than a consequence of writing it. Every
      // number in it is read off the device, so there is nothing to meter.
      return true;
    case 'enrichment':
      // The last of Pro+'s three, and still unwritten: nothing anywhere
      // mentions LinkedIn, and looking a person up is the one of the three
      // that cannot be done from what the device already holds. Listed so the
      // paywall can name what the tier will be, and false so nothing routes
      // to a screen that is not there.
      return false;
    case 'smartLists':
      // Built (src/features/people/smart-lists.ts, §2.71) and metered rather
      // than locked, like bulk card scanning: true for every plan, with the
      // number in `limitsFor`.
      return true;
    case 'bulkCardScan':
      // Built (app/scan-many.tsx) and metered rather than locked, so this is
      // true for every plan and the number is in `limitsFor` instead. See
      // FREE_BULK_CARDS_PER_BATCH for why a lock would have been the wrong
      // shape for this one.
      return true;
    case 'assistant':
    case 'clientHistory':
    case 'autoFollowUps':
    case 'brainDump':
    case 'events':
      return true;
  }
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
 * Whether the app chases for you by itself after something is sent.
 *
 * The card says *Auto* follow-ups, and that word is the whole feature. A
 * count cap was the first idea and it was the wrong shape: nobody adds a
 * follow-up, they accumulate as a side effect of sending things, so a cap
 * means the fourth message quietly goes unchased — invisible, and failing
 * exactly where the feature is supposed to help. It also had no good answer
 * for the three screens that turn one parsed list into several waiting
 * items at once.
 *
 * So the number is not limited at all. What Pro buys is the chase starting
 * on its own. A Free account can still have anyone waiting on it, and still
 * says so itself; it just has to say so.
 */
export function canAutoChase(plan: Plan): boolean {
  return isPro(plan);
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

/**
 * Cards still to be kept from the batch in hand. Pro+ is unlimited, so this
 * returns `Infinity` — callers should check `Number.isFinite` rather than
 * compare.
 */
export function bulkCardsLeft(plan: Plan, keptSoFar: number): number {
  const limit = limitsFor(plan).bulkCardsPerBatch;
  if (limit === null) return Infinity;
  return Math.max(0, limit - keptSoFar);
}

/**
 * Whether another smart list can be made. Pro+ is unlimited; everyone else
 * keeps `FREE_SMART_LISTS`, and the screen says so rather than hiding the
 * button.
 */
export function canAddSmartList(plan: Plan, made: number): boolean {
  const limit = limitsFor(plan).smartLists;
  return limit === null || made < limit;
}

/**
 * Which badge a plan wears in Settings.
 *
 * Its own function because `isPro` is the wrong question here. `isPro` is
 * true for `trial`, `pro` and `pro_plus` alike — deliberately, so that every
 * "has this person paid" check keeps working — and the badge used to ask
 * only that, so a Pro+ subscriber and somebody four days into a free trial
 * both read "Pro". The one place a plan is *named* has to tell them apart,
 * and the five plans collapse to four badges rather than three:
 *
 *   free, lapsed → 'free'   a lapsed subscriber is on Free now, and saying
 *                            so is honest; the nudge to come back is the
 *                            card underneath, not the badge
 *   trial        → 'trial'   says the clock is running
 *   pro          → 'pro'
 *   pro_plus     → 'plus'
 */
export type PlanBadgeKind = 'free' | 'trial' | 'pro' | 'plus';

export function planBadge(plan: Plan): PlanBadgeKind {
  switch (plan) {
    case 'pro_plus':
      return 'plus';
    case 'pro':
      return 'pro';
    case 'trial':
      return 'trial';
    case 'free':
    case 'lapsed':
      return 'free';
  }
}
