#!/usr/bin/env bash
# =============================================================================
# Fly Postgres → Supabase Postgres data migration
# =============================================================================
# Dumps savspot-db (Fly) and restores into a Supabase project. Schemas must
# already match — Phase 1 of the migration plumbed `directUrl` into
# `prisma/schema.prisma` and applied all 24 migrations to the Supabase project.
#
# Idempotent: truncates Supabase data tables before reloading, so re-running
# is safe. `_prisma_migrations` is excluded from the dump so the migration
# history on Supabase (already populated by Phase 1) is preserved.
#
# Required env vars (typically sourced from ~/.config/savspot-deploy.env):
#   FLY_API_TOKEN              — flyctl auth (org-scoped Fly PAT)
#   SAVSPOT_FLY_DATABASE_URL_RAW — postgres URL pointing at savspot-db.flycast
#                                 (auto-fetched from savspot-api Fly secrets)
#   SAVSPOT_SUPABASE_DIRECT_URL  — Supabase direct (port 5432) URL
#   SAVSPOT_DB_PASSWORD          — Supabase postgres password
#
# Optional env:
#   PROXY_PORT                 — local port for `flyctl proxy` (default: 15432)
#   FLY_DB_APP                 — Fly app name for the Postgres cluster (default: savspot-db)
#
# Usage:
#   bash scripts/admin/migrate-fly-to-supabase.sh
#
# This script does NOT flip Fly secrets. The cutover step (setting
# DATABASE_URL + DIRECT_URL on savspot-api / savspot-worker) is intentionally
# manual so that operator confirms the dry-run row-count parity first.
# =============================================================================

set -euo pipefail

PROXY_PORT="${PROXY_PORT:-15432}"
FLY_DB_APP="${FLY_DB_APP:-savspot-db}"
WORK_DIR="$(mktemp -d -t savspot-migrate-XXXX)"
trap 'rm -rf "$WORK_DIR"; if [ -n "${PROXY_PID:-}" ]; then kill "$PROXY_PID" 2>/dev/null || true; fi' EXIT

require_env() {
  local name="$1"
  if [ -z "${!name:-}" ]; then
    echo "ERROR: required env var \$$name is not set." >&2
    echo "Source ~/.config/savspot-deploy.env and retry." >&2
    exit 1
  fi
}

require_env FLY_API_TOKEN
require_env SAVSPOT_FLY_DATABASE_URL_RAW
require_env SAVSPOT_SUPABASE_DIRECT_URL
require_env SAVSPOT_DB_PASSWORD

command -v flyctl >/dev/null || { echo "ERROR: flyctl not in PATH"; exit 1; }
command -v docker >/dev/null || { echo "ERROR: docker not in PATH"; exit 1; }

# -----------------------------------------------------------------------------
# Parse the Fly DATABASE_URL into discrete fields. The raw URL points at
# savspot-db.flycast (Fly internal network); we replace host:port with
# localhost:$PROXY_PORT for the local pg_dump connection.
# -----------------------------------------------------------------------------
PARSED=$(python3 - <<PY
import os, urllib.parse as up
u = up.urlparse(os.environ['SAVSPOT_FLY_DATABASE_URL_RAW'])
print(f"FLY_DB_USER={u.username}")
print(f"FLY_DB_PASSWORD={u.password}")
print(f"FLY_DB_NAME={u.path.lstrip('/').split('?')[0]}")
PY
)
eval "$PARSED"

echo "==> Migration: Fly Postgres ($FLY_DB_APP) → Supabase"
echo "    Fly DB user: $FLY_DB_USER"
echo "    Fly DB name: $FLY_DB_NAME"
echo "    Local proxy port: $PROXY_PORT"
echo "    Working dir: $WORK_DIR"
echo

# -----------------------------------------------------------------------------
# Open the flyctl proxy. Backgrounded; killed in the trap on exit.
# -----------------------------------------------------------------------------
echo "==> Opening flyctl proxy localhost:$PROXY_PORT → $FLY_DB_APP:5432"
flyctl proxy "$PROXY_PORT:5432" -a "$FLY_DB_APP" >/dev/null 2>&1 &
PROXY_PID=$!

# Wait for proxy to accept connections (up to 15s).
for i in $(seq 1 15); do
  if (echo > "/dev/tcp/localhost/$PROXY_PORT") 2>/dev/null; then
    echo "    proxy up after ${i}s"
    break
  fi
  sleep 1
done
if ! (echo > "/dev/tcp/localhost/$PROXY_PORT") 2>/dev/null; then
  echo "ERROR: flyctl proxy failed to come up within 15s." >&2
  exit 1
fi

# -----------------------------------------------------------------------------
# Capture pre-migration row counts from Fly so we can compare after restore.
# -----------------------------------------------------------------------------
echo "==> Capturing source row counts (Fly)"
docker run --rm --network host \
  -e PGPASSWORD="$FLY_DB_PASSWORD" \
  postgres:17-alpine \
  psql -h localhost -p "$PROXY_PORT" -U "$FLY_DB_USER" -d "$FLY_DB_NAME" -At -F '|' \
  -c "SELECT tablename, (xpath('/row/c/text()', query_to_xml(format('SELECT count(*) AS c FROM public.%I', tablename), false, true, '')))[1]::text::bigint FROM pg_tables WHERE schemaname='public' AND tablename != '_prisma_migrations' ORDER BY tablename;" \
  > "$WORK_DIR/fly-counts.txt"
echo "    $(wc -l < "$WORK_DIR/fly-counts.txt") tables counted on source"

# -----------------------------------------------------------------------------
# Dump data from Fly. Custom format → smaller, supports parallel restore later
# if size grows. _prisma_migrations excluded — Phase 1 already populated it on
# Supabase identically.
# -----------------------------------------------------------------------------
echo "==> pg_dump (data-only) from Fly"
docker run --rm --network host \
  -e PGPASSWORD="$FLY_DB_PASSWORD" \
  -v "$WORK_DIR:/dump" \
  postgres:17-alpine \
  pg_dump -h localhost -p "$PROXY_PORT" -U "$FLY_DB_USER" -d "$FLY_DB_NAME" \
    --data-only --no-owner --no-privileges --no-comments \
    --exclude-table=_prisma_migrations \
    -f /dump/savspot-fly-data.sql 2>&1 | grep -v 'circular foreign-key' || true
echo "    dump size: $(stat -c '%s' "$WORK_DIR/savspot-fly-data.sql") bytes"

# -----------------------------------------------------------------------------
# Build the combined truncate+load SQL. session_replication_role=replica
# disables triggers + FK checks for the duration of the session, so data can
# load in any order. row_security=off bypasses RLS (Supabase's postgres role
# already has BYPASSRLS but belt-and-braces.) Wrapped in a single transaction
# so a partial failure rolls back cleanly.
# -----------------------------------------------------------------------------
echo "==> Building combined truncate+load script"
cat > "$WORK_DIR/savspot-restore.sql" <<'HEAD'
-- Dump+restore from Fly Postgres into Supabase. Generated by migrate-fly-to-supabase.sh.
SET session_replication_role = replica;
SET row_security = off;
BEGIN;
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename != '_prisma_migrations' LOOP
    EXECUTE format('TRUNCATE TABLE public.%I CASCADE', r.tablename);
  END LOOP;
END$$;
HEAD
cat "$WORK_DIR/savspot-fly-data.sql" >> "$WORK_DIR/savspot-restore.sql"
echo "COMMIT;" >> "$WORK_DIR/savspot-restore.sql"

# -----------------------------------------------------------------------------
# Restore into Supabase.
# -----------------------------------------------------------------------------
echo "==> Restoring into Supabase"
docker run --rm --network host \
  -e PGPASSWORD="$SAVSPOT_DB_PASSWORD" \
  -v "$WORK_DIR:/sql" \
  postgres:17-alpine \
  psql "$SAVSPOT_SUPABASE_DIRECT_URL" -v ON_ERROR_STOP=1 -f /sql/savspot-restore.sql > /dev/null
echo "    restore complete"

# -----------------------------------------------------------------------------
# Capture post-migration row counts from Supabase, diff against Fly.
# -----------------------------------------------------------------------------
echo "==> Capturing target row counts (Supabase) and comparing"
docker run --rm --network host \
  -e PGPASSWORD="$SAVSPOT_DB_PASSWORD" \
  postgres:17-alpine \
  psql "$SAVSPOT_SUPABASE_DIRECT_URL" -At -F '|' \
  -c "SELECT tablename, (xpath('/row/c/text()', query_to_xml(format('SELECT count(*) AS c FROM public.%I', tablename), false, true, '')))[1]::text::bigint FROM pg_tables WHERE schemaname='public' AND tablename != '_prisma_migrations' ORDER BY tablename;" \
  > "$WORK_DIR/supabase-counts.txt"

if diff -q "$WORK_DIR/fly-counts.txt" "$WORK_DIR/supabase-counts.txt" >/dev/null; then
  echo "    ✓ all $(wc -l < "$WORK_DIR/fly-counts.txt") tables match"
else
  echo "    ✗ ROW COUNT MISMATCH"
  diff "$WORK_DIR/fly-counts.txt" "$WORK_DIR/supabase-counts.txt" | head -50
  exit 1
fi

echo
echo "==> Migration verified. Next step (manual):"
echo "    flyctl secrets set -a savspot-api \\"
echo "      DATABASE_URL='\$SAVSPOT_SUPABASE_POOLER_URL' \\"
echo "      DIRECT_URL='\$SAVSPOT_SUPABASE_DIRECT_URL'"
echo "    flyctl secrets set -a savspot-worker \\"
echo "      DATABASE_URL='\$SAVSPOT_SUPABASE_POOLER_URL' \\"
echo "      DIRECT_URL='\$SAVSPOT_SUPABASE_DIRECT_URL'"
echo "    Setting Fly secrets triggers a rolling redeploy of each app."
echo "    Fly Postgres stays warm for the rollback window."
