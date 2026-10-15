/**
 * The live DataSource: the app's own tables, read over a direct Postgres
 * connection that only this server holds (DATABASE_URL — Supabase's
 * connection string, which runs as a role that bypasses row-level security).
 * It never reaches the browser; the screens get what these functions return.
 *
 * Where a screen shows something no table records yet — store downloads,
 * crashes, store reviews, offer codes, revenue the stores have not reported —
 * the value is left out rather than made up. BUILD-REVIEW.md §2.37 lists
 * each one and what it needs.
 */
import 'server-only';

import { createHash, createHmac } from 'node:crypto';
import postgres from 'postgres';

import { usersToCsv } from './csv';
import { dateKey, day as dayLabel, rel, TIME_ZONE } from './format';
import type { DataSource } from './source';
import type {
  AuditEntry,
  Check,
  Growth,
  Overview,
  Plan,
  PrivacyRequest,
  Role,
  SubStatus,
  SubscriptionRow,
  TaskKind,
  TeamMember,
  Ticket,
  UserDetail,
  UserRow,
} from './types';

type Sql = ReturnType<typeof postgres>;

let shared: Sql | null = null;
const connect = (url: string): Sql => (shared ??= postgres(url, { max: 5, idle_timeout: 30, prepare: false }));
const db = () => connect(process.env.DATABASE_URL as string);

/** List prices (DATA_MODEL § Integrations), for the revenue estimate. */
const PRICE = { monthly: 4.99, yearly: 35.88 } as const;
/** The stores keep 15 % from small developers (App Store Small Business Program, Play's first $1M). */
const AFTER_FEES = 0.85;

// --------------------------------------------------------- sign-in ----

export async function memberById(userId: string): Promise<{ name: string; role: Role } | null> {
  const [row] = await db()`select name, role from admin_member where user_id = ${userId}`;
  return row ? { name: row.name as string, role: row.role as Role } : null;
}

export async function recentFailures(email: string, minutes: number): Promise<number> {
  const [row] = await db()`
    select count(*)::int as n from admin_sign_in_failure
    where email = ${email} and at > now() - make_interval(mins => ${minutes})`;
  return (row?.n as number) ?? 0;
}

export async function recordFailure(email: string): Promise<void> {
  await db()`insert into admin_sign_in_failure (email) values (${email})`;
}

// -------------------------------------------------- first-time setup ----
// The one-time /setup page (src/auth/setup.ts). Open only while the team is
// empty, so it can make exactly one Owner and then never runs again.

export async function teamIsEmpty(): Promise<boolean> {
  const [row] = await db()`select not exists (select 1 from admin_member) as empty`;
  return Boolean(row?.empty);
}

/**
 * Marks a just-created account's email as confirmed. The address is a team
 * address that may have no mailbox, and the person proving it is the one
 * holding the setup secret.
 */
export async function confirmEmail(email: string): Promise<void> {
  await db()`update auth.users set email_confirmed_at = coalesce(email_confirmed_at, now()) where lower(email) = ${email}`;
}

/** The auth account behind an email, if there is one. */
export async function authUserIdByEmail(email: string): Promise<string | null> {
  const [row] = await db()`select id from auth.users where lower(email) = ${email} limit 1`;
  return row ? String(row.id) : null;
}

/** Adds the first Owner, and only while there is no team yet. */
export async function addFirstOwner(userId: string, name: string): Promise<boolean> {
  const rows = await db()`
    insert into admin_member (user_id, name, role)
    select ${userId}::uuid, ${name}, 'Owner'
    where not exists (select 1 from admin_member)
    returning user_id`;
  return rows.length === 1;
}

// ------------------------------------------------------------ rows ----

const PLATFORM = { ios: 'iOS', android: 'Android' } as const;
const PROVIDER = { apple: 'Apple', google: 'Google' } as const;

/** A subscription as the panel names its state; an expired one has none. */
function subStatus(status: string | null, endsAt: Date | null, now: Date): SubStatus | null {
  if (status === 'active' || status === 'trial' || status === 'grace' || status === 'refunded') return status;
  if (status === 'cancelled') return endsAt && endsAt > now ? 'cancelled' : null;
  return null;
}

const iso = (d: Date | string | null | undefined) => (d ? new Date(d).toISOString() : null);

/** The columns every user row needs, with the counts the list shows. */
function userSelect(sql: Sql) {
  return sql`
    select u.id, u.name, u.first_name, u.email, u.phone_dial, u.phone_number, u.job_title, u.country,
           u.platform, u.auth_provider, u.plan, u.suspended, u.created_at, u.last_seen_at,
           s.status as sub_status, s.period as sub_period, s.started_at as sub_started, s.renews_at as sub_renews,
           s.ends_at as sub_ends, s.store as sub_store,
           (select count(*)::int from contact c where c.user_id = u.id) as contacts,
           (select count(*)::int from task t where t.user_id = u.id) as tasks,
           coalesce((select granted from consent k where k.user_id = u.id and k.kind = 'marketing' order by granted_at desc limit 1), false) as marketing
    from app_user u
    left join subscription s on s.user_id = u.id
    where u.deleted_at is null`;
}

type Raw = Record<string, unknown>;

function toUserRow(r: Raw, now: Date): UserRow {
  const phone = [r.phone_dial, r.phone_number].filter(Boolean).join(' ');
  const sub = subStatus(r.sub_status as string | null, r.sub_ends as Date | null, now);
  return {
    id: String(r.id),
    name: String(r.name),
    first: String(r.first_name),
    email: (r.email as string | null) ?? '',
    phone,
    job: (r.job_title as string | null) ?? '',
    country: (r.country as string | null) ?? '',
    platform: r.platform ? PLATFORM[r.platform as 'ios' | 'android'] : null,
    signin: PROVIDER[r.auth_provider as 'apple' | 'google'],
    plan: r.plan as Plan,
    sub,
    billing: r.sub_period === 'yearly' ? 'Yearly' : r.sub_period === 'monthly' ? 'Monthly' : null,
    joinedAt: iso(r.created_at as Date)!,
    lastActiveAt: iso(r.last_seen_at as Date | null),
    contacts: Number(r.contacts),
    tasks: Number(r.tasks),
    marketing: Boolean(r.marketing),
    suspended: Boolean(r.suspended),
  };
}

/** Same normalised name, same phone digits (≥ 7), or same lowercased email — DATA_MODEL § Key rules. */
function duplicates(contacts: { name: string; phone: string; email: string }[]) {
  const seen = new Map<string, number>();
  const found: { name: string; phone: string }[] = [];
  for (const c of contacts) {
    const keys = [
      'n:' + c.name.trim().toLowerCase(),
      ...(c.phone.replace(/\D/g, '').length >= 7 ? ['p:' + c.phone.replace(/\D/g, '')] : []),
      ...(c.email ? ['e:' + c.email.toLowerCase()] : []),
    ];
    if (keys.some((k) => seen.has(k))) found.push(c);
    for (const k of keys) seen.set(k, 1);
  }
  return found;
}

const KIND_LABEL: Record<string, string> = { call: 'call', email: 'email', whatsapp: 'WhatsApp', meeting: 'meeting', visit: 'visit', webinar: 'webinar', course: 'course', reminder: 'reminder' };

// ---------------------------------------------------------- source ----

export function dbSource(url: string): DataSource {
  const sql = connect(url);

  const userDetail = async (id: string): Promise<UserDetail | null> => {
    const now = new Date();
    const [r] = await sql`${userSelect(sql)} and u.id::text = ${id}`;
    if (!r) return null;
    const row = toUserRow(r, now);
    const [extra] = await sql`
      select u.app_version, u.notifications_allowed,
        (select count(*)::int from follow_up f where f.user_id = u.id) as follow_ups,
        (select coalesce(sum(planned_min), 0)::int from focus_session f where f.user_id = u.id and f.completed) as focus_min,
        (select version from consent k where k.user_id = u.id and k.kind = 'terms_privacy' and k.granted order by granted_at desc limit 1) as terms_version,
        (select granted_at from consent k where k.user_id = u.id and k.kind = 'terms_privacy' and k.granted order by granted_at desc limit 1) as terms_at,
        (select granted_at from consent k where k.user_id = u.id and k.kind = 'marketing' and k.granted order by granted_at desc limit 1) as marketing_at
      from app_user u where u.id = ${id}::uuid`;
    const contacts = await sql`
      select c.name, c.role_company, coalesce(c.dial || ' ', '') || coalesce(c.phone, '') as phone, coalesce(c.email, '') as email,
             (select count(*)::int from history h where h.contact_id = c.id) as history
      from contact c where c.user_id = ${id}::uuid order by c.created_at desc limit 100`;
    const tasks = await sql`
      select t.type, t.title, t.who, t.due_at, t.status, t.draft_subject, t.draft_body, t.sent_confirmed_at, t.created_at, t.created_via
      from task t where t.user_id = ${id}::uuid order by coalesce(t.due_at, t.created_at) desc limit 200`;
    const tickets = await sql`
      select s.id, s.status, (select text from support_message m where m.ticket_id = s.id order by at limit 1) as first
      from support_ticket s where s.user_id = ${id}::uuid order by s.created_at desc`;
    const oneThings = await sql`select to_char("date", 'YYYY-MM-DD') as date, title, focus_minutes, done from one_thing where user_id = ${id}::uuid order by "date" desc limit 10`;
    const closed = await sql`select what, last_action_at from follow_up where user_id = ${id}::uuid and last_action = 'closed' and last_action_at is not null order by last_action_at desc limit 10`;

    const contactList = contacts.map((c) => ({
      name: String(c.name),
      role: (c.role_company as string | null) ?? '',
      phone: String(c.phone).trim(),
      email: String(c.email),
      history: Number(c.history),
    }));

    const notifications = (extra?.notifications_allowed as boolean | null) ?? null;
    const latest = process.env.LATEST_APP_VERSION;
    const version = (extra?.app_version as string | null) ?? null;
    const checks: Check[] = [
      notifications === null
        ? { status: 'warn', title: 'Notifications', detail: 'Not reported by the app yet', fix: null }
        : notifications
          ? { status: 'ok', title: 'Notifications', detail: 'Allowed', fix: null }
          : { status: 'warn', title: 'Notifications', detail: 'Permission off — reminders won’t ring', fix: 'howto' },
      row.lastActiveAt
        ? { status: 'ok', title: 'Sync', detail: `Last sync ${rel(row.lastActiveAt, now)} · ${row.tasks} tasks · ${row.contacts} contacts`, fix: null }
        : { status: 'warn', title: 'Sync', detail: 'Never synced', fix: null },
      !version
        ? { status: 'warn', title: 'App version', detail: 'Not reported by the app yet', fix: null }
        : { status: latest && !version.startsWith(latest) ? 'warn' : 'ok', title: 'App version', detail: version + (latest ? (version.startsWith(latest) ? ' · latest' : ` · ${latest} is out`) : ''), fix: null },
      {
        status: row.sub === 'grace' ? 'bad' : 'ok',
        title: 'Billing',
        detail: row.sub === 'grace' ? 'Payment failed — store is retrying' : row.sub ? 'Receipt valid' : 'No subscription',
        fix: row.sub ? 'receipt' : null,
      },
      { status: 'ok', title: 'Account', detail: row.suspended ? 'Suspended' : 'Active · signed in with ' + row.signin, fix: 'resync' },
    ];

    const issues: UserDetail['issues'] = [
      ...contactList.filter((c) => !c.phone).slice(0, 2).map((c) => ({ kind: 'No phone' as const, text: c.name + ' — WhatsApp and call can’t start', value: '' })),
      ...contactList.filter((c) => !c.email).slice(0, 1).map((c) => ({ kind: 'No email' as const, text: c.name + ' — email drafts can’t open', value: '' })),
      ...duplicates(contactList).slice(0, 1).map((c) => ({ kind: 'Duplicate' as const, text: c.name + ' saved twice', value: c.phone || '—' })),
    ];

    const taskList: UserDetail['taskList'] = tasks
      .filter((t) => t.status !== 'cancelled')
      .slice(0, 50)
      .map((t) => ({
        kind: t.type as TaskKind,
        title: String(t.title),
        who: (t.who as string | null) ?? '',
        at: iso(t.due_at as Date | null),
        status:
          t.status === 'done' ? 'Done' : t.status === 'snoozed' ? 'Snoozed' : t.due_at && new Date(t.due_at as Date) < now ? 'Overdue' : 'Open',
      }));

    const messages: UserDetail['messages'] = tasks
      .filter((t) => (t.type === 'whatsapp' || t.type === 'email' || t.type === 'call') && (t.draft_body !== null || t.sent_confirmed_at !== null))
      .slice(0, 30)
      .map((t) => ({
        kind: t.type as TaskKind,
        to: (t.who as string | null) ?? '',
        subject: (t.draft_subject as string | null) ?? '',
        body: (t.draft_body as string | null) ?? '',
        status: t.sent_confirmed_at ? (t.type === 'call' ? 'done' : 'sent') : 'draft',
        at: iso((t.sent_confirmed_at ?? t.created_at) as Date)!,
      }));

    // Activity, from what the tables already record. There is no event log
    // (BUILD-REVIEW.md §2.37), so a moment the app does not keep — a focus
    // session ending, a brain dump — cannot appear.
    const activity: UserDetail['activity'] = [
      { title: 'Signed up', detail: row.signin + (row.platform ? ' · ' + row.platform : ''), at: row.joinedAt, colour: '#0b0b0b' },
      ...oneThings.map((o) => ({
        title: 'Set One Thing',
        detail: `${o.title}${o.focus_minutes ? ` · ${o.focus_minutes} min` : ''}`,
        // A day, not a moment: shown at the start of the morning.
        at: new Date(`${o.date}T06:00:00Z`).toISOString(),
        colour: '#0b0b0b',
      })),
      ...tasks
        .filter((t) => t.sent_confirmed_at)
        .slice(0, 10)
        .map((t) => ({ title: `Sent ${KIND_LABEL[t.type as string] ?? t.type} draft`, detail: (t.who as string | null) ?? String(t.title), at: iso(t.sent_confirmed_at as Date)!, colour: 'oklch(0.52 0.13 150)' })),
      ...tasks
        .filter((t) => t.type === 'meeting' || t.type === 'visit')
        .slice(0, 5)
        .map((t) => ({ title: `Added ${t.type}`, detail: String(t.title), at: iso(t.created_at as Date)!, colour: 'oklch(0.52 0.12 200)' })),
      ...closed.map((f) => ({ title: 'Marked follow-up closed', detail: String(f.what), at: iso(f.last_action_at as Date)!, colour: 'oklch(0.52 0.14 250)' })),
      ...(r.sub_started && r.sub_status ? [{ title: r.sub_status === 'trial' ? 'Started Pro trial' : 'Started Pro', detail: r.sub_period === 'yearly' ? 'Yearly' : 'Monthly', at: iso(r.sub_started as Date)!, colour: 'oklch(0.48 0.15 300)' }] : []),
    ]
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 20);

    return {
      ...row,
      followUps: Number(extra?.follow_ups ?? 0),
      focusHours: Math.round(Number(extra?.focus_min ?? 0) / 60),
      appVersion: version,
      termsVersion: (extra?.terms_version as string | null) ?? null,
      termsAt: iso(extra?.terms_at as Date | null),
      marketingAt: iso(extra?.marketing_at as Date | null),
      notifications,
      subRenewsAt: row.sub && row.sub !== 'cancelled' && row.sub !== 'refunded' ? iso(r.sub_renews as Date | null) : null,
      subEndsAt: row.sub === 'cancelled' || row.sub === 'refunded' ? iso(r.sub_ends as Date | null) : null,
      storeConsoleUrl:
        r.sub_store === 'app_store'
          ? process.env.APP_STORE_CONNECT_URL ?? null
          : r.sub_store === 'play'
            ? process.env.PLAY_CONSOLE_URL ?? null
            : null,
      checks,
      issues,
      tickets: tickets.map((t) => ({ id: String(t.id), text: (t.first as string | null) ?? '', resolved: t.status === 'done' })),
      activity,
      taskList,
      contactList,
      messages,
    };
  };

  return {
    now: () => new Date(),

    async overview(): Promise<Overview> {
      const tz = TIME_ZONE;
      const [u] = await sql`
        select count(*)::int as total,
          count(*) filter (where created_at >= date_trunc('month', now() at time zone ${tz}) at time zone ${tz})::int as this_month,
          count(*) filter (where plan = 'pro')::int as pro,
          count(*) filter (where plan = 'trial')::int as trial
        from app_user where deleted_at is null`;
      const [a] = await sql`
        with today as (select (now() at time zone ${tz})::date as d)
        select
          count(distinct user_id) filter (where day = (select d from today))::int as a1,
          count(distinct user_id) filter (where day = (select d from today) - 1)::int as p1,
          count(distinct user_id) filter (where day > (select d from today) - 7)::int as a7,
          count(distinct user_id) filter (where day <= (select d from today) - 7 and day > (select d from today) - 14)::int as p7,
          count(distinct user_id) filter (where day > (select d from today) - 30)::int as a30,
          count(distinct user_id) filter (where day <= (select d from today) - 30 and day > (select d from today) - 60)::int as p30
        from active_day`;
      const [s] = await sql`
        select
          count(*) filter (where status = 'active' and started_at >= date_trunc('month', now()))::int as pro_month,
          count(*) filter (where status = 'active' and period = 'monthly')::int as monthly,
          count(*) filter (where status = 'active' and period = 'yearly')::int as yearly,
          count(*) filter (where status in ('active', 'grace'))::int as paying,
          count(*) filter (where status in ('cancelled', 'refunded') and updated_at > now() - interval '30 days')::int as cancelled_30,
          count(*) filter (where status = 'grace')::int as grace,
          count(*)::int as any
        from subscription`;
      const signups = await sql`
        select to_char((created_at at time zone ${tz})::date, 'YYYY-MM-DD') as day, count(*)::int as n
        from app_user where created_at > now() - interval '15 days' group by 1`;
      const [src] = await sql`
        select count(*)::int as n,
          count(*) filter (where platform = 'ios' and auth_provider = 'apple')::int as ios_apple,
          count(*) filter (where platform = 'android' and auth_provider = 'google')::int as android_google,
          count(*) filter (where platform = 'ios' and auth_provider = 'google')::int as ios_google,
          count(*) filter (where language = 'ar')::int as arabic
        from app_user where deleted_at is null`;
      const [req] = await sql`select count(*)::int as n, min(deadline_at) as due from privacy_request where completed_at is null`;
      const [use] = await sql`
        with active as (select distinct user_id from active_day where day > (now() at time zone ${tz})::date - 7),
        recent as (select * from task where created_at > now() - interval '7 days')
        select (select count(*) from active)::int as base,
          (select count(distinct user_id) from recent where remind is not null)::int as reminders,
          (select count(distinct user_id) from recent where type = 'whatsapp' and draft_body is not null)::int as whatsapp,
          (select count(distinct user_id) from focus_session where started_at > now() - interval '7 days')::int as focus,
          (select count(distinct user_id) from follow_up where created_at > now() - interval '7 days')::int as follow_ups,
          (select count(distinct user_id) from recent where created_via = 'capture')::int as capture,
          (select count(distinct user_id) from recent where type in ('meeting', 'visit'))::int as meetings`;

      const pct = (n: number, of: number) => (of > 0 ? Math.round((n / of) * 100) : 0);
      const change = (now: number, before: number) => (before > 0 ? Math.round(((now - before) / before) * 100) : null);
      const byDay = new Map(signups.map((x) => [String(x.day), Number(x.n)]));
      const today = new Date();
      const days = Array.from({ length: 14 }, (_, i) => dateKey(new Date(today.getTime() - (13 - i) * 86_400_000)));
      const revenue = (s?.monthly ?? 0) * PRICE.monthly + ((s?.yearly ?? 0) * PRICE.yearly) / 12;
      const n = Number(src?.n ?? 0);
      const dueIn = req?.due ? Math.max(0, Math.ceil((new Date(req.due as Date).getTime() - Date.now()) / 86_400_000)) : null;

      return {
        totalUsers: u?.total ?? 0,
        usersThisMonth: u?.this_month ?? 0,
        active: [a?.a1 ?? 0, a?.a7 ?? 0, a?.a30 ?? 0],
        activeChange: [change(a?.a1 ?? 0, a?.p1 ?? 0), change(a?.a7 ?? 0, a?.p7 ?? 0), change(a?.a30 ?? 0, a?.p30 ?? 0)],
        pro: u?.pro ?? 0,
        proThisMonth: s?.pro_month ?? 0,
        trial: u?.trial ?? 0,
        trialConversion: null,
        revenue: s?.any ? Math.round(revenue) : null,
        revenueAfterFees: s?.any ? Math.round((revenue * AFTER_FEES) / 100) * 100 : null,
        cancelled: s?.any ? Math.round((1000 * (s.cancelled_30 ?? 0)) / Math.max(1, (s.paying ?? 0) + (s.cancelled_30 ?? 0))) / 10 : null,
        cancelledChange: null,
        signups: days.map((d) => ({ date: d, count: byDay.get(d) ?? 0 })),
        sources: [
          { label: 'iPhone · Sign in with Apple', share: pct(src?.ios_apple ?? 0, n) },
          { label: 'Android · Google', share: pct(src?.android_google ?? 0, n) },
          { label: 'iPhone · Google', share: pct(src?.ios_google ?? 0, n) },
          { label: 'Arabic interface', share: pct(src?.arabic ?? 0, n) },
        ],
        attention: [
          { text: `${req?.n ?? 0} privacy requests open`, meta: dueIn === null ? '' : `oldest due in ${dueIn} days`, tone: 'urgent' },
          { text: `${s?.grace ?? 0} Pro users with billing issues`, meta: 'store retrying payment', tone: 'warn' },
        ],
        usage: [
          { label: 'Reminders', share: pct(use?.reminders ?? 0, use?.base ?? 0), colour: 'oklch(0.55 0.15 300)' },
          { label: 'WhatsApp drafts', share: pct(use?.whatsapp ?? 0, use?.base ?? 0), colour: 'oklch(0.52 0.13 150)' },
          { label: 'Focus sessions', share: pct(use?.focus ?? 0, use?.base ?? 0), colour: '#0b0b0b' },
          { label: 'Follow-ups', share: pct(use?.follow_ups ?? 0, use?.base ?? 0), colour: 'oklch(0.52 0.14 250)' },
          { label: 'Voice capture', share: pct(use?.capture ?? 0, use?.base ?? 0), colour: 'oklch(0.55 0.15 50)' },
          { label: 'Meetings & visits', share: pct(use?.meetings ?? 0, use?.base ?? 0), colour: 'oklch(0.52 0.12 200)' },
        ],
      };
    },

    async users(search, plan) {
      const now = new Date();
      const q = search.trim().toLowerCase();
      const digits = q.replace(/\D/g, '');
      const rows = await sql`
        ${userSelect(sql)}
        ${plan === 'all' ? sql`` : sql`and u.plan = ${plan}`}
        ${
          q
            ? sql`and (lower(u.name) like ${'%' + q + '%'} or lower(coalesce(u.email, '')) like ${'%' + q + '%'}
                   or u.id::text like ${'%' + q + '%'}
                   ${digits ? sql`or regexp_replace(coalesce(u.phone_dial, '') || coalesce(u.phone_number, ''), '\\D', '', 'g') like ${'%' + digits + '%'}` : sql``})`
            : sql``
        }
        order by u.created_at desc limit 200`;
      const [total] = await sql`select count(*)::int as n from app_user where deleted_at is null`;
      return { rows: rows.map((r) => toUserRow(r, now)), total: total?.n ?? 0 };
    },

    user: userDetail,

    async subscriptions(filter) {
      const now = new Date();
      const rows = await sql`${userSelect(sql)} and s.user_id is not null order by s.started_at desc limit 500`;
      const all: SubscriptionRow[] = rows
        .map((r) => ({ r, row: toUserRow(r, now) }))
        .filter(({ row }) => row.sub !== null)
        .map(({ r, row }) => ({
          ...row,
          sub: row.sub!,
          startedAt: iso(r.sub_started as Date)!,
          renewsAt: row.sub === 'cancelled' || row.sub === 'refunded' ? null : iso(r.sub_renews as Date | null),
          endsAt: row.sub === 'cancelled' || row.sub === 'refunded' ? iso(r.sub_ends as Date | null) : null,
        }));
      const active = all.filter((x) => x.sub === 'active');
      return {
        rows: all.filter((x) => filter === 'all' || x.sub === filter),
        stats: {
          active: active.length,
          trial: all.filter((x) => x.sub === 'trial').length,
          grace: all.filter((x) => x.sub === 'grace').length,
          cancelling: all.filter((x) => x.sub === 'cancelled').length,
          yearlyShare: active.length ? Math.round((active.filter((x) => x.billing === 'Yearly').length / active.length) * 100) : null,
        },
      };
    },

    async tickets() {
      const rows = await sql`
        select s.id, s.source, s.rating, s.status, s.created_at, s.user_id, u.name, u.platform, u.plan
        from support_ticket s left join app_user u on u.id = s.user_id
        order by s.created_at desc limit 300`;
      const messages = rows.length
        ? await sql`select ticket_id, from_user, text, at from support_message where ticket_id in ${sql(rows.map((r) => r.id as string))} order by at`
        : [];
      const [avg] = await sql`
        select avg(extract(epoch from (first_reply - s.created_at)) / 60)::float as minutes
        from support_ticket s
        cross join lateral (select min(at) as first_reply from support_message m where m.ticket_id = s.id and not m.from_user) r
        where r.first_reply is not null`;
      const tickets: Ticket[] = rows.map((r) => ({
        id: String(r.id),
        source: r.source === 'app' ? 'app' : r.source === 'app_store' ? 'ios' : 'play',
        userId: (r.user_id as string | null) ?? null,
        name: (r.name as string | null) ?? '',
        userPlatform: r.platform ? PLATFORM[r.platform as 'ios' | 'android'] : null,
        userPlan: (r.plan as Plan | null) ?? null,
        stars: (r.rating as number | null) ?? null,
        resolved: r.status === 'done',
        at: iso(r.created_at as Date)!,
        thread: messages.filter((m) => m.ticket_id === r.id).map((m) => ({ fromUser: Boolean(m.from_user), text: String(m.text), at: iso(m.at as Date)! })),
      }));
      return { tickets, avgFirstReplyMinutes: avg?.minutes == null ? null : Math.round(Number(avg.minutes)) };
    },

    async growth(): Promise<Growth> {
      const tz = TIME_ZONE;
      const [f] = await sql`
        with cohort as (select id from app_user where created_at > now() - interval '30 days')
        select (select count(*) from auth.users a
                  where a.created_at > now() - interval '30 days'
                    and not exists (select 1 from admin_member m where m.user_id = a.id))::int as signed_in,
          (select count(*) from cohort)::int as finished_setup,
          (select count(*) from cohort c where exists (select 1 from one_thing o where o.user_id = c.id))::int as one_thing,
          (select count(*) from cohort c
             where (select count(*) from task t where t.user_id = c.id) >= 3
                or (select count(*) from analytics_event e where e.user_id = c.id and e.name = 'task_created') >= 3)::int as three_tasks,
          (select count(*) from cohort c where exists (select 1 from subscription s where s.user_id = c.id))::int as trial,
          (select count(*) from cohort c where exists (select 1 from subscription s where s.user_id = c.id and s.status in ('active', 'grace')))::int as pro`;
      const cohorts = await sql`
        with weeks as (
          select generate_series(date_trunc('week', (now() at time zone ${tz})::date) - interval '4 weeks', date_trunc('week', (now() at time zone ${tz})::date), interval '1 week')::date as week
        ), members as (
          select w.week, u.id from weeks w join app_user u
            on (u.created_at at time zone ${tz})::date >= w.week and (u.created_at at time zone ${tz})::date < w.week + 7
        )
        select to_char(w.week, 'YYYY-MM-DD') as week, k,
          (select count(*) from members m where m.week = w.week)::int as size,
          (select count(distinct a.user_id) from members m join active_day a on a.user_id = m.id
             where m.week = w.week and a.day >= w.week + 7 * k and a.day < w.week + 7 * (k + 1))::int as active,
          (w.week + 7 * k) <= (now() at time zone ${tz})::date as started
        from weeks w cross join generate_series(0, 4) as k
        order by w.week, k`;
      const byWeek = new Map<string, (number | null)[]>();
      for (const c of cohorts) {
        const key = String(c.week);
        const list = byWeek.get(key) ?? [];
        list[Number(c.k)] = c.started && Number(c.size) > 0 ? (Number(c.k) === 0 ? 100 : Math.round((Number(c.active) / Number(c.size)) * 100)) : null;
        byWeek.set(key, list);
      }
      const now = new Date();
      return {
        // Store downloads come from App Store Connect and the Play Console,
        // which are not connected. Signing in makes the auth user; the app's
        // own row is written by the first sync, which only a finished setup
        // starts, so the gap between the two is who left at setup. Admins are
        // auth users too, and are not counted.
        //
        // "Added 3+ tasks" also counts task_created events, so someone who
        // added three and then deleted them still passed the step.
        funnel: [
          { label: 'Signed in', count: f?.signed_in ?? 0 },
          { label: 'Finished setup', count: f?.finished_setup ?? 0 },
          { label: 'Set first One Thing', count: f?.one_thing ?? 0 },
          { label: 'Added 3+ tasks', count: f?.three_tasks ?? 0 },
          { label: 'Started trial', count: f?.trial ?? 0 },
          { label: 'Became Pro', count: f?.pro ?? 0 },
        ],
        advice: null,
        cohorts: [...byWeek.entries()].map(([week, values]) => ({ week: dayLabel(week + 'T12:00:00Z', now), values })),
        codes: [],
      };
    },

    async requests() {
      const rows = await sql`
        select p.id, p.type, p.source, p.requested_at, p.deadline_at, p.completed_at, p.user_id, u.name, u.email
        from privacy_request p left join app_user u on u.id = p.user_id
        order by p.completed_at is not null, p.deadline_at limit 300`;
      return rows.map(
        (r): PrivacyRequest => ({
          id: String(r.id),
          type: r.type === 'delete' ? 'Delete' : 'Export',
          userId: (r.user_id as string | null) ?? null,
          // A completed deletion keeps no name (DATA_MODEL § Key rules).
          name: (r.name as string | null) ?? '—',
          email: (r.email as string | null) ?? '—',
          via: r.source === 'web' ? 'website' : 'app',
          requestedAt: iso(r.requested_at as Date)!,
          deadlineAt: iso(r.deadline_at as Date)!,
          done: r.completed_at !== null,
        })
      );
    },

    async audit() {
      const rows = await sql`
        select l.at, l.action, l.reason, m.name, m.role
        from admin_audit_log l left join admin_member m on m.user_id = l.admin_id
        order by l.at desc limit 500`;
      return rows.map(
        (r): AuditEntry => ({
          at: iso(r.at as Date)!,
          who: r.name ? (r.role === 'Owner' ? String(r.name).split(' ')[0]! : `${String(r.name).split(' ')[0]} (${r.role})`) : 'System',
          what: String(r.action),
          why: (r.reason as string | null) || '—',
        })
      );
    },

    async team() {
      const rows = await sql`
        select m.name, m.role, u.email,
          exists (select 1 from auth.mfa_factors f where f.user_id = m.user_id and f.factor_type = 'totp' and f.status = 'verified') as two_step
        from admin_member m join auth.users u on u.id = m.user_id
        order by m.role, m.name`;
      return rows.map((r): TeamMember => ({ name: String(r.name), email: String(r.email), role: r.role as Role, twoStep: Boolean(r.two_step) }));
    },

    async badges() {
      const [b] = await sql`
        select
          (select count(*) from support_ticket s where s.status = 'open'
             and not exists (select 1 from support_message m where m.ticket_id = s.id and not m.from_user))::int as support,
          (select count(*) from privacy_request where completed_at is null)::int as requests`;
      return { support: b?.support ?? 0, requests: b?.requests ?? 0 };
    },

    async log(adminId, what, why, targetUserId) {
      await sql`insert into admin_audit_log (admin_id, action, reason, target_user_id)
                values (${adminId}::uuid, ${what}, ${why || null}, ${targetUserId ?? null})`;
    },

    async setSuspended(userId, suspended) {
      // The flag the panel shows, and the ban Supabase Auth enforces at sign-in.
      await sql.begin(async (tx) => {
        await tx`update app_user set suspended = ${suspended} where id = ${userId}::uuid`;
        await tx`update auth.users set banned_until = ${suspended ? sql`'infinity'::timestamptz` : null} where id = ${userId}::uuid`;
      });
    },

    async deleteUser(userId) {
      // Every row cascades from the auth user (0001, 0002).
      await sql`delete from auth.users where id = ${userId}::uuid`;
    },

    async completeRequest(requestId) {
      const [r] = await sql`select type, user_id from privacy_request where id = ${requestId}::uuid and completed_at is null`;
      if (!r) return;
      if (r.type === 'export') return { unavailable: 'sending an export needs an email provider' };
      await sql.begin(async (tx) => {
        await tx`update privacy_request set completed_at = now() where id = ${requestId}::uuid`;
        if (r.user_id) await tx`delete from auth.users where id = ${r.user_id as string}::uuid`;
      });
    },

    async reply() {
      return { unavailable: 'replies need the app’s support inbox and email, and store replies need the store APIs' };
    },
    async resolve(ticketId) {
      await sql`update support_ticket set status = 'done' where id = ${ticketId}::uuid`;
    },
    async toggleCode() {
      return { unavailable: 'offer codes need the App Store Connect and Play Developer APIs' };
    },
    async createCode() {
      return { unavailable: 'offer codes need the App Store Connect and Play Developer APIs' };
    },
    async extendTrial() {
      return { unavailable: 'trials are the stores’ own; extending one needs their APIs' };
    },
    async grantPro() {
      return { unavailable: 'comp Pro needs the stores’ promotional offers' };
    },
    async exportUser() {
      return { unavailable: 'sending an export needs an email provider' };
    },
    async fix(_userId, kind) {
      return {
        unavailable: {
          howto: 'sending the guide needs an email provider',
          receipt: 'checking a receipt needs the store APIs',
          resync: 'asking the app to re-sync needs push notifications from the server',
        }[kind],
      };
    },

    async usersCsv() {
      const now = new Date();
      const rows = await sql`${userSelect(sql)} order by u.created_at desc`;
      return usersToCsv(rows.map((r) => toUserRow(r, now)));
    },

    async dataset() {
      // Stable pseudonymous IDs: the same person gets the same ID in every
      // export, and nobody without the key can turn it back into an account.
      const key = process.env.DATASET_KEY;
      if (!key) throw new Error('DATASET_KEY is not set.');
      const pid = (id: string) => createHmac('sha256', key).update(id).digest('hex').slice(0, 16);
      const hash = (v: string | null) => (v ? createHash('sha256').update(v.trim().toLowerCase()).digest('hex') : '');
      const csv = (head: string[], rows: unknown[][]) =>
        [head.join(','), ...rows.map((r) => r.map((v) => (v == null ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v))).join(','))].join('\n') + '\n';

      const users = await sql`select id, created_at, platform, auth_provider, language, plan, country from app_user where deleted_at is null`;
      const tasks = await sql`select user_id, type, status, created_via, created_at, due_at, sent_confirmed_at from task`;
      const contacts = await sql`select user_id, role_company, preferred_channel, phone, email, created_at from contact`;
      const messages = await sql`select user_id, type, sent_confirmed_at, created_at from task where type in ('whatsapp', 'email', 'call') and draft_body is not null`;
      const events = await sql`select user_id, to_char("day", 'YYYY-MM-DD') as day from active_day`;

      const split = (rc: string | null) => {
        const [role, company] = (rc ?? '').split(' · ');
        return [role ?? '', company ?? ''];
      };
      return {
        'users.csv': csv(['user_id', 'created_at', 'platform', 'signin', 'language', 'plan', 'country'], users.map((u) => [pid(String(u.id)), iso(u.created_at as Date), u.platform, u.auth_provider, u.language, u.plan, u.country])),
        'tasks.csv': csv(['user_id', 'type', 'status', 'created_via', 'created_at', 'due_at', 'sent_confirmed_at'], tasks.map((t) => [pid(String(t.user_id)), t.type, t.status, t.created_via, iso(t.created_at as Date), iso(t.due_at as Date | null), iso(t.sent_confirmed_at as Date | null)])),
        'contacts.csv': csv(['user_id', 'contact_role', 'company', 'channel', 'phone_sha256', 'email_sha256', 'created_at'], contacts.map((c) => [pid(String(c.user_id)), ...split(c.role_company as string | null), c.preferred_channel, hash((c.phone as string | null)?.replace(/\D/g, '') ?? null), hash(c.email as string | null), iso(c.created_at as Date)])),
        'messages.csv': csv(['user_id', 'channel', 'status', 'created_at'], messages.map((m) => [pid(String(m.user_id)), m.type, m.sent_confirmed_at ? 'sent' : 'draft', iso(m.created_at as Date)])),
        'events.csv': csv(['user_id', 'event', 'created_at'], events.map((e) => [pid(String(e.user_id)), 'active_day', e.day])),
      };
    },
  };
}
