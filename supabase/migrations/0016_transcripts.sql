-- What people actually typed to Sanad, for the ones who offered it.
--
-- 0014 keeps the *shape* of every question — names, numbers and addresses
-- replaced on the phone before anything is sent — and that is what every
-- account sends. This is the other thing, and it is different in kind: it is
-- the sentence as written, so it can hold a name, a number, a price, a
-- grievance. Three things follow from that, and all three are here rather
-- than in a client that could forget them. BUILD-REVIEW §2.115.
--
-- The consent value this depends on is added by 0015, alone, because a new
-- enum value cannot be used in the transaction that added it (§2.117).
--
--   1. It arrives only with consent, and the consent is checked by the
--      database, not only by the app: `assistant_transcript` must be granted
--      and still granted for an insert to be allowed.
--   2. It dies with the account. 0014's rows survive a deletion with a null
--      user_id because a redacted shape is nobody's; a transcript is very
--      much somebody's, so this one cascades.
--   3. It is kept 90 days, not the year a redacted phrasing gets.


create table assistant_transcript (
  id uuid primary key default gen_random_uuid(),
  -- Not nullable, and cascading: when the account goes, so does every word.
  user_id uuid not null references app_user (id) on delete cascade,
  "text" text not null check (length("text") between 1 and 2000),
  verdict assistant_verdict not null,
  "source" assistant_phrasing_source not null,
  lang text not null check (lang in ('en', 'ar')),
  dialect text not null check (dialect in ('gulf', 'egypt')),
  at timestamptz not null default now(),
  platform text
);

create index on assistant_transcript (at desc);
create index on assistant_transcript (user_id, at desc);
create index on assistant_transcript (verdict, at desc);

alter table assistant_transcript enable row level security;

/*
 * The latest word on one kind of consent for one person. `consent` is
 * append-only — every change is a new row with its own timestamp — so "do
 * they agree *now*" is the most recent row and not merely "is there a row".
 */
create or replace function consent_now(who uuid, what consent_kind) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select granted from consent where user_id = who and kind = what order by granted_at desc limit 1),
    false
  );
$$;

-- They may add their own, and only while they are offering. A client that
-- kept sending after the switch went off is refused by the database.
create policy own_rows_while_consented on assistant_transcript
  for insert to authenticated
  with check (user_id = auth.uid() and consent_now(auth.uid(), 'assistant_transcript'));

-- And read their own back, which is what makes the data export honest.
create policy own_rows_read on assistant_transcript
  for select to authenticated using (user_id = auth.uid());

revoke update, delete on assistant_transcript from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke update, delete on assistant_transcript from authenticated;
  end if;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on assistant_transcript from anon;
  end if;
end $$;

/*
 * Turning the switch off takes back what it collected.
 *
 * Stopping at "no new rows" would be the letter of consent and not its
 * meaning: somebody who turns this off is asking us to forget, not merely to
 * stop. The app calls this on the next sync after the switch goes off, and
 * it is safe to call at any time — it only ever reaches the caller's own
 * rows.
 */
create or replace function forget_my_transcripts() returns void
language sql security definer set search_path = public as $$
  delete from assistant_transcript where user_id = auth.uid();
$$;
revoke all on function forget_my_transcripts() from public, anon;
grant execute on function forget_my_transcripts() to authenticated;

-- 90 days, not the year a redacted phrasing keeps: this is the sentence as
-- written, so it earns its keep faster or not at all.
create or replace function trim_assistant_transcripts() returns void
language sql security definer set search_path = public as $$
  delete from assistant_transcript where at < now() - interval '90 days';
$$;
