-- The One Thing — the Assistant's daily meter, kept where it cannot be
-- edited away (DATA_MODEL § AI / parsing: "Free plan: 10 assistant
-- requests/day; Pro: unlimited").
--
-- The app keeps the same count on the device, to open the paywall without
-- a round trip; this is the one that decides. The `assist` edge function
-- spends a request before asking Claude and gives it back if no answer came.
-- `parse` (Quick capture, Brain dump) is open on every plan and only guarded
-- against runaway use. BUILD-REVIEW.md §2.38.

create table assist_usage (
  user_id uuid not null references app_user (id) on delete cascade,
  "day" date not null,
  meter text not null check (meter in ('assistant', 'parse')),
  used int not null default 0,
  primary key (user_id, "day", meter)
);
alter table assist_usage enable row level security;
-- The person may read their own count; only the functions below change it.
create policy own_usage_read on assist_usage for select using (user_id = auth.uid());
-- Supabase grants the API roles every table by default; take writes back,
-- so an attempt fails outright rather than quietly matching no rows.
do $$
declare r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke insert, update, delete, truncate on assist_usage from %I', r);
    end if;
  end loop;
end $$;

-- Spends one of today's requests for `who`, in their own time zone. True
-- when it was allowed. Pro and trial have no Assistant limit; the parse
-- guard applies to every plan. The limits live here, not with the caller:
-- they must equal FREE_ASSISTANT_REQUESTS_PER_DAY and PARSE_REQUESTS_PER_DAY
-- (supabase/functions/_shared/assist-contract.ts), which a test checks.
--
-- Called only by the edge function, as the service role, with the user it
-- has verified. A user cannot call either function: one that could would
-- give itself requests back.
create function public.spend_assist_request(who uuid, meter text, time_zone text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  -- Copied out of the argument, which shares its name with the column.
  kind text := spend_assist_request.meter;
  plan public.plan_kind;
  daily_limit int;
  today date;
  spent int;
begin
  daily_limit := case kind when 'assistant' then 10 when 'parse' then 200 end;
  if daily_limit is null then
    raise exception 'unknown meter %', kind using errcode = '22023';
  end if;
  -- An unknown zone raises; the edge function has already checked it.
  today := (now() at time zone time_zone)::date;
  select u.plan into plan from public.app_user u where u.id = who;
  if kind = 'assistant' and plan in ('pro', 'trial') then
    return true;
  end if;
  insert into public.assist_usage as a (user_id, "day", meter, used) values (who, today, kind, 1)
    on conflict on constraint assist_usage_pkey do update set used = a.used + 1 where a.used < daily_limit
    returning a.used into spent;
  return spent is not null;
end $$;

-- Gives back one of today's requests, when the request produced no answer.
create function public.refund_assist_request(who uuid, meter text, time_zone text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.assist_usage a set used = greatest(0, a.used - 1)
    where a.user_id = who and a."day" = (now() at time zone time_zone)::date and a.meter = refund_assist_request.meter;
end $$;

revoke execute on function public.spend_assist_request(uuid, text, text) from public;
revoke execute on function public.refund_assist_request(uuid, text, text) from public;
do $$
declare r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke execute on function public.spend_assist_request(uuid, text, text) from %I', r);
      execute format('revoke execute on function public.refund_assist_request(uuid, text, text) from %I', r);
    end if;
  end loop;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.spend_assist_request(uuid, text, text) to service_role;
    grant execute on function public.refund_assist_request(uuid, text, text) to service_role;
  end if;
end $$;
