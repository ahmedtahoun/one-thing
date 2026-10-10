-- The One Thing — initial schema.
-- Transcribed from design_handoff_the_one_thing/DATA_MODEL.md § Entities.
--
-- Every user-owned table carries user_id and is protected by row-level
-- security, so a user can only ever read and write their own rows. The admin
-- panel reads through the service role, never through these policies, and
-- every such read is written to admin_audit_log (ADMIN.md § 12).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- enums ----
create type auth_provider as enum ('apple', 'google');
create type app_platform as enum ('ios', 'android');
create type app_language as enum ('en', 'ar');
create type plan_kind as enum ('free', 'trial', 'pro', 'lapsed');
create type nudge_style as enum ('gentle', 'firm', 'quiet');
create type consent_kind as enum ('terms_privacy', 'marketing');
create type consent_source as enum ('signin', 'settings');

create type task_type as enum (
  'call', 'email', 'whatsapp', 'reminder', 'visit', 'meeting', 'webinar', 'course'
);
create type task_status as enum ('open', 'done', 'snoozed', 'cancelled');

-- DATA_MODEL.md lists (at|10|60|custom|null). The event form also offers
-- "Day before" (EVX.rems), so day_before is added here — BUILD-REVIEW.md §2.5.
create type remind_offset as enum ('at', 'min_10', 'hour_1', 'day_before', 'custom');

create type created_via as enum ('quick', 'capture', 'dump', 'assistant', 'event_form', 'followup');
create type history_kind as enum ('note', 'call', 'meeting', 'visit', 'email', 'whatsapp', 'followup_closed');
create type followup_status as enum ('due', 'waiting', 'done');
create type review_decision as enum ('kept', 'tomorrow', 'drop');
create type store_kind as enum ('app_store', 'play');
create type sub_period as enum ('monthly', 'yearly');
create type sub_status as enum ('trial', 'active', 'grace', 'cancelled', 'refunded', 'expired');
create type tip_product as enum ('tip_small', 'tip_regular', 'tip_large');
create type ticket_source as enum ('app', 'app_store', 'play');
create type ticket_status as enum ('open', 'done');
create type privacy_request_type as enum ('delete', 'export');
create type privacy_request_source as enum ('app', 'web');

-- ---------------------------------------------------------------- users ----
create table app_user (
  id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  auth_provider auth_provider not null,
  apple_sub text unique,
  google_sub text unique,
  email text,
  name text not null,
  first_name text not null,
  job_title text,
  phone_dial text,
  phone_number text,
  country text,
  language app_language not null default 'en',
  platform app_platform,
  app_version text,
  plan plan_kind not null default 'free',
  suspended boolean not null default false,
  deleted_at timestamptz
);

create table settings (
  user_id uuid primary key references app_user (id) on delete cascade,
  nudge_style nudge_style not null default 'gentle',
  focus_minutes smallint not null default 45 check (focus_minutes in (25, 45, 90)),
  quiet_hours_start time not null default '22:00',
  quiet_hours_end time not null default '08:00',
  channel_whatsapp boolean not null default true,
  channel_email boolean not null default true,
  channel_call boolean not null default true,
  notif_sound boolean not null default true,
  notif_vibration boolean not null default true
);

-- Terms and marketing are recorded separately, each with its own timestamp and
-- policy version (SCREENS.md § 01, ACCEPTANCE § First run).
create table consent (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_user (id) on delete cascade,
  kind consent_kind not null,
  version text not null,
  granted boolean not null,
  granted_at timestamptz not null default now(),
  source consent_source not null
);
create index on consent (user_id, kind, granted_at desc);

-- ------------------------------------------------------- the one thing ----
create table one_thing (
  user_id uuid not null references app_user (id) on delete cascade,
  "date" date not null,
  title text not null,
  done boolean not null default false,
  focus_minutes smallint,
  primary key (user_id, "date")
);

-- ------------------------------------------------------------- contacts ----
create table contact (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_user (id) on delete cascade,
  name text not null,
  role_company text,
  dial text,
  phone text,
  email text,
  preferred_channel task_type,
  remember_note text,
  created_at timestamptz not null default now()
);
create index on contact (user_id, created_at desc);

-- Duplicate detection: same normalised name, same phone digits (>= 7), or same
-- lowercased email (DATA_MODEL.md § Key rules). Indexed so the check on the
-- contact form stays cheap.
create index contact_norm_name_idx on contact (user_id, lower(btrim(name)));
create index contact_email_idx on contact (user_id, lower(email)) where email is not null;
create index contact_phone_idx on contact (user_id, regexp_replace(coalesce(phone, ''), '\D', '', 'g'))
  where phone is not null;

-- ---------------------------------------------------------------- tasks ----
create table task (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_user (id) on delete cascade,
  "type" task_type not null,
  title text not null,
  due_at timestamptz,
  remind remind_offset,
  remind_at timestamptz,
  status task_status not null default 'open',
  snoozed_until timestamptz,
  notes text,
  goal text,
  points text[] not null default '{}',
  draft_subject text,
  draft_body text,
  link text,
  location text,
  platform text,
  duration_min smallint,
  host text,
  lesson text,
  study_days smallint[] not null default '{}'
    check (study_days <@ array[0,1,2,3,4,5,6]::smallint[]),
  progress_done smallint,
  progress_total smallint,
  created_via created_via not null,
  created_at timestamptz not null default now(),
  sent_confirmed_at timestamptz,
  -- A snoozed task has to know when it returns to open.
  constraint snoozed_has_until check (status <> 'snoozed' or snoozed_until is not null)
);
create index on task (user_id, due_at);
create index on task (user_id, status, due_at);

-- A task can involve several people (meeting attendees), so the link is its
-- own table rather than an array of ids.
create table task_contact (
  task_id uuid not null references task (id) on delete cascade,
  contact_id uuid not null references contact (id) on delete cascade,
  primary key (task_id, contact_id)
);
create index on task_contact (contact_id);

-- -------------------------------------------------------------- history ----
create table history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_user (id) on delete cascade,
  contact_id uuid not null references contact (id) on delete cascade,
  kind history_kind not null,
  text text not null,
  at timestamptz not null default now()
);
create index on history (contact_id, at desc);

-- ----------------------------------------------------------- follow-ups ----
create table follow_up (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_user (id) on delete cascade,
  contact_id uuid not null references contact (id) on delete cascade,
  task_id uuid references task (id) on delete set null,
  channel task_type not null,
  what text not null,
  status followup_status not null default 'waiting',
  next_at timestamptz not null,
  last_action text,
  last_action_at timestamptz
);
create index on follow_up (user_id, status, next_at);

-- ---------------------------------------------------- focus and review ----
create table focus_session (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_user (id) on delete cascade,
  started_at timestamptz not null default now(),
  planned_min smallint not null,
  ended_at timestamptz,
  completed boolean not null default false
);

create table review (
  user_id uuid not null references app_user (id) on delete cascade,
  "date" date not null,
  one_thing_done boolean,
  closed_at timestamptz,
  primary key (user_id, "date")
);

create table review_item (
  user_id uuid not null,
  "date" date not null,
  task_id uuid not null references task (id) on delete cascade,
  decision review_decision not null,
  primary key (user_id, "date", task_id),
  foreign key (user_id, "date") references review (user_id, "date") on delete cascade
);

-- ------------------------------------------------------------- billing ----
-- Source of truth is the store: App Store Server Notifications v2 and Google
-- RTDN write here (DATA_MODEL.md § Integrations, ADMIN.md § 08).
create table subscription (
  user_id uuid primary key references app_user (id) on delete cascade,
  store store_kind not null,
  product_id text not null,
  period sub_period not null,
  status sub_status not null,
  started_at timestamptz not null,
  renews_at timestamptz,
  ends_at timestamptz,
  original_transaction_id text unique,
  updated_at timestamptz not null default now()
);

create table tip (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_user (id) on delete cascade,
  store store_kind not null,
  product_id tip_product not null,
  at timestamptz not null default now()
);

-- ---------------------------------------------------- support & privacy ----
create table support_ticket (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references app_user (id) on delete set null,
  source ticket_source not null,
  rating smallint check (rating between 1 and 5),
  status ticket_status not null default 'open',
  created_at timestamptz not null default now()
);

create table support_message (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references support_ticket (id) on delete cascade,
  from_user boolean not null,
  text text not null,
  at timestamptz not null default now()
);
create index on support_message (ticket_id, at);

create table privacy_request (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references app_user (id) on delete set null,
  "type" privacy_request_type not null,
  source privacy_request_source not null,
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  -- 30-day deadline, shown as a countdown in the admin panel (ADMIN.md § 11).
  -- Stored rather than generated: timestamptz + interval depends on the
  -- session time zone, so Postgres will not accept it in a generated column.
  deadline_at timestamptz not null default (now() + interval '30 days')
);

-- Append-only. No update or delete policy is ever granted on this table.
create table admin_audit_log (
  id bigserial primary key,
  admin_id uuid not null,
  action text not null,
  target_user_id uuid,
  reason text,
  at timestamptz not null default now()
);
create index on admin_audit_log (at desc);
create index on admin_audit_log (target_user_id, at desc);

revoke update, delete on admin_audit_log from public;

-- ------------------------------------------------- row-level security ----
alter table app_user enable row level security;
alter table settings enable row level security;
alter table consent enable row level security;
alter table one_thing enable row level security;
alter table contact enable row level security;
alter table task enable row level security;
alter table task_contact enable row level security;
alter table history enable row level security;
alter table follow_up enable row level security;
alter table focus_session enable row level security;
alter table review enable row level security;
alter table review_item enable row level security;
alter table subscription enable row level security;
alter table tip enable row level security;
alter table support_ticket enable row level security;
alter table support_message enable row level security;
alter table privacy_request enable row level security;
alter table admin_audit_log enable row level security;

create policy own_row on app_user
  using (id = auth.uid()) with check (id = auth.uid());

-- Every table that carries user_id gets the same owner-only policy.
do $$
declare t text;
begin
  foreach t in array array[
    'settings', 'consent', 'one_thing', 'contact', 'task', 'history', 'follow_up',
    'focus_session', 'review', 'review_item', 'tip', 'support_ticket', 'privacy_request'
  ] loop
    execute format(
      'create policy own_rows on %I using (user_id = auth.uid()) with check (user_id = auth.uid())', t
    );
  end loop;
end $$;

-- Subscriptions are readable by their owner but only ever written by the store
-- webhooks, which run as the service role and bypass RLS.
create policy own_subscription_read on subscription for select using (user_id = auth.uid());

-- Reached through their parents, so they check the parent's owner.
create policy own_task_contacts on task_contact
  using (exists (select 1 from task where task.id = task_contact.task_id and task.user_id = auth.uid()))
  with check (exists (select 1 from task where task.id = task_contact.task_id and task.user_id = auth.uid()));

create policy own_support_messages on support_message
  using (exists (
    select 1 from support_ticket s where s.id = support_message.ticket_id and s.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from support_ticket s where s.id = support_message.ticket_id and s.user_id = auth.uid()
  ));

-- No policy on admin_audit_log: unreachable from a user session by design.
