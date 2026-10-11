-- Analytics events, and the two integrity holes that came with them.
--
-- DATA_MODEL.md § Analytics events lists seventeen pseudonymised events and
-- ADMIN.md asks for KPI cards, a seven-step funnel and weekly retention
-- cohorts built from them. Nothing in 0001 or 0002 had anywhere to put one,
-- so every one of those admin screens had no source (RELEASE.md § 9.2).

create type analytics_event_name as enum (
  'signin',
  'setup_done',
  'one_thing_set',
  'task_created',
  'task_done',
  'compose_opened',
  'send_confirmed',
  'followup_created',
  'nudge_opened',
  'focus_started',
  'focus_completed',
  'review_closed',
  'paywall_viewed',
  'trial_started',
  'purchase',
  'tip',
  'account_deleted'
);

-- An enum rather than text so a typo in a client is a rejected insert, not a
-- silent extra row in someone's funnel.
create table analytics_event (
  id uuid primary key default gen_random_uuid(),
  -- Null once the account is deleted: the funnel keeps its shape and the
  -- rows stop being personal data, which is what makes the hard delete in
  -- DATA_MODEL § Key rules possible without emptying the analytics.
  user_id uuid references app_user (id) on delete set null,
  "name" analytics_event_name not null,
  -- The event's own properties: {type, via} for task_created, {channel} for
  -- compose_opened, and so on. Never a phone, an email or message text —
  -- src/lib/analytics/events.ts is typed so there is nothing else to send.
  props jsonb,
  at timestamptz not null default now(),
  -- Which device sent it, for the platform split. Not an identifier.
  platform text
);

-- The two orders every admin screen reads in: a user's own trail, and
-- everyone's events of one kind over a window.
create index on analytics_event (user_id, at desc);
create index on analytics_event ("name", at desc);

alter table analytics_event enable row level security;

-- A user may add their own events and read them back. They may not change or
-- remove one: an event is something that happened.
create policy own_rows on analytics_event
  using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke update, delete on analytics_event from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke update, delete on analytics_event from authenticated;
  end if;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on analytics_event from anon;
  end if;
end $$;

-- ------------------------------------------------------- privacy requests ----
-- 0001 gave privacy_request the same owner-only policy as every other table
-- carrying user_id, which let a user delete their own deletion or export
-- request — the one row that proves the request was made, and the row the
-- admin panel counts a 30-day deadline from. It is a compliance record, so
-- it gets admin_audit_log's treatment instead: insert and read, nothing else.
revoke update, delete on privacy_request from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke update, delete on privacy_request from authenticated;
  end if;
end $$;

-- ------------------------------------------------------- account deletion ----
-- delete_my_account() already recorded the privacy_request with no user_id.
-- It now records the event too, in the same transaction, because the device
-- cannot: after this returns there is no session and no app_user row to
-- attach one to. Unchanged otherwise — 0002's body, plus one insert.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid();
begin
  if me is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  insert into public.privacy_request (user_id, "type", source, completed_at)
    values (null, 'delete', 'app', now());
  insert into public.analytics_event (user_id, "name") values (null, 'account_deleted');
  delete from auth.users where id = me;
end $$;
