-- How many cups a tip was: the counter on the tip sheet (BUILD-REVIEW §2.100).
--
-- StoreKit takes a quantity on a consumable purchase and reports it back on
-- the notification, so three small coffees arrive as ONE transaction with
-- quantity 3, not three transactions. Without this column the panel would
-- count that as one tip and under-report what was actually paid.
--
-- Default 1, because every tip recorded before this was exactly one, and
-- because Play sends no quantity at all — its multi-quantity flow is a
-- console setting whose purchases still arrive one per transaction.
alter table tip add column quantity smallint not null default 1
  check (quantity between 1 and 99);

-- `record_store_tip` has to take it too. Postgres cannot add a parameter to
-- an existing function — `create or replace` with a longer argument list
-- makes a second one — so the old signature is dropped first, and the
-- revokes 0007 applied to it are applied again to the new one. The grants
-- name the signature, so they do not survive the drop on their own.
drop function if exists public.record_store_tip(
  public.store_kind, text, text, uuid, public.tip_product, text, timestamptz
);

create function public.record_store_tip(
  p_store store_kind,
  p_external_id text,
  p_type text,
  p_user_id uuid,
  p_product_id tip_product,
  p_transaction_id text,
  p_at timestamptz,
  p_quantity smallint default 1
) returns boolean
language plpgsql security definer set search_path = '' as $$
declare fresh boolean;
begin
  insert into public.store_notification (store, external_id, "type", outcome, user_id)
    values (p_store, p_external_id, p_type, 'tip', p_user_id)
    on conflict (store, external_id) do nothing
    returning true into fresh;
  if fresh is null then
    return false;
  end if;

  -- Two belts: the notification id above, and the store's own transaction id,
  -- in case the same purchase ever arrives under two notification ids.
  insert into public.tip (user_id, store, product_id, transaction_id, at, quantity)
    values (p_user_id, p_store, p_product_id, p_transaction_id, p_at, greatest(1, coalesce(p_quantity, 1)))
    on conflict (store, transaction_id) do nothing;
  return true;
end $$;

-- The same four lines 0007 applies to every writer here: the grants name a
-- signature, so none of them survived the drop above. Revoked from everyone
-- and granted back to the service role alone — a user may not write a tip.
do $$
declare f text := 'public.record_store_tip('
  || 'public.store_kind, text, text, uuid, public.tip_product, text, timestamptz, smallint)';
begin
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
end $$;
