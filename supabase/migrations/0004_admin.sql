-- The One Thing — what the admin panel needs (ADMIN.md).
--
-- The panel reads over its own server-side connection, never through the
-- API the app uses, so nothing here is reachable from a user session:
-- every table below has row-level security on and no policy for users,
-- except active_day, which the app writes for itself.

-- ------------------------------------------------------------ the team ----
create type admin_role as enum ('Owner', 'Support', 'Analyst');

-- Team & roles (ADMIN.md § 13). A team member signs in through Supabase
-- Auth like anyone, with an @theonething.app address and a verified TOTP
-- factor; this row is what makes them an admin, and with which role.
create table admin_member (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  role admin_role not null,
  created_at timestamptz not null default now()
);

-- "Too many attempts locks the account for 15 minutes" (ADMIN.md § 01).
create table admin_sign_in_failure (
  id bigserial primary key,
  email text not null,
  at timestamptz not null default now()
);
create index on admin_sign_in_failure (email, at desc);

alter table admin_member enable row level security;
alter table admin_sign_in_failure enable row level security;

-- ------------------------------------------- what the app now reports ----
-- The drawer's Last active, App version and Notifications, and the
-- Troubleshoot checks built on them. Written by the app's sync.
alter table app_user add column last_seen_at timestamptz;
alter table app_user add column notifications_allowed boolean;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant update (last_seen_at, notifications_allowed) on app_user to authenticated;
    grant insert (last_seen_at, notifications_allowed) on app_user to authenticated;
  end if;
end $$;

-- One row per user per day the app was used: Active users on Overview and
-- Retention by sign-up week on Growth are both counted from it. A date, not
-- a time, and nothing about what was done.
create table active_day (
  user_id uuid not null references app_user (id) on delete cascade,
  "day" date not null,
  primary key (user_id, "day")
);
create index on active_day ("day");
alter table active_day enable row level security;
create policy own_rows on active_day using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------- audit log ----
-- "Entries can't be edited or deleted" (ADMIN.md § 12). 0001 revokes the
-- grants, but the panel's own connection owns the table and would not be
-- stopped by that; this stops everyone, the owner included.
create function admin_audit_log_is_append_only() returns trigger language plpgsql as $$
begin
  raise exception 'The audit log is append-only.' using errcode = '42501';
end $$;
create trigger append_only before update or delete on admin_audit_log
  for each row execute function admin_audit_log_is_append_only();
create trigger append_only_truncate before truncate on admin_audit_log
  for each statement execute function admin_audit_log_is_append_only();
