-- The One Thing — what the store webhooks write.
--
-- `subscription` and `tip` have been waiting for this since 0001, and
-- 0003_tips_from_the_store.sql took the last user-writable path away: both are
-- now written only by the service role, which is what these functions run as
-- (supabase/functions/app-store, supabase/functions/play-rtdn).
--
-- Three things were missing before a webhook could be trusted:
--   1. somewhere to record that a notification was seen, so a store that
--      delivers the same one twice — both of them do, deliberately — cannot
--      count a tip twice or walk a subscription backwards;
--   2. an idempotent handle on a tip, which had none;
--   3. one statement that writes the subscription and the plan together, so a
--      user is never Pro with no subscription or the reverse.

-- -------------------------------------------------------- what we have seen ----

create type store_notification_outcome as enum ('subscription', 'tip', 'ignored', 'failed');

create table store_notification (
  id uuid primary key default gen_random_uuid(),
  store store_kind not null,
  -- Apple's notificationUUID, Google's Pub/Sub messageId. Unique per store,
  -- which is what makes a redelivery a no-op.
  external_id text not null,
  -- Apple's notificationType (+ subtype), or Google's notification name.
  "type" text not null,
  outcome store_notification_outcome not null,
  -- Why an ignored notification was ignored, or why one failed. Read by
  -- whoever is working out why a purchase did not land.
  detail text,
  -- Null when the notification never named an account we know.
  user_id uuid references app_user (id) on delete set null,
  received_at timestamptz not null default now()
);

create unique index on store_notification (store, external_id);
create index on store_notification (received_at desc);
create index on store_notification (user_id, received_at desc);

alter table store_notification enable row level security;
-- No policy: a user has no business reading the store's traffic, and the
-- service role bypasses this anyway. Same treatment as admin_audit_log.

-- --------------------------------------------------------------------- tips ----

-- A tip had no stable handle, so a redelivered ONE_TIME_CHARGE would have been
-- a second tip and a second line in the admin panel's revenue.
alter table tip add column transaction_id text;
create unique index on tip (store, transaction_id);

-- ------------------------------------------------------------- the writes ----

-- Both functions are `security definer` so they can write `app_user.plan` and
-- `subscription`, which 0002 revoked from every user role. Execute is granted
-- to the service role only: these are reached from an edge function with the
-- service key, never from a device.

create function public.record_store_subscription(
  p_store store_kind,
  p_external_id text,
  p_type text,
  p_user_id uuid,
  p_product_id text,
  p_period sub_period,
  p_status sub_status,
  p_plan plan_kind,
  p_started_at timestamptz,
  p_renews_at timestamptz,
  p_ends_at timestamptz,
  p_original_transaction_id text
) returns boolean
language plpgsql security definer set search_path = '' as $$
declare fresh boolean;
begin
  -- The notification is claimed first. A redelivery loses the race or finds
  -- the row already there, and returns false without touching anything.
  insert into public.store_notification (store, external_id, "type", outcome, user_id)
    values (p_store, p_external_id, p_type, 'subscription', p_user_id)
    on conflict (store, external_id) do nothing
    returning true into fresh;
  if fresh is null then
    return false;
  end if;

  -- One row per user (user_id is the primary key): a person has one
  -- subscription, and a change to it is an update, not a second row.
  insert into public.subscription (
    user_id, store, product_id, period, status, started_at, renews_at, ends_at,
    original_transaction_id, updated_at
  ) values (
    p_user_id, p_store, p_product_id, p_period, p_status, p_started_at, p_renews_at, p_ends_at,
    p_original_transaction_id, now()
  )
  on conflict (user_id) do update set
    store = excluded.store,
    product_id = excluded.product_id,
    period = excluded.period,
    status = excluded.status,
    started_at = least(public.subscription.started_at, excluded.started_at),
    renews_at = excluded.renews_at,
    ends_at = excluded.ends_at,
    original_transaction_id = excluded.original_transaction_id,
    updated_at = now();

  update public.app_user set plan = p_plan where id = p_user_id;
  return true;
end $$;

create function public.record_store_tip(
  p_store store_kind,
  p_external_id text,
  p_type text,
  p_user_id uuid,
  p_product_id tip_product,
  p_transaction_id text,
  p_at timestamptz
) returns boolean
language plpgsql security definer set search_path = '' as $$
declare fresh boolean;
begin
  insert into public.store_notification (store, external_id, "type", outcome, user_id)
    values (p_store, p_external_id, p_type, 'tip', p_user_id)
    on conflict (store, external_id) do nothing
    returning true into fresh;
  if fresh is null then
    return false;
  end if;

  -- Two belts: the notification id above, and the store's own transaction id,
  -- in case the same purchase ever arrives under two notification ids.
  insert into public.tip (user_id, store, product_id, transaction_id, at)
    values (p_user_id, p_store, p_product_id, p_transaction_id, p_at)
    on conflict (store, transaction_id) do nothing;
  return true;
end $$;

-- Everything the webhooks decided not to act on, and everything that threw.
-- Recorded so a purchase that did not land can be explained.
create function public.record_store_notice(
  p_store store_kind,
  p_external_id text,
  p_type text,
  p_outcome store_notification_outcome,
  p_detail text
) returns boolean
language plpgsql security definer set search_path = '' as $$
declare fresh boolean;
begin
  insert into public.store_notification (store, external_id, "type", outcome, detail)
    values (p_store, p_external_id, p_type, p_outcome, p_detail)
    on conflict (store, external_id) do nothing
    returning true into fresh;
  return fresh is not null;
end $$;

-- ------------------------------------------------------- the safety net ----

-- Stores retry a notification they cannot deliver, so a lost EXPIRED is
-- unlikely — but "unlikely" is not "never", and a user keeping Pro for free
-- is the expensive direction to be wrong in. This moves anyone whose paid
-- period has passed off Pro without waiting to be told.
--
-- Nothing calls it yet: it needs a schedule (pg_cron, or a cron-triggered
-- function). RELEASE.md § 9.6.
create function public.lapse_expired_subscriptions() returns integer
language plpgsql security definer set search_path = '' as $$
declare moved integer;
begin
  with over as (
    select s.user_id from public.subscription s
    where s.ends_at is not null and s.ends_at <= now()
      and s.status in ('trial', 'active', 'grace', 'cancelled')
  )
  update public.app_user u set plan = 'lapsed'
  from over where u.id = over.user_id and u.plan in ('trial', 'pro');
  get diagnostics moved = row_count;
  return moved;
end $$;

-- Supabase grants every new function to anon and authenticated by default.
-- These four write columns no user may write, so they are the service role's
-- alone.
do $$
declare f text;
begin
  foreach f in array array[
    'public.record_store_subscription(public.store_kind, text, text, uuid, text, public.sub_period, public.sub_status, public.plan_kind, timestamptz, timestamptz, timestamptz, text)',
    'public.record_store_tip(public.store_kind, text, text, uuid, public.tip_product, text, timestamptz)',
    'public.record_store_notice(public.store_kind, text, text, public.store_notification_outcome, text)',
    'public.lapse_expired_subscriptions()'
  ] loop
    execute format('revoke execute on function %s from public', f);
    if exists (select 1 from pg_roles where rolname = 'anon') then
      execute format('revoke execute on function %s from anon', f);
    end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then
      execute format('revoke execute on function %s from authenticated', f);
    end if;
    if exists (select 1 from pg_roles where rolname = 'service_role') then
      execute format('grant execute on function %s to service_role', f);
    end if;
  end loop;
end $$;
