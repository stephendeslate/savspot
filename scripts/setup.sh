#!/bin/bash
# =============================================================================
# SavSpot — Local Development Setup
# Run once after cloning: ./scripts/setup.sh
# =============================================================================
set -e

echo "=== SavSpot Local Setup ==="
echo ""

# 1. Install dependencies
echo "[1/6] Installing dependencies..."
pnpm install

# 2. Start Docker services
echo "[2/6] Starting PostgreSQL + Redis..."
pnpm docker:up

# Wait for PostgreSQL to be ready
echo "       Waiting for PostgreSQL..."
for i in {1..30}; do
  if docker compose -f docker/docker-compose.yml exec -T postgres pg_isready -U savspot > /dev/null 2>&1; then
    break
  fi
  sleep 1
done

# 3. Generate Prisma client
echo "[3/6] Generating Prisma client..."
pnpm db:generate

# 4. Run migrations
echo "[4/6] Running database migrations..."
pnpm db:migrate:dev

# 5. Seed database
echo "[5/6] Seeding database..."
pnpm db:seed

# 6. Build shared packages
echo "[6/6] Building shared packages..."
pnpm --filter @savspot/shared build
pnpm --filter @savspot/ui build

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Start development:"
echo "  pnpm dev"
echo ""
echo "API:  http://localhost:3001"
echo "Web:  http://localhost:3000"
echo ""
