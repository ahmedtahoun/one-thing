-- The consent somebody gives by turning on "Help improve Sanad": that Sanad
-- may keep what they typed, and not only the markered-up shape of it.
--
-- **Alone in its own file, and that is the whole point.** Postgres will not
-- let a new enum value be *used* in the transaction that added it, and the
-- Supabase SQL Editor wraps each execution in one. 0016 uses this value in a
-- policy, so the two cannot share a file: pasted together — or written as one
-- migration, which is how this was first written — they fail with
--
--     unsafe use of new value "assistant_transcript" of enum type consent_kind
--
-- admin/DEPLOY.md § 5 already warned about this for 0011 and 0012. The
-- warning was about two files pasted together; this was one file that could
-- not apply on its own, which is worse and which nothing caught, because the
-- test harness runs each statement in its own transaction and production does
-- not. BUILD-REVIEW §2.117.

alter type consent_kind add value if not exists 'assistant_transcript';
