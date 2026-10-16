-- The One Thing — Pro given, not sold.
--
-- The panel's "Grant Pro (comp)" and "Extend trial" have always answered
-- "Not connected yet — comp Pro needs the stores' promotional offers". That
-- was the wrong reading of our own system: what makes somebody Pro is
-- `app_user.plan`, which the app pulls on every sync (src/lib/sync/
-- engine.ts), not a receipt. A comp needs no store at all.
--
-- **This is for giving Pro away, never for selling it.** Taking money
-- outside the app for something used inside it is App Store Guideline
-- 3.1.1; every grant here is free, and `reason` records why it was given.
--
-- It is a table of its own rather than a row in `subscription`, for three
-- reasons: `subscription.user_id` is the primary key, so a comp written
-- there would overwrite a real store subscription — including the
-- `original_transaction_id` the webhooks match on; the Overview's revenue
-- estimate counts `subscription` rows, and a gift is not revenue; and a
-- person can be comped more than once, which one row cannot hold.

create table comp_grant (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_user (id) on delete cascade,
  -- What they were given. 'pro' today; 'pro_plus' the day it is sold.
  plan plan_kind not null check (plan in ('pro', 'pro_plus')),
  months smallint not null check (months in (1, 3, 6, 12)),
  -- Why, in the Owner's words. Not optional: a gift with no reason is the
  -- one the audit cannot explain a year later.
  reason text not null check (btrim(reason) <> ''),
  granted_by uuid references admin_member (user_id) on delete set null,
  granted_at timestamptz not null default now(),
  ends_at timestamptz not null,
  -- Set when the Owner takes it back early; the row stays, for the record.
  revoked_at timestamptz
);
create index on comp_grant (user_id, ends_at desc);

-- Nothing reaches this through PostgREST: it is the panel's and the
-- scheduled functions' alone. RLS on with no policy denies every API role,
-- and the grants are taken back for the same reason 0001 does it.
alter table comp_grant enable row level security;
revoke all on comp_grant from anon, authenticated;

/**
 * Whether a comp is paying for this person's plan right now.
 */
create function public.has_live_comp(who uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.comp_grant g
    where g.user_id = who and g.revoked_at is null and g.ends_at > now()
  )
$$;

/**
 * A comp that has run out, or been taken back, puts the person where they
 * belong: `lapsed` if they ever had a subscription of their own, `free` if
 * they never did.
 *
 * It leaves alone anybody still covered — by another comp, or by a store
 * subscription that has not ended — so a comp running out beside a real
 * subscription changes nothing. Taking one back calls this straight away
 * rather than waiting for the hour, which is why "done" counts a revoked
 * grant as well as an expired one.
 */
create function public.expire_comp_grants() returns integer
language plpgsql security definer set search_path = '' as $$
declare moved integer;
begin
  with done as (
    select distinct g.user_id from public.comp_grant g
    where g.revoked_at is not null or g.ends_at <= now()
  ),
  covered as (
    select g.user_id from public.comp_grant g
      where g.revoked_at is null and g.ends_at > now()
    union
    select s.user_id from public.subscription s
      where s.status in ('trial', 'active', 'grace', 'cancelled')
        and (s.ends_at is null or s.ends_at > now())
  )
  update public.app_user u
     -- Both arms cast: a bare CASE over two literals is `text`, and the
     -- column is `plan_kind`.
     set plan = case
                  when exists (select 1 from public.subscription s where s.user_id = u.id)
                  then 'lapsed'::public.plan_kind
                  else 'free'::public.plan_kind
                end
    from done
   where u.id = done.user_id
     and u.plan in ('trial', 'pro', 'pro_plus')
     and not exists (select 1 from covered c where c.user_id = u.id);
  get diagnostics moved = row_count;
  return moved;
end $$;

/**
 * 0007's sweep, with two corrections.
 *
 * It must not lapse somebody a comp is currently paying for: their store
 * subscription ending is exactly when the gift is supposed to carry them.
 *
 * And it listed `('trial', 'pro')`, which 0011 did not revisit when it added
 * `pro_plus` — so a Pro+ subscriber would never have been lapsed at all.
 * Nothing writes that plan yet, which is why nobody has met it.
 */
create or replace function public.lapse_expired_subscriptions() returns integer
language plpgsql security definer set search_path = '' as $$
declare moved integer;
begin
  with over as (
    select s.user_id from public.subscription s
    where s.ends_at is not null and s.ends_at <= now()
      and s.status in ('trial', 'active', 'grace', 'cancelled')
  )
  update public.app_user u set plan = 'lapsed'
  from over where u.id = over.user_id and u.plan in ('trial', 'pro', 'pro_plus')
    and not public.has_live_comp(u.id);
  get diagnostics moved = row_count;
  return moved;
end $$;

-- Supabase grants every new function to anon and authenticated by default.
do $$
declare f text;
begin
  foreach f in array array[
    'public.has_live_comp(uuid)',
    'public.expire_comp_grants()'
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

-- Hourly, alongside the lapse sweep it sits beside (0009).
do $$
begin
  if not exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    raise notice 'pg_cron is not installed here; the comp sweep is not scheduled';
    return;
  end if;
  create extension if not exists pg_cron;
  perform cron.schedule('expire-comp-grants', '23 * * * *', 'select public.expire_comp_grants()');
end $$;
