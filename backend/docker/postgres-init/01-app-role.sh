#!/bin/sh
# Runs once, on first start of an empty data volume.
# POSTGRES_USER owns the schema and runs migrations. The API logs in as
# APP_DB_USER, a member of app_runtime: no ownership, no BYPASSRLS, so
# row-level security always applies to it.
set -eu

psql -v ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -v app_user="$APP_DB_USER" -v app_password="$APP_DB_PASSWORD" <<'EOSQL'
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_runtime') THEN
    CREATE ROLE app_runtime NOLOGIN NOBYPASSRLS;
  END IF;
END $$;

CREATE ROLE :"app_user" LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE
  PASSWORD :'app_password' IN ROLE app_runtime;
EOSQL
