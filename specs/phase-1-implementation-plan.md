# Phase 1 Implementation Plan

**Date:** 2026-03-06
**Source:** `specs/phase-1-gap-analysis.md` (verified against codebase and specs)
**Scope:** 10 Must + 7 Should features = 17 total gaps

All items below are verified: the "What Exists" column reflects actual file-level inspection, and the "Spec Requirement" column quotes exact spec text.

---

## Table of Contents

1. [M1: Tax Rates CRUD](#m1-tax-rates-crud)
2. [M2: Consent Records](#m2-consent-records)
3. [M3: Booking Flow Config](#m3-booking-flow-config)
4. [M4: Audit Logging](#m4-audit-logging)
5. [M5: Data Export Processing](#m5-data-export-processing)
6. [M6: Account Deletion Processing](#m6-account-deletion-processing)
7. [M7: Calendar Drag-and-Drop](#m7-calendar-drag-and-drop)
8. [M8: AI Support Triage](#m8-ai-support-triage)
9. [M9: CSRF Protection](#m9-csrf-protection)
10. [M10: Gallery Photos CRUD](#m10-gallery-photos-crud)
11. [S1: Onboarding Tours](#s1-onboarding-tours)
12. [S2: Apple Sign-In](#s2-apple-sign-in)
13. [S3: QR Code Generation](#s3-qr-code-generation)
14. [S4: JSON-LD Structured Data](#s4-json-ld-structured-data)
15. [S5: Sitemap Generation](#s5-sitemap-generation)
16. [S6: admin:feedback CLI](#s6-adminfeedback-cli)
17. [S7: Notification Preferences Wiring](#s7-notification-preferences-wiring)
18. [Dependency Graph & Execution Order](#dependency-graph--execution-order)
19. [External Blockers](#external-blockers)

---

## M1: Tax Rates CRUD

### Spec Requirement
- **SRS-2 line 940:** `GET|POST /api/tenants/:id/tax-rates`, `PATCH|DELETE /api/tax-rates/:id`
- **Table:** `tax_rates: id (PK), tenant_id (FK, RLS), name, rate (DECIMAL), region, is_inclusive, is_default, is_active`

### What Exists
- Prisma `TaxRate` model at `prisma/schema.prisma:1328-1344` with all fields, relations to `Tenant` and `InvoiceLineItem`, indexes on `tenantId`
- Listed in `prisma-tenant.extension.ts:29` for RLS filtering
- No API module, no controller, no service, no DTOs, no frontend page

### Implementation Steps

**API (apps/api/src/tax-rates/)**

1. Create `tax-rates.module.ts`
   - Import `PrismaModule`
   - Register `TaxRatesService`, `TaxRatesController`

2. Create `dto/create-tax-rate.dto.ts`
   ```
   Fields: name (string, required), rate (number, required, 0-100),
   region (string, optional), isInclusive (boolean, default false),
   isDefault (boolean, default false)
   ```
   - Use `class-validator`: `@IsString`, `@IsNumber`, `@Min(0)`, `@Max(100)`, `@IsOptional`, `@IsBoolean`

3. Create `dto/update-tax-rate.dto.ts`
   - `PartialType(CreateTaxRateDto)` + optional `isActive: boolean`

4. Create `tax-rates.service.ts`
   - `findAll(tenantId)` -- list active tax rates for tenant, ordered by `name`
   - `create(tenantId, dto)` -- if `dto.isDefault`, first unset any existing default (`UPDATE tax_rates SET is_default = false WHERE tenant_id = ? AND is_default = true`), then create
   - `update(id, dto)` -- same default-uniqueness logic; verify tax rate belongs to tenant via RLS
   - `remove(id)` -- soft-delete by setting `isActive = false` (tax rates may be referenced by existing invoice line items)

5. Create `tax-rates.controller.ts`
   ```
   @UseGuards(JwtAuthGuard, TenantRolesGuard)
   GET    /api/tenants/:tenantId/tax-rates       -> findAll
   POST   /api/tenants/:tenantId/tax-rates       -> create    @Roles('OWNER', 'ADMIN')
   PATCH  /api/tax-rates/:id                     -> update    @Roles('OWNER', 'ADMIN')
   DELETE /api/tax-rates/:id                     -> remove    @Roles('OWNER', 'ADMIN')
   ```

6. Register `TaxRatesModule` in `app.module.ts`

**Frontend (apps/web/src/app/(dashboard)/settings/tax-rates/)**

7. Create `page.tsx` following the pattern of existing settings pages (e.g., `settings/services/page.tsx`)
   - Fetch `GET /api/tenants/:id/tax-rates` on mount
   - Table columns: Name, Rate (%), Region, Inclusive?, Default, Actions (Edit/Delete)
   - Create/Edit dialog with form fields matching DTO
   - Delete confirmation dialog (explain soft-delete: "This tax rate will be deactivated")

8. Add "Tax Rates" entry to settings sidebar navigation in the settings layout component

**Tests**

9. Create `tax-rates.service.spec.ts` -- unit tests for CRUD + default uniqueness logic
10. Create `tax-rates.controller.spec.ts` -- endpoint auth + validation tests

---

## M2: Consent Records

### Spec Requirement
- **SRS-2 Section 10:** `consent_records` table with unique `(user_id, purpose)`. On withdrawal, `consented = false` and `withdrawn_at` recorded (in-place update). History tracked in `audit_logs`.
- **SRS-2 line 946:** `GET /api/users/me/consents`, `PATCH /api/users/me/consents/:purpose`
- **SRS-1 Section 8:** On booking completion, create `DATA_PROCESSING` consent record
- **SRS-4 Section 33:** `FOLLOW_UP_EMAILS` purpose used as CAN-SPAM unsubscribe mechanism; `deliverCommunication` must check before sending follow-up emails

### What Exists
- Prisma `ConsentRecord` model at `prisma/schema.prisma:2153-2170` with all fields
- `ConsentPurpose` enum: `DATA_PROCESSING`, `MARKETING`, `ANALYTICS`, `THIRD_PARTY_SHARING`, `FOLLOW_UP_EMAILS`
- Enum mirrored in `packages/shared/src/enums/security.enums.ts:32-39`
- No API module, no integration in booking session, no frontend

### Implementation Steps

**API (apps/api/src/consent/)**

1. Create `consent.module.ts`

2. Create `dto/update-consent.dto.ts`
   ```
   Fields: consented (boolean, required)
   ```

3. Create `consent.service.ts`
   - `findAllForUser(userId)` -- return all consent records for authenticated user
   - `upsertConsent(userId, purpose, consented, ip, userAgent)`:
     - If `consented = true`: upsert with `consentedAt = now()`, `withdrawnAt = null`, IP, user agent
     - If `consented = false`: update `consented = false`, `withdrawnAt = now()`, IP, user agent
     - Use Prisma `upsert` with unique constraint `(userId, purpose)`
   - `createBookingConsent(userId, ip, userAgent)` -- called during booking completion, creates `DATA_PROCESSING` consent if not already present (idempotent via upsert)
   - `hasConsent(userId, purpose)` -- returns boolean, used by `deliverCommunication` to check `FOLLOW_UP_EMAILS`

4. Create `consent.controller.ts`
   ```
   @UseGuards(JwtAuthGuard)
   GET   /api/users/me/consents           -> findAllForUser (userId from JWT)
   PATCH /api/users/me/consents/:purpose  -> upsertConsent  (purpose from param, validated against enum)
   ```
   - Extract IP from `request.ip`, user agent from `request.headers['user-agent']`
   - Validate `:purpose` param against `ConsentPurpose` enum values

5. Register `ConsentModule` in `app.module.ts`

**Integration Points**

6. In `apps/api/src/booking-sessions/booking-sessions.service.ts` method `complete()` (around line 212-358):
   - After booking creation, call `consentService.createBookingConsent(userId, ip, userAgent)`
   - Inject `ConsentService` into `BookingSessionsService`
   - IP and user agent available from the request context (inject via `@Req()` in controller, pass to service)

7. In `apps/api/src/communications/` (wherever `deliverCommunication` or follow-up email sending occurs):
   - Before sending follow-up emails, call `consentService.hasConsent(userId, 'FOLLOW_UP_EMAILS')`
   - If no consent or `consented = false`, skip delivery

**Audit Logging Dependency**

8. All consent changes must be audit-logged. After M4 (Audit Logging) is complete:
   - The audit interceptor will automatically capture PATCH requests to consent endpoints
   - Alternatively, explicitly call `auditService.log()` in `consent.service.ts` for each upsert with `old_values`/`new_values`

**Tests**

9. `consent.service.spec.ts` -- upsert grant/withdraw, idempotent booking consent, hasConsent check
10. `consent.controller.spec.ts` -- auth, purpose validation, IP/UA extraction

---

## M3: Booking Flow Config

### Spec Requirement
- **SRS-2:** `GET|PATCH /api/tenants/:id/booking-flow`
- **SRS-2 Table:** `booking_flows: id, tenant_id, name, is_default, step_overrides (JSONB, nullable), settings (JSONB), min_booking_advance_days (INT, default 1), max_booking_advance_days (INT, default 365), created_at`
- **PRD FR-CRM-9 (Must/P1):** "visual step editor showing which steps are active based on service config"
- **Note:** `step_overrides = null` means steps auto-resolved from service config (SRS-1 Section 8). Phase 1 only needs read-only visualization; drag-and-drop builder is Phase 2 (FR-ONB-11).

### What Exists
- Prisma `BookingFlow` model at `prisma/schema.prisma:983-1002` with all fields
- Referenced in `BookingSessionsService` (line 309: `bookingFlowId: session.bookingFlowId`)
- `BookingFlowAnalytics` model also exists
- E2E test at `apps/web/e2e/booking-flow.spec.ts` (tests public booking page, not config)
- No API module for config GET/PATCH, no settings page

### Implementation Steps

**API (apps/api/src/booking-flow/)**

1. Create `booking-flow.module.ts`

2. Create `dto/update-booking-flow.dto.ts`
   ```
   Fields: name (string, optional), stepOverrides (JSON, optional, nullable),
   settings (JSON, optional), minBookingAdvanceDays (int, optional, min 0),
   maxBookingAdvanceDays (int, optional, min 1)
   ```

3. Create `booking-flow.service.ts`
   - `getConfig(tenantId)`:
     - Find default booking flow for tenant (`isDefault = true`)
     - If none exists, return a computed default object with `stepOverrides = null`
     - Fetch all services for tenant
     - For each service, run the step resolution algorithm (same logic used in `BookingSessionsService`) to show which steps would be active
     - Return: `{ flow: BookingFlow, resolvedSteps: { serviceId, serviceName, steps: Step[] }[] }`
   - `updateConfig(tenantId, dto)`:
     - Find or create default booking flow
     - Update with provided fields
     - Validate `maxBookingAdvanceDays >= minBookingAdvanceDays`

4. Create `booking-flow.controller.ts`
   ```
   @UseGuards(JwtAuthGuard, TenantRolesGuard)
   GET   /api/tenants/:tenantId/booking-flow  -> getConfig    @Roles('OWNER', 'ADMIN')
   PATCH /api/tenants/:tenantId/booking-flow  -> updateConfig @Roles('OWNER', 'ADMIN')
   ```

5. Register `BookingFlowModule` in `app.module.ts`

**Frontend (apps/web/src/app/(dashboard)/settings/booking-flow/)**

6. Create `page.tsx`:
   - Fetch `GET /api/tenants/:id/booking-flow`
   - Display settings: min/max advance days (editable number inputs)
   - Read-only step visualization:
     - Per-service dropdown/accordion
     - For each service, list all possible booking steps in order
     - Active steps: green checkmark icon + step name
     - Inactive steps: gray icon + step name + explanation link (e.g., "Enable deposits on this service to add this step" linking to service edit page)
   - Save button calls `PATCH` with updated settings

7. Add "Booking Flow" entry to settings sidebar navigation

**Tests**

8. `booking-flow.service.spec.ts` -- getConfig with/without existing flow, step resolution per service, update validation

---

## M4: Audit Logging

### Spec Requirement
- **SRS-4 Section 29:** "All admin actions, auth events, sensitive data access in `audit_logs`. Actions: CREATE, UPDATE, DELETE, READ, LOGIN, LOGOUT, EXPORT, IMPORT, SIGN, VOID, SEND, ACCEPT, REJECT, PASSWORD_CHANGE, MFA_ENABLE, MFA_DISABLE. Actor types: USER, SYSTEM, API_KEY, WEBHOOK. Stores `old_values`/`new_values` JSON. Retention: 2 years; archived to R2 after 90 days."
- **SRS-2 Section 11:** Table schema with indexes on `(tenant_id, entity_type, entity_id)` and `(actor_id, timestamp)`
- **SRS-2 line 946:** consent PATCH must be "audit-logged"

### What Exists
- Prisma `AuditLog` model at `prisma/schema.prisma:2049-2071` with all fields
- `AuditAction` enum (16 values) at schema lines 419-436
- `ActorType` enum (4 values) at schema lines 438-443
- Enums mirrored in `packages/shared/src/enums/security.enums.ts:3-24`
- `TransformInterceptor` exists at `apps/api/src/common/interceptors/transform.interceptor.ts` (wraps responses, does not audit)
- No audit module, interceptor, service, or any usage of audit enums

### Implementation Steps

**API (apps/api/src/audit/)**

1. Create `audit.module.ts`
   - Global module (`@Global()`) so any module can inject `AuditService`

2. Create `audit.service.ts`
   - `log(params)`:
     ```
     params: {
       tenantId?: string,
       entityType: string,
       entityId: string,
       action: AuditAction,
       actorId?: string,
       actorType: ActorType,
       oldValues?: object,
       newValues?: object,
       ipAddress?: string,
       userAgent?: string,
       metadata?: object,
     }
     ```
     - Write to `audit_logs` table via Prisma
     - **Async fire-and-forget**: use `this.prisma.auditLog.create(...).catch(err => this.logger.error(...))` -- do NOT await in the request pipeline
   - `query(tenantId, filters)` -- for future admin query endpoint; implement now as it's needed by CLI
     - Filters: `entityType`, `entityId`, `actorId`, `action`, `dateRange`
     - Paginated, ordered by `timestamp DESC`

3. Create `audit.interceptor.ts` -- global NestJS interceptor
   - Intercepts POST, PATCH, PUT, DELETE requests (skip GET/OPTIONS/HEAD)
   - Extracts from request context:
     - `actorId`: from JWT payload (`request.user.id`) or `null` for unauthenticated
     - `actorType`: `USER` (JWT), `API_KEY` (API key auth), `WEBHOOK` (webhook endpoints), `SYSTEM` (cron jobs)
     - `tenantId`: from `nestjs-cls` store or route param
     - `entityType`: derive from route (e.g., `/api/tenants/:id/services` -> `Service`)
     - `entityId`: from route param (`:id`) or response body (`response.data.id` for POST)
     - `ipAddress`: `request.ip`
     - `userAgent`: `request.headers['user-agent']`
   - Determine `action` from HTTP method: POST -> CREATE, PATCH/PUT -> UPDATE, DELETE -> DELETE
   - Uses RxJS `tap()` operator in the response pipe -- side-effect only, never blocks the response
   - **Skip conditions**: health check endpoints, public read endpoints, Stripe webhook callbacks (these are logged separately)

4. Create `audit.decorator.ts` -- `@AuditLog(action: AuditAction)` method decorator
   - For explicit audit logging on sensitive operations not captured by the interceptor (e.g., `LOGIN`, `LOGOUT`, `PASSWORD_CHANGE`, `EXPORT`, data reads)
   - When applied, the interceptor uses the decorator's action instead of deriving from HTTP method

5. Register interceptor:
   - In `app.module.ts`: `APP_INTERCEPTOR` provider for `AuditInterceptor`
   - Ensure it runs AFTER `TransformInterceptor` (order matters for response body access)

6. Register `AuditModule` as global in `app.module.ts`

**Explicit Audit Points**

7. In `apps/api/src/auth/auth.service.ts`:
   - `login()`: call `auditService.log({ action: LOGIN, ... })`
   - `logout()`: call `auditService.log({ action: LOGOUT, ... })`
   - `changePassword()`: call `auditService.log({ action: PASSWORD_CHANGE, ... })`

8. In consent service (M2): each upsert calls `auditService.log()` with `oldValues`/`newValues`

**Retention (deferred)**

9. Retention archival (R2 after 90 days, delete after 2 years) is a background job concern. Add a TODO/ticket for this -- it's operational infrastructure, not blocking launch.

**Tests**

10. `audit.service.spec.ts` -- log write, query with filters
11. `audit.interceptor.spec.ts` -- method->action mapping, skip conditions, async fire-and-forget verification

---

## M5: Data Export Processing

### Spec Requirement
- **SRS-4 Section 41a:** "Job: processDataExportRequest. Queue: gdpr. Schedule: On request. Purpose: Gather all user data across tables (bookings, payments, invoices, communications, contracts, reviews, notifications), generate JSON archive, upload to R2, set data_requests.export_url and status = COMPLETED. Auto-expires R2 URL after 7 days."
- **PRD FR-CP-13 (Must/P1):** "Data export (GDPR)"
- **SRS-4 Section 30:** `GET /api/users/me/data-export` endpoint
- **Queue config:** gdpr queue with concurrency 2, retry 3 times before dead-letter

### What Exists
- Prisma `DataRequest` model at `prisma/schema.prisma:2133-2151`
- `DataRequestType` enum: `EXPORT`, `DELETION`, `TENANT_EXPORT`
- `DataRequestStatus` enum: `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`
- GDPR queue constant at `apps/api/src/bullmq/queue.constants.ts:12`
- `cleanup-retention.processor.ts` handles retention cleanup but NOT data export
- Client portal has `requestDataExport()` method that creates a PENDING DataRequest record but does NOT enqueue a job
- No processor for `processDataExportRequest`

### Implementation Steps

**API**

1. Create `apps/api/src/jobs/data-export.processor.ts`
   - Decorate with `@Processor(QUEUE_GDPR)`
   - Handle job name `processDataExportRequest`
   - Job payload: `{ dataRequestId: string, userId: string }`

2. Processor logic:
   ```
   a. Set DataRequest status = PROCESSING
   b. Gather user data from all relevant tables:
      - User profile (users table, excluding password hash)
      - Bookings (bookings, booking_state_history)
      - Payments (payments, refunds)
      - Invoices (invoices, invoice_line_items)
      - Communications sent (communication_logs where recipientId = userId)
      - Consent records
      - Notifications
      - Notes (where entity relates to user's bookings)
      - Client portal activity
   c. Structure as JSON with sections per data type
   d. Upload JSON to R2 via existing upload service:
      - Key: `exports/${userId}/${dataRequestId}.json`
      - Set R2 object lifecycle rule: expire after 7 days
   e. Update DataRequest: status = COMPLETED, exportUrl = R2 URL, completedAt = now()
   f. Send notification email to user with download link
   ```

3. Error handling:
   - On failure, set `status = FAILED` with error in `notes`
   - BullMQ retry: 3 attempts with exponential backoff
   - On final failure, dead-letter and notify platform admin

4. Wire up job enqueue:
   - In `apps/api/src/client-portal/client-portal.service.ts` `requestDataExport()`:
     - After creating the PENDING DataRequest, add: `this.gdprQueue.add('processDataExportRequest', { dataRequestId: record.id, userId })`
   - Inject the GDPR BullMQ queue into `ClientPortalService`

5. Register processor in `apps/api/src/jobs/jobs.module.ts`

**Tests**

6. `data-export.processor.spec.ts` -- mock Prisma queries, verify JSON structure, verify R2 upload call, verify status transitions

---

## M6: Account Deletion Processing

### Spec Requirement
- **SRS-4 Section 41a:** "Job: processAccountDeletion. Queue: gdpr. Schedule: Daily 5 AM. Purpose: Process DELETION requests past 30-day grace period: cascade-delete or anonymize user data across all tenants, revoke active sessions, delete push tokens, send confirmation email before deletion. Sets data_requests.status = COMPLETED."
- **PRD FR-CP-14 (Must/P1):** "Account deletion request"

### What Exists
- Client portal endpoint `POST /portal/account-deletion` at `apps/api/src/client-portal/client-portal.controller.ts:172-186`
- Service method `requestAccountDeletion()` at `client-portal.service.ts:516-550` -- creates PENDING DataRequest with DELETION type, 30-day deadline, checks for active bookings
- `cleanup-retention.processor.ts` runs daily at 3 AM UTC but only handles data retention cleanup (expired reservations, abandoned sessions, old notifications) -- NOT account deletion
- No processor for `processAccountDeletion`, no cron for it

### Implementation Steps

**API**

1. Create `apps/api/src/jobs/account-deletion.processor.ts`
   - Decorate with `@Processor(QUEUE_GDPR)`
   - Handle job name `processAccountDeletion`

2. Add cron schedule in `apps/api/src/jobs/job-scheduler.service.ts`:
   - Daily at 5 AM UTC: query `DataRequest` where `requestType = DELETION`, `status = PENDING`, `deadlineAt <= now()`
   - For each eligible record, enqueue `processAccountDeletion` job with `{ dataRequestId, userId }`

3. Processor logic per user:
   ```
   a. Set DataRequest status = PROCESSING
   b. Send pre-deletion confirmation email to user ("Your account will be permanently deleted")
   c. Wait brief period (or handle as two-phase: email first, delete in next run -- spec says "send confirmation email before deletion")
   d. Anonymize user data:
      - Replace user.email with `deleted-{uuid}@deleted.savspot.com`
      - Replace user.firstName, lastName with "[deleted]"
      - Replace user.phone with null
      - Nullify profile fields (avatarUrl, etc.)
   e. Cascade-delete ephemeral data:
      - Delete all sessions (refresh_tokens table)
      - Delete push_subscriptions
      - Delete notification records
      - Delete API keys
   f. Preserve business records (anonymized):
      - Bookings: keep but with anonymized client reference
      - Payments: keep for financial records (legal requirement)
      - Invoices: keep for accounting
   g. Revoke active sessions in Redis:
      - Delete all refresh token entries for userId
      - Add userId to token blacklist
   h. Update DataRequest: status = COMPLETED, completedAt = now()
   i. Audit log the deletion (action: DELETE, entityType: User, actorType: SYSTEM)
   ```

4. Register processor in `jobs.module.ts`

**Tests**

5. `account-deletion.processor.spec.ts` -- mock all Prisma operations, verify anonymization logic, verify Redis session cleanup, verify audit log creation

---

## M7: Calendar Drag-and-Drop

### Spec Requirement
- **PRD FR-CRM-2 (Must/P1):** "Calendar view: day/week/month, drag-and-drop reschedule"
- **SRS-2:** `POST /api/bookings/:id/reschedule` endpoint exists

### What Exists
- Calendar page at `apps/web/src/app/(dashboard)/calendar/page.tsx` (543 lines) with month/week/day/agenda views
- `react-big-calendar` v1.19.4 installed
- Click-to-view popover implemented (not DnD)
- Reschedule endpoint exists at `apps/api/src/bookings/bookings.controller.ts`
- `RescheduleBookingDto` at `apps/api/src/bookings/dto/reschedule-booking.dto.ts`
- No `react-dnd` or DnD addon imported, no `withDragAndDrop` usage

### Implementation Steps

**Frontend (apps/web/src/app/(dashboard)/calendar/page.tsx)**

1. Install DnD dependencies:
   ```bash
   cd apps/web && pnpm add react-dnd react-dnd-html5-backend
   ```
   (react-big-calendar v1.19 requires these as peer dependencies for DnD addon)

2. Import DnD addon:
   ```typescript
   import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'
   import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'
   ```

3. Wrap calendar:
   ```typescript
   const DnDCalendar = withDragAndDrop(Calendar)
   ```
   Replace `<Calendar ... />` with `<DnDCalendar ... />`

4. Add `draggableAccessor` prop:
   - Return `true` only for events with status `PENDING` or `CONFIRMED`
   - Return `false` for `COMPLETED`, `CANCELLED`, `NO_SHOW`, `IN_PROGRESS`

5. Implement `onEventDrop` handler:
   ```typescript
   async function handleEventDrop({ event, start, end }) {
     // Show confirmation dialog: "Reschedule {service} from {oldTime} to {newTime}?"
     const confirmed = await showConfirmDialog(...)
     if (!confirmed) return // revert visual position

     try {
       await api.post(`/bookings/${event.bookingId}/reschedule`, {
         newStartTime: start.toISOString(),
         newEndTime: end.toISOString(),
       })
       toast.success('Booking rescheduled')
       refetchEvents() // re-query calendar events
     } catch (err) {
       if (err.status === 409) {
         toast.error('Time slot conflict -- another booking exists at that time')
       } else {
         toast.error('Failed to reschedule')
       }
       refetchEvents() // revert to server state
     }
   }
   ```

6. Implement `onEventResize` handler (same pattern as `onEventDrop` for duration changes)

7. Add visual feedback:
   - Draggable events show grab cursor
   - Non-draggable events show default cursor
   - During drag, show ghost outline at target position

**Tests**

8. Manual testing: drag a CONFIRMED booking to a new time slot, verify API call and calendar update
9. E2E test: extend `apps/web/e2e/` with a calendar DnD test if Playwright supports DnD simulation

---

## M8: AI Support Triage

### Spec Requirement
- **PRD FR-SUP-3 (Must/P1):** "AI-powered L1 support triage"
- **SRS-4 Section 41b:** "Job: triageSupportTicket. Queue: support. Schedule: Event-driven. Pipeline: (1) set status = AI_INVESTIGATING; (2) enrich source_context with tenant config snapshot, recent errors, booking/payment state; (3) route to Qwen3 (local) for known patterns or escalate; (4) populate ai_diagnosis; (5) auto-respond (AI_RESOLVED) or escalate (NEEDS_MANUAL_REVIEW)"

### What Exists
- Support module at `apps/api/src/support/` with controller and service
- `SupportTicket` model has AI fields: `aiDiagnosis`, `aiResponse`, `aiResolutionType` (enum: `FAQ_MATCH`, `CONFIGURATION_GUIDANCE`, `KNOWN_WORKAROUND`, `CODE_FIX_PREPARED`)
- `TicketStatus` enum includes `AI_INVESTIGATING`, `AI_RESOLVED`, `NEEDS_MANUAL_REVIEW`
- `resolvedBy` enum: `AI`, `DEVELOPER`
- Support service has `createTicket()`, `listTickets()`, `getTicket()` but no update method
- No AI/Ollama integration anywhere, no support triage processor, no support queue

### Implementation Steps

**API**

1. Add support queue constant in `apps/api/src/bullmq/queue.constants.ts`:
   ```typescript
   export const QUEUE_SUPPORT = 'support'
   ```

2. Register support queue in BullMQ module configuration (follow pattern of existing queues)

3. Create `apps/api/src/jobs/support-triage.processor.ts`:
   - Decorate with `@Processor(QUEUE_SUPPORT)`
   - Handle job name `triageSupportTicket`
   - Job payload: `{ ticketId: string }`

4. Processor pipeline:
   ```
   a. Fetch ticket with relations (user, tenant)
   b. Set status = AI_INVESTIGATING
   c. Build context:
      - Ticket body and type
      - Tenant config snapshot (business type, active services)
      - User's recent bookings/payments (last 5)
      - Any related error context from ticket metadata
   d. Call Ollama API:
      - URL: process.env.OLLAMA_URL || 'http://localhost:11434'
      - Model: 'qwen3-coder-next' (available locally per MEMORY.md)
      - Endpoint: POST /api/generate
      - Prompt: system prompt with SavSpot context + classification instructions
      - Ask model to: classify issue, determine if auto-resolvable, draft response
   e. Parse AI response:
      - If high-confidence match to known pattern:
        - Set aiDiagnosis, aiResponse, aiResolutionType
        - Set status = AI_RESOLVED, resolvedBy = AI
        - Queue email to user with AI response via communications queue
      - If uncertain or complex:
        - Set aiDiagnosis (what AI found)
        - Set status = NEEDS_MANUAL_REVIEW
        - Send notification to platform admin
   ```

5. Add `OLLAMA_URL` to environment config:
   - In `.env.example`: `OLLAMA_URL=http://localhost:11434`
   - In config validation schema

6. Create `apps/api/src/jobs/support-escalation.processor.ts`:
   - Cron: every 30 minutes
   - Find tickets with `status = NEEDS_MANUAL_REVIEW` and `createdAt < 4 hours ago` without response
   - Send escalation email to platform admin

7. Wire up job enqueue in `apps/api/src/support/support.service.ts`:
   - In `createTicket()`, after Prisma create, add:
     ```typescript
     await this.supportQueue.add('triageSupportTicket', { ticketId: ticket.id })
     ```

8. Add `updateTicket()` method to `SupportService`:
   - Allow status transitions, AI field updates
   - Used by the processor and potentially by admin manual resolution

9. Register both processors in `jobs.module.ts`

**Tests**

10. `support-triage.processor.spec.ts` -- mock Ollama API response, verify status transitions, verify email enqueue
11. `support-escalation.processor.spec.ts` -- verify 4-hour threshold, verify escalation email

---

## M9: CSRF Protection

### Spec Requirement
- **SRS-4 Section 28:** "CSRF protection: SameSite=Strict + CSRF tokens"

### What Exists
- `SecurityHeadersMiddleware` at `apps/api/src/common/middleware/security-headers.middleware.ts` -- sets CSP, X-Frame-Options, X-Content-Type-Options
- No CSRF middleware, no csurf package, no cookie SameSite configuration for auth
- Need to determine: Does the API use httpOnly cookies for JWT storage, or Authorization header?

### Pre-Implementation Investigation Required

Before implementing, verify these facts in the codebase:

- **Q1:** How does the frontend send the JWT? Check `apps/web` API client/fetch wrapper for `Authorization: Bearer` header vs cookies
- **Q2:** Are auth tokens stored in httpOnly cookies? Check `apps/api/src/auth/` token response handling
- **Q3:** What HTTP adapter does NestJS use? Check `apps/api/src/main.ts` for Express vs Fastify
- **Q4:** Is the frontend same-origin with the API in production? (e.g., `app.savspot.com` + `api.savspot.com` vs same domain)

### Implementation Steps (conditional on investigation)

**Scenario A: API uses Authorization header (no cookies)**
- CSRF is NOT applicable (CSRF only exploits automatic cookie sending)
- Verify no httpOnly cookie auth path exists
- Document decision: "CSRF protection not needed because auth uses Authorization header, which is not automatically attached by browsers"
- The SameSite=Strict requirement still applies to any session/preference cookies

**Scenario B: API uses httpOnly cookies**
1. Install CSRF package based on HTTP adapter:
   - Express: `pnpm add csurf` in `apps/api`
   - Fastify: `pnpm add @fastify/csrf-protection` in `apps/api`

2. Configure CSRF middleware in `apps/api/src/main.ts`:
   - Double-submit cookie pattern: server sets CSRF token cookie, client reads and sends in `X-CSRF-Token` header
   - Apply to all state-changing routes (POST, PATCH, PUT, DELETE)

3. Create `GET /api/auth/csrf-token` endpoint:
   - Returns CSRF token for SPA to include in subsequent requests
   - Token rotated per session

4. Exempt endpoints:
   - Stripe webhook endpoints (verified by Stripe signature, not cookies)
   - Public booking session creation (guest users, no cookie auth)
   - Health check endpoints

5. Frontend integration:
   - On app load, fetch CSRF token from `/api/auth/csrf-token`
   - Include `X-CSRF-Token` header in all state-changing API calls
   - Refresh token on 403 CSRF error

6. Set `SameSite=Strict` on all auth-related cookies as defense-in-depth

**Tests**

7. Verify state-changing request without CSRF token returns 403
8. Verify webhook endpoints work without CSRF token
9. Verify valid CSRF token allows requests

---

## M10: Gallery Photos CRUD

### Spec Requirement
- **SRS-2 line 909:** `GET /api/tenants/:id/gallery` (`?venue_id&service_id`), `POST /api/tenants/:id/gallery`, `PATCH /api/gallery/:id`, `DELETE /api/gallery/:id`
- **SRS-2 line 623:** `gallery_photos: id, tenant_id, venue_id (nullable), service_id (nullable), category, url (R2), thumbnail_url, alt_text, caption, is_featured, sort_order, width, height, file_size, created_at`

### What Exists
- Prisma `GalleryPhoto` model at `prisma/schema.prisma` with all fields and relations
- Listed in `prisma-tenant.extension.ts` for RLS filtering
- Upload infrastructure exists: presign + confirm flow via `apps/api/src/uploads/`
- No gallery module, controller, service, or frontend page

### Implementation Steps

**API (apps/api/src/gallery/)**

1. Create `gallery.module.ts`

2. Create `dto/create-gallery-photo.dto.ts`:
   ```
   Fields: url (string, required), thumbnailUrl (string, optional),
   venueId (UUID, optional), serviceId (UUID, optional),
   category (string, optional), altText (string, optional),
   caption (string, optional), isFeatured (boolean, default false),
   sortOrder (int, default 0), width (int, optional),
   height (int, optional), fileSize (int, optional)
   ```

3. Create `dto/update-gallery-photo.dto.ts`:
   - `PartialType(CreateGalleryPhotoDto)` excluding `url` (can't change the file, only metadata)

4. Create `gallery.service.ts`:
   - `findAll(tenantId, filters?: { venueId?, serviceId? })` -- list with optional venue/service filter, ordered by `sortOrder`
   - `create(tenantId, dto)` -- validate venueId/serviceId belong to tenant if provided
   - `update(id, dto)` -- validate ownership via RLS
   - `remove(id)` -- hard delete (photo record + optionally trigger R2 object deletion)

5. Create `gallery.controller.ts`:
   ```
   @UseGuards(JwtAuthGuard, TenantRolesGuard)
   GET    /api/tenants/:tenantId/gallery   -> findAll   (query params: venue_id, service_id)
   POST   /api/tenants/:tenantId/gallery   -> create    @Roles('OWNER', 'ADMIN')
   PATCH  /api/gallery/:id                 -> update    @Roles('OWNER', 'ADMIN')
   DELETE /api/gallery/:id                 -> remove    @Roles('OWNER', 'ADMIN')
   ```

6. Register `GalleryModule` in `app.module.ts`

**Frontend**

7. Gallery management could live on venue/service edit pages as a photo section, or as a standalone settings page. Determine based on existing UI patterns.
   - If standalone: create `apps/web/src/app/(dashboard)/settings/gallery/page.tsx`
   - Photo grid with upload button (uses existing presign flow), drag-to-reorder (sort_order), featured toggle, edit alt text/caption, delete

**Tests**

8. `gallery.service.spec.ts` -- CRUD, venue/service filter, sort order
9. `gallery.controller.spec.ts` -- auth, role guards, query param filtering

---

## S1: Onboarding Tours

### Spec Requirement
- **SRS-2 line 948:** `GET /api/users/me/tours`, `PATCH /api/users/me/tours/:tourKey`
- **Table:** `onboarding_tours: id, user_id, tour_key, completed_at, dismissed_at, steps_completed, total_steps, created_at. Unique: (user_id, tour_key). No tenant_id.`

### What Exists
- Prisma `OnboardingTour` model at `prisma/schema.prisma:2006-2020`
- No API module, no frontend components

### Implementation Steps

**API (apps/api/src/onboarding-tours/)**

1. Create `onboarding-tours.module.ts`

2. Create `dto/update-tour.dto.ts`:
   ```
   Fields: completedAt (datetime, optional), dismissedAt (datetime, optional),
   stepsCompleted (int, optional)
   ```

3. Create `onboarding-tours.service.ts`:
   - `findAll(userId)` -- return all tour records for user
   - `update(userId, tourKey, dto)` -- upsert tour record (create if first interaction)

4. Create `onboarding-tours.controller.ts`:
   ```
   @UseGuards(JwtAuthGuard)
   GET   /api/users/me/tours            -> findAll
   PATCH /api/users/me/tours/:tourKey   -> update
   ```
   - Note: No `TenantRolesGuard` needed (user-scoped, not tenant-scoped)

5. Register module in `app.module.ts`

**Frontend:** Tour UI components deferred until UX designs exist. API is the deliverable for Phase 1.

**Tests**

6. `onboarding-tours.service.spec.ts` -- findAll, upsert on first interaction, complete, dismiss

---

## S2: Apple Sign-In

### Spec Requirement
- **PRD FR-AUTH-3 (Should/P1):** "Apple Sign-In"

### What Exists
- Google OAuth strategy at `apps/api/src/auth/strategies/google.strategy.ts` (reference pattern)
- Google OAuth button in frontend at `apps/web/src/components/auth/google-button.tsx`
- No Apple-related code or packages

### External Blocker
- Requires Apple Developer account configuration: Team ID, Key ID, Service ID, private key file
- Cannot be implemented without these credentials

### Implementation Steps (once credentials available)

**API**

1. Install: `cd apps/api && pnpm add passport-apple`

2. Create `apps/api/src/auth/strategies/apple.strategy.ts`:
   - Follow `google.strategy.ts` pattern
   - Configure with: `clientID` (Service ID), `teamID`, `keyID`, `privateKeyPath`, `callbackURL`
   - `validate()` callback: extract `email`, `firstName`, `lastName` from Apple profile
   - Call `authService.validateOAuthUser()` (same as Google flow)

3. Add `POST /api/auth/apple` and `GET /api/auth/apple/callback` to `AuthController`

4. Add environment variables to `.env.example`:
   ```
   APPLE_CLIENT_ID=
   APPLE_TEAM_ID=
   APPLE_KEY_ID=
   APPLE_PRIVATE_KEY_PATH=
   APPLE_CALLBACK_URL=
   ```

**Frontend**

5. Create `apps/web/src/components/auth/apple-button.tsx` following `google-button.tsx` pattern
6. Add to login and register pages alongside Google button

**Tests**

7. `apple.strategy.spec.ts` -- mock Apple OAuth response, verify user creation/lookup

---

## S3: QR Code Generation

### Spec Requirement
- **PRD FR-BP-7 (Should/P1):** "QR code generation for booking URL"
- **SRS-2 line 875:** `GET /api/booking-pages/:slug/qr`

### What Exists
- `PublicBookingController` at `apps/api/src/public-booking/public-booking.controller.ts`
- No QR code package or endpoint

### Implementation Steps

1. Install: `cd apps/api && pnpm add qrcode @types/qrcode`

2. Add endpoint to `PublicBookingController`:
   ```typescript
   @Get(':slug/qr')
   @Header('Content-Type', 'image/png')
   async getQrCode(@Param('slug') slug: string, @Res() res: Response) {
     // Verify slug exists
     const tenant = await this.service.findBySlug(slug)
     if (!tenant) throw new NotFoundException()

     const url = `${this.configService.get('PUBLIC_URL')}/book/${slug}`
     const buffer = await QRCode.toBuffer(url, { width: 300, margin: 2 })
     res.send(buffer)
   }
   ```

3. Add `PUBLIC_URL` to environment config if not already present

**Tests**

4. Verify endpoint returns valid PNG for existing slug, 404 for non-existent

---

## S4: JSON-LD Structured Data

### Spec Requirement
- **PRD FR-BP-9 (Should/P1):** "JSON-LD structured data (schema.org LocalBusiness + Service) on booking pages"

### What Exists
- Booking page layout at `apps/web/src/app/book/[slug]/layout.tsx` with OG + Twitter meta tags
- `generateMetadata` already fetches tenant data + services

### Implementation Steps

1. In `apps/web/src/app/book/[slug]/layout.tsx`:
   - Build JSON-LD objects from existing metadata fetch:
     ```typescript
     const jsonLd = {
       '@context': 'https://schema.org',
       '@type': 'LocalBusiness',
       name: tenant.businessName,
       description: tenant.description,
       url: `${baseUrl}/book/${slug}`,
       image: tenant.logoUrl,
       address: tenant.address ? {
         '@type': 'PostalAddress',
         streetAddress: tenant.address.street,
         addressLocality: tenant.address.city,
         addressRegion: tenant.address.state,
         postalCode: tenant.address.zip,
         addressCountry: tenant.address.country,
       } : undefined,
       telephone: tenant.phone,
       makesOffer: services.map(s => ({
         '@type': 'Offer',
         itemOffered: {
           '@type': 'Service',
           name: s.name,
           description: s.description,
         },
         price: s.price,
         priceCurrency: tenant.currency || 'USD',
       })),
     }
     ```
   - Inject in layout body:
     ```tsx
     <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
     ```

**Tests**

2. Verify JSON-LD script tag renders in page source with correct schema.org structure

---

## S5: Sitemap Generation

### Spec Requirement
- **PRD FR-BP-9 (Should/P1):** "auto-generated sitemap.xml for all published booking pages"

### What Exists
- Nothing (no sitemap.ts or robots.ts)

### Implementation Steps

1. Create `apps/web/src/app/sitemap.ts`:
   ```typescript
   import { MetadataRoute } from 'next'

   export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
     const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://savspot.com'

     // Fetch all active/published tenant slugs from API
     const res = await fetch(`${process.env.API_URL}/api/public/booking-pages`)
     const slugs: string[] = await res.json()

     const staticPages = [
       { url: baseUrl, lastModified: new Date() },
       { url: `${baseUrl}/privacy`, lastModified: new Date() },
       { url: `${baseUrl}/terms`, lastModified: new Date() },
     ]

     const bookingPages = slugs.map(slug => ({
       url: `${baseUrl}/book/${slug}`,
       lastModified: new Date(),
       changeFrequency: 'weekly' as const,
     }))

     return [...staticPages, ...bookingPages]
   }
   ```

2. Create `apps/web/src/app/robots.ts`:
   ```typescript
   import { MetadataRoute } from 'next'

   export default function robots(): MetadataRoute.Robots {
     const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://savspot.com'
     return {
       rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/dashboard/'] },
       sitemap: `${baseUrl}/sitemap.xml`,
     }
   }
   ```

3. If no public endpoint exists to list all published slugs, add one:
   - `GET /api/public/booking-pages` -- returns array of slugs for `isPublished = true` tenants

---

## S6: admin:feedback CLI

### Spec Requirement
- **PRD FR-FBK-3 (Should/P1):** "Phase 1 CLI script (pnpm admin:feedback) to list new feedback items filtered by type, tenant, and status. COMPARISON_NOTE type items are flagged prominently as competitive intelligence."

### What Exists
- 7 admin scripts in `scripts/admin/` with shared utilities in `_shared.ts`
- Pattern: each script uses `_shared.ts` for Prisma client, argument parsing, table output
- No `feedback.ts` script

### Implementation Steps

1. Create `scripts/admin/feedback.ts` following existing pattern from `_shared.ts`:
   ```
   Usage: pnpm admin:feedback [options]

   Options:
     --type <type>        Filter by type (FEATURE_REQUEST, UX_FRICTION, COMPARISON_NOTE, GENERAL)
     --status <status>    Filter by status
     --tenant <id>        Filter by tenant ID
     --since <date>       Only show items after date (ISO format)
     --acknowledge <id>   Mark feedback item as ACKNOWLEDGED

   Output columns: Date, Type, Tenant, User, Body (truncated to 80 chars), Status
   COMPARISON_NOTE items highlighted/flagged with [COMPETITIVE] prefix
   ```

2. Add script entry in root `package.json`:
   ```json
   "admin:feedback": "tsx scripts/admin/feedback.ts"
   ```

---

## S7: Notification Preferences Wiring

### Spec Requirement
- **PRD FR-NOT-4 (Must/Phase 2):** Backend notification preferences API is Phase 2
- **Current state:** Frontend has simulated save with `setTimeout` (fake success)

### What Exists
- Settings page at `apps/web/src/app/(dashboard)/settings/notifications/page.tsx`
- 4 category toggles (BOOKING, PAYMENT, SYSTEM, CALENDAR) with email + push switches
- `handleSave()` at line 86-93 uses `setTimeout(resolve, 500)` to simulate save

### Implementation Steps

1. In `apps/web/src/app/(dashboard)/settings/notifications/page.tsx`:
   - Replace the simulated save with a disabled state
   - Add a note: "Notification preferences will be available in a future update"
   - Keep the toggle UI visible but non-functional (read-only / disabled)
   - Remove the fake success toast

---

## Dependency Graph & Execution Order

```
INDEPENDENT (can start immediately, in parallel):
  M1  Tax Rates CRUD (API + frontend)
  M3  Booking Flow Config (API)
  M4  Audit Logging (API, cross-cutting)
  M7  Calendar DnD (frontend only)
  M9  CSRF Protection (investigation + middleware)
  M10 Gallery Photos CRUD (API)
  B4  QR Code (trivial, S3)
  E1  JSON-LD (S4)
  E2  Sitemap (S5)
  E3  Feedback CLI (S6)
  S7  Notification Preferences cleanup

DEPENDS ON M4 (Audit Logging):
  M2  Consent Records (needs audit logging for consent changes)

DEPENDS ON M2 (Consent Records) BEING WIRED:
  Nothing blocks, but booking flow integration references consent

DEPENDS ON M1/M3 BACKENDS:
  D2  Booking Flow frontend (needs M3 API)
  D3  Tax Rates frontend (needs M1 API -- can be done together with M1)

INDEPENDENT BUT LOWER PRIORITY:
  M5  Data Export Processor (background job)
  M6  Account Deletion Processor (background job)
  M8  AI Support Triage (background job, needs Ollama)
  S1  Onboarding Tours (API only)
  S2  Apple Sign-In (blocked by Apple credentials)
```

### Recommended Execution Waves

**Wave 1 -- Parallel (no dependencies)**

| Task | Type | Scope |
|------|------|-------|
| M4: Audit Logging | API: global interceptor + service | ~300 lines |
| M9: CSRF Protection | API: investigation + middleware | ~100 lines |
| M1: Tax Rates CRUD | API + frontend settings page | ~350 lines |
| M3: Booking Flow Config | API endpoints | ~150 lines |
| M10: Gallery Photos CRUD | API module | ~200 lines |
| S3: QR Code | API endpoint | ~30 lines |
| S4: JSON-LD | Frontend layout edit | ~60 lines |
| S5: Sitemap | Frontend new files | ~40 lines |
| S6: Feedback CLI | Script | ~100 lines |
| S7: Notif Prefs | Frontend fix | ~10 lines |

**Wave 2 -- After M4 completes**

| Task | Type | Scope |
|------|------|-------|
| M2: Consent Records | API + booking integration | ~170 lines |
| M7: Calendar DnD | Frontend calendar enhancement | ~100 lines |
| M5: Data Export Processor | Background job | ~200 lines |
| M6: Account Deletion Processor | Background job + cron | ~250 lines |
| M3 frontend: Booking Flow page | Frontend settings page | ~200 lines |

**Wave 3 -- After Wave 2**

| Task | Type | Scope |
|------|------|-------|
| M8: AI Support Triage | Background job + Ollama | ~300 lines |
| S1: Onboarding Tours | API endpoints | ~100 lines |

**Wave 4 -- When external blockers clear**

| Task | Type | Scope |
|------|------|-------|
| S2: Apple Sign-In | API + frontend | ~180 lines |

---

## External Blockers

| Blocker | Affects | Resolution |
|---------|---------|------------|
| Apple Developer credentials | S2: Apple Sign-In | Configure Team ID, Key ID, Service ID, private key |
| Legal counsel | Privacy/Terms/DPA content | Not code -- placeholder pages already exist |
| Node.js 22 upgrade | All development | `sudo` required on dev machine |
| .env file creation | All development | Copy `.env.example`, fill in secrets |
| Ollama running | M8: AI Support Triage | Ollama + qwen3-coder-next available locally per setup |

---

## Total Estimated Scope

| Priority | Count | Est. Lines |
|----------|-------|-----------|
| Must (M1-M10) | 10 | ~1,850 |
| Should (S1-S7) | 7 | ~520 |
| **Total** | **17** | **~2,370** |

No architectural changes required. All gaps fit into existing patterns (NestJS modules, BullMQ processors, Next.js pages, admin CLI scripts).
