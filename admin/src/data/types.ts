/**
 * What the admin panel shows, independent of where it comes from.
 *
 * Two sources fill these: `demo.ts`, a port of the handoff's seed data
 * (`design-handoff/source/admin-logic.js`) used to hold the screens to the
 * prototype, and `db.ts`, which reads the real tables. Times are ISO
 * strings; the screens format them (`format.ts`).
 */

/**
 * Mirrors `plan_kind` in the database and `Plan` in the app's
 * src/policy/entitlements.ts. `pro_plus` is the dearer tier: priced and
 * stored, not yet on sale.
 */
export type Plan = 'free' | 'trial' | 'pro' | 'pro_plus' | 'lapsed';

/**
 * Whether this plan is a paying one. Worth a function rather than a
 * comparison: the panel used to ask `plan !== 'pro'` to mean "not paying",
 * which was true while Pro was the only paid tier and became wrong the
 * moment it was not — it would have offered a Pro+ subscriber a comped Pro
 * month.
 */
export const paying = (plan: Plan): boolean => plan === 'pro' || plan === 'pro_plus' || plan === 'trial';

/** What to call the plan in the panel. */
export const planLabel = (plan: Plan): string =>
  plan === 'pro_plus' ? 'Pro+' : plan === 'pro' ? 'Pro' : plan === 'trial' ? 'Trial' : plan === 'lapsed' ? 'Pro ended' : 'Free plan';
/** The prototype's subscription states; `grace` is shown as "Billing issue". */
export type SubStatus = 'active' | 'trial' | 'grace' | 'cancelled' | 'refunded';
export type Role = 'Owner' | 'Support' | 'Analyst';
export type TaskKind = 'call' | 'email' | 'whatsapp' | 'reminder' | 'meeting' | 'visit' | 'webinar' | 'course';

export type UserRow = {
  id: string;
  name: string;
  first: string;
  email: string;
  /** Empty when the user gave none. */
  phone: string;
  job: string;
  /** Flag and name, "🇦🇪 UAE"; empty when unknown. */
  country: string;
  platform: 'iOS' | 'Android' | null;
  signin: 'Apple' | 'Google';
  plan: Plan;
  sub: SubStatus | null;
  billing: 'Yearly' | 'Monthly' | null;
  joinedAt: string;
  lastActiveAt: string | null;
  contacts: number;
  tasks: number;
  marketing: boolean;
  suspended: boolean;
};

/**
 * The lengths a comp may be given for, matching `comp_grant`'s own check
 * constraint. Here rather than in `actions.ts`, which is `'use server'` and
 * may export nothing but async functions.
 */
export const COMP_MONTHS = [1, 3, 6, 12] as const;

export type CheckFix = 'howto' | 'receipt' | 'resync';
export type Check = { status: 'ok' | 'warn' | 'bad'; title: string; detail: string; fix: CheckFix | null };

export type UserDetail = UserRow & {
  followUps: number;
  focusHours: number;
  appVersion: string | null;
  termsVersion: string | null;
  termsAt: string | null;
  marketingAt: string | null;
  notifications: boolean | null;
  subRenewsAt: string | null;
  subEndsAt: string | null;
  storeConsoleUrl: string | null;
  /**
   * Pro given rather than sold, if one is running (`comp_grant`). Null is
   * the ordinary case; a store subscription is `sub` and is separate.
   */
  comp: { plan: Plan; months: number; reason: string; endsAt: string } | null;
  checks: Check[];
  issues: { kind: 'No phone' | 'No email' | 'Duplicate'; text: string; value: string }[];
  tickets: { id: string; text: string; resolved: boolean }[];
  activity: { title: string; detail: string; at: string; colour: string }[];
  taskList: { kind: TaskKind; title: string; who: string; at: string | null; status: 'Overdue' | 'Open' | 'Snoozed' | 'Done' }[];
  /**
   * The people this user has saved. `name`, `role`, `phone` and `email` are
   * the four the drawer's table shows; the rest open under a row when it is
   * tapped. Deliberately **not** here: the contact's address, the user's
   * labels for them, and the user's private note — all three are stored
   * (DATA_MODEL § contacts) and none is named in the Privacy Policy's "Who
   * at our company can see it", which lists "name, position, company, phone
   * and email". Widening the sentence is a decision for the controller and
   * the lawyer who reviewed it, not for this screen (BUILD-REVIEW § 2.73).
   */
  contactList: {
    name: string;
    role: string;
    phone: string;
    email: string;
    history: number;
    phone2: string;
    email2: string;
    /** How this user prefers to reach them, if they set it. */
    channel: TaskKind | null;
  }[];
  messages: {
    kind: TaskKind;
    to: string;
    subject: string;
    body: string;
    status: 'sent' | 'draft' | 'done' | 'not sent';
    at: string;
  }[];
};

export type SubscriptionRow = UserRow & { sub: SubStatus; startedAt: string; renewsAt: string | null; endsAt: string | null };

export type Ticket = {
  id: string;
  source: 'app' | 'ios' | 'play';
  /** The app user behind an in-app ticket. */
  userId: string | null;
  /** The user's name, or the reviewer's name in the store. */
  name: string;
  /** For an in-app ticket: the user's platform and plan, shown under the name. */
  userPlatform: 'iOS' | 'Android' | null;
  userPlan: Plan | null;
  stars: number | null;
  resolved: boolean;
  at: string;
  thread: { fromUser: boolean; text: string; at: string }[];
};

export type PrivacyRequest = {
  id: string;
  type: 'Delete' | 'Export';
  userId: string | null;
  name: string;
  email: string;
  via: 'app' | 'website';
  requestedAt: string;
  deadlineAt: string;
  done: boolean;
};

export type AuditEntry = { at: string; who: string; what: string; why: string };
/** `id` is the Supabase Auth user id — what `admin_member` is keyed on. */
export type TeamMember = { id: string; name: string; email: string; role: Role; twoStep: boolean };
export type OfferCode = { code: string; description: string; used: number; active: boolean };

export type Overview = {
  totalUsers: number;
  usersThisMonth: number;
  /** Active users for Today / 7 days / 30 days, and the change against the period before. */
  active: [number, number, number];
  activeChange: [number | null, number | null, number | null];
  pro: number;
  proThisMonth: number;
  trial: number;
  /** Share of trials that became Pro, 0–100; null without enough history. */
  trialConversion: number | null;
  /** Monthly revenue before and after store fees, in dollars; null without store data. */
  revenue: number | null;
  revenueAfterFees: number | null;
  /** Share of subscriptions cancelled in the last 30 days, 0–100, and the change in points. */
  cancelled: number | null;
  cancelledChange: number | null;
  /** Sign-ups for each of the last 14 days, oldest first, keyed YYYY-MM-DD. */
  signups: { date: string; count: number }[];
  sources: { label: string; share: number }[];
  attention: { text: string; meta: string; tone: 'urgent' | 'warn' | 'quiet' }[];
  usage: { label: string; share: number; colour: string }[];
};

export type Growth = {
  funnel: { label: string; count: number }[];
  /** A suggestion after the biggest drop. The prototype's own, in the demo; nothing live yet. */
  advice: string | null;
  cohorts: { week: string; values: (number | null)[] }[];
  codes: OfferCode[];
};

export type SubscriptionStats = { active: number; trial: number; grace: number; cancelling: number; yearlyShare: number | null };

export type Badges = { support: number; requests: number };

/** Something the admin did, kept as the audit log's action and reason. */
export type Logged = { what: string; why: string };

/**
 * How people really ask Sanad, grouped by the sentence so a phrasing asked
 * forty times is one row with a 40 on it.
 *
 * The text arrived redacted — the phone replaced names, numbers and
 * addresses with {name}, {phone} and {email} before anything was queued
 * (src/lib/parse/redact.ts), and the table refuses a row that still holds an
 * address or a long number. Nothing here is linked to a person in this view,
 * which is why reading it needs `dataset` and not `personal`.
 */
export type PhrasingRow = {
  /** The redacted sentence, as a reader of the admin panel sees it. */
  text: string;
  /** What Sanad made of it. 'unknown' is the one to fix. */
  verdict: string;
  /** How many times it has been asked this way. */
  count: number;
  /** 'en', 'ar' or 'ar-EG', whichever it was asked in — several if several. */
  langs: string[];
  spoken: number;
  lastAt: string;
};

/** The phrasings list and what it adds up to. */
export type Phrasings = {
  rows: PhrasingRow[];
  /** Distinct phrasings and total askings, over the window. */
  distinct: number;
  total: number;
  /** How many of the askings Sanad could not answer. */
  unanswered: number;
};
