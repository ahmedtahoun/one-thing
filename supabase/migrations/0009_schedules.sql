-- The One Thing — the two jobs nothing was calling.
--
-- 0007 wrote `lapse_expired_subscriptions()`, the safety net for a lost
-- expiry notification, and 0008 wrote the export job; both said "it needs a
-- schedule" (RELEASE.md § 9.3, § 9.6). This is the schedule.
--
-- Both run on pg_cron, which every Supabase project has. The export job is an
-- edge function, so the database reaches it over HTTP with pg_net, using two
-- secrets kept in Supabase Vault — set once, in the SQL editor:
--
--   select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
--   select vault.create_secret('<service role key>', 'service_role_key');
--
-- Until both are there the export sweep does nothing and says so in the
-- Postgres log; the lapse sweep needs neither and runs from the start.
--
-- Where pg_cron or pg_net are not installed — the throwaway Postgres the tests
-- use — the functions are still created and the scheduling is skipped with a
-- notice, so the same file applies everywhere.

/**
 * A claim older than an hour belongs to a run that died without handing it
 * back (a timeout, a deploy mid-run). Without this the request would sit
 * claimed for ever and quietly miss its 30-day deadline.
 */
create function public.release_stale_export_claims() returns integer
language plpgsql security definer set search_path = '' as $$
declare freed integer;
begin
  update public.privacy_request set claimed_at = null
    where "type" = 'export' and completed_at is null
      and claimed_at < now() - interval '1 hour';
  get diagnostics freed = row_count;
  return freed;
end $$;

/**
 * One tick of the export sweep: free stale claims, then call the export
 * function once per waiting request, at most ten a tick. Each call claims its
 * own request (`for update skip locked`), so calls running side by side never
 * take the same one.
 *
 * Returns how many calls it made. It makes none when nothing is waiting —
 * the common case — so an idle project costs no invocations.
 */
create function public.kick_export_sweep() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  waiting integer;
  calls integer;
  base text;
  key text;
begin
  perform public.release_stale_export_claims();

  select count(*) into waiting from public.privacy_request
    where "type" = 'export' and completed_at is null and claimed_at is null and user_id is not null;
  if waiting = 0 then return 0; end if;

  if to_regnamespace('net') is null or to_regclass('vault.decrypted_secrets') is null then
    raise warning 'export sweep: % request(s) waiting, but pg_net or Vault is not installed', waiting;
    return 0;
  end if;
  select decrypted_secret into base from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into key from vault.decrypted_secrets where name = 'service_role_key';
  if base is null or key is null then
    raise warning 'export sweep: % request(s) waiting, but the Vault secrets project_url and service_role_key are not both set', waiting;
    return 0;
  end if;

  calls := least(waiting, 10);
  for i in 1..calls loop
    perform net.http_post(
      url := rtrim(base, '/') || '/functions/v1/export',
      headers := jsonb_build_object('Authorization', 'Bearer ' || key, 'Content-Type', 'application/json'),
      body := '{}'::jsonb
    );
  end loop;
  return calls;
end $$;

do $$
declare f text;
begin
  foreach f in array array['public.release_stale_export_claims()', 'public.kick_export_sweep()'] loop
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

-- ------------------------------------------------------------ schedule ----

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_net;
  end if;

  if not exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    raise notice 'pg_cron is not installed here; the lapse and export sweeps are not scheduled';
    return;
  end if;
  create extension if not exists pg_cron;

  -- Hourly, off the hour: a lapsed subscriber keeps Pro for at most an hour
  -- past the end of what they paid for, and only when the store's own
  -- EXPIRED notice was lost.
  perform cron.schedule('lapse-expired-subscriptions', '17 * * * *', 'select public.lapse_expired_subscriptions()');
  -- Every ten minutes: the copy promises the data "within 24 hours".
  perform cron.schedule('export-sweep', '*/10 * * * *', 'select public.kick_export_sweep()');
end $$;
