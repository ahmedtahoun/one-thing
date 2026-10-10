#!/usr/bin/env bash
# Applies supabase/migrations/*.sql to a throwaway Postgres database so schema
# errors surface here rather than in a Supabase deploy.
#
# Supabase provides the `auth` schema; locally we stub just enough of it
# (auth.users and auth.uid()) for the migration to apply and for the RLS
# policies to compile.
set -euo pipefail

DB="${1:-one_thing_schema_check}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PSQL=(psql -v ON_ERROR_STOP=1 -q)

run_as_postgres() { su postgres -c "$1"; }

run_as_postgres "dropdb --if-exists ${DB}"
run_as_postgres "createdb ${DB}"

su postgres -c "${PSQL[*]} -d ${DB}" <<'SQL'
create schema if not exists auth;
create table auth.users (id uuid primary key default gen_random_uuid());
create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
SQL

for f in "${ROOT}"/supabase/migrations/*.sql; do
  echo "applying $(basename "$f")"
  su postgres -c "${PSQL[*]} -d ${DB} -f ${f}"
done

echo
echo "tables:"
su postgres -c "psql -tA -d ${DB} -c \"select tablename from pg_tables where schemaname='public' order by 1\""
echo
echo "tables with RLS enabled but no policy (should be only admin_audit_log):"
su postgres -c "psql -tA -d ${DB} -c \"
  select c.relname from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname='public' and c.relrowsecurity
    and not exists (select 1 from pg_policies p where p.tablename = c.relname)
  order by 1\""
echo
echo "tables with no RLS (should be none):"
su postgres -c "psql -tA -d ${DB} -c \"
  select c.relname from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname='public' and c.relkind='r' and not c.relrowsecurity order by 1\""
