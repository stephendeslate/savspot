# SavSpot - AI Assistant Context

## Project Overview
Multi-tenant SaaS booking platform for service businesses globally.

## Tech Stack
- **Monorepo:** Turborepo + pnpm workspaces
- **Backend:** NestJS 11 (`apps/api`)
- **Frontend:** Next.js 15 App Router (`apps/web`)
- **ORM:** Prisma 6 (`prisma/schema.prisma`)
- **Database:** PostgreSQL 16 with Row-Level Security
- **Cache/Queue:** Redis 7 (Upstash in production, Docker locally)
- **Language:** TypeScript 5.8+ strict mode
- **Testing:** Vitest
- **UI:** shadcn/ui + Tailwind CSS 4

## Key Commands
```bash
pnpm dev              # Start all apps in dev mode
pnpm build            # Build all apps and packages
pnpm lint             # Lint all packages
pnpm typecheck        # Type check all packages
pnpm test             # Run all tests
pnpm db:generate      # Generate Prisma client
pnpm db:migrate:dev   # Run migrations (dev)
pnpm db:migrate:deploy # Run migrations (production)
pnpm db:seed          # Seed database
pnpm db:studio        # Open Prisma Studio
pnpm docker:up        # Start Docker services (PostgreSQL + Redis)
pnpm docker:down      # Stop Docker services
```

## Architecture Decisions
- **Multi-tenancy:** Shared DB with RLS + Prisma Client Extensions + nestjs-cls
- **Progressive complexity:** Nullable JSONB columns (null = feature inactive)
- **Business presets:** One-time onboarding functions, not persistent config
- **Booking flow:** Dynamic step resolution from service config (SRS-1 Section 8)
- **Tenant context:** Use `select set_config('app.current_tenant', tenantId, TRUE)` (not SET LOCAL)
- **BullMQ workers:** Run outside HTTP lifecycle — pass tenant_id in job payload
- **Payments:** Stripe Connect Express with destination charges + application_fee_amount

## Important: Prisma + RLS + Interactive Transactions
Prisma Client Extensions with `$allOperations` can create nested transactions that break `SELECT ... FOR UPDATE` locks. For booking slot reservation, use `$queryRaw` with explicit transaction. See architecture.md in memory.

## Conventions
- All timestamps: UTC in database, timezone-aware display
- All money: Decimal type (major units / dollars) — only convert to cents at Stripe boundary
- All IDs: UUID v4
- API: REST (no GraphQL)
- Enums: Defined in both Prisma schema AND `@savspot/shared` (must stay in sync)
- Branch strategy: feature/* → develop → main
- Commit format: Conventional Commits (feat:, fix:, chore:, etc.)

## Spec Documents
Located in `specs/` directory:
- BRD.md — Revenue model, business rules, constraints
- PRD.md — All functional requirements by domain + phase
- PVD.md — Vision, personas, competitive landscape
- SRS-1-ARCHITECTURE.md — Tech stack, architecture, multi-tenancy
- SRS-2-DATA-MODEL.md — ~75 tables, Prisma schema, API endpoints
- SRS-3-BOOKING-PAYMENTS.md — Booking state machine, availability, payments
- SRS-4-COMMS-SECURITY-WORKFLOWS.md — Auth, comms, security, background jobs

## Sub-Agent Instructions
When spawning sub-agents for parallel work:
- Use worktree isolation for any task that writes files
- Each sub-agent should run tests within its scope before completing
- Prefer 3-4 focused sub-agents over many small ones
- Group related file changes into the same sub-agent scope
- Local model sub-agents (fast-explorer, fast-editor) are available
  for high-volume, low-complexity work at zero token cost

## Local Development Note
Stop local PostgreSQL before using Docker: `brew services stop postgresql@14`
