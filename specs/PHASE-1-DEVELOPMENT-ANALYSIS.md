# Savspot — Phase 1 Development Analysis & Approach

**Date:** March 2, 2026 | **Author:** Claude Code (Research Compilation)
**Purpose:** Evidence-backed analysis of Phase 1 development approach, tech stack findings, and implementation recommendations.

---

## 1. Executive Summary

Phase 1 (Months 1–2.5) delivers a web-only, multi-tenant booking SaaS platform with: business-type preset onboarding, dynamic booking flow engine, Stripe Connect Express payments (with offline fallback), Admin CRM with progressive disclosure, client portal, booking page, one-way + inbound calendar sync, transactional email/SMS, and platform admin CLI scripts. This analysis synthesizes findings from all 9 spec documents and current (March 2026) tech stack research to provide a concrete development approach.

---

## 2. Version Findings & Recommendations

### 2.1 Prisma: v7 Recommended (v6 Used for Sprint 1)

**Finding:** Prisma 7 was released November 19, 2025. It is now the current stable release.

> **Sprint 1 Note (March 2, 2026):** Sprint 1 was implemented with **Prisma 6** for stability. Migration to Prisma 7 can be done in a future sprint. The key difference is `prisma.config.ts` (v7) vs `package.json` config (v6), and the driver adapter requirement. The `$extends()` API used for multi-tenancy is available in both versions.

| Aspect | Prisma 6 (spec'd) | Prisma 7 (recommended) |
|--------|-------------------|----------------------|
| Client engine | Rust-based | TypeScript (Rust-free) |
| Bundle size | Baseline | **90% smaller** |
| Query execution | Baseline | **3x faster** |
| Type checking | Baseline | **70% faster** |
| ESM support | Preview | **Default (native ESM)** |
| Client extensions | Supported | Supported (middleware API removed — use extensions) |
| Config | `schema.prisma` + `package.json` | **`prisma.config.ts`** (new, TypeScript-native) |

**Breaking changes from the spec:** The `$use()` middleware API is removed in Prisma 7. The spec's multi-tenancy approach uses Prisma Client Extensions (`$extends()`), which are fully supported. The migration path is straightforward — one config line change. Prisma 7's ESM-first nature aligns better with the monorepo.

**Recommendation:** Target **Prisma 7** from the start. Update spec references from "Prisma 6+" to "Prisma 7+". The `prisma.config.ts` file replaces some `package.json` config.

### 2.2 NestJS 11: Confirmed Stable

**Finding:** NestJS 11 is stable with key improvements:

- **Module startup performance:** Overhauled opaque key generation using object references instead of hashing — significantly faster for large apps with dynamic modules
- **Express v5 support:** Wildcard routes need `/*splat` syntax (auto-converted in most cases)
- **CacheModule:** Updated to `cache-manager` v6 using `Keyv`
- **ConfigService:** Changed value reading order; `skipProcessEnv` option added
- **Lifecycle hooks:** `OnModuleDestroy`/`OnApplicationShutdown` order reversed (important for graceful shutdown of BullMQ workers)

**Gotcha:** The reversed lifecycle hook order means BullMQ worker cleanup needs to be verified — ensure workers drain before database connections close.

### 2.3 TypeScript: Target 5.8 (stable)

**Finding:** TypeScript 5.8 is stable. Key feature: `--erasableSyntaxOnly` flag enables direct Node.js execution of TypeScript files (Node 23.6+). TypeScript 5.9 is available but 5.8 is the proven stable choice.

**Recommendation:** Use TypeScript 5.8+ as spec'd. The `erasableSyntaxOnly` flag is relevant for CLI admin scripts — enables `node --experimental-strip-types` for faster script execution without a build step, though not critical for Phase 1.

### 2.4 Next.js 15: Confirmed

Next.js 15 with App Router is stable and well-supported on Vercel. No spec changes needed.

---

## 3. Infrastructure Cost Estimate (Bootstrap Phase)

### 3.1 Fly.io (API + Workers + PostgreSQL)

| Resource | Spec | Monthly Cost |
|----------|------|-------------|
| API Server | shared-cpu-2x, 1GB RAM | ~$8/mo |
| BullMQ Worker | shared-cpu-1x, 512MB RAM | ~$4/mo |
| PostgreSQL (self-managed) | shared-cpu-1x, 1GB RAM, 10GB volume | ~$5.50/mo |
| Dedicated IPv4 | Required for API | $2/mo |
| **Fly.io Subtotal** | | **~$20/mo** |

**Fly.io PostgreSQL options:**

| Option | Cost | Includes |
|--------|------|----------|
| Self-managed Fly Postgres | ~$5.50/mo (shared-cpu-1x, 1GB RAM, 10GB volume) | Full control, you own backups/failover |
| Managed Postgres (MPG) Basic | $38/mo + $0.28/GB storage | Auto backups, HA failover, connection pooling, 24/7 support |

**Recommendation for Phase 1:** Start with **self-managed Fly Postgres** (~$5.50/mo) during development and soft launch. This gives full control over PostgreSQL configuration (needed for RLS), WAL archiving for PITR, and dramatically lower cost. Migrate to MPG when scaling justifies the cost. The spec's PITR requirement (NFR-DR-3) is achievable on self-managed Fly Postgres by configuring WAL archiving manually.

**Alternative for PostgreSQL:** **Neon** (serverless Postgres with built-in PITR, free tier up to 0.5GB, pro at $19/mo) or **Supabase** (free tier, pro at $25/mo with PITR). Both support RLS natively.

### 3.2 Upstash Redis

| Plan | Monthly Cost | Notes |
|------|-------------|-------|
| Free tier | $0 | 256MB, 500K commands/month |
| Fixed $10 plan | $10/mo | 250MB, unlimited commands |

**Critical gotcha:** BullMQ polls Redis continuously even when idle. On Upstash's pay-as-you-go plan, this generates costs from background polling. **Must use a Fixed plan ($10/mo minimum)** for BullMQ workloads. The Free tier is suitable only for development.

### 3.3 Vercel (Next.js Frontend)

| Plan | Monthly Cost | Notes |
|------|-------------|-------|
| Hobby (personal) | $0 | Limited to personal, non-commercial use |
| Pro | $20/mo | Commercial use, preview deployments, analytics |

**Recommendation:** Start on Pro ($20/mo) since this is a commercial SaaS product. Hobby plan's terms prohibit commercial use.

### 3.4 Third-Party Services

| Service | Plan | Monthly Cost | Notes |
|---------|------|-------------|-------|
| Resend (email) | Free | $0 | 3,000 emails/mo, 100/day — sufficient for soft launch |
| Twilio (SMS) | Pay-as-you-go | ~$6-7/mo | ~$0.0095/SMS (incl. surcharges), phone $1.15/mo. **Requires A2P 10DLC registration** (~$19 one-time) |
| Cloudflare R2 | Free tier | $0 | 10GB storage, 1M write ops, 10M reads free |
| Sentry | Free tier | $0 | 5K errors/mo |
| PostHog | Free tier | $0 | 1M events/mo |
| Stripe | Per transaction | $0 fixed | 2.9% + $0.30 per transaction (paid by connected accounts) |
| Cloudflare (DNS/CDN) | Free | $0 | DNS and CDN |
| Google Calendar API | Free | $0 | Generous free quota |

### 3.5 Total Monthly Cost Estimate

| Phase | Monthly Cost |
|-------|-------------|
| Development (local) | ~$0 (Docker Compose) |
| Staging/Soft Launch | **~$58/mo** (self-managed PG) |
| Production (with Managed PG) | **~$90-110/mo** |

This aligns with the bootstrap constraint (BRD §8). The infrastructure costs are well under $200/mo for the initial phase.

---

## 4. Multi-Tenancy Implementation — Critical Findings

### 4.1 RLS + Prisma: The Proven Pattern

The spec's approach (RLS as database safety net + Prisma Client Extensions for application-layer filtering) is well-validated by multiple production implementations in 2024-2025.

**Recommended pattern (from `nestjs-prisma-postgres-tenancy` reference implementation):**

```
Request → NestJS Middleware → Extract tenant_id from JWT
  → SET LOCAL app.current_tenant = tenant_id (via $executeRaw in transaction)
  → Prisma Client Extension auto-filters all queries by tenant_id
  → PostgreSQL RLS provides defense-in-depth
```

**Key implementation detail:** Use `nestjs-cls` (Continuation-Local Storage) to propagate the tenant context through the request lifecycle without passing it through every function call. This is cleaner than request-scoped Prisma clients.

### 4.2 RLS Performance — Evidence-Based Findings

PostgreSQL RLS has measurable but manageable performance impact when implemented correctly:

- **Best case:** RLS policy compiles to an additional WHERE clause — negligible overhead
- **Worst case:** Subquery per row (exponential scaling) — avoidable with correct policy design
- **Benchmark data:** Simple `tenant_id = current_setting()` policy on 1M rows: ~31ms without RLS vs ~107ms with subquery RLS. With direct column comparison (the spec's approach), overhead is minimal.

**Critical optimization rules:**
1. **Index `tenant_id` on every tenant-scoped table** — without this, RLS forces sequential scans
2. **Use `current_setting()` (STABLE function)** — cached per transaction, evaluated once
3. **Never pass row data to functions in RLS policies** — causes per-row evaluation
4. **Mark helper functions as `LEAKPROOF`** where applicable — enables index usage through RLS

### 4.3 Prisma + Interactive Transactions + RLS — Known Issue

**Critical finding:** GitHub issue #23583 (March 2024, closed as NOT_PLANNED) documents that when using Prisma Client Extensions with `$allOperations` for RLS, interactive transactions can create nested transactions that break row-level locks (`SELECT ... FOR UPDATE`).

**Impact on Savspot:** The booking system uses pessimistic locking (SRS-3) for double-booking prevention. If the RLS extension wraps each query in its own transaction, `SELECT ... FOR UPDATE` locks won't persist across the interactive transaction.

**Workaround options:**
1. **Separate the RLS concern from the Prisma extension:** Use NestJS middleware to execute `SET LOCAL` directly on the raw connection before Prisma touches it, rather than wrapping each query in a transaction within the extension
2. **Use `nestjs-cls` + Prisma's `$transaction` (interactive mode):** Set the tenant context once at the start of the transaction, not per-query
3. **Bypass the extension for critical locking operations:** For booking slot reservation, use `$queryRaw` with explicit `SET LOCAL` + `SELECT ... FOR UPDATE` in a single interactive transaction

**Recommendation:** This is the most architecturally sensitive decision in Phase 1. The middleware-based approach (option 1) is safest — it avoids the nesting problem entirely by separating tenant context setting from Prisma's query pipeline.

---

## 5. Phase 1 Requirements Inventory

### 5.1 "Must" Requirements (Phase 1)

Extracted from PRD with cross-references to SRS documents. These are non-negotiable for Phase 1 launch.

#### Onboarding (6 Must items)
- FR-ONB-1: Two-phase guided setup (Phase A <5 min → live booking page)
- FR-ONB-2: Business type selection + preset function
- FR-ONB-3: Business profile (name, description, logo, cover photos, location, contact)
- FR-ONB-4: First service creation with minimal fields
- FR-ONB-5: Booking page live immediately after first service
- FR-ONB-8: Unique booking URL (`savspot.co/{slug}`)

#### Booking Flow (10 Must items)
- FR-BFW-1: Dynamic booking flow engine (step resolution algorithm)
- FR-BFW-2: Service/venue selection step
- FR-BFW-3: Date/time picker with real-time availability
- FR-BFW-4: Guest count step (when `guest_config` exists)
- FR-BFW-7: Pricing summary step (adapts to pricing model)
- FR-BFW-8: Payment step via Stripe Elements
- FR-BFW-10: Confirmation step with .ics download
- FR-BFW-11: Back/next navigation, progress indicator
- FR-BFW-12: Real-time availability check (double-booking prevention)
- FR-BFW-13: Reservation token system
- FR-BFW-18: Walk-in booking (Admin CRM Quick-Add)

#### Calendar Integration (8 Must items)
- FR-CAL-1: Google Calendar OAuth connection
- FR-CAL-3: Auto-create event on booking confirmation
- FR-CAL-4: Auto-update event on reschedule
- FR-CAL-5: Auto-delete event on cancellation
- FR-CAL-6: Calendar events include client name, service, time, location
- FR-CAL-7: Connect/disconnect from Admin CRM
- FR-CAL-8: Connection status indicator
- FR-CAL-9: Graceful expired-token handling
- FR-CAL-10: Read INBOUND calendar events to block availability (**moved to Phase 1**)

#### Payments (8 Must items)
- FR-PAY-1: PaymentProvider abstraction with Stripe Connect Express
- FR-PAY-2: Payment intent creation with platform fee
- FR-PAY-3: Deposit payments
- FR-PAY-4: Full payment at booking
- FR-PAY-6: Refund processing (full/partial)
- FR-PAY-7: Tenant-currency payment processing
- FR-PAY-10: Webhook handling for payment lifecycle
- FR-PAY-11: Platform referral commission calculation
- FR-PAY-12: Payout dashboard (link to Stripe dashboard)
- FR-PAY-14: Offline payment first-class path

#### Communications (3 Must items)
- FR-COM-1a: Basic transactional email via Resend (platform-default templates)
- FR-COM-2a: Provider SMS notifications via Twilio (new booking, cancellation, reschedule)
- FR-COM-4: Automated triggers (confirmed, cancelled, 24h reminder, 24h follow-up)

#### Auth & Security (8 Must items)
- FR-AUTH-1: Email/password registration and login
- FR-AUTH-2: Google OAuth login
- FR-AUTH-4: JWT RS256, 15-min access, 7-day refresh
- FR-AUTH-5: Token blacklisting on logout (Redis)
- FR-AUTH-6: Email verification
- FR-AUTH-7: Password reset via email link
- FR-AUTH-8: Two-tier RBAC (platform + tenant roles)
- FR-AUTH-10: API key auth for agents/integrations

#### Surfaces (Must items)
- **Booking Page:** FR-BP-1 through FR-BP-6 (branded page, mobile-responsive, OG tags)
- **Client Portal:** FR-CP-1, 2, 4, 5, 9, 10, 13, 14 (dashboard, booking detail, cancellation, payments, profile, history, GDPR export/deletion)
- **Admin CRM:** FR-CRM-1 through FR-CRM-7, 9, 10, 19, 21, 27 (dashboard, calendar, booking/client/service/venue/payment management, booking flow config, settings, branding, calendar settings, mobile calendar list)
- **Embed Widget:** FR-EMB-4 only (redirect mode — free tier)
- **Platform Admin:** FR-PADM-1 through FR-PADM-5, 7 (all CLI scripts)

#### Background Jobs (Must items — from SRS-3/SRS-4)
- `expireReservations` (every 5 min)
- `sendBookingReminders` (every 15 min)
- `processCompletedBookings` (hourly)
- `deliverCommunication` (event-driven)
- `deliverProviderSMS` (event-driven)
- `sendPaymentReminders` (every 15 min)
- `enforcePaymentDeadlines` (daily 6 AM)
- `enforceApprovalDeadlines` (every 15 min)
- `syncCalendarEvents` (every 15 min — for INBOUND calendar blocking)
- `cleanupRetentionPolicy` (daily 3 AM)

#### Non-Functional (Must items)
- NFR-PERF-1 through 5 (performance targets)
- NFR-ACC-1 through 5 (WCAG 2.1 AA accessibility)
- NFR-DR-1 through 6 (backup & disaster recovery)
- NFR-RELY-1 through 5 (99.5% uptime, RTO ≤1h, RPO ≤1h)

### 5.2 "Should" Requirements (Phase 1) — Include If Time Permits

These are high-value and many are important for the design partner scenario:

- FR-ONB-6: Post-setup prompts (non-blocking)
- FR-ONB-7: Payment provider onboarding (Stripe Connect Express)
- FR-ONB-10: Setup progress tracking with resume
- FR-ONB-12: Category selection telemetry
- FR-AUTH-3: Apple Sign-In
- FR-BFW-15: Booking flow preview mode
- FR-BFW-17: Guest checkout with optional account creation
- FR-BFW-19: Post-appointment rebooking prompt
- FR-CAL-11 through FR-CAL-15: Calendar sync options, manual sync
- FR-PAY-8: Invoice PDF generation
- FR-PAY-13: Failed payment retry
- FR-COM-10: Morning summary SMS
- FR-COM-11: Weekly digest email
- FR-NOT-6: Browser push notifications (Admin CRM)
- FR-CP-3: Booking modification request
- FR-CRM-5 (complexity indicators, service copy): Service management enhancements
- FR-CRM-11: Team management (invite, roles)
- FR-CRM-17: Discount/promo code management
- FR-CRM-18: Data import CLI (clients from Booksy/Fresha/etc.)
- FR-CRM-26: Business data export
- FR-CRM-27: Mobile-optimized calendar list view
- FR-CRM-28: Quick actions (mark arrived, completed, walk-in)
- FR-CRM-29: Client preferences
- FR-IMP-1: CLI-based client import
- FR-BP-7: QR code for booking URL
- FR-BP-9: JSON-LD structured data
- FR-FBK-1: In-app feedback widget
- FR-FBK-2, 3: Feedback lifecycle + developer queue
- FR-SUP-1 through FR-SUP-4: Support tickets + AI triage
- Legal compliance documents (ToS, Privacy Policy, DPA)

### 5.3 Requirement Count Summary

| Priority | Count |
|----------|-------|
| Must (Phase 1) | ~75 functional requirements + ~20 NFRs |
| Should (Phase 1) | ~40 functional requirements |
| Total Phase 1 scope | ~135 requirements |

---

## 6. Recommended Development Sequence

Based on dependency analysis across all spec documents:

### Sprint 1 (Week 1-2): Foundation — DONE (March 2, 2026)
1. **Monorepo scaffolding** — Turborepo + pnpm, `apps/api`, `apps/web`, `packages/shared`, `packages/ui` ✅
2. **Database setup** — Prisma 6 schema (75 models, 73 enums from SRS-2), RLS policies (48 tables), seed scripts ✅
3. **Docker Compose** — Local PostgreSQL 16 + Redis 7 dev environment ✅
4. **CI/CD** — GitHub Actions pipeline (lint, typecheck, test, build) ✅
5. ~~Auth module~~ — Deferred to Sprint 2 (foundation-only scope)
6. ~~Multi-tenancy middleware~~ — Deferred to Sprint 2 (foundation-only scope)

### Sprint 2 (Week 3-4): Core Domain — DONE (March 3, 2026)
6. **Auth module** — Email/password, Google OAuth, JWT RS256, email verification (Resend), password reset, token blacklisting
7. **Multi-tenancy middleware** — nestjs-cls, tenant context, RLS integration, Prisma Client Extensions
8. **Tenant/onboarding** — Business registration, preset functions, slug generation, preset application
9. **Service management** — CRUD with all JSONB fields, categories, venues, copy/duplicate
10. **Availability engine** — Rules CRUD, blocked dates, slot resolution algorithm (timezone-aware)
11. **Booking session** — State machine, step resolution, date reservation with pessimistic locking (`$queryRaw` + `SELECT ... FOR UPDATE`)
12. **Admin CRM frontend** — Auth pages, onboarding wizard, dashboard, service management, availability editor, settings, calendar stub

### Sprint 3 (Week 5-6): Booking Flow + Payments
11. **Dynamic booking flow engine** — Step resolution algorithm (SRS-1 §8)
12. **Booking page** — Branded page, service listing, "Book Now" flow
13. **Stripe Connect integration** — Express onboarding, PaymentProvider abstraction
14. **Payment processing** — Payment intents, deposits, refunds, webhooks
15. **Invoice generation** — Auto-create on booking confirmation
16. **Offline payment path** — Booking confirms without payment, manual mark-paid

### Sprint 4 (Week 7-8): Communications + Calendar
17. **Email system** — Resend integration, React Email templates (confirmation, receipt, reminder, follow-up)
18. **SMS system** — Twilio integration, provider notification SMS (FR-COM-2a)
19. **Google Calendar integration** — OAuth, event CRUD, INBOUND sync
20. **BullMQ workers** — All background jobs from SRS-3 §16 and SRS-4 §40-41
21. **Workflow automations** — Preset automations (confirmation, reminder, follow-up)

### Sprint 5 (Week 9-10): Client Portal + Admin CRM Completion
22. **Client portal** — Dashboard, booking detail, cancellation, payment management, profile
23. **Admin CRM completion** — All Must screens: calendar view, client management, payment management, booking flow config, settings, branding
24. **Walk-in booking** — Quick-Add from Admin CRM (FR-BFW-18)
25. **RBAC enforcement** — Guards, permission matrix (SRS-2 §3)
26. **Platform admin CLI scripts** — All FR-PADM-* requirements

### Sprint 6 (Week 11-12): Polish + Should Items + Testing
27. **Guest checkout** (FR-BFW-17)
28. **Data import CLI** (FR-IMP-1) — Critical for design partner
29. **Browser push notifications** (FR-NOT-6)
30. **Feedback widget** (FR-FBK-1)
31. **Support tickets** (FR-SUP-1)
32. **E2E testing** — Playwright for critical paths
33. **Performance optimization** — NFR-PERF targets
34. **Accessibility audit** — WCAG 2.1 AA
35. **Security hardening** — Rate limiting, CSRF, CSP headers
36. **Deployment pipeline** — CI/CD, staging environment

---

## 7. High-Risk Areas & Mitigations

### 7.1 Prisma + RLS Interactive Transaction Conflict (HIGH)
**Risk:** Pessimistic locking for double-booking prevention breaks when Prisma extensions wrap queries in nested transactions.
**Mitigation:** Use middleware-based `SET LOCAL` approach, not extension-based. Test booking concurrency thoroughly with load testing before launch.

### 7.2 Calendar INBOUND Sync Latency (MEDIUM)
**Risk:** Google Calendar polling-based sync has 15-20 min latency (SRS-3 references). For the design partner parallel-run, Booksy bookings synced via Google Calendar → SavSpot could have a window where double-booking is theoretically possible.
**Mitigation:** The spec acknowledges 20-45 min latency is acceptable for advance bookings (BRD §9, Assumption 7). Add "Sync Now" button (FR-CAL-15) for manual refresh. Document the latency window in design partner onboarding.

### 7.3 Fly.io Managed Postgres PITR Uncertainty (MEDIUM)
**Risk:** The new Fly.io MPG docs don't explicitly confirm WAL-based PITR. The spec requires PITR (NFR-DR-3).
**Mitigation:** Verify with Fly.io support. If unavailable, consider Neon ($19/mo pro with built-in PITR) or self-managed Fly Postgres with manual WAL archiving.

### 7.4 BullMQ + Upstash Redis Idle Polling Cost (LOW)
**Risk:** BullMQ polls Redis continuously, generating costs on pay-as-you-go plans.
**Mitigation:** Use Fixed plan ($10/mo). Already documented above.

### 7.5 Scope Creep from Should Items (MEDIUM)
**Risk:** 40+ Should items compete for time with Must items. The design partner scenario requires several Should items (data import, walk-in booking, provider SMS — though these are already Must).
**Mitigation:** Strict prioritization. Data import CLI, provider SMS, and walk-in booking are critical for the design partner and are already classified as Must/Should Phase 1. Defer lower-priority Should items (QR code, JSON-LD, Apple Sign-In) to post-soft-launch.

---

## 8. Stripe Connect Integration — Key Patterns

### 8.1 Account Type: Express
Express accounts provide the best balance of control and reduced onboarding burden. Stripe handles KYC, identity verification, and dashboard access.

### 8.2 Payment Flow (Destination Charges)
```
Client pays → Stripe creates PaymentIntent
  → transfer_data[destination] = connected_account_id
  → application_fee_amount = booking_total × 0.01 (1% platform fee)
  → For platform-sourced clients: add referral commission to application_fee_amount
  → Stripe processes: full amount → connected account → application fee back to platform
  → Platform pays Stripe's processing fee from its balance
```

### 8.3 Deposit Pattern

Two options:

**Option A — Manual Capture (Auth + Capture):**
Authorize the full amount with `capture_method: 'manual'`, then capture only the deposit amount. Remaining hold is released automatically. **Limitation:** Authorization holds expire after 7 days (card network rule). Not suitable for bookings far in advance.

**Option B — Two Separate PaymentIntents (Recommended):**
Create PaymentIntent #1 for the deposit amount at booking time. Use `SetupIntent` to save the customer's payment method. Create PaymentIntent #2 for the remaining balance closer to the appointment date. This avoids authorization hold expiry and is the standard pattern for booking platforms.

**Recommendation:** Use Option B for Phase 1. It's simpler, handles advance bookings correctly, and aligns with the spec's invoice-based tracking.

### 8.4 Webhook Events to Handle (Phase 1)
- `payment_intent.succeeded` → Confirm booking, send receipt
- `payment_intent.payment_failed` → Notify business, retry logic
- `account.updated` → Track Connect onboarding status
- `charge.refunded` → Update invoice, notify client

---

## 9. Google Calendar Integration — Implementation Notes

### 9.1 OAuth 2.0 Flow
Standard OAuth 2.0 with offline access (`access_type: 'offline'`) for refresh tokens. Store encrypted tokens in `calendar_connections` table.

### 9.2 INBOUND Sync (FR-CAL-10) — Critical for Design Partner
Poll Google Calendar API every 15 minutes (configurable via FR-CAL-12) for events in connected calendars. Create `calendar_events` records with `direction = INBOUND`, `booking_id = null`. The availability engine treats these as hard blocks — identical to confirmed SavSpot bookings.

### 9.3 Token Refresh
Google OAuth tokens expire after 1 hour. Use the stored refresh token to obtain new access tokens automatically. Track `last_synced_at` and `status` on `calendar_connections` to detect failures.

### 9.4 Push Notifications via Watch Channels

Google Calendar supports push notifications via `events.watch()` — Google sends a webhook when events change. This reduces sync latency from 15 min (polling) to near-real-time.

**Critical constraints:**
- Watch channels expire (max ~30 days). You **must** implement a renewal cron job.
- The webhook domain must be verified in Google Search Console.
- Push notifications are **opaque** — they don't include event data. You must call `events.list()` with a sync token to get actual changes.
- Handle `410 Gone` (expired sync token) by doing a full re-sync.

**Recommendation:** Implement watch channels for Phase 1 to minimize the parallel-run double-booking window. The added complexity is manageable and directly benefits the design partner scenario.

### 9.5 Google OAuth Verification

**Important:** While your OAuth app is in "testing" mode, tokens expire every 7 days and you are limited to 100 test users. Google's verification review for sensitive scopes (`calendar.events`) can take weeks. **Start the verification process early** — submit for review during Sprint 1-2, not right before launch.

---

## 10. Monorepo Structure — Practical Recommendations

### 10.1 Package Resolution
Use `pnpm` workspace protocol (`workspace:*`) for internal package references. Turborepo handles build ordering via `dependsOn` in `turbo.json`.

### 10.2 NestJS in Turborepo — Known Issue
NestJS module resolution can fail in Turborepo monorepos when internal packages don't properly set `main` and `types` fields in `package.json`. **Fix:** Ensure `packages/shared/package.json` has:
```json
{
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": { ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" } }
}
```

### 10.3 Shared Package (`packages/shared`)
Contains: Zod schemas (shared between client/server validation), TypeScript types/interfaces, constants (enums, business presets), utility functions. This is the most impactful code reuse in the monorepo — every Zod schema defined here is used by both the NestJS API (request validation) and the Next.js frontend (form validation).

### 10.4 turbo.json Pipeline
```json
{
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**", ".next/**"] },
    "dev": { "cache": false, "persistent": true },
    "lint": { "dependsOn": ["^build"] },
    "typecheck": { "dependsOn": ["^build"] },
    "test": { "dependsOn": ["^build"] }
  }
}
```

---

## 11. Data Model Scope (Phase 1)

From SRS-2, the Phase 1 schema includes approximately **40 tables**. Key entity groups:

| Group | Tables | Purpose |
|-------|--------|---------|
| Tenancy | `tenants`, `tenant_memberships`, `users` | Multi-tenancy, auth, RBAC |
| Services | `services`, `service_categories`, `venues`, `availability_rules`, `blocked_dates` | Service configuration, availability |
| Bookings | `bookings`, `booking_sessions`, `date_reservations`, `booking_addons` | Booking lifecycle |
| Payments | `invoices`, `invoice_items`, `payments`, `discounts` | Financial records |
| Calendar | `calendar_connections`, `calendar_events` | Google Calendar sync |
| Communications | `communications`, `booking_reminders` | Email/SMS tracking |
| Workflows | `workflow_automations` | Preset automations |
| Support | `support_tickets`, `feedback` | Customer support + feedback |
| Platform | `audit_logs`, `api_keys`, `consent_records`, `data_requests`, `import_jobs`, `import_records` | Operations, compliance |

---

## 12. Testing Strategy — Phase 1 Priorities

### 12.1 Critical Test Categories
1. **Multi-tenant isolation** — Verify RLS prevents cross-tenant data access (integration tests)
2. **Booking concurrency** — Verify double-booking prevention under concurrent requests (load tests)
3. **Payment flow** — End-to-end Stripe Connect flow with test keys (integration tests)
4. **Availability engine** — Edge cases: timezone boundaries, buffer times, INBOUND calendar blocking (unit tests)
5. **Booking state machine** — All valid transitions, rejection of invalid transitions (unit tests)

### 12.2 Testing Tools
- **Vitest** — Unit + integration tests (faster than Jest, TypeScript-native)
- **Playwright** — E2E web tests for critical booking flow
- **TestContainers** — Isolated PostgreSQL instances for integration tests with real RLS policies
- **Stripe test mode** — Test card numbers, test webhook events

---

## 13. Conclusion

The spec documents are exceptionally thorough and internally consistent. The tech stack choices are well-validated by the ecosystem as of March 2026, with one significant version update (Prisma 6 → 7) that should be adopted from the start. The most architecturally sensitive area is the Prisma + RLS + interactive transactions intersection, which has a known workaround. The infrastructure cost for bootstrap phase is manageable at ~$80-85/mo.

The 10-week development timeline (excluding Week 11-12 polish/testing) is ambitious but feasible for a solo developer with the described AI pipeline, given the LifePlace precedent of ~543K LOC in 6 months. The critical path runs through: monorepo scaffold → auth + multi-tenancy → availability engine → booking flow → payments → calendar sync → communications. Each sprint builds on the previous one with minimal parallelization dependencies.

**Top 3 actions for Sprint 2:**
1. Implement the auth module — registration, login, email verification, JWT RS256, Google OAuth
2. Implement multi-tenancy middleware — `nestjs-cls`, tenant resolution, RLS integration via Prisma Client Extensions
3. Build tenant onboarding flow — business registration, preset functions, slug generation

---

## 14. Sprint 1 Implementation Results

**Completed:** March 2, 2026 | **Scope:** Foundation only (auth + multi-tenancy deferred to Sprint 2)

### 14.1 Deviations from Original Plan

| Aspect | Planned | Actual | Reason |
|--------|---------|--------|--------|
| Prisma version | Prisma 7 | **Prisma 6** (^6.0.0) | Agent chose stable v6 for reliability; Prisma 7's `prisma.config.ts` and driver adapter patterns are newer with less community validation |
| TypeScript version | 5.8+ | **5.9.3** | Latest stable at time of implementation |
| Node.js version | 22 LTS | **24.2.0** | Already installed on developer machine |
| ESLint config | `.eslintrc.js` (legacy) | **`eslint.config.mjs`** (flat config) | ESLint 10 requires flat config format |
| Table count | ~40 tables | **75 models** | SRS-2 had more tables than initially estimated (includes junction tables, state history, etc.) |
| Enum count | ~35 enums | **73 enums** | More granular enum definitions than estimated |
| RLS tables | ~30 tables | **48 tables** | All tenant-scoped tables including junction and history tables |
| Sprint 1 scope | Foundation + Auth + Multi-tenancy | **Foundation only** | User decision to keep Sprint 1 focused; auth deferred to Sprint 2 |
| @nestjs/swagger | ^8.0.0 | **^11.0.0** | Version 8 had peer dependency mismatch with NestJS 11 |

### 14.2 Final Verification Results

| Check | Status | Details |
|-------|--------|---------|
| Docker services | ✅ Healthy | PostgreSQL 16 + Redis 7 both healthy |
| `pnpm install` | ✅ Clean | All 5 workspace packages resolved |
| `pnpm db:generate` | ✅ Pass | 75 models generated |
| `pnpm db:migrate:dev` | ✅ Pass | 2 migrations: init + rls_and_search |
| `pnpm db:seed` | ✅ Pass | 3 tenants, 11 users, 5 memberships, 6 services, 14 availability rules, 10 bookings |
| `pnpm lint` | ✅ Pass | All 5 packages lint clean |
| `pnpm typecheck` | ✅ Pass | All 5 packages typecheck clean |
| `pnpm test` | ✅ Pass | 3 tests pass (API health controller), shared/web pass with no tests |
| `pnpm build` | ✅ Pass | All 5 packages build successfully |
| Health endpoint | ✅ 200 OK | `GET /health` returns `{"status":"ok","timestamp":"...","version":"0.1.0"}` |
| RLS enabled | ✅ 48 tables | Verified via `pg_tables WHERE rowsecurity=true` |
| Search triggers | ✅ 3 tables | tenants, services, venues — weighted tsvector (name='A', description='B') |
| GIN indexes | ✅ 6 indexes | search_vector GIN + name trigram GIN on tenants, services, venues |

### 14.3 Issues Encountered & Resolutions

1. **Local PostgreSQL 14 port conflict** — Homebrew postgres was running on port 5432, conflicting with Docker. Fixed with `brew services stop postgresql@14`.
2. **RLS migration `::UUID` cast error** — tenant_id columns are Prisma `String` (text), not UUID. Removed `::UUID` cast from all `current_setting()` calls.
3. **RLS migration `gin_trgm_ops` error** — Shadow database didn't have pg_trgm extension. Added `CREATE EXTENSION IF NOT EXISTS "pg_trgm"` to migration SQL.
4. **NestJS build output path** — `rootDir: "."` caused build output to `dist/src/`. Fixed by setting `rootDir: "./src"` in `tsconfig.build.json`.
5. **NestJS ESM module resolution** — `tsconfig.base.json` uses ESNext modules but NestJS needs CommonJS. Fixed by overriding `module: "commonjs"` and `moduleResolution: "node"` in API tsconfig.
6. **ESLint 10 flat config** — ESLint 10 doesn't support `.eslintrc.js`. Migrated to `eslint.config.mjs` with `@eslint/js` + `typescript-eslint` unified package.

### 14.4 Workspace Package Summary

| Package | Path | Build Output | Key Dependencies |
|---------|------|-------------|-----------------|
| @savspot/api | apps/api/ | dist/ (CommonJS) | NestJS 11, @nestjs/swagger 11, vitest |
| @savspot/web | apps/web/ | .next/ | Next.js 15, React 19, Tailwind CSS 4 |
| @savspot/shared | packages/shared/ | dist/ (ESM) | Zod 3.23 |
| @savspot/ui | packages/ui/ | dist/ (ESM) | React 19, clsx, tailwind-merge |
| @savspot/prisma | prisma/ | N/A (generated) | Prisma 6, @prisma/client 6 |

### 14.5 Lessons Learned for Sprint 2

1. **Prisma 6 vs 7:** Using Prisma 6 means the `$use()` middleware API is still available, but should NOT be used — Prisma Client Extensions (`$extends()`) are the forward-compatible approach for multi-tenancy.
2. **NestJS + ESM:** NestJS still requires CommonJS module output. The API tsconfig must override the base config's ESNext module setting. This may change in NestJS 12+.
3. **ESLint flat config:** All packages share the root `eslint.config.mjs`. Package-specific rules can be added with directory-scoped overrides.
4. **Vitest `passWithNoTests`:** Packages without test files need `passWithNoTests: true` in vitest config to avoid CI failures.
5. **tenant_id type:** The Prisma schema uses `String` for tenant_id (Prisma's UUID maps to text). RLS policies must NOT cast `current_setting()` to UUID — use plain text comparison.

---

## 15. Sprint 2 Implementation Results

**Started:** March 2, 2026 | **Completed:** March 3, 2026 | **Status:** Done | **Scope:** Core domain layer

Sprint 2 delivers all zero-to-one business logic: authentication, multi-tenancy, tenant onboarding, service management, availability engine, booking session state machine, and a working Admin CRM frontend. This is the critical path — Sprints 3-6 cannot begin without Sprint 2's outputs.

### 15.1 Execution Strategy

Work was organized into 5 parallel waves with specialized sub-agents:

| Wave | Scope | Status | Duration |
|------|-------|--------|----------|
| Wave 1 | Shared Infrastructure (Prisma, Redis, Upload, TenantContext, Common) | ✅ Done | Sequential |
| Wave 2 | Auth Module (backend) + Frontend Scaffolding (parallel) | ✅ Done | 2 parallel agents |
| Wave 3 | Tenants + Services backend + Onboarding/Services UI (parallel) | ✅ Done | 2 parallel agents |
| Wave 4 | Availability Engine + Booking Sessions + Remaining Frontend (parallel) | ✅ Done | 2 parallel agents |
| Wave 5 | Integration wiring, lint/typecheck/test/build verification | ✅ Done | Sequential |

### 15.2 Modules Delivered

#### Infrastructure (Wave 1)
- **PrismaModule** — Global module wrapping PrismaClient with lifecycle hooks. Import path: `../../../../prisma/generated/prisma` (relative, since path aliases don't resolve at NestJS tsc runtime)
- **RedisModule** — Global ioredis wrapper (get, set, setex, del, exists, expire). Reads `REDIS_URL` from ConfigService
- **UploadModule** — Cloudflare R2 presigned URL generation via `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`
- **TenantContextModule** — `nestjs-cls` + middleware that extracts tenantId from JWT or URL params, stores in CLS, executes `SELECT set_config('app.current_tenant', tenantId, TRUE)`
- **PrismaTenantExtension** — `$extends()` with `$allModels.$allOperations` for defense-in-depth tenant filtering. NOT used for booking reservation per architecture decision
- **Common utilities** — 5 decorators (`@CurrentUser`, `@CurrentTenant`, `@Roles`, `@TenantRoles`, `@Public`), 3 guards (JWT global, platform roles, tenant roles), exception filter, transform interceptor, UUID validation pipe

#### Authentication (Wave 2)
- **JWT RS256** — 15-min access token, 7-day refresh with rotation, token blacklisting via Redis (`token:blacklist:{jti}` with TTL)
- **Token management** — Ephemeral RSA keypair generated at startup if `JWT_PRIVATE_KEY_BASE64`/`JWT_PUBLIC_KEY_BASE64` not provided (dev only)
- **Email/password auth** — bcrypt 12 rounds, email verification via HMAC-SHA256 signed tokens (24h expiry), password reset via UUID token in Redis (1h TTL)
- **Google OAuth** — passport-google-oauth20 strategy, handles missing config gracefully, account linking for existing email users
- **Email delivery** — Resend integration with console.log fallback when `RESEND_API_KEY` not set
- **Users module** — `GET/PATCH /api/users/me` with sanitized output (strips passwordHash, mfaSecret, mfaRecoveryCodes)

#### Tenants + Services (Wave 3)
- **Tenant CRUD** — Create with OWNER membership, slug generation (dedup with `-2`, `-3` suffixes), preset application
- **Preset application** — Dynamic import of `@savspot/shared` BUSINESS_PRESETS (ESM→CJS bridge), transactional creation of services + availability rules + workflow automations
- **Service CRUD** — Full CRUD with all nullable JSONB fields (guestConfig, tierConfig, depositConfig, intakeFormConfig, cancellationPolicy), copy/duplicate endpoint, soft-delete
- **Service Categories** — Standard CRUD with hard delete
- **Venues** — CRUD with JSON address/images fields, soft-delete
- **TenantRolesGuard enhancement** — Now resolves tenantId from route params (`:tenantId` or `:id`) before falling back to JWT payload

#### Availability Engine + Booking Sessions (Wave 4)
- **Availability Service** — Slot resolution algorithm: loads service duration/buffers, availability rules (service-specific → tenant-wide fallback), blocked dates, existing bookings, HELD reservations; generates non-conflicting slots for date range
- **Availability Rules Service** — CRUD with day-of-week, start/end times, service/venue scoping, active toggle
- **Blocked Dates Service** — CRUD with date range, reason, service/venue scoping
- **Booking Sessions Service** — Session lifecycle: create (IN_PROGRESS), update (step/data), abandon (release reservations), complete (create booking in transaction). Dynamic step resolution based on service config
- **Reservation Service** — Pessimistic locking via `$transaction` + `$queryRaw` + `SELECT ... FOR UPDATE`. Checks both `date_reservations` (HELD) and `bookings` (CONFIRMED/IN_PROGRESS/PENDING) for conflicts. Creates reservation with 5-minute expiry and UUID token
- **Session State Machine** — `IN_PROGRESS → COMPLETED` (booking created) or `IN_PROGRESS → ABANDONED` (reservations released). Dynamic step types: SERVICE_SELECTION (if multi-service), VENUE_SELECTION (if venues exist), GUEST_COUNT (if guestConfig), DATE_TIME_PICKER, PRICING_SUMMARY, CONFIRMATION (always)

#### Frontend Scaffolding (Wave 2)
- **Auth pages** — Login, register, verify-email, forgot-password, reset-password
- **Auth components** — Login form (react-hook-form + zod), register form (password strength validation), Google OAuth button
- **Dashboard shell** — Sidebar navigation, header with mobile menu toggle, mobile slide-over nav
- **UI components** — 12 shadcn/ui-pattern components (input, label, card, badge, skeleton, separator, avatar, textarea, select, table, tabs, dialog)
- **Infrastructure** — API client with auto 401→refresh, auth context provider, query provider (TanStack Query), route protection middleware

#### Frontend Pages (Waves 3-4)
- **Onboarding Wizard** — 3-step flow: business type selection (6 categories) → business profile form (name, timezone, country, currency) → review & create. Creates tenant + applies business preset
- **Dashboard** — Stats cards (services, active services, availability rules, bookings), quick action links, onboarding CTA when no tenant
- **Services Management** — List with table (name, duration, price, status, actions), create form, edit form with all JSONB fields, deactivate action
- **Settings Hub** — Navigation to profile, availability, notifications, billing, appearance
- **Business Profile Settings** — Edit tenant name, description, timezone, country, currency, contact info
- **Availability Schedule Editor** — List rules by day/time, add rule form (day, start, end), toggle active/inactive, delete rules
- **Calendar Stub** — Day/week/month view selector, placeholder content
- **Clients List** — Search bar, empty state with CTA, table structure ready for bookings

### 15.3 API Endpoints Implemented

```
# Auth
POST   /api/auth/register           201 { user, tokens }
POST   /api/auth/login              200 { user, tokens, memberships }
POST   /api/auth/logout             200
POST   /api/auth/refresh            200 { user, tokens }
POST   /api/auth/verify-email       200
POST   /api/auth/forgot-password    200
POST   /api/auth/reset-password     200
PATCH  /api/auth/change-password    200
GET    /api/auth/google             302 → Google
GET    /api/auth/google/callback    302 → Frontend

# Users
GET    /api/users/me                200 { user }
PATCH  /api/users/me                200 { user }

# Tenants
POST   /api/tenants                 201 { tenant }
GET    /api/tenants/:id             200 { tenant }
PATCH  /api/tenants/:id             200 { tenant }
POST   /api/tenants/:id/apply-preset 200 { counts }

# Services
GET    /api/tenants/:tenantId/services          200 [services]
POST   /api/tenants/:tenantId/services          201
GET    /api/tenants/:tenantId/services/:id      200
PATCH  /api/tenants/:tenantId/services/:id      200
DELETE /api/tenants/:tenantId/services/:id       204
POST   /api/tenants/:tenantId/services/:id/copy 201

# Service Categories
GET    /api/tenants/:tenantId/service-categories       200
POST   /api/tenants/:tenantId/service-categories       201
PATCH  /api/tenants/:tenantId/service-categories/:id   200
DELETE /api/tenants/:tenantId/service-categories/:id   204

# Venues
GET    /api/tenants/:tenantId/venues         200
POST   /api/tenants/:tenantId/venues         201
PATCH  /api/tenants/:tenantId/venues/:id     200
DELETE /api/tenants/:tenantId/venues/:id     204

# Availability
GET    /api/tenants/:tenantId/availability              200 [slots]
GET    /api/tenants/:tenantId/availability-rules        200 [rules]
POST   /api/tenants/:tenantId/availability-rules        201
PATCH  /api/tenants/:tenantId/availability-rules/:id    200
DELETE /api/tenants/:tenantId/availability-rules/:id    204
POST   /api/tenants/:tenantId/blocked-dates             201
DELETE /api/tenants/:tenantId/blocked-dates/:id          204

# Booking Sessions
POST   /api/booking-sessions                201 { session }
GET    /api/booking-sessions/:id            200 { session }
PATCH  /api/booking-sessions/:id            200 { session }
POST   /api/booking-sessions/:id/reserve    201 { reservation }
POST   /api/booking-sessions/:id/release    200
POST   /api/booking-sessions/:id/complete   201 { booking }

# Upload
POST   /api/upload/presigned-url    200 { uploadUrl, publicUrl }
```

**Total: 40 API endpoints** (10 auth + 2 users + 4 tenants + 10 services/categories + 5 venues + 7 availability + 6 booking sessions + 1 upload)

### 15.4 Issues Encountered & Resolutions

| # | Issue | Resolution |
|---|-------|------------|
| 1 | **DTO definite assignment (TS2564)** — Strict TS requires `!` on class properties | Added `!` to all DTO class fields (e.g., `email!: string`) |
| 2 | **Missing @types/jsonwebtoken** — `Cannot find module 'jsonwebtoken'` | Installed `@types/jsonwebtoken` as dev dependency |
| 3 | **jwt.sign() type mismatch (TS2769)** — Newer `@types/jsonwebtoken` expects `StringValue` for `expiresIn` | Cast: `expiresIn: this.accessExpiry as unknown as number, } as jwt.SignOptions` |
| 4 | **Lint errors from destructuring unused vars** — `const { passwordHash, ...safe } = user` triggers `@typescript-eslint/no-unused-vars` | Replaced with `delete result['passwordHash']` pattern |
| 5 | **Google OAuth callback broken** — Tried to call `authService.login()` which requires password | Added `loginGoogleUser(userId)` method to AuthService |
| 6 | **@savspot/shared ESM→CJS import** — API is CJS, shared is ESM-only. `moduleResolution: "node"` can't resolve ESM exports | Added `@savspot/shared` as workspace dependency (types resolve via top-level `"types"` field), runtime uses `await import()` |
| 7 | **Prisma schema field name mismatches** — Sub-agent used `basePriceCents` (Int), schema has `basePrice` (Decimal) | Fixed all DTOs and services to use `basePrice` (Decimal), proper field names from schema |
| 8 | **WorkflowAutomation schema mismatch** — No `name` or `delayMinutes` fields exist | Store description and delay in `actionConfig` JSON field |
| 9 | **AvailabilityRule time fields** — `@db.Time()` maps to Date, not string | Convert "HH:mm" strings to `new Date(1970, 0, 1, hours, minutes)` |
| 10 | **JSON type casting** — `Record<string, unknown>` not assignable to Prisma `InputJsonValue` | Explicit cast: `dto.field as Prisma.InputJsonValue` |
| 11 | **Web missing DOM lib** — Base tsconfig has `lib: ["ES2022"]` without DOM types | Added `"lib": ["ES2022", "DOM", "DOM.Iterable"]` to web tsconfig |
| 12 | **noPropertyAccessFromIndexSignature** — `process.env.X` requires bracket notation | Changed to `process.env['NEXT_PUBLIC_API_URL']` |
| 13 | **Tailwind CSS 4 `@apply` fails** — `border-border` not recognized as utility in `globals.css` build | Added `@theme inline {}` block to register CSS variables as Tailwind theme values (e.g., `--color-border: hsl(var(--border))`) |
| 14 | **Next.js 15 `useSearchParams()` SSG error** — Static generation fails without Suspense boundary | Wrapped `useSearchParams()` components in `<Suspense>` with loading fallback (verify-email, reset-password pages) |
| 15 | **Seed script path double-nesting** — `tsx prisma/seed/index.ts` in `prisma/package.json` resolves to `prisma/prisma/seed/index.ts` | Fixed to `tsx seed/index.ts` (working directory is already `prisma/`) |
| 16 | **Migration name not propagating** — `pnpm db:migrate:dev -- --name X` loses the `--name` flag through pnpm filter chain | Run directly: `cd prisma && npx prisma migrate dev --name sprint2_core_domain` |
| 17 | **14 web lint errors** — Unused imports (Table components, lucide icons) and empty interfaces in UI components | Removed unused imports, converted `interface Foo extends Bar {}` to `type Foo = Bar` |

### 15.5 Key Technical Decisions

1. **ESM/CJS bridge pattern** — The `@savspot/shared` package is ESM-only (`"type": "module"`), while the NestJS API uses CJS (`moduleResolution: "node"`). Resolution: `import type` for types (erased at compile time), `await import()` for runtime values (works in CJS to load ESM). This avoids requiring a dual CJS/ESM build of the shared package.

2. **Prisma import path** — Using relative paths (`../../../../prisma/generated/prisma`) rather than tsconfig path aliases, since path aliases don't resolve in NestJS tsc build output at runtime.

3. **JSON field handling** — All nullable JSONB columns use explicit `Prisma.InputJsonValue` casts. For updates, build `Prisma.ServiceUpdateInput` objects field-by-field instead of spreading DTOs (which would include non-Prisma fields).

4. **TenantRolesGuard param resolution** — Enhanced to resolve tenantId from route params (`:tenantId` or `:id`) before falling back to JWT `tenantId` claim. This enables nested resource routes like `/tenants/:tenantId/services`.

5. **Auth token flow** — Access tokens in memory (ApiClient class), refresh tokens in localStorage. Next.js middleware checks a `savspot-has-session` cookie (set by client-side AuthProvider) for route protection — middleware can't access localStorage.

6. **Sanitize user pattern** — Uses `delete result['field']` instead of destructuring to avoid TypeScript lint errors with unused variables.

### 15.6 Dependencies Added

**API (`apps/api`):**
```
# Runtime
@nestjs/passport passport passport-jwt passport-local passport-google-oauth20
jsonwebtoken bcryptjs nestjs-cls ioredis uuid cookie-parser resend
@aws-sdk/client-s3 @aws-sdk/s3-request-presigner @savspot/shared

# Dev
@types/bcryptjs @types/ioredis @types/uuid @types/cookie-parser
@types/passport-jwt @types/passport-local @types/passport-google-oauth20
@types/jsonwebtoken
```

**Web (`apps/web`):**
```
@tanstack/react-query react-hook-form @hookform/resolvers zod lucide-react
```

### 15.7 Environment Variables Added

```env
# JWT (required for production, auto-generated in dev)
JWT_PRIVATE_KEY_BASE64=
JWT_PUBLIC_KEY_BASE64=
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Google OAuth (optional — disabled if not set)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback

# Resend Email (optional — falls back to console.log)
RESEND_API_KEY=
RESEND_FROM_EMAIL=noreply@savspot.co

# Cloudflare R2 (optional — upload disabled if not set)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=
```

### 15.8 Verification Results

All monorepo checks pass:

| Check | Packages | Status |
|-------|----------|--------|
| `pnpm lint` | 5/5 | ✅ Pass (0 errors) |
| `pnpm typecheck` | 5/5 | ✅ Pass (0 errors) |
| `pnpm test` | 5/5 | ✅ Pass (484 tests: 444 shared + 12 UI + 28 API) |
| `pnpm build` | 5/5 | ✅ Pass (API: NestJS, Web: 18 Next.js pages) |

**Database:** Migration `sprint2_core_domain` applied, seed data loaded (11 users, 3 tenants, 6 services, 14 availability rules, 10 bookings).

### 15.9 Frontend Pages Delivered

| Route | Type | Purpose |
|-------|------|---------|
| `/login` | Static | Email/password login form |
| `/register` | Static | Registration with password strength validation |
| `/forgot-password` | Static | Request password reset email |
| `/reset-password` | Static | Set new password (from email link) |
| `/verify-email` | Static | Auto-verify email token from link |
| `/onboarding` | Static | 3-step business setup wizard |
| `/dashboard` | Static | Stats cards, quick actions, onboarding CTA |
| `/services` | Static | Service list with table, deactivate action |
| `/services/new` | Static | Create service form |
| `/services/[id]` | Dynamic | Edit service form |
| `/calendar` | Static | Day/week/month view stub |
| `/clients` | Static | Client list with search |
| `/settings` | Static | Settings navigation hub |
| `/settings/profile` | Static | Edit business profile |
| `/settings/availability` | Static | Weekly schedule rule editor |

### 15.10 Production Deployment TODO (Future)

The following configuration is required before production deployment and was intentionally deferred from Sprint 2 (development-only scope):

**Critical — Required for production:**
- [ ] Generate and persist JWT RS256 keypair (`JWT_PRIVATE_KEY_BASE64`, `JWT_PUBLIC_KEY_BASE64`) in production secrets manager
- [ ] Configure production PostgreSQL (`DATABASE_URL`) — Fly.io self-managed or managed
- [ ] Configure production Redis (`REDIS_URL`) — Upstash Fixed plan ($10/mo)
- [ ] Set `WEB_URL` to production frontend domain (used for CORS + email links)
- [ ] Set `NEXT_PUBLIC_API_URL` to production API domain
- [ ] Configure Resend (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`) with verified sending domain

**Recommended — Enables features:**
- [ ] Configure Google OAuth (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`) with production redirect URI
- [ ] Configure Cloudflare R2 (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`) for file uploads

**Infrastructure — Sprint 6 scope:**
- [ ] Fly.io deployment (API + Workers)
- [ ] Vercel Pro deployment (Next.js frontend)
- [ ] CI/CD pipeline with staging environment
- [ ] Rate limiting, CSRF protection, CSP headers
- [ ] Monitoring and alerting setup
