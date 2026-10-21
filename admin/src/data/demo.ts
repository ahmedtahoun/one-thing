/**
 * The handoff's seed data as a DataSource — `design-handoff/source/
 * admin-logic.js`, ported line for line, so demo mode shows what the
 * prototype shows and can be measured against it.
 *
 * In-memory and per server process: changes (suspend, reply, resolve…)
 * behave as in the prototype and are gone on restart. It never touches a
 * database, and `config.ts` only allows it when ADMIN_DEMO=1.
 */
import { dateKey, day, zoned } from './format';
import { newPassword } from '../auth/password';
import { contactsToCsv, usersToCsv } from './csv';
import type { DataSource } from './source';
import type {
  AuditEntry,
  Check,
  OfferCode,
  Plan,
  PrivacyRequest,
  SubStatus,
  SubscriptionRow,
  TaskKind,
  TeamMember,
  Ticket,
  UserDetail,
  UserRow,
  PhrasingRow,
  TranscriptRow,
} from './types';

// ------------------------------------------------- the prototype's seed ----
const FIRST = ['Khalid', 'Sara', 'Faisal', 'Noura', 'Omar', 'Reem', 'Yousef', 'Lama', 'Abdullah', 'Hessa', 'Majed', 'Dana', 'Turki', 'Ghada', 'Nasser', 'Rana', 'Ali', 'Maha', 'Saud', 'Joud', 'Hamad', 'Layla', 'Fahad', 'Aseel'];
const LAST = ['Al-Mansouri', 'Haddad', 'Al-Otaibi', 'Al-Harbi', 'Khalid', 'Al-Qahtani', 'Al-Dosari', 'Al-Shehri', 'Al-Ghamdi', 'Al-Zahrani', 'Al-Mutairi', 'Al-Anazi'];
const JOBS = ['Founder', 'Freelancer', 'Sales', 'Manager', 'Consultant', 'Student'];
const CTRY = [['🇸🇦', 'Saudi Arabia', '+966'], ['🇦🇪', 'UAE', '+971'], ['🇰🇼', 'Kuwait', '+965'], ['🇧🇭', 'Bahrain', '+973'], ['🇶🇦', 'Qatar', '+974'], ['🇪🇬', 'Egypt', '+20']] as const;
const PLANS: Plan[] = ['pro', 'free', 'trial', 'pro', 'free', 'free', 'pro', 'lapsed', 'free', 'trial', 'pro', 'free'];
const rnd = (i: number, m: number) => ((i * 9301 + 49297) % 233280) % m;

const TDB: [TaskKind, string, number, string][] = [['call', 'Confirm Friday catering order', 6, 'Reem Al-Qahtani'], ['email', 'Send October invoices', 5, 'Omar Khalid'], ['whatsapp', 'Follow up on price quote', 0, 'Mohammed Al-Saadi'], ['meeting', 'Q4 pricing review · Zoom', 8, 'Sara Haddad'], ['reminder', 'Renew commercial registration', 9, 'Ministry portal'], ['visit', 'Tasting at the new branch', 1, 'Bader Al-Fahad'], ['email', 'Deck v3 + book a call', 3, 'Sara Haddad'], ['call', 'Contract terms', 4, 'Faisal Al-Otaibi'], ['whatsapp', 'Share new menu photos', 2, 'Noura Al-Harbi'], ['reminder', 'Pay the packaging supplier', 7, 'Al Noor Packaging']];
/**
 * The prototype's contacts, with the second number, second email and chosen
 * channel the drawer opens under a row. The first four fields are what the
 * table shows and are the prototype's own, so `npm run fidelity` still
 * compares like with like.
 */
const CDB: [string, string, string, string, string, string, TaskKind | null][] = [
  ['Mohammed Al-Saadi', 'Client · Al-Saadi Trading', '+966 50 221 4410', 'mohammed@alsaadi-trading.com', '+966 11 477 3301', 'orders@alsaadi-trading.com', 'whatsapp'],
  ['Sara Haddad', 'Investor · Northwind VC', '+971 50 331 2045', 'sara@northwind.vc', '', 'sara.haddad@gmail.com', 'email'],
  ['Faisal Al-Otaibi', 'Lawyer · Otaibi Law', '+966 55 123 4567', 'faisal@otaibilaw.sa', '', '', 'call'],
  ['Noura Al-Harbi', 'Designer · Studio Noura', '+966 54 880 1123', 'noura@studionoura.com', '', 'hello@studionoura.com', 'whatsapp'],
  ['Al Noor Packaging', 'Supplier', '+966 11 465 2200', 'sales@alnoorpack.com', '+966 11 465 2201', '', 'call'],
  ['Omar Khalid', 'Accountant · LedgerCo', '+966 56 702 9910', 'omar@ledgerco.sa', '', '', 'email'],
  ['Reem Al-Qahtani', 'Coffee supplier · Qahwa Beans', '+973 3300 4512', 'reem@qahwabeans.com', '', '', 'whatsapp'],
  ['Yousef Al-Dosari', 'Landlord', '+966 50 900 1188', '', '', '', 'call'],
  ['Bader Al-Fahad', 'Head of Ops · Riyadh Roasters', '+966 53 118 7720', 'bader@riyadhroasters.sa', '+966 11 220 8814', '', null],
  ['Huda Al-Saleh', 'HR Manager · Tamkeen', '', 'huda.saleh@tamkeen.sa', '', '', 'email'],
];
const MDB: [TaskKind, string, string, string, UserDetail['messages'][number]['status']][] = [['whatsapp', 'Mohammed Al-Saadi', '', 'Hi Mohammed, hope you’re well. Just checking the price quote reached you. If you pay upfront I can do 5% off, and delivery is 2 weeks.', 'sent'], ['email', 'Sara Haddad', 'Deck v3 + a quick call', 'Hi Sara,\nAttached is v3 of the deck — the new traction slide is on page 4. Would Tuesday 11:00 or Wednesday 14:00 work for 20 minutes?', 'sent'], ['email', 'Omar Khalid', 'October invoices', 'Hi Omar, sharing the October invoices for the three branches. Let me know if anything is missing.', 'draft'], ['whatsapp', 'Noura Al-Harbi', '', 'Hi Noura! Could you send the final logo files when you get a moment? Thanks!', 'not sent'], ['call', 'Reem Al-Qahtani', '', 'Call script: confirm 40 guests, Friday 1pm, oat milk option.', 'done']];

/** The prototype's "today": Friday 10 October 2026, midday in the panel's zone. */
const NOW = () => zoned(2026, 9, 10, 12);

/** `n` days before the prototype's today, at `time` ("08:41") in the panel's zone, as ISO. */
function ago(n: number, time = '00:00'): string {
  const [h, m] = time.split(':').map(Number);
  return zoned(2026, 9, 10 - n, h ?? 0, m ?? 0).toISOString();
}

type Seed = UserRow & { index: number; joinedN: number; lastN: number; fus: number; mktN: number };

function seedUsers(): Seed[] {
  return FIRST.map((f, i) => {
    const l = LAST[i % LAST.length]!;
    const c = CTRY[rnd(i + 3, 6) > 3 ? rnd(i, 6) : 0]!;
    const plan = PLANS[i % 12]!;
    const sub: SubStatus | null =
      plan === 'pro' ? (i % 7 === 3 ? 'grace' : i % 5 === 0 ? 'cancelled' : 'active') : plan === 'trial' ? 'trial' : plan === 'lapsed' ? (i % 2 ? 'refunded' : 'cancelled') : null;
    const joined = 3 + rnd(i * 7, 160);
    const last = rnd(i * 3, 9);
    return {
      index: i,
      id: 'usr_' + (48213 + i * 37).toString(36),
      name: f + ' ' + l,
      first: f,
      email: f.toLowerCase() + '.' + l.toLowerCase().replace('al-', '') + '@' + ['gmail.com', 'icloud.com', 'outlook.com', 'qahwahouse.sa'][i % 4],
      phone: i % 3 === 2 ? '' : c[2] + ' 5' + (10 + i) + ' ' + (300 + i * 17) + ' ' + (1000 + i * 131).toString().slice(0, 4),
      job: JOBS[i % 6]!,
      country: c[0] + ' ' + c[1],
      platform: i % 3 === 1 ? 'Android' : 'iOS',
      signin: i % 3 === 1 ? 'Google' : i % 4 === 0 ? 'Google' : 'Apple',
      plan,
      sub,
      billing: i % 2 ? 'Yearly' : 'Monthly',
      joinedAt: ago(joined),
      lastActiveAt: ago(last),
      joinedN: joined,
      lastN: last,
      mktN: joined,
      contacts: 4 + rnd(i * 11, 60),
      tasks: 6 + rnd(i * 13, 140),
      fus: rnd(i * 5, 14),
      marketing: i % 3 !== 1,
      suspended: false,
    };
  });
}

type DemoTicket = { id: number; src: Ticket['source']; u?: number; stars?: number; name?: string; st: 'open' | 'done'; d: number; t: string; thread: ['u' | 'a', string][] };

const state = {
  users: seedUsers(),
  tickets: [
    { id: 1, src: 'app', u: 7, st: 'open', d: 0, t: '14:20', thread: [['u', 'My reminders stopped ringing after the last update. I missed two calls today 😕']] },
    { id: 2, src: 'ios', stars: 2, name: 'busy_mama_sa', st: 'open', d: 0, t: '11:05', thread: [['u', 'Love the idea but notifications come late on my iPhone. Fix and I’ll give 5 stars.']] },
    { id: 3, src: 'app', u: 2, st: 'open', d: 1, t: '18:40', thread: [['u', 'How do I move my data to a new phone?']] },
    { id: 4, src: 'play', stars: 5, name: 'Abdulrahman K.', st: 'open', d: 1, t: '09:12', thread: [['u', 'Finally an app that gets ADHD brains. The WhatsApp drafts are genius.']] },
    { id: 5, src: 'app', u: 11, st: 'done', d: 3, t: '10:30', thread: [['u', 'Can I pay yearly instead?'], ['a', 'Yes! Settings → Try Pro → Yearly. You’ll save 40%.']] },
    { id: 6, src: 'play', stars: 1, name: 'Mansour', st: 'open', d: 2, t: '22:01', thread: [['u', 'Charged after the trial and I forgot to cancel.']] },
  ] as DemoTicket[],
  reqs: [
    { id: 1, type: 'Delete' as const, u: 7, d: 3, done: false },
    { id: 2, type: 'Export' as const, u: 2, d: 1, done: false },
    { id: 3, type: 'Delete' as const, u: 15, d: 22, done: false },
    { id: 4, type: 'Export' as const, u: 11, d: 9, done: true },
    { id: 5, type: 'Delete' as const, u: 19, d: 26, done: true },
  ],
  log: [
    { at: ago(0, '09:42'), who: 'Khalid', what: 'Viewed subscription · Lama Al-Shehri', why: 'Billing issue follow-up' },
    { at: ago(1, '17:15'), who: 'Dana (Support)', what: 'Revealed contacts · Sara Haddad', why: 'Ticket #1182 — sync bug' },
    { at: ago(1, '11:03'), who: 'Khalid', what: 'Extended trial 7 days · Hessa Al-Zahrani', why: 'Onboarding bug compensation' },
    { at: ago(2, '14:20'), who: 'System', what: 'Deleted account · usr_1kz9', why: 'User request (in app)' },
    { at: ago(3, '10:51'), who: 'Dana (Support)', what: 'Exported data · Rana Al-Mutairi', why: 'User request #1170' },
  ] as AuditEntry[],
  codes: [
    { code: 'LAUNCH50', description: '50% off first year · yearly', used: 312, active: true },
    { code: 'FRIEND1M', description: '1 month free Pro', used: 88, active: true },
    { code: 'RAMADAN', description: '3 months for $0.99', used: 0, active: false },
  ] as OfferCode[],
};

const TEAM: TeamMember[] = [
  { id: 'demo-owner', name: 'Khalid Al-Mansouri', email: 'khalid@onlyonething.app', role: 'Owner', twoStep: true },
  { id: 'demo-support', name: 'Dana Al-Anazi', email: 'dana@onlyonething.app', role: 'Support', twoStep: true },
  { id: 'demo-analyst', name: 'Turki Al-Ghamdi', email: 'turki@onlyonething.app', role: 'Analyst', twoStep: true },
];
/**
 * Comps granted in this session, by user id. Empty to begin with, so the
 * drawer matches the prototype until one is given.
 */
const comps = new Map<string, NonNullable<UserDetail['comp']>>();

/** Demo admins are named by their first name in the log, as the prototype does. */
const ADMIN_NAMES: Record<string, string> = { 'demo-owner': 'Khalid', 'demo-support': 'Dana (Support)', 'demo-analyst': 'Turki (Analyst)' };

const row = ({ index: _i, joinedN: _j, lastN: _l, fus: _f, mktN: _m, ...user }: Seed): UserRow => user;

function detail(cu: Seed): UserDetail {
  const ui = state.users.indexOf(cu);
  const bad = cu.lastN > 4;
  const android = cu.platform === 'Android';
  const seed = cu.tasks % 7;
  const rot = <T,>(arr: T[]) => arr.map((_, i) => arr[(i + seed) % arr.length]!);
  const relN = (n: number) => (n === 0 ? 'Today' : n === 1 ? 'Yesterday' : n < 7 ? n + ' days ago' : n < 30 ? Math.floor(n / 7) + ' wk ago' : Math.floor(n / 30) + ' mo ago');
  const dayN = (n: number) => day(ago(n), NOW());

  const contactList = rot(CDB).map(([name, role, phone, email, phone2, email2, channel], i) => ({ name, role, phone, email, phone2, email2, channel, history: 2 + ((i * 5 + seed) % 11) }));
  const checks: Check[] = [
    { status: bad ? 'warn' : 'ok', title: 'Notifications', detail: bad ? 'Permission off since ' + dayN(cu.lastN) + ' — reminders won’t ring' : 'Allowed · last push delivered ' + relN(cu.lastN), fix: bad ? 'howto' : null },
    { status: 'ok', title: 'Sync', detail: 'Last sync ' + relN(cu.lastN) + ' · ' + cu.tasks + ' tasks · ' + cu.contacts + ' contacts', fix: null },
    { status: android && ui % 2 ? 'warn' : 'ok', title: 'App version', detail: (cu.platform === 'iOS' ? '1.0.0 · iOS 19.1' : '1.0.0 · Android 16') + (android && ui % 2 ? ' · update 1.0.1 fixes late reminders' : ' · latest'), fix: null },
    { status: ui % 5 === 2 ? 'warn' : 'ok', title: 'Crashes · 30 days', detail: ui % 5 === 2 ? '2 crashes on Focus screen (fixed in 1.0.1)' : 'None', fix: null },
    { status: cu.sub === 'grace' ? 'bad' : 'ok', title: 'Billing', detail: cu.sub === 'grace' ? 'Payment failed — store is retrying' : cu.sub ? 'Receipt valid' : 'No subscription', fix: cu.sub ? 'receipt' : null },
    { status: 'ok', title: 'Account', detail: cu.suspended ? 'Suspended' : 'Active · signed in with ' + cu.signin, fix: 'resync' },
  ];
  const issues: UserDetail['issues'] = [
    ...contactList.filter((c) => !c.phone).slice(0, 2).map((c) => ({ kind: 'No phone' as const, text: c.name + ' — WhatsApp and call can’t start', value: '' })),
    ...contactList.filter((c) => !c.email).slice(0, 1).map((c) => ({ kind: 'No email' as const, text: c.name + ' — email drafts can’t open', value: '' })),
    ...(ui % 3 === 0 ? [{ kind: 'Duplicate' as const, text: contactList[0]!.name + ' saved twice', value: contactList[0]!.phone || '—' }] : []),
  ];

  return {
    ...row(cu),
    followUps: cu.fus,
    focusHours: Math.round(cu.tasks / 9),
    appVersion: cu.platform === 'iOS' ? '1.0.0 (iOS 19.1)' : '1.0.0 (Android 16)',
    termsVersion: '1.0',
    termsAt: ago(cu.joinedN),
    marketingAt: cu.marketing ? ago(cu.mktN) : null,
    notifications: cu.lastN < 5,
    subRenewsAt: cu.sub && cu.sub !== 'cancelled' ? ago(-(4 + rnd(cu.contacts, 26))) : null,
    subEndsAt: cu.sub === 'cancelled' ? ago(-14) : null,
    storeConsoleUrl: null,
    comp: comps.get(cu.id) ?? null,
    checks,
    issues,
    tickets: state.tickets.filter((t) => t.u === ui).map((t) => ({ id: String(t.id), text: t.thread[0]![1], resolved: t.st === 'done' })),
    activity: (
      [
        ['Signed in', cu.signin + ' · ' + cu.platform, 0, '08:41', '#0b0b0b'],
        ['Set One Thing', 'Finish the investor proposal · 45 min', 0, '08:44', '#0b0b0b'],
        ['Completed focus session', '45 min', 0, '09:31', 'oklch(0.52 0.13 150)'],
        ['Sent WhatsApp draft', 'Mohammed Al-Saadi', 0, '10:12', 'oklch(0.52 0.13 150)'],
        ['Added meeting', 'Q4 pricing review · Zoom', 1, '16:05', 'oklch(0.52 0.12 200)'],
        ['Brain dump', '3 tasks extracted, 1 removed', 1, '19:20', 'oklch(0.55 0.15 50)'],
        ['Added contact', 'Bader Al-Fahad · Head of Ops', 2, '11:02', '#0b0b0b'],
        ['Marked follow-up closed', 'Logo final files', 3, '15:47', 'oklch(0.52 0.14 250)'],
        ['Closed the day', '6 of 9 kept', 3, '21:10', '#8a8a86'],
        ['Started Pro trial', 'Yearly · $2.99/mo', cu.joinedN - 1, '20:15', 'oklch(0.48 0.15 300)'],
      ] as [string, string, number, string, string][]
    ).map(([title, d, n, time, colour]) => ({ title, detail: d, at: ago(n, time), colour })),
    taskList: rot(TDB)
      .concat(rot(TDB).slice(0, 4))
      .map(([kind, title, dd, who], i) => ({
        kind,
        title,
        who,
        at: ago(dd + Math.floor(i / 3), ['09:30', '11:00', '13:00', '16:30'][i % 4]),
        status: i < 3 ? (i === 0 ? 'Overdue' : 'Open') : i % 4 === 0 ? 'Snoozed' : 'Done',
      })),
    contactList,
    messages: rot(MDB).map(([kind, to, subject, body, status], i) => ({
      kind,
      to,
      subject,
      body,
      status,
      at: ago(i * 2 + 1, ['10:12', '14:40', '09:05', '18:22', '12:30'][i]),
    })),
  };
}

function subscriptionRow(u: Seed): SubscriptionRow {
  const ended = u.sub === 'cancelled' || u.sub === 'refunded';
  return {
    ...row(u),
    sub: u.sub!,
    startedAt: ago(Math.max(1, u.joinedN - 7)),
    renewsAt: ended ? null : ago(-(4 + rnd(u.contacts, 26))),
    endsAt: ended ? ago(-12 - rnd(u.tasks, 20)) : null,
  };
}

export const demoSource: DataSource = {
  now: NOW,

  async overview() {
    const openRequests = state.reqs.filter((r) => !r.done).length;
    const SU = [18, 24, 21, 32, 27, 14, 19, 26, 31, 29, 41, 36, 22, 28];
    return {
      totalUsers: 2418,
      usersThisMonth: 138,
      active: [312, Math.round(312 * 6.2), Math.round(312 * 24)],
      activeChange: [6, 6, 6],
      pro: 384,
      proThisMonth: 21,
      trial: 57,
      trialConversion: 41,
      revenue: 1412,
      revenueAfterFees: 1200,
      cancelled: 3.1,
      cancelledChange: -0.4,
      // The prototype labels its bars Mon…Sun twice without dates; these are
      // the fortnight that reads that way (21 Sept – 4 Oct).
      signups: SU.map((count, i) => ({ date: dateKey(new Date(ago(19 - i, '12:00'))), count })),
      sources: [
        { label: 'iPhone · Sign in with Apple', share: 58 },
        { label: 'Android · Google', share: 34 },
        { label: 'iPhone · Google', share: 8 },
        { label: 'Arabic interface', share: 71 },
      ],
      attention: [
        { text: openRequests + ' privacy requests open', meta: 'oldest due in 4 days', tone: 'urgent' },
        { text: '6 Pro users with billing issues', meta: 'store retrying payment', tone: 'warn' },
        { text: 'Crash rate 0.4% on Android 16', meta: 'focus screen', tone: 'warn' },
        { text: '12 new 1–2★ reviews mention reminders', meta: 'this week', tone: 'quiet' },
      ],
      usage: [
        { label: 'Reminders', share: 92, colour: 'oklch(0.55 0.15 300)' },
        { label: 'WhatsApp drafts', share: 74, colour: 'oklch(0.52 0.13 150)' },
        { label: 'Focus sessions', share: 61, colour: '#0b0b0b' },
        { label: 'Follow-ups', share: 48, colour: 'oklch(0.52 0.14 250)' },
        { label: 'Voice capture', share: 37, colour: 'oklch(0.55 0.15 50)' },
        { label: 'Meetings & visits', share: 22, colour: 'oklch(0.52 0.12 200)' },
      ],
    };
  },

  async users(search, plan) {
    const q = search.trim().toLowerCase();
    const rows = state.users.filter(
      (u) =>
        (plan === 'all' || u.plan === plan) &&
        (!q || u.name.toLowerCase().includes(q) || u.email.includes(q) || u.phone.replace(/\D/g, '').includes(q.replace(/\D/g, '') || '§') || u.id.includes(q))
    );
    return { rows: rows.map(row), total: 2418 };
  },

  async user(id) {
    const u = state.users.find((x) => x.id === id);
    return u ? detail(u) : null;
  },

  async subscriptions(filter) {
    const rows = state.users.filter((u) => u.sub && (filter === 'all' || u.sub === filter)).map(subscriptionRow);
    return { rows, stats: { active: 352, trial: 57, grace: 6, cancelling: 26, yearlyShare: 63 } };
  },

  async tickets() {
    const tickets: Ticket[] = state.tickets.map((t) => {
      const u = t.u !== undefined ? state.users[t.u] : undefined;
      const at = ago(t.d, t.t);
      return {
        id: String(t.id),
        source: t.src,
        userId: u?.id ?? null,
        name: u ? u.name : t.name ?? '',
        userPlatform: u?.platform ?? null,
        userPlan: u?.plan ?? null,
        stars: t.stars ?? null,
        resolved: t.st === 'done',
        at,
        thread: t.thread.map(([who, text]) => ({ fromUser: who === 'u', text, at })),
      };
    });
    return { tickets, avgFirstReplyMinutes: 200 };
  },

  async growth() {
    return {
      funnel: (
        [['Downloaded', 4120], ['Signed in', 3180], ['Finished setup', 2740], ['Set first One Thing', 2210], ['Added 3+ tasks', 1630], ['Started trial', 690], ['Became Pro', 284]] as [string, number][]
      ).map(([label, c]) => ({ label, count: c })),
      advice: 'Try showing the Pro screen after a user’s first closed day instead of only in Settings.',
      cohorts: [
        { week: '8 Sep', values: [100, 62, 48, 41, 37] },
        { week: '15 Sep', values: [100, 64, 51, 44, null] },
        { week: '22 Sep', values: [100, 67, 53, null, null] },
        { week: '29 Sep', values: [100, 71, null, null, null] },
        { week: '6 Oct', values: [100, null, null, null, null] },
      ],
      codes: state.codes.map((c) => ({ ...c })),
    };
  },

  async requests() {
    return state.reqs.map((r): PrivacyRequest => {
      const u = state.users[r.u]!;
      return {
        id: String(r.id),
        type: r.type,
        userId: u.id,
        name: u.name,
        email: u.email,
        via: r.id % 2 ? 'app' : 'website',
        requestedAt: ago(r.d),
        deadlineAt: ago(r.d - 30),
        done: r.done,
      };
    });
  },

  async audit() {
    return state.log.map((e) => ({ ...e }));
  },

  /**
   * Phrasings as they come off a real phone: already redacted, a mix of the
   * three languages, and the unanswered ones at the top because those are
   * the reason to open this screen at all.
   */
  /** Three demo accounts offering their words, in the three languages. */
  async transcripts(filter: 'all' | 'unanswered') {
    const rows = DEMO_TRANSCRIPTS.filter((t) => filter === 'all' || t.verdict === 'unknown');
    return { rows, people: 3, total: DEMO_TRANSCRIPTS.length };
  },

  async phrasings(filter: 'all' | 'unanswered') {
    const rows = DEMO_PHRASINGS.filter((p) => filter === 'all' || p.verdict === 'unknown');
    return {
      rows: [...rows].sort((a, b) => b.count - a.count),
      distinct: rows.length,
      total: DEMO_PHRASINGS.reduce((n, p) => n + p.count, 0),
      unanswered: DEMO_PHRASINGS.filter((p) => p.verdict === 'unknown').reduce((n, p) => n + p.count, 0),
    };
  },

  async team() {
    return TEAM;
  },

  /**
   * Demo mode changes no real account, so this hands back a password of the
   * same shape without touching anything — enough to drive the screen, and
   * worth nothing to anybody, like every other value in this file.
   */
  async resetAdminPassword(memberId: string) {
    if (!TEAM.some((m) => m.id === memberId)) throw new Error('No such admin.');
    return { password: newPassword() };
  },

  async badges() {
    return {
      support: state.tickets.filter((t) => t.st === 'open' && t.thread.length === 1).length,
      requests: state.reqs.filter((r) => !r.done).length,
    };
  },

  async log(adminId, what, why) {
    state.log.unshift({ at: new Date().toISOString(), who: ADMIN_NAMES[adminId] ?? adminId, what, why: why || '—' });
  },

  async setSuspended(userId, suspended) {
    state.users = state.users.map((u) => (u.id === userId ? { ...u, suspended } : u));
  },
  async deleteUser(userId) {
    state.users = state.users.filter((u) => u.id !== userId);
  },
  async completeRequest(requestId) {
    state.reqs = state.reqs.map((r) => (String(r.id) === requestId ? { ...r, done: true } : r));
  },
  async reply(ticketId, text) {
    state.tickets = state.tickets.map((t) => (String(t.id) === ticketId ? { ...t, thread: [...t.thread, ['a', text]] } : t));
  },
  async resolve(ticketId) {
    state.tickets = state.tickets.map((t) => (String(t.id) === ticketId ? { ...t, st: 'done' } : t));
  },
  async toggleCode(code) {
    state.codes = state.codes.map((c) => (c.code === code ? { ...c, active: !c.active } : c));
  },
  async createCode(code) {
    state.codes = [{ code, description: '30% off first 3 months', used: 0, active: true }, ...state.codes];
  },
  async extendTrial(userId) {
    state.users = state.users.map((u) => (u.id === userId ? { ...u, plan: 'trial', sub: 'trial' } : u));
  },
  /**
   * Demo mode keeps the comp beside the seed users rather than in a table.
   * It starts empty, so every drawer matches the prototype until somebody
   * grants one (`npm run fidelity`).
   */
  async grantComp(userId: string, months: number, reason: string) {
    const from = comps.get(userId);
    const start = from && Date.parse(from.endsAt) > Date.now() ? new Date(from.endsAt) : NOW();
    const ends = new Date(start);
    ends.setMonth(ends.getMonth() + months);
    comps.set(userId, { plan: 'pro', months, reason, endsAt: ends.toISOString() });
    state.users = state.users.map((u) => (u.id === userId ? { ...u, plan: 'pro' } : u));
  },

  async revokeComp(userId: string) {
    comps.delete(userId);
    state.users = state.users.map((u) => (u.id === userId ? { ...u, plan: u.sub ? 'lapsed' : 'free' } : u));
  },
  async exportUser() {},

  async contactsCsv(userId) {
    const user = state.users.find((u) => u.id === userId);
    return contactsToCsv(user ? detail(user).contactList : []);
  },
  async fix() {},
  async usersCsv() {
    return usersToCsv(state.users.map(row));
  },
  async dataset() {
    return { 'users.csv': usersToCsv(state.users.map(row)) };
  },
};

/**
 * Redacted exactly as a device would have sent them — {name} where somebody
 * was mentioned, and nothing that could say who. The four 'unknown' rows are
 * the point of the screen: each is a sentence waiting to become a line in
 * src/lib/parse/phrasings.test.ts.
 */
const DEMO_PHRASINGS: PhrasingRow[] = [
  { text: 'وش التالي؟', verdict: 'next', count: 184, langs: ['ar'], spoken: 41, lastAt: '2026-10-20T18:42:00.000Z' },
  { text: 'ايه اللي اتأخر؟', verdict: 'tasks', count: 97, langs: ['ar-EG'], spoken: 22, lastAt: '2026-10-20T17:10:00.000Z' },
  { text: "what's next?", verdict: 'next', count: 88, langs: ['en'], spoken: 9, lastAt: '2026-10-20T16:55:00.000Z' },
  { text: 'رقم {name}؟', verdict: 'person', count: 73, langs: ['ar', 'ar-EG'], spoken: 31, lastAt: '2026-10-20T15:20:00.000Z' },
  { text: 'مين لازم ارد عليه؟', verdict: 'waiting', count: 46, langs: ['ar-EG'], spoken: 12, lastAt: '2026-10-20T14:02:00.000Z' },
  { text: 'كلم {name} بكرة الساعة ٤', verdict: 'task', count: 41, langs: ['ar'], spoken: 28, lastAt: '2026-10-20T13:41:00.000Z' },
  // The lessons.
  { text: 'ايه اللي عملته امبارح؟', verdict: 'unknown', count: 23, langs: ['ar-EG'], spoken: 6, lastAt: '2026-10-20T12:30:00.000Z' },
  { text: 'كم مرة كلمت {name}؟', verdict: 'unknown', count: 14, langs: ['ar'], spoken: 3, lastAt: '2026-10-19T19:05:00.000Z' },
  { text: 'how is this month going?', verdict: 'unknown', count: 11, langs: ['en'], spoken: 1, lastAt: '2026-10-19T11:44:00.000Z' },
  { text: 'مين اكتر واحد بكلمه؟', verdict: 'unknown', count: 8, langs: ['ar-EG'], spoken: 4, lastAt: '2026-10-18T20:15:00.000Z' },
];

/**
 * The words as people typed them — names and all, which is the point and the
 * reason this screen is `personal` and audit-logged. Only accounts that
 * turned on "Help improve Sanad" are ever in here.
 */
const DEMO_TRANSCRIPTS: TranscriptRow[] = [
  { text: 'ايه اللي عملته امبارح؟', verdict: 'unknown', source: 'spoken', lang: 'ar-EG', at: '2026-10-20T12:30:00.000Z' },
  { text: 'كم مرة كلمت محمد السعدي الشهر ده؟', verdict: 'unknown', source: 'typed', lang: 'ar-EG', at: '2026-10-20T11:12:00.000Z' },
  { text: 'مين لازم ارد عليه؟', verdict: 'waiting', source: 'typed', lang: 'ar-EG', at: '2026-10-20T10:40:00.000Z' },
  { text: 'how is this month going?', verdict: 'unknown', source: 'typed', lang: 'en', at: '2026-10-19T11:44:00.000Z' },
  { text: 'remind me tomorrow at 4 to call Faisal about the lease', verdict: 'task', source: 'spoken', lang: 'en', at: '2026-10-19T09:02:00.000Z' },
  { text: 'وش رقم ريم القحطاني؟', verdict: 'person', source: 'typed', lang: 'ar', at: '2026-10-18T17:25:00.000Z' },
  { text: 'مين اكتر واحد بكلمه؟', verdict: 'unknown', source: 'spoken', lang: 'ar-EG', at: '2026-10-18T20:15:00.000Z' },
];
