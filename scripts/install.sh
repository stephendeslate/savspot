#!/usr/bin/env bash
# =============================================================================
# SavSpot — Quick Install Script
# =============================================================================
# One-command setup for self-hosted SavSpot.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/stephendeslate/savspot/main/scripts/install.sh | bash
#   # or
#   git clone https://github.com/stephendeslate/savspot.git && cd savspot && ./scripts/install.sh
# =============================================================================

set -euo pipefail

REPO_URL="https://github.com/stephendeslate/savspot.git"
INSTALL_DIR="${SAVSPOT_DIR:-savspot}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[savspot]${NC} $1"; }
warn() { echo -e "${YELLOW}[savspot]${NC} $1"; }
err()  { echo -e "${RED}[savspot]${NC} $1" >&2; }

# ── Preflight checks ───────────────────────────────────────────────────────

check_command() {
  if ! command -v "$1" &>/dev/null; then
    err "Required: $1 is not installed."
    err "Install it and try again."
    exit 1
  fi
}

log "Checking prerequisites..."
check_command docker
check_command git
check_command openssl

# Check Docker Compose (v2 plugin)
if ! docker compose version &>/dev/null; then
  err "Docker Compose v2 is required (docker compose, not docker-compose)."
  err "Update Docker or install the compose plugin."
  exit 1
fi

# ── Clone or use existing repo ─────────────────────────────────────────────

if [ ! -f "docker-compose.prod.yml" ]; then
  if [ -d "$INSTALL_DIR" ]; then
    warn "Directory '$INSTALL_DIR' already exists. Using it."
    cd "$INSTALL_DIR"
  else
    log "Cloning SavSpot..."
    git clone "$REPO_URL" "$INSTALL_DIR"
    cd "$INSTALL_DIR"
  fi
fi

# ── Generate .env if missing ───────────────────────────────────────────────

if [ ! -f ".env" ]; then
  log "Creating .env from template..."
  cp .env.production.example .env

  # Generate a random Postgres password
  PG_PASS=$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s/CHANGE_ME_STRONG_PASSWORD/$PG_PASS/" .env
  else
    sed -i "s/CHANGE_ME_STRONG_PASSWORD/$PG_PASS/" .env
  fi

  # Generate JWT keys and encryption key
  log "Generating JWT keys and encryption key..."
  bash scripts/generate-keys.sh >> .env

  warn "Edit .env to set your DOMAIN and optional integrations (email, payments, etc.)"
else
  log ".env already exists, skipping generation."
fi

# ── Build and start ────────────────────────────────────────────────────────

log "Building containers (this may take a few minutes on first run)..."
docker compose -f docker-compose.prod.yml build

log "Starting SavSpot..."
docker compose -f docker-compose.prod.yml up -d

# ── Wait for healthy ───────────────────────────────────────────────────────

log "Waiting for services to be ready..."
TRIES=0
MAX_TRIES=30
until docker compose -f docker-compose.prod.yml exec -T api wget -q --spider http://localhost:3001/health 2>/dev/null; do
  TRIES=$((TRIES + 1))
  if [ $TRIES -ge $MAX_TRIES ]; then
    err "API did not become healthy after ${MAX_TRIES}s. Check logs:"
    err "  docker compose -f docker-compose.prod.yml logs api"
    exit 1
  fi
  sleep 1
done

echo ""
log "SavSpot is running!"
echo ""
echo "  Web:  http://localhost (or https://yourdomain.com if DOMAIN is set)"
echo "  API:  http://localhost/api"
echo ""
echo "  Useful commands:"
echo "    docker compose -f docker-compose.prod.yml logs -f     # View logs"
echo "    docker compose -f docker-compose.prod.yml down        # Stop"
echo "    docker compose -f docker-compose.prod.yml pull        # Update"
echo ""
