# SavSpot

Multi-tenant SaaS booking platform for service businesses. Turborepo monorepo: `apps/api` (NestJS), `apps/web` (Next.js App Router), `apps/mobile`, `packages/{shared,ui,embed-widget,mcp-server}`.

## Commands
```
pnpm dev / build / lint / typecheck / test
pnpm db:generate / db:migrate:dev / db:migrate:deploy / db:seed / db:studio
pnpm docker:up / docker:down
pnpm format / format:check
```

## Architecture Decisions
- **Multi-tenancy:** Shared DB with RLS + Prisma Client Extensions + nestjs-cls
- **Progressive complexity:** Nullable JSONB columns (null = feature inactive)
- **Business presets:** One-time onboarding functions, not persistent config
- **Booking flow:** Dynamic step resolution from service config (SRS-1 Section 8)
- **Tenant context:** Use `select set_config('app.current_tenant', tenantId, TRUE)` (not SET LOCAL)
- **BullMQ workers:** Run outside HTTP lifecycle — pass tenant_id in job payload
- **Payments:** Stripe Connect Express with destination charges + application_fee_amount

## Coder Agent Limits (Stall Prevention)
- Do NOT delegate if the primary file is >300 lines
- Do NOT delegate if >3 functions need editing in one file
- Do NOT delegate if the change involves cross-handler React state management
- When in doubt: Opus implements directly — faster and more reliable
- Override: include `CODER_FORCE` in the prompt to bypass the PreToolUse size check

## Prisma + RLS + Interactive Transactions
Prisma Client Extensions with `$allOperations` can create nested transactions that break `SELECT ... FOR UPDATE` locks. For booking slot reservation, use `$queryRaw` with explicit transaction.

## Conventions
- Timestamps: UTC in DB, timezone-aware display
- Money: Decimal (major units) — convert to cents only at Stripe boundary
- IDs: UUID v4
- API: REST only
- Enums: Defined in both Prisma schema AND `@savspot/shared` (must stay in sync)
- Branch: feature/* → develop → main
- Commits: Conventional Commits (feat:, fix:, chore:)

## Specs
Located in `specs/` — BRD, PRD, PVD, SRS-1 through SRS-4. Read relevant spec before implementing a feature in that domain.
