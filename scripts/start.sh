#!/usr/bin/env bash
set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${GREEN}[start]${NC} $1"; }
warn()  { echo -e "${YELLOW}[start]${NC} $1"; }
error() { echo -e "${RED}[start]${NC} $1"; }

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

# --- Stop local PostgreSQL if running (avoid port conflict) ---
if command -v brew &>/dev/null && brew services list 2>/dev/null | grep -q 'postgresql.*started'; then
  warn "Local PostgreSQL detected — stopping to avoid port 5432 conflict..."
  brew services stop postgresql@14 2>/dev/null || brew services stop postgresql 2>/dev/null || true
fi

# --- 1. Docker containers ---
info "Starting Docker containers (PostgreSQL + Redis)..."
docker compose up -d

info "Waiting for PostgreSQL to be healthy..."
until docker compose exec -T postgres pg_isready -U savspot -d savspot_dev &>/dev/null; do
  sleep 1
done
info "PostgreSQL is ready."

info "Waiting for Redis to be healthy..."
until docker compose exec -T redis redis-cli ping 2>/dev/null | grep -q PONG; do
  sleep 1
done
info "Redis is ready."

# --- 2. Generate Prisma client ---
info "Generating Prisma client..."
pnpm db:generate

# --- 3. Run migrations ---
info "Running database migrations..."
pnpm db:migrate:dev --name init 2>/dev/null || pnpm db:migrate:dev

# --- 4. Seed (skip if already seeded) ---
info "Seeding database (safe to re-run)..."
pnpm db:seed || warn "Seed encountered an issue — database may already be seeded."

# --- 5. Start dev servers ---
info "Starting dev servers (API + Web)..."
info "  API  -> http://localhost:3001"
info "  Web  -> http://localhost:3000"
info ""
info "Press Ctrl+C to stop the dev servers."
info "Run ./scripts/stop.sh to also stop Docker containers."
echo ""

exec pnpm dev
