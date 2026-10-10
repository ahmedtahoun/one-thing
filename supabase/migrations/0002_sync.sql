-- The One Thing — what syncing the device's stores needs from the schema.
--
-- 0001 transcribed DATA_MODEL.md. Wiring the stores to it showed where the
-- app keeps something the model left out, and where a constraint would
-- reject what the app does. Each change below says which. The sync itself is
-- src/lib/sync/; BUILD-REVIEW.md §2.36 has the reasoning.

-- --------------------------------------------------------------- task ----
-- "Faisal · Lawyer" under a task's title. Seed, captured and assistant tasks
-- name a person without being linked to a contact, so the text is its own
-- column rather than something derived from task_contact.
alter table task add column who text;

-- ------------------------------------------------------------ contact ----
-- The "Emailed · Sunday" line on People, until it is derived from history.
alter table contact add column last_label text;
-- People lists the most recently contacted first. A contact moves to the top
-- when a message goes out to them, which created_at cannot express, so every
-- device sorts by this instead.
alter table contact add column touched_at timestamptz;

-- ---------------------------------------------------------- follow_up ----
-- The card shows who it is with and when it was sent as text ("Noura ·
-- Designer", "Sent Sunday · follow up Tue").
alter table follow_up add column who text not null default '';
alter table follow_up add column since text not null default '';
-- Newest first on Follow-ups. Nullable: rows written before this existed
-- have no honest value to backfill.
alter table follow_up add column created_at timestamptz;
-- A follow-up can outlive its contact — deleting someone on the contact form
-- removes them and their history, not what you are waiting to hear back on —
-- and one set from Compose may not be scheduled yet.
alter table follow_up alter column contact_id drop not null;
alter table follow_up alter column next_at drop not null;
alter table follow_up drop constraint follow_up_contact_id_fkey;
alter table follow_up add constraint follow_up_contact_id_fkey
  foreign key (contact_id) references contact (id) on delete set null;
-- Stored as a kind so the footer follows the language.
alter table follow_up add constraint follow_up_last_action_kind
  check (last_action is null or last_action in ('nudged', 'closed'));

-- ----------------------------------------------------------- app_user ----
-- Row-level security decides which rows a user reaches, not which columns.
-- Under 0001 alone, a signed-in user could set their own plan to 'pro', lift
-- a suspension or claim another account's Apple / Google subject. Those
-- columns are now written only by the service role: the store webhooks
-- (plan), the admin panel (suspended) and sign-in (the provider subjects).
revoke insert, update on app_user from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke insert, update on app_user from authenticated;
    grant insert (id, auth_provider, email, name, first_name, job_title, phone_dial,
                  phone_number, country, language, platform, app_version)
      on app_user to authenticated;
    grant update (email, name, first_name, job_title, phone_dial, phone_number,
                  country, language, platform, app_version)
      on app_user to authenticated;
  end if;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke insert, update on app_user from anon;
  end if;
end $$;

-- ----------------------------------------------------- delete account ----
-- "Delete my account" (SCREENS.md § 21–23; DATA_MODEL § Key rules: hard
-- delete of every row). Removing the auth user cascades to app_user and from
-- there to every table that hangs off it. Security definer because a user
-- cannot delete from auth.users themselves; it only ever acts on auth.uid().
--
-- The privacy request is recorded already completed and without a user, so
-- the admin panel can count deletions without keeping who asked.
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid();
begin
  if me is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  insert into public.privacy_request (user_id, "type", source, completed_at)
    values (null, 'delete', 'app', now());
  delete from auth.users where id = me;
end $$;

-- Supabase's default privileges grant every new function to anon as well;
-- the function refuses a caller with no user anyway, but nothing signed out
-- should reach it at all.
revoke execute on function public.delete_my_account() from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke execute on function public.delete_my_account() from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant execute on function public.delete_my_account() to authenticated;
  end if;
end $$;
