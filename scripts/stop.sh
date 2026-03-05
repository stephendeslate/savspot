#!/usr/bin/env bash
set -euo pipefail

GREEN='\033[0;32m'
NC='\033[0m'

info() { echo -e "${GREEN}[stop]${NC} $1"; }

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

# --- Kill any running turbo/next/nest dev processes ---
info "Stopping dev servers..."
pkill -f "turbo.*dev" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
pkill -f "nest start" 2>/dev/null || true

# --- Stop Docker containers ---
info "Stopping Docker containers (PostgreSQL + Redis)..."
docker compose down

info "All stopped."
