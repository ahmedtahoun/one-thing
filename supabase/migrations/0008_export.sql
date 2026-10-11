-- The One Thing — the server half of "Download my data".
--
-- 0006_events.sql gave the app somewhere to put the request; this gives the
-- job somewhere to put the answer, and a way to take one request at a time
-- without two runs doing the same one twice.
--
-- Everything here is the service role's, like the webhooks: a user may ask
-- for an export (0001's own-rows policy on privacy_request) and read their
-- own request, and that is all.

alter table privacy_request add column claimed_at timestamptz;
-- Where the file sits in Storage, once there is one. Not a URL: a signed URL
-- expires, so it is made when the link is handed over, not stored.
alter table privacy_request add column export_path text;

-- Oldest first, so nobody waits behind a newer request.
create index on privacy_request (requested_at) where completed_at is null;

/**
 * Takes the oldest export request nobody is working on, and marks it taken.
 *
 * `for update skip locked` is what makes two runs safe: the second one steps
 * over the row the first is holding and takes the next, or none.
 */
create function public.claim_export_request()
returns table (id uuid, user_id uuid, requested_at timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  return query
    with next as (
      select p.id from public.privacy_request p
      where p."type" = 'export' and p.completed_at is null and p.claimed_at is null
        and p.user_id is not null
      order by p.requested_at
      limit 1
      for update skip locked
    )
    update public.privacy_request p set claimed_at = now()
    from next where p.id = next.id
    returning p.id, p.user_id, p.requested_at;
end $$;

/** The file is written; the request is answered. */
create function public.complete_export_request(p_id uuid, p_path text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare done boolean;
begin
  update public.privacy_request
    set completed_at = now(), export_path = p_path
    where id = p_id and completed_at is null
    returning true into done;
  return done is not null;
end $$;

/**
 * Hands a claimed request back, so a failure is retried rather than stuck.
 * Without this a request that died halfway would sit claimed forever and
 * quietly miss its 30-day deadline.
 */
create function public.release_export_request(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.privacy_request set claimed_at = null
    where id = p_id and completed_at is null;
end $$;

do $$
declare f text;
begin
  foreach f in array array[
    'public.claim_export_request()',
    'public.complete_export_request(uuid, text)',
    'public.release_export_request(uuid)'
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

