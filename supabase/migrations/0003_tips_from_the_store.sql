-- The One Thing — tips are written by the store, not by the user.
--
-- 0001 gave `tip` the same owner-only policy as every user table, which
-- lets a signed-in user insert a tip they never paid for; the admin panel's
-- Subscriptions screen would count it as revenue. A tip is a consumable
-- purchase, so like `subscription` it is recorded by the store webhooks
-- (App Store Server Notifications, Google RTDN), which run as the service
-- role and bypass row-level security. The owner can still read theirs.
-- BUILD-REVIEW.md §2.36, item 5.

drop policy own_rows on tip;
create policy own_tip_read on tip for select using (user_id = auth.uid());
