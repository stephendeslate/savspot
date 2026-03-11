# Savspot -- Software Requirements Specification: Architecture & Infrastructure

**Version:** 1.2 | **Date:** March 7, 2026 | **Author:** SD Solutions, LLC
**Document:** SRS Part 1 of 4

---

## 1. Scope

This document covers the technology stack, system architecture, multi-tenancy implementation, progressive complexity strategy, deployment strategy, CI/CD pipeline, testing strategy, monitoring and observability, development workflow, and non-functional requirements for the Savspot booking SaaS platform. Data models and schema design are defined in **SRS-2**. Domain logic for bookings, payments, and scheduling is in **SRS-3**. Communications, security, workflows, and integrations are in **SRS-4**.

---

## 2. Core Tech Stack

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| Language | TypeScript | 5.8+ | Single language across stack; best AI code-gen support |
| Backend | NestJS | 11+ | Opinionated, modular, DI-based, supports DDD patterns |
| ORM | Prisma | 6+ | Type-safe queries, declarative migrations, PostgreSQL RLS support |
| Frontend | Next.js App Router | 15+ | RSC, server actions, SSR for booking pages |
| UI | shadcn/ui + Radix | Latest | Accessible, Tailwind-based, lighter than MUI |
| Styling | Tailwind CSS | 4+ | Utility-first, design tokens |
| Mobile | React Native + Expo | 54+ | Code sharing with web, managed builds, OTA updates **(Phase 3)** |
| State (Web) | TanStack Query v5 + Context API | v5 | No Redux/Zustand; simpler mental model for web |
| State (Mobile) | Zustand + TanStack Query | Latest | Intentional divergence; Zustand better suited for mobile state |
| Forms | React Hook Form + Zod | Latest | Type-safe validation, shared schemas between client and server |
| Database | PostgreSQL | 16+ | ACID compliance, RLS, JSON columns, full-text search |
| Cache/Queue | Redis via Upstash | 7+ | BullMQ broker, caching layer, session storage |
| Job Queue | BullMQ | 5+ | Redis-backed, TypeScript-native, reliable job processing |
| Search | PostgreSQL FTS + pg_trgm | Built-in | No external dependency; migrate to Meilisearch if directory scales |
| Real-time | Server-Sent Events (SSE) | N/A | Simpler than WebSocket for unidirectional updates; upgrade path to WS |

---

## 3. External Services

| Service | Provider | Purpose |
|---------|----------|---------|
| Payments | PaymentProvider abstraction interface (Stripe Connect Express in Phase 1; Adyen, PayPal Commerce Platform in Phase 3; regional providers in Phase 4) | Payment processing, KYC, automated payouts; offline payment as first-class fallback |
| Email | Resend | Transactional email with React Email templates |
| SMS | Plivo (migrated from Twilio in Phase 2) | Booking confirmations, appointment reminders |
| Push Notifications | Expo Push | iOS and Android push notifications **(Phase 3)** |
| Object Storage | Cloudflare R2 | S3-compatible file storage (images, documents) |
| Error Tracking | Sentry | Error tracking + performance monitoring |
| Analytics | PostHog | Product analytics, feature flags, session replay |
| Auth | Custom NestJS + Passport.js | JWT, OAuth 2.0, API key authentication |
| Google Calendar | Google Calendar API v3 | OAuth 2.0, one-way + two-way sync |
| Outlook Calendar | Microsoft Graph API | OAuth 2.0, calendar sync |
| Accounting (Phase 3) | QuickBooks Online / Xero | Premium accounting integration |
| Maps | Mapbox or Google Maps | Location services, address autocomplete |
| DNS/CDN | Cloudflare | DNS management, CDN, DDoS protection |

---

## 4. Development & Infrastructure Tools

| Tool | Purpose |
|------|---------|
| Turborepo + pnpm | Monorepo management and dependency resolution |
| GitHub Actions | CI/CD pipeline automation |
| Fly.io | Backend hosting (API server + workers + Redis + PostgreSQL) |
| Vercel | Frontend hosting (Next.js SSR/SSG) |
| EAS Build | Mobile app builds (iOS + Android) **(Phase 3)** |
| Docker | Local dev environment + Fly.io deployment containers |
| ESLint, Prettier, Biome | Code linting and formatting |
| TypeScript strict mode | Type safety enforcement across all packages |
| Vitest, Playwright, Jest, Maestro | Unit, integration, E2E web, and E2E mobile testing (Maestro: Phase 3) |
| Swagger/OpenAPI | API documentation auto-generated from NestJS decorators |

---

## 5. High-Level Architecture

```
                    +-------------------------------------+
                    |           Cloudflare CDN             |
                    +----------+----------+---------------+
                               |          |
                    +----------v--+  +----v--------------+
                    |   Vercel    |  |    Mobile Apps     |
                    |  (Next.js)  |  | (Expo iOS/Android) |
                    |  Admin CRM  |  |   ** Phase 2 **    |
                    |Client Portal|  +--------+-----------+           |
                    |Booking Pages|           |
                    +------+------+           |
                           |                  |
                    +------v------------------v-----------+
                    |          Fly.io Platform             |
                    |  +------------------------------+   |
                    |  |    NestJS API Server          |   |
                    |  |    (REST API)                 |   |
                    |  +----------+-------------------+   |
                    |             |                        |
                    |  +----------v-------------------+   |
                    |  |    PostgreSQL 16 (RLS)        |   |
                    |  +------------------------------+   |
                    |  +------------------------------+   |
                    |  |    Redis (Upstash)            |   |
                    |  +------------------------------+   |
                    |  +------------------------------+   |
                    |  |    BullMQ Workers             |   |
                    |  +------------------------------+   |
                    +--------------------------------------+
                               |
              +----------------+----------------+
              |                |                |
     +--------v---+  +--------v---+  +---------v----+
     |  Payment   |  |   Resend   |  | Cloudflare   |
     |  Provider* |  |   (Email)  |  |     R2       |
     +------------+  +------------+  +--------------+
```

*PaymentProvider abstraction interface: Stripe Connect Express (Phase 1), Adyen + PayPal (Phase 3), regional providers (Phase 4), offline payment fallback. Tenant's `payment_provider` column selects implementation at runtime via NestJS DI.*

**Request Flow:** Clients hit Cloudflare CDN, which routes to Vercel (web) or directly to Fly.io (API). In Phase 1, all client interactions are via mobile-responsive web; the native mobile app ships in Phase 3 and communicates directly with the Fly.io API. All applications communicate with the NestJS API server hosted on Fly.io. The API uses PostgreSQL with Row-Level Security for data isolation, Redis for caching and job brokering, and BullMQ workers for asynchronous task processing (emails, SMS, webhooks, calendar sync).

---

## 6. Monorepo Structure

```
savspot/
├── apps/
│   ├── api/                  # NestJS backend (REST API)
│   ├── web/                  # Next.js frontend (Admin CRM, Client Portal, Booking Pages)
│   └── mobile/               # React Native + Expo app (Phase 3; scaffolded in Phase 1 for shared package compatibility)
├── packages/
│   ├── shared/               # Shared types, Zod schemas, constants, utils
│   ├── ui/                   # shadcn/ui components, design tokens
│   ├── embed-widget/         # Embeddable booking widget (iframe + JS SDK)
│   └── mcp-server/           # Model Context Protocol server (separate process; communicates with API via internal HTTP; authenticates with API key; Phase 3)
├── prisma/
│   └── schema.prisma         # Database schema + migrations
├── docker-compose.yml        # Local dev (PostgreSQL, Redis)
├── turbo.json                # Turborepo pipeline config
├── pnpm-workspace.yaml       # pnpm workspace definition
├── tsconfig.base.json        # Shared TypeScript config
├── .eslintrc.js              # Shared ESLint config
├── .prettierrc               # Shared Prettier config
├── CLAUDE.md                 # AI assistant context (root)
└── .github/
    └── workflows/
        ├── ci.yml            # Lint, typecheck, test
        ├── deploy-api.yml    # Deploy API to Fly.io
        ├── deploy-web.yml    # Deploy web to Vercel
        └── deploy-mobile.yml # EAS Build trigger (Phase 3)
```

---

## 7. Multi-Tenancy Implementation

### Strategy: Shared Database with Row-Level Security

All tenants share a single PostgreSQL database. Isolation is enforced at the database level via RLS policies.

**RLS Policy Example:**

```sql
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON bookings
  FOR ALL
  TO application_role
  USING (tenant_id = current_setting('app.current_tenant')::UUID);
```

### Implementation Steps

1. **Resolve tenant** from JWT claims or URL slug on every request.
2. **NestJS middleware** sets `app.current_tenant` on the PostgreSQL session via `select set_config('app.current_tenant', tenantId, TRUE)` (not `SET LOCAL` -- `set_config` with `TRUE` is transaction-local and compatible with Prisma interactive transactions).
3. **Prisma Client Extension** auto-filters all queries by `tenant_id` at the application layer.
4. **RLS acts as a database-level safety net** -- even if application code has a bug, data cannot leak across tenants.

### Tenant Resolution by Context

| Context | Resolution Method |
|---------|-------------------|
| Admin CRM | Extracted from JWT `tenant_id` claim |
| Client Portal | URL slug (e.g., `/portal/{slug}`) |
| Booking Page | Read-only database role; tenant resolved from page slug |
| Embed Widget | Tenant slug passed via widget configuration |
| API / MCP | API key mapped to `tenant_id` |

---

## 8. Progressive Complexity Architecture

### Design Principle

The schema is designed for the most complex use case (venue/event with guest tracking, tiered pricing, multi-party contracts, workflow automation). The defaults are configured for the simplest use case (freelancer with a flat price and basic availability). **The presence or absence of data is the configuration** -- no feature flags table, no configuration cascade, no persistent complexity profiles.

### Implementation Strategy: Smart Defaults with Nullable Optional Fields

Advanced features are represented by nullable JSONB columns or the presence/absence of related records. When a field is `null` or a related table has no rows, the feature is inactive and its UI is hidden.

| Feature | Data Representation | When Null / Empty | When Configured |
|---------|--------------------|--------------------|-----------------|
| Guest tracking | `services.guest_config` (JSONB, nullable) | No guest count in booking flow | Guest step appears; age tiers rendered if `age_tiers` array present |
| Tiered pricing | `services.tier_config` (JSONB, nullable) | FIXED pricing used (`base_price`) | Tiered pricing engine activated |
| Contracts | `services.contract_template_id` (FK, nullable) | No contract step in booking flow | Contract step appears with signature capture |
| Intake forms | `services.intake_form_config` (JSONB, nullable) | No questionnaire step | Questionnaire step rendered from config |
| Buffer times | `services.buffer_before_minutes` / `buffer_after_minutes` (INT, default 0) | No buffer between bookings | Availability engine subtracts buffers |
| Deposit requirement | `services.deposit_config` (JSONB, nullable) | Full payment or free | Deposit amount/percentage applied |
| Cancellation policy | `services.cancellation_policy` (JSONB, nullable) | Default free cancellation 24h before start | Custom cancellation rules with late-cancel fees (see SRS-3 §2) |
| Workflow automation | `workflow_automations` rows per tenant | Only system defaults (confirmation email) | Custom automation stages execute |

### Business-Type Presets (Onboarding Only)

Presets are **one-time functions**, not persistent configuration. During onboarding, category selection triggers a function that writes concrete records:

```
applyPreset(tenant, category):
  // Writes real rows to availability_rules, workflow_automations, etc.
  // After execution, the preset is forgotten
  // The tenant has concrete data they can freely modify
  // Original category stored on tenant for analytics only
```

Preset definitions per category are application-level constants (see [BRD.md](BRD.md) Section 5, Business-Type Preset table).

### Dynamic Booking Flow Resolution

The booking flow steps for a service are resolved at runtime from the service's configured data:

```
resolveBookingSteps(service, tenant):
  steps = []
  if tenant.services.length > 1:    steps.push(SERVICE_SELECTION)
  // For multi-service tenants: at session creation, service_id is null and resolved_steps
  // contains only [SERVICE_SELECTION]. When the client selects a service (PATCH step update),
  // resolved_steps is re-resolved using the selected service's config and SERVICE_SELECTION
  // is prepended. The immutability guarantee (SRS-3 §20 Edge Case #12) applies from the
  // point of service selection onward — subsequent service config changes do not affect the session.
  if tenant.venues.length > 0 AND service.venue_id == null:
                                     steps.push(VENUE_SELECTION)
  // If service.venue_id is set, VENUE_SELECTION is auto-resolved (pre-filled) and skipped
  steps.push(DATE_TIME_PICKER)                          // always
  if service.guest_config != null:   steps.push(GUEST_COUNT)
  if service.intake_form_config:     steps.push(QUESTIONNAIRE)   // Phase 2 (FR-BFW-5); null in Phase 1
  if service.addons.length > 0:      steps.push(ADD_ONS)        // Phase 2 (FR-BFW-6); empty in Phase 1; see SRS-2 service_addons table
  if service.base_price > 0:         steps.push(PRICING_SUMMARY)  // includes discount/promo code entry field
  if service.contract_template_id:   steps.push(CONTRACT)         // Phase 2 (FR-BFW-9); null in Phase 1. Before payment: sign terms, then pay
  if tenant.payment_provider_onboarded && service.base_price > 0:
                                     steps.push(PAYMENT)
  steps.push(CONFIRMATION)                              // always
  return steps
```

A zero-config service (flat price, no guests, no contracts, no intake form) produces: **Date/Time -> Pricing Summary -> Payment -> Confirmation** (or just **Date/Time -> Confirmation** if free and no payment provider connected).

> **Privacy & terms acceptance:** The CONFIRMATION step includes a required checkbox: *"I agree to the [Terms of Service] and [Privacy Policy]."* This is not a separate booking step — it is embedded in the confirmation UI. On booking completion, a `consent_records` entry is created for `DATA_PROCESSING` with the user's IP address, user agent, and consent text version. For guest checkout (FR-BFW-17), this consent record is created alongside the silent user record (see SRS-3 §20 Edge Case #4). This satisfies GDPR Article 13 (information obligation) and provides an auditable consent trail via SRS-2 §11 `consent_records`.

> **Discount/promo code entry:** When a tenant has active discounts (see SRS-3 §9), the PRICING_SUMMARY step includes a promo code input field. Code validation uses `POST /api/discounts/validate` (SRS-2 §14). The discount is not a separate booking step -- it is part of the pricing summary UI. When no active `CODE_REQUIRED` discounts exist for the tenant, the promo code field is hidden. `AUTOMATIC` discounts are applied without user input.

### Progressive Disclosure in Admin CRM

The Admin CRM uses a consistent UI pattern across all management screens:

1. **Basic fields** are always visible (name, duration, price, availability hours)
2. **Advanced sections** are collapsible, closed by default (guest config, buffer times, tiered pricing, deposit policy, intake forms, contract linking)
3. **Inactive features** (null data) show a minimal empty state: one line of text explaining the feature + a setup link. No grayed-out forms or placeholder inputs.
4. **Contextual discovery**: when user behavior suggests a feature would help (e.g., 3 cancellations in a week), a non-intrusive prompt suggests configuring deposits

---

## 9. Deployment Environments

| Environment | Infrastructure | Trigger |
|-------------|---------------|---------|
| Local | Docker Compose (PostgreSQL, Redis), NestJS dev server, Next.js dev server, Expo Go | Manual (`pnpm dev`) |
| Preview | Vercel Preview Deployment + Fly.io preview app + shared staging DB | Pull request opened/updated |
| Staging | Fly.io staging app + Vercel staging + dedicated staging DB | Push to `develop` branch |
| Production | Fly.io production (multi-region) + Vercel production + production DB | Push to `main` branch |

---

## 10. CI/CD Pipeline

### Pipeline Flow

```
Install ──> Lint + Typecheck ──> Test ──> Build ──> Deploy
```

### Pipeline Steps

| Step | Command | Description |
|------|---------|-------------|
| Install | `pnpm install --frozen-lockfile` | Deterministic dependency install |
| Lint | `turbo run lint` | ESLint + Prettier across all packages |
| Typecheck | `turbo run typecheck` | `tsc --noEmit` across all packages |
| Unit Tests | `turbo run test` | Vitest unit + integration tests |
| E2E Tests | `turbo run test:e2e` | Playwright (web), Maestro (mobile) |
| Build | `turbo run build` | Build all apps and packages |
| Deploy API | `fly deploy --app savspot-api` | Deploy NestJS to Fly.io |
| Deploy Web | Vercel auto-deploy | Triggered by Git push |
| Deploy Mobile | `eas build --platform all` | Triggered manually or on release tag **(Phase 3)** |

### Database Migration Strategy

| Environment | Command | Strategy |
|-------------|---------|----------|
| Local | `prisma migrate dev` | Create + apply migrations interactively |
| Staging/Production | `prisma migrate deploy` | Apply pending migrations only |
| Fly.io | `fly.toml` `release_command` | Runs `prisma migrate deploy` before new instances start |
| Zero-downtime | Expand-and-contract | Add columns/tables first, backfill, then remove old columns in a subsequent release |

---

## 11. Testing Strategy

### Testing Pyramid

| Level | Tool | Scope | Coverage Target |
|-------|------|-------|-----------------|
| Unit | Vitest | Functions, services, utils, Zod schemas | 80%+ |
| Integration | Vitest + Prisma | API endpoints, database queries, service interactions | 70%+ |
| Component | Vitest + Testing Library | React components, hooks, form validation | 70%+ |
| E2E Web | Playwright | Full user flows (booking, payment, admin) | Critical paths |
| E2E Mobile | Maestro | Mobile user flows (booking, notifications) | Critical paths **(Phase 3)** |

### Test Data Strategy

| Strategy | Description |
|----------|-------------|
| Factory functions | TypeScript factories (e.g., `createTestBooking()`) for consistent test data |
| Seeded database | `prisma db seed` with representative multi-tenant data |
| Payment provider test mode | Provider-specific test keys (e.g., Stripe test API keys), test card numbers, test webhook events |
| Mocked services | Resend, Plivo, Expo Push mocked in test environment |
| Seed scripts | `pnpm db:seed` populates local/staging with realistic demo data |

---

## 12. Monitoring & Observability

| Concern | Tool | Details |
|---------|------|---------|
| Error Tracking | Sentry | Source maps, breadcrumbs, release tracking, user context |
| Application Metrics | PostHog | Funnel analysis, feature flag evaluation, session replay |
| Infrastructure Metrics | Fly.io Metrics | CPU, memory, disk, network per machine |
| Uptime | Fly.io Healthchecks + UptimeRobot | HTTP health endpoint (`/health`), 1-min interval |
| Logs | Fly.io Log Shipper | Structured JSON logs, shipped to Fly.io log drain |
| Alerting | Sentry Alerts + UptimeRobot | Error spike alerts, downtime alerts via Slack and email |
| Support Triage | Open Claw + Qwen3/Claude Code | 24/7 monitoring of `support_tickets` table; AI-powered L1 investigation and resolution; unresolvable tickets escalated to developer (BRD §8a, FR-SUP-3) |

---

## 13. Development Workflow

### Branch Strategy

| Branch | Purpose | Deploy Target | Merge Target |
|--------|---------|---------------|-------------|
| `main` | Production-ready code | Production | N/A |
| `develop` | Integration branch | Staging | `main` |
| `feature/*` | New features | Preview | `develop` |
| `hotfix/*` | Production bug fixes | Preview -> Production | `main` + `develop` |

### Code Quality Gates

| Gate | Tool | Description |
|------|------|-------------|
| Pre-commit hooks | Husky + lint-staged | Lint, format, typecheck changed files |
| CI checks | GitHub Actions | Full lint, typecheck, test suite on every PR |
| Commit messages | Conventional Commits | `feat:`, `fix:`, `chore:`, etc. enforced by commitlint |
| Code review | AI-assisted + manual | AI review for patterns, human review for logic and architecture |

### AI-Assisted Development

| Tier | Tool | Purpose |
|------|------|---------|
| **Complexity** | Claude Code (cloud) | Complex architecture, multi-file orchestration, PR review, system design decisions |
| **Volume** | Qwen3 on gmktec evo x2 128GB (local, Ollama + Continue.dev) | CRUD scaffolding, Prisma migrations, React components, Zod schemas, test factories, documentation |
| **Monitoring** | Open Claw (local, 24/7) | CI monitoring, deployment health, error tracking triage, support ticket triage and AI-powered L1 resolution (BRD §8a), development support |
| — | CLAUDE.md per package | Context files in each package root for AI assistant guidance |

---

## 14. Non-Functional Requirements

### 14.1 Performance Targets

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-PERF-1 | First Contentful Paint (booking pages) | < 2 seconds |
| NFR-PERF-2 | API response time (p95 reads / writes) | < 200ms reads, < 500ms writes |
| NFR-PERF-3 | Booking step transition (client-perceived) | < 300ms |
| NFR-PERF-4 | Search results (autocomplete + full search) | < 500ms |
| NFR-PERF-5 | Concurrent session support | 10,000+ concurrent sessions |

### 14.2 Scalability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-SCALE-1 | Multi-tenant capacity | 10,000+ businesses on shared infrastructure |
| NFR-SCALE-2 | Database read scaling | Horizontal read replicas via Fly.io |
| NFR-SCALE-3 | Job processing throughput | 1,000+ jobs/minute via BullMQ workers |
| NFR-SCALE-4 | Search performance at scale | Sub-second search across 100,000+ business listings |

### 14.3 Internationalization

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-I18N-1 | Date/time storage | UTC in database, always |
| NFR-I18N-2 | Date/time display | Timezone-aware rendering per business and client locale |
| NFR-I18N-3 | Currency support | 10+ currencies via payment providers (Stripe Phase 1, expanded coverage Phase 3+), stored as Decimal (major units / dollars); convert to minor units (cents) only at payment provider boundary |
| NFR-I18N-4 | String externalization | All user-facing strings externalized; ICU MessageFormat |
| NFR-I18N-5 | RTL layout | Infrastructure for right-to-left languages from day one |
| NFR-I18N-6 | Locale-aware formatting | Numbers, dates, times formatted per user locale |

> **Note:** v1 ships English-only. Internationalization infrastructure is built from day one to avoid retrofit costs.

### 14.4 Reliability (NFR-RELY)

| ID | Requirement | Target | Measurement |
|----|-------------|--------|-------------|
| NFR-RELY-1 | Platform uptime (excluding scheduled maintenance) | 99.5% monthly | UptimeRobot HTTP checks at 1-min intervals (SRS-1 §12) |
| NFR-RELY-2 | Scheduled maintenance window | Max 30 min, off-peak (02:00-06:00 UTC), announced 24h in advance | Fly.io deployment logs |
| NFR-RELY-3 | Recovery Time Objective (RTO) | ≤1 hour for full service restoration | Incident response timer |
| NFR-RELY-4 | Recovery Point Objective (RPO) | ≤1 hour of data loss | Backup recency (§14.5) |
| NFR-RELY-5 | Mean Time to Detect (MTTD) | ≤5 minutes | UptimeRobot + Sentry alert latency |

> **Phase 1 note:** 99.5% uptime ≈ 3.6 hours/month downtime allowance. This is appropriate for a bootstrap-stage platform. Target increases to 99.9% when monthly bookings exceed 10,000 (PVD §7 Year 1 target).

### 14.5 Backup & Disaster Recovery (NFR-DR)

| ID | Requirement | Specification |
|----|-------------|---------------|
| NFR-DR-1 | Automated database backups | Fly.io managed PostgreSQL daily snapshots (enabled by default) + WAL-based continuous archiving |
| NFR-DR-2 | Backup retention | 7 daily snapshots + 4 weekly snapshots (28-day retention) |
| NFR-DR-3 | Point-in-time recovery (PITR) | Fly.io PITR via WAL replay; granularity ≤5 minutes within retention window |
| NFR-DR-4 | Backup verification | Monthly restore test to staging environment; logged in ops runbook |
| NFR-DR-5 | R2 object storage durability | Cloudflare R2 provides 99.999999999% (11 nines) durability; no additional backup required for uploaded files |
| NFR-DR-6 | Redis data loss tolerance | Redis is a cache/session layer; all authoritative data is in PostgreSQL. Redis loss requires no recovery — sessions re-create on next request, BullMQ jobs retry from PostgreSQL state |

**Disaster Recovery Runbook (Phase 1):**

| Scenario | Procedure | RTO |
|----------|-----------|-----|
| API deployment failure | `fly deploy --image <previous-image>` to roll back to last known good image | ≤5 min |
| Database migration failure | Expand-and-contract pattern (§10) ensures backward compatibility; deploy previous API image that works with current schema | ≤15 min |
| Database corruption / data loss | Fly.io PITR restore to new cluster; update `DATABASE_URL`; verify data integrity; switch traffic | ≤1 hour |
| Full region outage | Fly.io multi-region (§9); traffic automatically routes to surviving region | Automatic |
| Redis failure | Restart Upstash instance; sessions and queues self-heal from PostgreSQL state | ≤5 min |

> **Cost note:** All backup capabilities listed above are included in Fly.io's managed PostgreSQL pricing. No additional infrastructure cost. Aligns with bootstrap constraint (BRD §8).

### 14.6 Deployment Rollback (NFR-ROLL)

**Rollback decision criteria:** Roll back if any of the following occur within 15 minutes of deployment:
1. Error rate exceeds 5% of requests (Sentry alert threshold, §12)
2. Health endpoint (`/health`) returns non-200 for >2 consecutive minutes (UptimeRobot)
3. Payment processing failures (any Stripe webhook errors not present pre-deployment)
4. Database migration causes query errors in application logs

**Rollback procedure:**

| Step | Command / Action | Notes |
|------|-----------------|-------|
| 1. Halt traffic | `fly scale count 0 --app savspot-api` | Prevents new requests during rollback |
| 2. Roll back API | `fly deploy --image <previous-image> --app savspot-api` | Fly.io retains previous release images |
| 3. Verify schema compatibility | Expand-and-contract (§10) ensures previous API version works with current schema | No migration rollback needed if expand-and-contract followed |
| 4. Restore traffic | `fly scale count <N> --app savspot-api` | Resume normal instance count |
| 5. Post-mortem | Document cause, update deployment checklist | Within 24 hours |

> **Migration rollback:** Because all schema changes follow expand-and-contract (§10), the previous API image is always compatible with the current database schema. Direct migration rollback (`prisma migrate rollback`) is a last resort reserved for data-destructive bugs; it requires manual verification and should be preceded by a PITR snapshot (§14.5, NFR-DR-3).

---

## Cross-References

- **Section 8 (Progressive Complexity):** The architectural foundation for how Savspot scales from individuals to SMBs. Referenced by SRS-2, SRS-3, and SRS-4 for data model optionality, dynamic booking flow resolution, and default automation behavior.
- **SRS-2 (Data Model):** Entity definitions, Prisma schema, enums, and relationships. Services table uses nullable JSONB fields per Section 8.
- **SRS-3 (Booking & Payments):** Booking lifecycle, availability engine, PaymentProvider integration (Stripe Connect Phase 1, multi-provider Phase 3+), scheduling rules. Pricing and availability engines adapt to configured data per Section 8.
- **SRS-4 (Communications, Security & Workflows):** Notifications, auth/authorization, calendar sync, webhooks, admin workflows. Default automations created by business-type presets per Section 8.