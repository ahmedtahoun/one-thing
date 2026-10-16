/**
 * The admin panel's live data source against a real Postgres with every
 * migration applied. `npm run test:db` (from admin/).
 *
 * Seeds three users the way the app's tables would hold them, then checks
 * what each screen would be shown, and what each action does to the
 * database: suspension reaches Supabase Auth's ban, deletion cascades,
 * the audit log cannot be rewritten, and the analytics export carries no
 * name, email or phone number.
 */
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { startCluster, type Cluster } from '../../scripts/pg-cluster';

const PORT = 54331;
const U1 = '00000000-0000-4000-8000-000000000101';
const U2 = '00000000-0000-4000-8000-000000000102';
const U3 = '00000000-0000-4000-8000-000000000103';
const OWNER = '00000000-0000-4000-8000-0000000000a1';
const SUPPORT = '00000000-0000-4000-8000-0000000000a2';

let cluster: Cluster;
let db: typeof import('../src/data/db');
let source: ReturnType<typeof import('../src/data/db')['dbSource']>;

const SEED = `
insert into auth.users (id, email) values
  ('${U1}', 'noura@example.com'), ('${U2}', 'omar@example.com'), ('${U3}', 'sara@example.com'),
  ('${OWNER}', 'khalid@onlyonething.app'), ('${SUPPORT}', 'dana@onlyonething.app');
insert into auth.mfa_factors (user_id, factor_type, status) values ('${OWNER}', 'totp', 'verified');
insert into admin_member (user_id, name, role) values ('${OWNER}', 'Khalid Al-Mansouri', 'Owner'), ('${SUPPORT}', 'Dana Al-Anazi', 'Support');

insert into app_user (id, auth_provider, email, name, first_name, job_title, phone_dial, phone_number, language, platform, plan, app_version, notifications_allowed, last_seen_at) values
  ('${U1}', 'apple', 'noura@example.com', 'Noura Al-Harbi', 'Noura', 'Designer', '+966', '501234567', 'ar', 'ios', 'pro', '1.0.0 (iOS 19.1)', true, now()),
  ('${U2}', 'google', 'omar@example.com', 'Omar Khalid', 'Omar', null, null, null, 'en', 'android', 'free', null, false, now() - interval '3 days'),
  ('${U3}', 'google', 'sara@example.com', 'Sara Haddad', 'Sara', 'Founder', '+971', '501112222', 'en', 'ios', 'trial', null, null, null);

insert into subscription (user_id, store, product_id, period, status, started_at, renews_at) values
  ('${U1}', 'app_store', 'pro_yearly', 'yearly', 'active', now() - interval '10 days', now() + interval '20 days'),
  ('${U3}', 'play', 'pro_monthly', 'monthly', 'trial', now() - interval '2 days', now() + interval '5 days');

insert into consent (user_id, kind, version, granted, source) values
  ('${U1}', 'terms_privacy', '2026-10-09', true, 'signin'), ('${U1}', 'marketing', '2026-10-09', true, 'signin'),
  ('${U2}', 'terms_privacy', '2026-10-09', true, 'signin'), ('${U2}', 'marketing', '2026-10-09', false, 'signin');

insert into contact (id, user_id, name, role_company, dial, phone, email, dial2, phone2, email2, preferred_channel, address, labels, remember_note) values
  ('00000000-0000-4000-8000-000000000c01', '${U1}', 'Mohammed Al-Saadi', 'Client · Al-Saadi Trading', '+966', '502214410', 'mohammed@alsaadi.com', '+966', '114773301', 'orders@alsaadi.com', 'whatsapp', 'King Fahd Road, Riyadh', '{Client,VIP}', 'Prefers a call before noon'),
  ('00000000-0000-4000-8000-000000000c02', '${U1}', 'Al Noor Packaging', 'Supplier', null, null, 'sales@alnoor.com', null, null, null, null, null, null, null),
  ('00000000-0000-4000-8000-000000000c03', '${U1}', 'Mohammed Al-Saadi', 'Client', '+966', '502214410', null, null, null, null, null, null, null, null);
insert into history (user_id, contact_id, kind, text) values ('${U1}', '00000000-0000-4000-8000-000000000c01', 'call', 'Talked prices');

insert into task (user_id, type, title, who, due_at, status, draft_body, sent_confirmed_at, created_via, remind) values
  ('${U1}', 'whatsapp', 'Follow up on price quote', 'Mohammed Al-Saadi', now() - interval '1 day', 'done', 'Hi Mohammed, the quote…', now() - interval '1 day', 'quick', 'at'),
  ('${U1}', 'email', 'Send October invoices', 'Omar Khalid', now() + interval '1 day', 'open', 'Hi Omar, sharing…', null, 'quick', null),
  ('${U1}', 'meeting', 'Q4 pricing review', 'Sara Haddad', now() + interval '2 days', 'open', null, null, 'event_form', null),
  ('${U1}', 'call', 'Contract terms', 'Faisal', now() - interval '3 hours', 'open', null, null, 'capture', null),
  ('${U2}', 'reminder', 'Renew registration', null, null, 'open', null, null, 'quick', null);
insert into follow_up (user_id, contact_id, channel, what, status, next_at, last_action, last_action_at, created_at) values
  ('${U1}', '00000000-0000-4000-8000-000000000c01', 'whatsapp', 'Logo files', 'done', now(), 'closed', now() - interval '1 hour', now() - interval '2 days');
insert into one_thing (user_id, "date", title, focus_minutes) values ('${U1}', (now() at time zone 'UTC')::date, 'Finish the investor proposal', 45);

insert into active_day (user_id, "day") values
  ('${U1}', (now() at time zone 'UTC')::date), ('${U2}', (now() at time zone 'UTC')::date - 3), ('${U3}', (now() at time zone 'UTC')::date - 10);

insert into support_ticket (id, user_id, source, status, created_at) values
  ('00000000-0000-4000-8000-000000000d01', '${U2}', 'app', 'open', now() - interval '2 hours'),
  ('00000000-0000-4000-8000-000000000d02', '${U1}', 'app', 'done', now() - interval '3 days');
insert into support_message (ticket_id, from_user, text, at) values
  ('00000000-0000-4000-8000-000000000d01', true, 'My reminders stopped ringing', now() - interval '2 hours'),
  ('00000000-0000-4000-8000-000000000d02', true, 'Can I pay yearly?', now() - interval '3 days'),
  ('00000000-0000-4000-8000-000000000d02', false, 'Yes! Settings → Try Pro → Yearly.', now() - interval '3 days' + interval '200 minutes');

insert into privacy_request (id, user_id, "type", source, requested_at, deadline_at) values
  ('00000000-0000-4000-8000-000000000e01', '${U2}', 'export', 'app', now() - interval '1 day', now() + interval '29 days'),
  ('00000000-0000-4000-8000-000000000e02', '${U3}', 'delete', 'web', now() - interval '25 days', now() + interval '5 days');
`;

describe('the admin panel against Postgres', () => {
  before(async () => {
    cluster = startCluster(PORT);
    cluster.psql(SEED);
    process.env.DATABASE_URL = cluster.url;
    db = await import('../src/data/db');
    source = db.dbSource(cluster.url);
  });

  after(() => cluster.stop());

  it('signs in only team members, and locks an email after repeated failures', async () => {
    assert.deepEqual(await db.memberById(OWNER), { name: 'Khalid Al-Mansouri', role: 'Owner' });
    assert.equal(await db.memberById(U1), null);
    for (let i = 0; i < 5; i++) await db.recordFailure('khalid@onlyonething.app');
    assert.equal(await db.recentFailures('khalid@onlyonething.app', 15), 5);
    assert.equal(await db.recentFailures('dana@onlyonething.app', 15), 0);
  });

  it('counts the Overview from the tables', async () => {
    const o = await source.overview();
    assert.equal(o.totalUsers, 3);
    assert.equal(o.usersThisMonth, 3);
    assert.equal(o.pro, 1);
    assert.equal(o.trial, 1);
    assert.deepEqual(o.active, [1, 2, 3]);
    assert.equal(o.signups.length, 14);
    assert.equal(o.signups.reduce((n, s) => n + s.count, 0), 3);
    assert.equal(o.sources.find((s) => s.label === 'iPhone · Sign in with Apple')?.share, 33);
    assert.equal(o.sources.find((s) => s.label === 'Arabic interface')?.share, 33);
    assert.equal(o.attention[0]?.text, '2 privacy requests open');
    assert.equal(o.revenue, 3, 'one yearly subscription: 35.88 / 12');
    assert.equal(o.usage.find((u) => u.label === 'Reminders')?.share, 50, 'one of the two active this week');
  });

  it('finds users by name, email, phone digits and ID, and filters by plan', async () => {
    assert.deepEqual((await source.users('nou', 'all')).rows.map((r) => r.name), ['Noura Al-Harbi']);
    assert.deepEqual((await source.users('omar@', 'all')).rows.map((r) => r.name), ['Omar Khalid']);
    assert.deepEqual((await source.users('50111', 'all')).rows.map((r) => r.name), ['Sara Haddad']);
    assert.deepEqual((await source.users(U2.slice(-6), 'all')).rows.map((r) => r.name), ['Omar Khalid']);
    assert.deepEqual((await source.users('', 'trial')).rows.map((r) => r.name), ['Sara Haddad']);
    const noura = (await source.users('noura', 'all')).rows[0]!;
    assert.equal(noura.contacts, 3);
    assert.equal(noura.tasks, 4);
    assert.equal(noura.marketing, true);
    assert.equal(noura.sub, 'active');
    assert.equal(noura.billing, 'Yearly');
    assert.equal(noura.phone, '+966 501234567');
  });

  it('opens a user record with what the drawer shows', async () => {
    const u = (await source.user(U1))!;
    assert.equal(u.appVersion, '1.0.0 (iOS 19.1)');
    assert.equal(u.termsVersion, '2026-10-09');
    assert.ok(u.termsAt && u.marketingAt);
    assert.equal(u.notifications, true);
    assert.equal(u.followUps, 1);
    assert.deepEqual(
      u.checks.map((c) => [c.title, c.status]),
      [['Notifications', 'ok'], ['Sync', 'ok'], ['App version', 'ok'], ['Billing', 'ok'], ['Account', 'ok']]
    );
    assert.deepEqual(u.issues.map((i) => i.kind).sort(), ['Duplicate', 'No email', 'No phone']);
    assert.ok(u.taskList.some((t) => t.title === 'Contract terms' && t.status === 'Overdue'));
    assert.ok(u.messages.some((m) => m.kind === 'whatsapp' && m.status === 'sent'));
    assert.ok(u.messages.some((m) => m.kind === 'email' && m.status === 'draft'));
    assert.ok(u.activity.some((a) => a.title === 'Set One Thing' && a.detail.startsWith('Finish the investor proposal')));
    assert.ok(u.activity.some((a) => a.title === 'Marked follow-up closed'));
    assert.equal(u.tickets.length, 1);
    assert.equal(u.contactList.find((c) => c.name === 'Al Noor Packaging')?.phone, '');
    const saadi = u.contactList.find((c) => c.email === 'mohammed@alsaadi.com')!;
    assert.deepEqual(
      { phone2: saadi.phone2, email2: saadi.email2, channel: saadi.channel },
      { phone2: '+966 114773301', email2: 'orders@alsaadi.com', channel: 'whatsapp' }
    );
    const spare = u.contactList.find((c) => c.name === 'Al Noor Packaging')!;
    assert.deepEqual({ phone2: spare.phone2, email2: spare.email2, channel: spare.channel }, { phone2: '', email2: '', channel: null });

    const omar = (await source.user(U2))!;
    assert.deepEqual(omar.checks.find((c) => c.title === 'Notifications'), { status: 'warn', title: 'Notifications', detail: 'Permission off — reminders won’t ring', fix: 'howto' });
    assert.equal(await source.user('00000000-0000-4000-8000-000000000999'), null);
  });

  it('lists subscriptions, tickets, growth and privacy requests', async () => {
    const subs = await source.subscriptions('all');
    assert.deepEqual(subs.stats, { active: 1, trial: 1, grace: 0, cancelling: 0, yearlyShare: 100 });
    assert.deepEqual((await source.subscriptions('trial')).rows.map((r) => r.name), ['Sara Haddad']);

    const { tickets, avgFirstReplyMinutes } = await source.tickets();
    assert.equal(tickets.length, 2);
    assert.equal(avgFirstReplyMinutes, 200);
    assert.equal(tickets.find((t) => t.userId === U2)?.name, 'Omar Khalid');
    assert.deepEqual(await source.badges(), { support: 1, requests: 2 });

    // Someone who signed in and left at setup has an auth user and no app
    // row; Omar added three tasks and deleted two, which his events remember.
    cluster.psql(`
      insert into auth.users (id) values ('00000000-0000-4000-8000-0000000000b9');
      insert into analytics_event (user_id, name, props, at) select '${U2}', 'task_created', '{}', now() from generate_series(1, 3);`);
    const growth = await source.growth();
    assert.deepEqual(
      growth.funnel.map((f) => f.count),
      [4, 3, 1, 2, 2, 1]
    );
    assert.equal(growth.cohorts.length, 5);
    assert.ok(growth.cohorts.every((c) => c.values.length === 5));

    const requests = await source.requests();
    assert.deepEqual(requests.map((r) => [r.type, r.name, r.done]), [['Delete', 'Sara Haddad', false], ['Export', 'Omar Khalid', false]]);
  });

  it('writes the audit log, names who did it, and lets nobody rewrite it', async () => {
    await source.log(OWNER, 'Opened user record · Noura Al-Harbi', 'Support / troubleshooting', U1);
    await source.log(SUPPORT, 'Viewed tasks · Noura Al-Harbi', 'Support / troubleshooting', U1);
    const entries = await source.audit();
    assert.deepEqual(entries.slice(0, 2).map((e) => e.who).sort(), ['Dana (Support)', 'Khalid']);
    assert.throws(() => cluster.psql(`update admin_audit_log set reason = 'nothing to see'`), /append-only/);
    assert.throws(() => cluster.psql(`delete from admin_audit_log`), /append-only/);
    assert.throws(() => cluster.psql(`truncate admin_audit_log`), /append-only/);
    // Nor can a signed-in app user read it.
    assert.equal(cluster.asUser(U1, 'select count(*) from admin_audit_log').trim(), '0');
  });

  it('shows the team with their 2-step status', async () => {
    const team = await source.team();
    assert.deepEqual(team.map((m) => [m.name, m.role, m.twoStep]), [['Khalid Al-Mansouri', 'Owner', true], ['Dana Al-Anazi', 'Support', false]]);
  });

  it('suspends through Supabase Auth, and restores', async () => {
    await source.setSuspended(U2, true);
    assert.equal(cluster.psql(`select banned_until = 'infinity' from auth.users where id = '${U2}'`).trim(), 't');
    assert.equal((await source.user(U2))!.suspended, true);
    await source.setSuspended(U2, false);
    assert.equal(cluster.psql(`select banned_until is null from auth.users where id = '${U2}'`).trim(), 't');
  });

  /**
   * The Contacts tab's Download CSV. The Privacy Policy's "Who at our company
   * can see it" lists "name, position, company, phone and email", so the file
   * carries those and the app's own two columns, and leaves the contact's
   * address, the user's labels and the user's note behind — all three of which
   * this user has, and the seed above gives them deliberately.
   */
  it('downloads one user’s contacts without their address, labels or notes', async () => {
    const csv = await source.contactsCsv(U1);
    const lines = csv.trimEnd().split('\n');
    assert.equal(lines[0], 'name,position_company,phone,phone_2,email,email_2,preferred_channel,times_in_touch');
    assert.equal(lines.length, 4, 'a header and this user’s three contacts');
    assert.ok(csv.includes('Mohammed Al-Saadi,Client · Al-Saadi Trading,+966 502214410,+966 114773301,mohammed@alsaadi.com,orders@alsaadi.com,whatsapp,1'));
    for (const held of ['King Fahd Road', 'Client,VIP', 'Prefers a call before noon']) {
      assert.equal(csv.includes(held), false, held);
    }
    assert.equal((await source.contactsCsv(U2)).trimEnd().split('\n').length, 1, 'a user with no contacts gets a header only');
  });

  /**
   * The Owner's "Reset password". Without SUPABASE_SERVICE_ROLE_KEY — which
   * DEPLOY.md § 4 has the deployer remove after setup, and which this test
   * run does not have — it must say so rather than half-work, and must not
   * touch `auth.users` behind Supabase's back.
   */
  it('says a password reset needs the service role key, and changes nothing without it', async () => {
    const row = () => cluster.psql(`select row_to_json(u) from auth.users u where id = '${OWNER}'`).trim();
    const before = row();
    assert.deepEqual(await source.resetAdminPassword(OWNER), {
      unavailable: 'resetting a password needs SUPABASE_SERVICE_ROLE_KEY in the panel’s environment (DEPLOY.md § 4)',
    });
    assert.equal(row(), before, 'the account was changed anyway');
    // And it refuses an id that is not an admin's, key or no key.
    await assert.rejects(source.resetAdminPassword(U1), /No such admin/);
  });

  it('knows who is on the team, by the id admin_member is keyed on', async () => {
    const team = await source.team();
    const owner = team.find((m) => m.role === 'Owner')!;
    assert.equal(owner.id, OWNER);
    assert.equal(owner.email, 'khalid@onlyonething.app');
    assert.ok(team.every((m) => m.id), 'a member with no id cannot be reset');
  });

  /**
   * Pro given rather than sold (0012). U2 is on Free with no subscription
   * of their own, so a comp running out must put them back to `free`; U1
   * pays, so the sweep must leave them alone.
   */
  describe('a comp', () => {
    const planOf = (id: string) => cluster.psql(`select plan from app_user where id = '${id}'`).trim();
    const endsOf = (id: string) => cluster.psql(`select max(ends_at) from comp_grant where user_id = '${id}' and revoked_at is null`).trim();

    it('makes somebody Pro without a store, and stacks when given twice', async () => {
      await source.grantComp(U2, 3, 'Ticket #1182 — sync bug cost them a week', OWNER);
      assert.equal(planOf(U2), 'pro');
      const after3 = Date.parse(endsOf(U2));
      assert.ok(after3 > Date.now() + 80 * 86400000, 'three months is not three months');

      const u = (await source.user(U2))!;
      assert.equal(u.comp?.months, 3);
      assert.equal(u.comp?.plan, 'pro');
      assert.equal(u.comp?.reason, 'Ticket #1182 — sync bug cost them a week');

      // A second grant adds to the end of the first rather than replacing it.
      await source.grantComp(U2, 1, 'And one more for the trouble', OWNER);
      assert.ok(Date.parse(endsOf(U2)) > after3 + 25 * 86400000, 'the second month did not stack');
      assert.equal(cluster.psql(`select count(*) from comp_grant where user_id = '${U2}'`).trim(), '2');
    });

    it('is not counted as a subscription, so it cannot read as revenue', async () => {
      assert.equal(cluster.psql(`select count(*) from subscription where user_id = '${U2}'`).trim(), '0');
      const { stats } = await source.subscriptions('all');
      assert.equal(stats.active, 1, 'the comp was counted among paying subscribers');
    });

    it('keeps the hourly sweep from lapsing the person it is paying for', async () => {
      // Their own subscription has run out; the gift is what carries them.
      cluster.psql(`update subscription set ends_at = now() - interval '1 day' where user_id = '${U1}'`);
      await source.grantComp(U1, 1, 'Goodwill while billing is sorted out', OWNER);
      cluster.psql(`select public.lapse_expired_subscriptions()`);
      assert.equal(planOf(U1), 'pro', 'a comped user was lapsed anyway');

      // Without the comp the same sweep does lapse them.
      await source.revokeComp(U1);
      cluster.psql(`select public.lapse_expired_subscriptions()`);
      assert.equal(planOf(U1), 'lapsed');
    });

    it('puts the person back where they were when it runs out', async () => {
      cluster.psql(`update comp_grant set ends_at = now() - interval '1 minute' where user_id = '${U2}'`);
      cluster.psql(`select public.expire_comp_grants()`);
      assert.equal(planOf(U2), 'free', 'U2 never paid, so they are free, not lapsed');

      await source.grantComp(U1, 1, 'Second goodwill', OWNER);
      assert.equal(planOf(U1), 'pro');
      cluster.psql(`update comp_grant set ends_at = now() - interval '1 minute' where user_id = '${U1}'`);
      cluster.psql(`select public.expire_comp_grants()`);
      assert.equal(planOf(U1), 'lapsed', 'U1 did pay once, so they lapse rather than go free');
    });

    it('is taken back at once, not at the end of the hour', async () => {
      await source.grantComp(U2, 12, 'A year, by mistake', OWNER);
      assert.equal(planOf(U2), 'pro');
      await source.revokeComp(U2);
      assert.equal(planOf(U2), 'free');
      assert.equal((await source.user(U2))!.comp, null);
      // The row stays, for the record.
      assert.ok(Number(cluster.psql(`select count(*) from comp_grant where user_id = '${U2}' and revoked_at is not null`).trim()) >= 1);
    });

    it('refuses a length and a reason the table does not allow', () => {
      for (const bad of [
        `insert into comp_grant (user_id, plan, months, reason, ends_at) values ('${U2}', 'pro', 2, 'two months', now())`,
        `insert into comp_grant (user_id, plan, months, reason, ends_at) values ('${U2}', 'pro', 1, '   ', now())`,
        `insert into comp_grant (user_id, plan, months, reason, ends_at) values ('${U2}', 'free', 1, 'free is not a gift', now())`,
      ]) {
        assert.throws(() => cluster.psql(bad), /violates check constraint|invalid input value/);
      }
    });
  });

  it('exports analytics without a name, an email or a phone number in it', async () => {
    process.env.DATASET_KEY = 'test-key';
    const files = await source.dataset();
    assert.deepEqual(Object.keys(files), ['users.csv', 'tasks.csv', 'contacts.csv', 'messages.csv', 'events.csv']);
    const all = Object.values(files).join('\n');
    for (const secret of ['Noura', 'noura@example.com', '501234567', 'Mohammed', 'mohammed@alsaadi.com', '502214410', U1]) {
      assert.equal(all.includes(secret), false, secret);
    }
    assert.ok(files['contacts.csv']!.includes('Client,Al-Saadi Trading'), 'position and company stay');
    const again = await source.dataset();
    assert.equal(again['users.csv'], files['users.csv'], 'the same person keeps the same ID');
  });

  it('completes a deletion request by deleting everything, and says an export cannot be sent yet', async () => {
    assert.deepEqual(await source.completeRequest('00000000-0000-4000-8000-000000000e01'), { unavailable: 'sending an export needs an email provider' });
    await source.completeRequest('00000000-0000-4000-8000-000000000e02');
    assert.equal(cluster.psql(`select count(*) from app_user where id = '${U3}'`).trim(), '0');
    assert.equal(cluster.psql(`select count(*) from subscription where user_id = '${U3}'`).trim(), '0');
    const done = (await source.requests()).find((r) => r.id === '00000000-0000-4000-8000-000000000e02')!;
    assert.equal(done.done, true);
    assert.equal(done.name, '—', 'a completed deletion keeps no name');
  });

  it('deletes an account and every row hanging off it', async () => {
    await source.deleteUser(U1);
    for (const table of ['app_user', 'task', 'contact', 'history', 'follow_up', 'one_thing', 'consent', 'subscription', 'active_day']) {
      const column = table === 'app_user' ? 'id' : 'user_id';
      assert.equal(cluster.psql(`select count(*) from ${table} where ${column} = '${U1}'`).trim(), '0', table);
    }
    assert.ok(Number(cluster.psql(`select count(*) from admin_audit_log where target_user_id = '${U1}'`).trim()) > 0, 'the log keeps the user ID');
  });

  it('lets the one-time setup make exactly one Owner, and only while the team is empty', async () => {
    // A team exists, so setup is closed and cannot add anyone.
    assert.equal(await db.teamIsEmpty(), false);
    assert.equal(await db.addFirstOwner(U2, 'Omar Khalid'), false);
    assert.equal(await db.memberById(U2), null);

    // A fresh install: nobody on the team yet.
    const fresh = '00000000-0000-4000-8000-0000000000f9';
    cluster.psql(`delete from admin_member; insert into auth.users (id, email) values ('${fresh}', 'ahmed@onlyonething.app')`);
    assert.equal(await db.teamIsEmpty(), true);
    await db.confirmEmail('ahmed@onlyonething.app');
    assert.equal(cluster.psql(`select email_confirmed_at is not null from auth.users where id = '${fresh}'`).trim(), 't');
    assert.equal(await db.addFirstOwner(fresh, 'Ahmed Tahoun'), true);
    assert.deepEqual(await db.memberById(fresh), { name: 'Ahmed Tahoun', role: 'Owner' });

    // And closed again: a second attempt, even with the secret, adds nobody.
    assert.equal(await db.teamIsEmpty(), false);
    assert.equal(await db.addFirstOwner(U2, 'Omar Khalid'), false);
  });
});
