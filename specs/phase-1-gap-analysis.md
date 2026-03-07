# Phase 1 Gap Analysis & Implementation Plan

**Date:** 2026-03-06 | **Updated:** 2026-03-07
**Completion estimate:** Phase 1 COMPLETE — all Must gaps closed, all Should gaps addressed (785 tests at Round 2 closure; 920 tests at final Phase 1 completion)

---

## 1. What's Done

The core platform is solidly implemented across 27 API modules, 30+ frontend pages, 18 background job processors, 7 admin CLI scripts, and 75 Prisma models with 6 migrations applied.

### Fully Implemented Systems
- **Auth**: Email/password, Google OAuth, JWT RS256 rotation (15-min access / 7-day refresh), token blacklisting (Redis), email verification, password reset, two-tier RBAC (platform + tenant roles), API key auth (SHA-256 hashed, prefix lookup)
- **Multi-tenancy**: PostgreSQL RLS (authoritative) + Prisma Client Extension (defense-in-depth, 38 models) + nestjs-cls tenant context
- **Onboarding**: 3-step wizard (business type, profile, confirm), 6 business presets with default services/availability/workflows, slug generation with uniqueness
- **Services**: Full CRUD with JSONB progressive configs (guest, tier, deposit, intake form, cancellation policy)
- **Service Categories**: Full CRUD
- **Venues**: Full CRUD with availability rules
- **Availability**: Slot resolution algorithm (rules, blocked dates, existing bookings, held reservations, inbound calendar events), rules CRUD, blocked dates CRUD
- **Booking Sessions**: Dynamic step resolution from service config, guest checkout with passwordless user creation, payment processing via Stripe PaymentIntent
- **Slot Reservation**: Pessimistic locking via raw SQL `SELECT ... FOR UPDATE` in interactive transactions
- **Bookings**: Full state machine (PENDING->CONFIRMED->IN_PROGRESS->COMPLETED, CANCELLED, NO_SHOW), walk-ins (commission-free, bypasses PENDING), all transitions logged to BookingStateHistory
- **Payments**: Stripe Connect Express (destination charges + application_fee_amount), payment intents, full/partial refunds, offline payment path, webhook handling (payment_intent.succeeded/failed, account.updated)
- **Invoices**: Sequential numbering (INV-YYYYMM-0001), line items from service, payment status tracking
- **Clients CRM**: Search, tag filtering, aggregated stats via raw SQL (total bookings, revenue, last visit, no-show count)
- **Calendar**: Google Calendar OAuth, AES-256-GCM token encryption, event CRUD, incremental sync (syncToken), push notifications (watch channels), token refresh
- **Communications**: 9 HTML email templates via Resend with tenant branding, BullMQ delivery
- **SMS**: Twilio integration for provider notifications
- **Workflow Engine**: Event-driven automations (@OnEvent), SEND_EMAIL/SMS/NOTIFICATION/PUSH actions with delay support
- **Notifications**: In-app CRUD, unread count, notification bell (polls every 30s)
- **Browser Push**: VAPID-based Web Push, subscription management, BullMQ delivery
- **Discounts**: Full CRUD with validation (active, date range, usage limit, min amount)
- **Team Management**: Invitations, role management (ADMIN/STAFF), service assignment
- **Notes**: Polymorphic notes (CLIENT, BOOKING entities)
- **Support Tickets**: Submission, listing, status tracking
- **Feedback**: Submission widget with type categorization (FEATURE_REQUEST, UX_FRICTION, COMPARISON_NOTE, GENERAL)
- **File Upload**: Cloudflare R2 presigned URLs + confirm flow
- **Client Portal**: 6 pages (dashboard, bookings, booking detail with cancellation, payments, profile, settings/GDPR)
- **Admin CRM**: Dashboard, bookings list + detail, calendar (day/week/month/agenda), clients list + detail, services CRUD, payments, 9 settings pages
- **Booking Page**: Public page at /book/{slug} with hero, service cards, full booking wizard (8 steps), Stripe Elements, .ics download, OG/Twitter meta tags
- **Embed Widget**: Redirect mode with customizable button (IIFE script)
- **Landing Page**: Full marketing page with hero, features, CTA
- **Background Jobs**: 18 processors across 6 queues (bookings, payments, calendar, communications, invoices, gdpr) with cron scheduling
- **Rate Limiting**: Global throttler (60/60s) + per-endpoint overrides (auth: 3-5/60s), webhook exemption
- **Security**: SecurityHeadersMiddleware (X-Frame-Options), AllExceptionsFilter, TransformInterceptor
- **CLI Scripts**: list-tenants, revenue-summary, dead-letter, manage-roles, suspend-tenant, platform-config, import-clients
- **Tests**: 24 API specs, 7 E2E tests, 3 package tests
- **Shared Package**: 12 enum files, business presets, booking steps, shared types

---

## 2. Verified Gaps

Each gap verified against exact spec text with priority classification.

### 2.1 Phase 1 Must (blocking launch)

| # | Gap | Spec Reference | What Exists | What's Missing |
|---|-----|----------------|-------------|----------------|
| M1 | Tax Rates CRUD | SRS-2 line 940: `GET\|POST /api/tenants/:id/tax-rates, PATCH\|DELETE /api/tax-rates/:id` | Prisma model + RLS extension entry | API module (controller, service, DTOs), frontend settings page |
| M2 | Consent Records | SRS-1 Section 8: "On booking completion, a consent_records entry is created for DATA_PROCESSING"; SRS-2 line 946: `GET /api/users/me/consents, PATCH .../consents/:purpose` | Prisma model | API endpoints, booking session consent creation, user consent management |
| M3 | Booking Flow Config | SRS-2 line 863: `GET\|PATCH /api/tenants/:id/booking-flow`; PRD FR-CRM-9 (Must/P1): "visual step editor showing which steps are active based on service config" | BookingFlow model used during session creation | GET/PATCH API endpoints, frontend read-only step visualization page |
| M4 | Audit Logging | SRS-4 Section 29: all admin actions, auth events, sensitive data access; SRS-2 line 946: consent PATCH "audit-logged" | Prisma model + RLS extension entry | NestJS interceptor/decorator for write logging, query endpoint |
| M5 | Data Export Processing | PRD FR-CP-13 (Must/P1): "Data export (GDPR)"; SRS-4 Section 41a: `processDataExportRequest` job | Client portal creates PENDING DataRequest | Background job to gather data, generate JSON archive, upload to R2, set export_url |
| M6 | Account Deletion Processing | PRD FR-CP-14 (Must/P1): "Account deletion request"; SRS-4 Section 41a: `processAccountDeletion` job | Client portal creates PENDING DataRequest with 30-day deadline | Background job to cascade-delete/anonymize after grace period |
| M7 | Calendar Drag-and-Drop | PRD FR-CRM-2 (Must/P1): "Calendar view: day/week/month, drag-and-drop reschedule" | Calendar with day/week/month/agenda views, click-to-view popover | `react-big-calendar` DnD addon integration, reschedule API call on drop |
| M8 | AI Support Triage | PRD FR-SUP-3 (Must/P1): "AI-powered L1 support triage: Open Claw monitors incoming support tickets 24/7" | Support ticket submission + listing | Background job processor using local AI (Qwen3), auto-resolve/escalate logic |
| M9 | CSRF Protection | SRS-4 Section 28: "SameSite=Strict + CSRF tokens" | SecurityHeadersMiddleware exists | CSRF token generation/validation middleware (needed for httpOnly cookie auth) |
| M10 | Gallery Photos CRUD | SRS-2 line 909: full CRUD endpoints; SRS-2 line 623: table definition (unphased) | Prisma model + RLS extension entry | API module (controller, service, DTOs), relies on existing upload infra |

### 2.2 Phase 1 Should (important but not blocking)

| # | Gap | Spec Reference | What Exists | What's Missing |
|---|-----|----------------|-------------|----------------|
| S1 | Onboarding Tours | SRS-2 line 948: `GET /api/users/me/tours, PATCH .../tours/:tourKey` | Prisma model | API endpoints (user-scoped, no tenant), frontend tour components |
| S2 | Apple Sign-In | PRD FR-AUTH-3 (Should/P1) | Google OAuth implemented | Apple OAuth strategy (passport-apple) |
| S3 | QR Code Generation | PRD FR-BP-7 (Should/P1); SRS-2 line 875: `GET /api/booking-pages/:slug/qr` | Nothing | Server-side QR PNG generation via `qrcode` npm package |
| S4 | JSON-LD Structured Data | PRD FR-BP-9 (Should/P1): "schema.org LocalBusiness + Service" | OG + Twitter meta tags on booking page | JSON-LD script tag in booking page layout |
| S5 | Sitemap Generation | PRD FR-BP-9 (Should/P1): "auto-generated sitemap.xml" | Nothing | Next.js `sitemap.ts` fetching all published tenant slugs |
| S6 | admin:feedback CLI | PRD FR-FBK-3 (Should/P1): "CLI script to list new feedback items" | 7 other admin CLI scripts | New script following existing pattern |
| S7 | Notification Preferences Wiring | Settings UI exists with toggles | Frontend has simulated save (`setTimeout`) | Wire to actual API when backend is ready (Phase 2 per FR-NOT-4) |

### 2.3 Not Phase 1 (confirmed deferred)

| Feature | Verdict | Reasoning |
|---------|---------|-----------|
| Notification Preferences API | Phase 2 Must | FR-NOT-4 and FR-CP-8 both explicitly Must/Phase 2 |
| i18n Full Translation | Phase 3 | PRD Phase Matrix; Phase 1 only needs UTC storage + timezone display (already done) |
| Drag-and-Drop Booking Flow Builder | Phase 2 Should | FR-ONB-11 explicitly Should/Phase 2; distinct from FR-CRM-9 read-only viz |

### 2.4 Content Dependencies (external)

| Item | Status | Action |
|------|--------|--------|
| Privacy Policy | Placeholder page exists | Needs legal counsel to draft content |
| Terms of Service | Placeholder page exists | Needs legal counsel to draft content |
| Data Processing Agreement | Not started | Needs legal counsel |

---

## 3. Implementation Plan

Organized into 6 sprints by dependency order. Each sprint is designed for parallel sub-agent execution where possible.

### Sprint A: Security & Compliance Foundation
**Why first:** Audit logging and CSRF are cross-cutting concerns that other features depend on. Consent records are needed by the booking flow.

#### A1. Audit Logging (M4)
**Approach:** NestJS interceptor that captures write operations + dedicated decorator for sensitive reads.

- Create `apps/api/src/audit/` module:
  - `audit.module.ts` -- global module
  - `audit.interceptor.ts` -- intercepts POST/PATCH/PUT/DELETE responses, writes to `audit_logs` table with actor (user/system/api-key/webhook), action, entity type/id, old/new values, IP, user agent
  - `audit.decorator.ts` -- `@AuditLog(action)` for explicit logging on sensitive reads (e.g., data export)
  - `audit.service.ts` -- write + query methods (admin query endpoint deferred to Phase 2 platform admin UI; CLI can query directly)
- Register as global interceptor in `app.module.ts`
- Auth events (login, logout, password change) logged explicitly in `AuthService`
- **Pattern:** Use `tap()` in RxJS pipe (side-effect, not transformation), async write (don't block response)
- **Estimated scope:** ~300 lines across 4 files

#### A2. CSRF Protection (M9)
**Approach:** `csurf` or custom double-submit cookie pattern. Since the API uses httpOnly cookies for JWT storage, CSRF protection is required.

- Research: NestJS 11 + `@fastify/csrf-protection` or `csurf` (Express). Check which HTTP adapter is in use.
- If Express: use `csurf` middleware with cookie-based tokens
- If already using SameSite=Strict on auth cookies, CSRF risk is mitigated for same-site requests. Verify cookie config in `AuthService`/`TokenService`.
- **Important:** Check if the frontend is same-origin or cross-origin with the API. If same-site cookies with `SameSite=Strict` are already set, the CSRF risk is minimal and a simpler approach (check Origin/Referer header) may suffice.
- Add CSRF token endpoint: `GET /api/auth/csrf-token`
- Frontend: include token in `X-CSRF-Token` header for state-changing requests
- Exempt: webhook endpoints (Stripe), public booking session creation
- **Estimated scope:** ~100 lines, middleware + config

#### A3. Consent Records (M2)
**Approach:** Simple CRUD module (user-scoped, not tenant-scoped) + integration into booking session completion.

- Create `apps/api/src/consent/` module:
  - `consent.controller.ts` -- `GET /api/users/me/consents`, `PATCH /api/users/me/consents/:purpose`
  - `consent.service.ts` -- upsert consent record with IP, user agent, version tracking
  - `consent.dto.ts` -- `{ consented: boolean }`
- Integrate into `BookingSessionsService.complete()`: after booking creation, create `DATA_PROCESSING` consent record with IP + user agent from request
- All consent changes must be audit-logged (depends on A1)
- **Estimated scope:** ~150 lines across 3 files + 20 lines integration

---

### Sprint B: Small CRUD Modules
**Why second:** Independent modules with no cross-dependencies. All follow the established feedback module pattern. Can be parallelized.

#### B1. Tax Rates CRUD (M1)
- Create `apps/api/src/tax-rates/` module:
  - `tax-rates.controller.ts` -- `GET|POST /api/tenants/:id/tax-rates`, `PATCH|DELETE /api/tax-rates/:id`
  - `tax-rates.service.ts` -- CRUD with tenant scoping, `is_default` uniqueness (one default per tenant)
  - DTOs: `create-tax-rate.dto.ts`, `update-tax-rate.dto.ts`
- Frontend: Add `/settings/tax-rates` page following existing settings page pattern
- Register module in `app.module.ts`
- **Estimated scope:** ~200 lines API + ~150 lines frontend

#### B2. Gallery Photos CRUD (M10)
- Create `apps/api/src/gallery/` module:
  - `gallery.controller.ts` -- `GET|POST /api/tenants/:id/gallery`, `PATCH|DELETE /api/gallery/:id`
  - `gallery.service.ts` -- CRUD with venue/service scoping, sort order, featured flag
  - DTOs: `create-gallery-photo.dto.ts`, `update-gallery-photo.dto.ts`
- Uses existing upload infrastructure (presign + confirm)
- Frontend: Gallery management could be part of venue/service edit pages or a dedicated settings page
- **Estimated scope:** ~200 lines API + ~200 lines frontend

#### B3. Booking Flow Config (M3)
- Create `apps/api/src/booking-flow/` module:
  - `booking-flow.controller.ts` -- `GET|PATCH /api/tenants/:id/booking-flow`
  - `booking-flow.service.ts` -- GET returns resolved steps based on current service configs (runs the same step resolution algorithm from `BookingSessionsService` but for preview); PATCH updates `step_overrides` JSONB
- Frontend: Add `/settings/booking-flow` page showing a read-only visualization of which steps are active per service, with "Configure [feature] to add this step" links for inactive steps
- **Estimated scope:** ~150 lines API + ~200 lines frontend

#### B4. QR Code Generation (S3)
- Install `qrcode` npm package in `apps/api`
- Add endpoint to existing `PublicBookingController`: `GET /api/booking-pages/:slug/qr`
- Returns PNG buffer with `Content-Type: image/png`
- QR encodes `${baseUrl}/book/${slug}`
- **Estimated scope:** ~30 lines

---

### Sprint C: Background Job Processors
**Why third:** These complete existing request-creation flows that are already built. Independent of each other.

#### C1. Data Export Processor (M5)
- Create `apps/api/src/jobs/data-export.processor.ts`:
  - Listens on `gdpr` queue for `processDataExportRequest` jobs
  - Gathers user data across tables: bookings, payments, invoices, communications, consent records, notifications
  - Generates JSON archive
  - Uploads to R2 via existing upload service
  - Updates `data_requests` record: `status = COMPLETED`, `export_url`, `completed_at`
  - Sets R2 object expiry to 7 days
- Register processor in `jobs.module.ts`
- Add job enqueue in `ClientPortalService.requestDataExport()` (currently only creates PENDING record)
- **Estimated scope:** ~200 lines

#### C2. Account Deletion Processor (M6)
- Create `apps/api/src/jobs/account-deletion.processor.ts`:
  - Scheduled daily at 5 AM UTC (add to `JobSchedulerService`)
  - Finds `DataRequest` records with `type = DELETION`, `status = PENDING`, `deadline <= now`
  - For each: anonymize user data (replace PII with "[deleted]"), cascade-delete sessions/tokens/push subscriptions, revoke active sessions (Redis), send confirmation email before deletion
  - Updates `data_requests.status = COMPLETED`
- Register in `jobs.module.ts`, add cron to `job-scheduler.service.ts`
- **Estimated scope:** ~250 lines

#### C3. AI Support Triage (M8)
- Create `apps/api/src/jobs/support-triage.processor.ts`:
  - Event-driven: triggered when a support ticket is created (add job enqueue in `SupportService.create()`)
  - Calls local Ollama API (`http://localhost:11434/api/generate`) with Qwen3 model
  - Prompt: classify ticket (common issue vs needs manual review), draft response for common issues
  - Updates ticket: `status = AI_RESOLVED` with resolution notes, or `status = NEEDS_MANUAL_REVIEW` with triage notes
  - For AI_RESOLVED: queue email to user with drafted response
- Create `apps/api/src/jobs/support-escalation.processor.ts`:
  - Scheduled every 30 min
  - Finds tickets in `NEEDS_MANUAL_REVIEW` older than 4 hours without response
  - Sends escalation alert (email to platform admin)
- **Estimated scope:** ~300 lines across 2 processors
- **Note:** Requires Ollama running locally in dev; production will need a deployed model endpoint. Add `OLLAMA_URL` to env config.

---

### Sprint D: Frontend Enhancements
**Why fourth:** These are UI improvements to existing pages. Calendar DnD has an API dependency (reschedule endpoint already exists).

#### D1. Calendar Drag-and-Drop Reschedule (M7)
- Import `withDragAndDrop` from `react-big-calendar/lib/addons/dragAndDrop`
- Import the DnD CSS: `react-big-calendar/lib/addons/dragAndDrop/styles.css`
- Wrap calendar component: `const DnDCalendar = withDragAndDrop(Calendar)`
- Implement `onEventDrop` handler:
  - Show confirmation dialog with old/new time
  - Call `POST /api/bookings/:id/reschedule` with new start/end
  - Refetch calendar events on success
  - Show error toast on conflict (409)
- Implement `onEventResize` for duration changes (same reschedule flow)
- Only allow drag for CONFIRMED/PENDING bookings (not COMPLETED/CANCELLED)
- **Dependencies:** `react-dnd` and `react-dnd-html5-backend` may need to be added (check if `react-big-calendar` v1.19 has built-in DnD support without them)
- **Estimated scope:** ~100 lines of changes to calendar page

#### D2. Booking Flow Visualization Page
- New page at `/settings/booking-flow`
- Add to settings sidebar navigation
- Fetches `GET /api/tenants/:id/booking-flow` (from B3)
- Displays ordered list of all possible steps with active/inactive status
- Active steps show green checkmark, inactive show gray with "Configure X to enable" link
- Per-service dropdown to preview step resolution for each service
- **Estimated scope:** ~200 lines

#### D3. Tax Rates Settings Page
- New page at `/settings/tax-rates`
- Add to settings sidebar navigation
- Standard CRUD table: name, rate %, region, inclusive/exclusive, default toggle
- Create/edit dialog
- **Estimated scope:** ~200 lines

---

### Sprint E: SEO & CLI
**Why fifth:** These are Should-priority items with no dependencies. Quick wins.

#### E1. JSON-LD Structured Data (S4)
- Add to `apps/web/src/app/book/[slug]/layout.tsx`:
  - Build `LocalBusiness` schema.org object from tenant data (name, description, address, phone, logo)
  - Build `Service` objects from services list (name, description, price)
  - Inject as `<script type="application/ld+json">` in layout
- Use existing `generateMetadata` data fetch (already fetches tenant + services)
- **Estimated scope:** ~60 lines

#### E2. Sitemap Generation (S5)
- Create `apps/web/src/app/sitemap.ts`:
  - Next.js App Router convention for dynamic sitemaps
  - Fetch all active tenant slugs from API
  - Return sitemap entries: `/book/{slug}` for each tenant + static pages (/, /privacy, /terms)
  - Add `robots.ts` for robots.txt
- **Estimated scope:** ~40 lines

#### E3. admin:feedback CLI (S6)
- Create `scripts/admin/feedback.ts`:
  - Follow existing CLI pattern from `_shared.ts`
  - List feedback items with filters: `--type`, `--status`, `--tenant`, `--since`
  - Table output with: date, type, tenant, user, body (truncated), status
  - `--acknowledge <id>` to mark as ACKNOWLEDGED
  - Flag COMPARISON_NOTE items prominently
- Add `admin:feedback` script to root `package.json`
- **Estimated scope:** ~100 lines

---

### Sprint F: Should-Priority Features
**Why last:** Lower priority items that improve polish but don't block launch.

#### F1. Onboarding Tours (S1)
- Create `apps/api/src/onboarding-tours/` module:
  - `GET /api/users/me/tours` -- list all tours for user
  - `PATCH /api/users/me/tours/:tourKey` -- mark completed/dismissed
- Note: User-scoped (no tenant_id), no TenantRolesGuard needed
- Frontend tour components deferred until UX designs exist
- **Estimated scope:** ~100 lines API

#### F2. Apple Sign-In (S2)
- Install `passport-apple` or `@arendajaelu/nestjs-passport-apple`
- Add Apple strategy to `apps/api/src/auth/strategies/`
- Add `POST /api/auth/apple` endpoint to `AuthController`
- Requires Apple Developer account configuration (Team ID, Key ID, Service ID, private key)
- Frontend: Add "Sign in with Apple" button on login/register pages
- **Estimated scope:** ~150 lines API + ~30 lines frontend
- **Blocker:** Requires Apple Developer credentials configured

#### F3. Notification Preferences Wiring (S7)
- The settings page UI already exists with toggles
- Currently simulated with `setTimeout`
- Per spec, the backend API is Phase 2 (FR-NOT-4)
- **Action:** Update the frontend page to show a "Coming soon" note rather than simulating a save. This is more honest UX than a fake success message.
- **Estimated scope:** ~10 lines changed

---

## 4. Dependency Graph

```
Sprint A (Security Foundation)
  A1 Audit Logging ─────────────────────┐
  A2 CSRF Protection                    │
  A3 Consent Records ──── depends on A1 ┘

Sprint B (CRUD Modules) ── no dependency on A (can start in parallel except B3 needs no prereq)
  B1 Tax Rates       ── independent
  B2 Gallery Photos  ── independent
  B3 Booking Flow    ── independent
  B4 QR Code         ── independent

Sprint C (Background Jobs) ── independent of B
  C1 Data Export     ── independent
  C2 Account Deletion── independent
  C3 AI Support      ── independent (requires Ollama running)

Sprint D (Frontend) ── D2/D3 depend on B3/B1 backends
  D1 Calendar DnD    ── independent
  D2 Booking Flow UI ── depends on B3
  D3 Tax Rates UI    ── depends on B1

Sprint E (SEO/CLI) ── fully independent
  E1 JSON-LD         ── independent
  E2 Sitemap         ── independent
  E3 Feedback CLI    ── independent

Sprint F (Should features) ── fully independent
  F1 Onboarding Tours── independent
  F2 Apple Sign-In   ── independent (blocked by Apple credentials)
  F3 Notif Prefs     ── independent
```

**Maximum parallelism:** Sprints A, B, C, and E can all run concurrently. Sprint D requires B1/B3 backends. Sprint F is lowest priority.

---

## 5. Recommended Execution Order

For a solo developer or small team, the recommended sequence balances risk, dependencies, and impact:

### Wave 1: Parallel (all independent)
- **A1** Audit Logging (security foundation, cross-cutting)
- **A2** CSRF Protection (security, quick)
- **B1** Tax Rates CRUD (simple, unblocks D3)
- **B3** Booking Flow Config (unblocks D2)
- **B4** QR Code (trivial, quick win)
- **E1-E3** SEO + CLI (quick wins)

### Wave 2: Parallel (after A1 completes)
- **A3** Consent Records (needs audit logging)
- **B2** Gallery Photos CRUD
- **C1** Data Export Processor
- **C2** Account Deletion Processor
- **D1** Calendar DnD (frontend only)

### Wave 3: Parallel (after B1/B3 complete)
- **D2** Booking Flow UI
- **D3** Tax Rates UI
- **C3** AI Support Triage

### Wave 4: If time permits
- **F1** Onboarding Tours
- **F2** Apple Sign-In (blocked by credentials)
- **F3** Notification Preferences cleanup

---

## 6. Estimated Total Scope

| Category | Items | Est. Lines | Effort |
|----------|-------|-----------|--------|
| Must (M1-M10) | 10 features | ~2,000 | Medium-High |
| Should (S1-S7) | 7 features | ~700 | Low-Medium |
| **Total** | **17 features** | **~2,700** | |

The remaining work is primarily boilerplate CRUD modules, background job processors following established patterns, and frontend page additions following existing conventions. No architectural changes are needed -- all gaps fit cleanly into the existing module/pattern structure.

---

## 7. External Dependencies & Blockers

| Dependency | Required For | Status |
|------------|-------------|--------|
| Legal counsel | Privacy Policy, Terms of Service, DPA content | Not started -- placeholder pages exist |
| Apple Developer account | Apple Sign-In (S2) | Not configured |
| Ollama + Qwen3 model | AI Support Triage (C3) | Available locally on dev machine |
| Node.js 22 | All development | Needs upgrade from v18 (requires sudo) |
| .env file | All development | Only .env.example exists |

---

## 8. Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Audit logging interceptor adds latency | Async writes via `tap()`, don't await DB insert |
| CSRF breaks existing API consumers | Exempt webhook endpoints, add X-CSRF-Token header gradually, test embed widget |
| AI triage quality (C3) | Start with conservative auto-resolve (high confidence only), escalate everything else |
| Calendar DnD conflicts | Show confirmation dialog before reschedule, handle 409 gracefully |
| Data export for large accounts | Stream JSON generation, set reasonable size limits, use R2 multipart upload |

---

## 9. Round 2 Verification (March 7, 2026)

After all 17 Round 1 gaps were implemented (commit `74ecfc4`), a full requirement-by-requirement audit was conducted. Every Phase 1 Must and Should requirement from the PRD was verified against actual source code by domain (onboarding, booking flow, calendar, payments, communications, auth, CRM, client portal, booking page). This audit revealed 14 additional gaps — items where infrastructure existed (schema fields, enum values, processor shells) but functional wiring or business logic was missing.

**Round 2 gaps are documented in:** `specs/phase-1-closure-plan.md`

### Round 2 Must Gaps (5)

| # | Item | PRD | Root Cause |
|---|------|-----|------------|
| CM1 | Calendar event push not wired | FR-CAL-3/4/5 | CalendarPushHandler exists but no @OnEvent listeners enqueue JOB_CALENDAR_EVENT_PUSH |
| CM2 | Deposit payments | FR-PAY-3 | processPaymentIntent() hardcodes FULL_PAYMENT; never reads service depositConfig |
| CM3 | Referral commission | FR-PAY-11 | referralCommission field on Payment exists but no calculation or eligibility logic |
| CM4 | Manual approval notification | FR-COM-1a | BOOKING_CREATED fires for PENDING but no staff email sent |
| CM5 | Booking flow config frontend | FR-CRM-9 | Backend API exists but no settings page |

### Round 2 Should Gaps (9)

| # | Item | PRD |
|---|------|-----|
| CS1 | Post-setup prompts | FR-ONB-6 |
| CS2 | Setup progress tracking | FR-ONB-10 |
| CS3 | Booking modification request | FR-CP-3 |
| CS4 | Business data export | FR-CRM-26 |
| CS5 | Scheduled calendar sync | FR-CAL-12 |
| CS6 | Calendar re-auth prompt | FR-CAL-9 |
| CS7 | Calendar conflict notification | FR-CAL-14 |
| CS8 | Invoice PDF to R2 | FR-PAY-8 |
| CS9 | Category selection telemetry | FR-ONB-12 |

### Why Round 1 Missed These

Round 1 focused on modules that were entirely absent (no API module, no controller, no service). Round 2 caught gaps where:
1. **Infrastructure existed but wiring was missing** (calendar push — processor exists, dispatcher routes it, but no event listener enqueues jobs)
2. **Schema fields existed but business logic was absent** (deposit payments, referral commission — columns in place, no code reads or writes them)
3. **Backend existed but frontend was missing** (booking flow config — API returns data, no page renders it)
4. **Cross-cutting concerns were incomplete** (manual approval notification — event fires, nobody listens)

---

## 10. Round 2 Closure (March 7, 2026)

All 14 Round 2 gaps were implemented and tested. 785 tests pass across 51 test files.

### Must Gaps Closed

| # | Item | Implementation | Tests |
|---|------|---------------|-------|
| CM1 | Calendar event push wiring | `CalendarEventListener` with @OnEvent for CONFIRMED/RESCHEDULED/CANCELLED → enqueues JOB_CALENDAR_EVENT_PUSH per active connection | 6 tests in calendar-event-listener.spec.ts |
| CM2 | Deposit payments | `resolvePaymentAmount()` in PaymentsService; processPaymentIntent reads service.depositConfig; DEPOSIT vs FULL_PAYMENT type | 9 tests in deposit-payments.spec.ts |
| CM3 | Referral commission | `calculateReferralCommission()` in PaymentsService; first-booking-only check; configurable rate (20%) and cap ($500); added to Stripe application_fee_amount | 11 tests in referral-commission.spec.ts |
| CM4 | Manual approval notification | `handleBookingCreated()` in WorkflowEngineService; checks PENDING status; sends staff-approval-required email to OWNER/ADMIN | 5 tests in manual-approval-notification.spec.ts |
| CM5 | Booking flow config frontend | Settings page at /settings/booking-flow; global steps with active/inactive indicators; per-service accordion; config links for inactive steps | Page created + nav link added |

### Should Gaps Closed

| # | Item | Implementation |
|---|------|---------------|
| CS1 | Post-setup prompts | Dashboard page shows "Complete Your Setup" card when services/availability/Stripe/calendar are missing |
| CS2 | Setup progress tracking | Integrated into dashboard stats (hasStripe, hasCalendar checks) |
| CS3 | Booking modification request | `POST portal/bookings/:id/reschedule` endpoint + service method with max-reschedule enforcement | 6 tests |
| CS4 | Business data export | `POST tenants/:id/export` endpoint; enqueues GDPR export job with tenant context |
| CS5 | Scheduled calendar sync | Calendar queue registered in JobSchedulerService with CRON_EVERY_15_MIN for two-way sync + CRON_HOURLY for token refresh |
| CS6 | Calendar re-auth prompt | "Reconnect Google Calendar" button shown on settings/calendar page when connection status is ERROR |
| CS7 | Calendar conflict notification | CalendarSyncHandler.detectConflicts() checks inbound events vs bookings after sync; creates in-app notifications for OWNER/ADMIN | 4 tests |
| CS8 | Invoice PDF to R2 | GenerateInvoicePdfProcessor uploads HTML to R2 via UploadService; falls back to data URI if R2 not configured | 4 tests |
| CS9 | Category selection telemetry | Logger.log with `[telemetry] category_selected` tag in TenantsService.create() |
