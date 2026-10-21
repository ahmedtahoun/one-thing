-- How people really ask Sanad, so Sanad can be taught what it missed.
--
-- 0006_events.sql draws a line in its own comment — "Never a phone, an email
-- or message text" — and that line stays where it is. This is not an
-- analytics event and does not go in that table: it is its own table, its own
-- queue on the device, and its own row in STORE-PRIVACY.md.
--
-- **What arrives here has already had the person taken out of it, on the
-- phone.** src/lib/parse/redact.ts replaces names, numbers, addresses and
-- links with {name}, {phone}, {email} and {link} before anything is queued,
-- and a sentence the device is not certain it cleaned is dropped rather than
-- sent. The server never sees what somebody typed — only its shape and what
-- the Assistant made of it. BUILD-REVIEW §2.114.

-- The Assistant's own answer kinds (src/lib/parse/ask-data.ts) plus the other
-- things it can do with a line. An enum rather than text, for the same reason
-- analytics_event_name is one: a typo in a client is a rejected insert rather
-- than a silent extra bucket in the admin panel.
create type assistant_verdict as enum (
  'person',
  'tasks',
  'next',
  'waiting',
  'quiet',
  'oneThing',
  'history',
  'withPerson',
  'findTask',
  'people',
  'log',
  'who',
  'nobody',
  'task',
  'dump',
  'contact',
  'attach',
  'smalltalk',
  -- The one worth reading: every rule was tried and none of them matched.
  'unknown'
);

create type assistant_phrasing_source as enum ('typed', 'spoken');

create table assistant_phrasing (
  id uuid primary key default gen_random_uuid(),
  -- Null once the account is deleted, like analytics_event: the lesson keeps
  -- its shape and the row stops being about anybody, which is what lets the
  -- hard delete stay hard.
  user_id uuid references app_user (id) on delete set null,
  -- Redacted on the device. A CHECK is not a substitute for that work, but it
  -- does stop the one mistake that would undo it: a client that forgot to
  -- redact would send something with an @ or a long run of digits in it.
  "text" text not null
    check (length("text") between 1 and 500)
    check ("text" !~ '[[:alnum:]._%+-]+@[[:alnum:].-]+\.[[:alpha:]]{2,}')
    check ("text" !~ '[0-9]{5,}'),
  verdict assistant_verdict not null,
  "source" assistant_phrasing_source not null,
  -- 'en' or 'ar'; the dialect is a second axis, not a third language.
  lang text not null check (lang in ('en', 'ar')),
  dialect text not null check (dialect in ('gulf', 'egypt')),
  at timestamptz not null default now(),
  platform text
);

-- The two orders the admin panel reads in: newest first, and everything of
-- one verdict — which is how "show me what Sanad could not answer" is asked.
create index on assistant_phrasing (at desc);
create index on assistant_phrasing (verdict, at desc);

alter table assistant_phrasing enable row level security;

-- A person may add their own and read them back. They may not change or
-- remove one: like an analytics event, it is something that happened.
create policy own_rows on assistant_phrasing
  using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke update, delete on assistant_phrasing from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke update, delete on assistant_phrasing from authenticated;
  end if;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on assistant_phrasing from anon;
  end if;
end $$;

-- Kept for a year and no longer. A phrasing is useful while Sanad still
-- cannot answer it; after that it is a sentence nobody needs. Called by the
-- same scheduled job that trims the rest — supabase/migrations/0009_schedules.sql.
create or replace function trim_assistant_phrasings() returns void
language sql security definer set search_path = public as $$
  delete from assistant_phrasing where at < now() - interval '365 days';
$$;
