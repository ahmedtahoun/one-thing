/**
 * What the admin panel shows, independent of where it comes from.
 *
 * Two sources fill these: `demo.ts`, a port of the handoff's seed data
 * (`design-handoff/source/admin-logic.js`) used to hold the screens to the
 * prototype, and `db.ts`, which reads the real tables. Times are ISO
 * strings; the screens format them (`format.ts`).
 */

export type Plan = 'free' | 'trial' | 'pro' | 'lapsed';
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
  checks: Check[];
  issues: { kind: 'No phone' | 'No email' | 'Duplicate'; text: string; value: string }[];
  tickets: { id: string; text: string; resolved: boolean }[];
  activity: { title: string; detail: string; at: string; colour: string }[];
  taskList: { kind: TaskKind; title: string; who: string; at: string | null; status: 'Overdue' | 'Open' | 'Snoozed' | 'Done' }[];
  contactList: { name: string; role: string; phone: string; email: string; history: number }[];
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
export type TeamMember = { name: string; email: string; role: Role; twoStep: boolean };
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
