# Phase 1 Gap Closure — Implementation Plan

> **Date:** 2026-03-10
> **Status:** Draft
> **Scope:** Three gaps identified during Phase 1 completeness audit

---

## Gap 1: Cancellation Policy Evaluation

**Spec reference:** SRS-3 §2a — `evaluateCancellationPolicy(service, booking)`
**Priority:** Must (Phase 1)

### Current State

- **Schema:** `Service.cancellationPolicy Json?` exists in Prisma schema
- **Client portal** (`client-portal.service.ts:258-282`): Evaluates policy to a string label (`FREE`/`LATE`/`NO_POLICY`) but does NOT calculate a refund amount. Returns full payment amount regardless of policy.
- **Admin cancellation** (`bookings.service.ts:207-275`): Does NOT evaluate policy at all. Calls `processRefund()` with no amount parameter → always full refund.
- **PaymentsService** (`payments.service.ts:456`): `processRefund(tenantId, paymentId, amount?)` already accepts an optional amount. Stripe provider handles partial refunds. No changes needed here.
- **Event payload** (`event.types.ts:37`): `BookingCancelledPayload.refundAmount?: number` exists but is never populated.
- **Workflow engine** (`workflow-engine.service.ts:74`): Cancellation email template already renders `refundAmount` if present — currently receives `undefined`.
- **Field name mismatch:** Client portal uses `late_cancellation_fee_percent` / `late_cancellation_flat_fee`. Spec uses `late_cancel_fee_type` + `late_cancel_fee_amount` + `no_refund_hours`.

### Implementation

#### Step 1: Create `CancellationPolicyEvaluator` utility

**File:** `apps/api/src/bookings/cancellation-policy.evaluator.ts`

A pure function (no dependencies, fully unit-testable) that implements the SRS-3 §2a algorithm exactly:

```
Input:
  - policy: CancellationPolicy | null (the JSONB value from service)
  - bookingStartTime: Date
  - totalAmount: number (from succeeded payment or booking total)
  - now?: Date (injectable for testing)

Output:
  - refundType: 'FULL_REFUND' | 'PARTIAL_REFUND' | 'NO_REFUND'
  - refundAmount: number (rounded to 2 decimal places)
  - fee: number (rounded to 2 decimal places)
```

**Type definition** (replaces the local interface in `client-portal.service.ts:19-23`):

```ts
export interface CancellationPolicy {
  free_cancellation_hours: number;
  late_cancel_fee_type: 'percentage' | 'fixed';
  late_cancel_fee_amount: number;
  no_refund_hours: number;
}

export const DEFAULT_CANCELLATION_POLICY: CancellationPolicy = {
  free_cancellation_hours: 24,
  late_cancel_fee_type: 'percentage',
  late_cancel_fee_amount: 0,
  no_refund_hours: 0,
};
```

The evaluator function must handle:
1. `policy == null` → apply default (free cancel 24h before, no fee)
2. `hours_until_start >= free_cancellation_hours` → FULL_REFUND
3. `no_refund_hours > 0 && hours_until_start <= no_refund_hours` → NO_REFUND
4. Otherwise → calculate fee based on `late_cancel_fee_type` (percentage or fixed), return PARTIAL_REFUND

#### Step 2: Update admin cancellation (`bookings.service.ts`)

In the `cancel()` method (line 207):

1. After fetching the booking (line 213), extract `cancellationPolicy` from `booking.service` (already included via `findById` at line 130).
2. Determine `totalAmount` from the succeeded payment (if any) at line 238.
3. Call `evaluateCancellationPolicy(policy, booking.startTime, totalAmount)`.
4. Pass `result.refundAmount` to `processRefund()` at line 244 (replacing the no-argument call).
5. Include `refundAmount: result.refundAmount` in the event emission at line 260.
6. Store the evaluation result in `BookingStateHistory.metadata` (like client portal does).

**Change at line 244:**
```ts
// Before:
await this.paymentsService.processRefund(tenantId, succeededPayment.id);

// After:
const policyResult = evaluateCancellationPolicy(
  booking.service.cancellationPolicy as CancellationPolicy | null,
  booking.startTime,
  succeededPayment.amount.toNumber(),
);
await this.paymentsService.processRefund(tenantId, succeededPayment.id, policyResult.refundAmount);
```

#### Step 3: Update client portal cancellation (`client-portal.service.ts`)

1. Remove the local `CancellationPolicy` interface (lines 17-23). Import from the evaluator module.
2. Replace the inline evaluation logic (lines 258-282) with a call to `evaluateCancellationPolicy()`.
3. Use the result to populate `refundInfo.amount` with the actual calculated refund amount (not the full payment amount as currently done at line 336).
4. If a succeeded payment exists and `policyResult.refundAmount > 0`, call `processRefund()` with the calculated amount. Currently the client portal only "flags" the refund but never processes it.

#### Step 4: Populate event payload

In both cancellation paths, ensure the `BookingCancelledPayload` includes:
```ts
refundAmount: policyResult.refundAmount
```

This flows through to `workflow-engine.service.ts` where the cancellation email template already renders it.

#### Step 5: Update `create-service.dto.ts` validation

Add structural validation for the `cancellationPolicy` JSON field to enforce the spec schema:
- `free_cancellation_hours`: positive number
- `late_cancel_fee_type`: `'percentage' | 'fixed'`
- `late_cancel_fee_amount`: non-negative number
- `no_refund_hours`: non-negative number

Use `class-validator` with a nested DTO or a custom validator.

#### Step 6: Migration for existing data

The client portal uses `late_cancellation_fee_percent` / `late_cancellation_flat_fee` while the spec uses `late_cancel_fee_type` + `late_cancel_fee_amount`. Since `cancellationPolicy` is a JSONB column and existing data may use either field naming:
- The evaluator should accept both field naming conventions during a transition period, preferring the spec naming.
- Alternatively, write a data migration script to normalize any existing JSONB values to the spec schema.
- Check the seed data and onboarding presets for which naming they use and align.

#### Tests

**File:** `apps/api/src/bookings/cancellation-policy.evaluator.spec.ts`

| Test case | Input | Expected |
|-----------|-------|----------|
| Null policy → default (>24h before) | policy=null, 48h before, $100 | FULL_REFUND, $100, $0 |
| Null policy → default (<24h before) | policy=null, 12h before, $100 | FULL_REFUND, $100, $0 (default fee is 0%) |
| Free window | 48h before, free=24h | FULL_REFUND, $100, $0 |
| Exactly at boundary | 24h before, free=24h | FULL_REFUND, $100, $0 |
| Late cancel (percentage) | 12h before, free=24h, 50% | PARTIAL_REFUND, $50, $50 |
| Late cancel (fixed) | 12h before, free=24h, $30 fixed | PARTIAL_REFUND, $70, $30 |
| Fixed fee exceeds total | 12h before, $25 booking, $30 fixed fee | PARTIAL_REFUND, $0, $25 |
| No-refund window | 1h before, no_refund=2h | NO_REFUND, $0, $100 |
| Past start time | -1h, free=24h | NO_REFUND or LATE depending on no_refund_hours |
| Zero total amount | any timing, $0 | FULL_REFUND, $0, $0 |

**Integration tests:** Add cancellation scenarios to existing booking E2E tests that verify refund amounts reach `PaymentsService.processRefund()` with correct values.

### Files Changed

| File | Change |
|------|--------|
| `apps/api/src/bookings/cancellation-policy.evaluator.ts` | **New** — pure evaluation function + types |
| `apps/api/src/bookings/cancellation-policy.evaluator.spec.ts` | **New** — unit tests |
| `apps/api/src/bookings/bookings.service.ts` | Update `cancel()` to evaluate policy and pass refund amount |
| `apps/api/src/client-portal/client-portal.service.ts` | Replace inline evaluation with shared evaluator, process refund |
| `apps/api/src/services/dto/create-service.dto.ts` | Add structural validation for cancellationPolicy JSON |

---

## Gap 2: Data Import Pipeline — ImportJob/ImportRecord Tracking + Service Import

**Spec reference:** PRD §3.13 — FR-IMP-1 (Must, Phase 1), FR-IMP-3 (Should, Phase 1), FR-IMP-4 (Could, Phase 1)
**Priority:** Must (FR-IMP-1 tracking), Should (FR-IMP-3), Could (FR-IMP-4)

### Current State

- **Schema:** `ImportJob` and `ImportRecord` models fully defined in Prisma schema with all fields, enums (`SourcePlatform`, `ImportType`, `ImportJobStatus`, `ImportRecordStatus`), and indexes. Migrations applied.
- **Shared types:** `packages/shared/src/enums/import.enums.ts` has Zod validators for all import enums.
- **CLI script:** `scripts/admin/import-clients.ts` (278 lines) imports clients from CSV. Functional with dry-run, skip-duplicates, update-existing flags.
- **Gap 1:** CLI script does NOT create `ImportJob` or `ImportRecord` entries. No audit trail.
- **Gap 2:** CLI script does NOT accept `--source-platform` argument. No platform-specific column mappings.
- **Gap 3:** CLI script only deduplicates on email. Spec requires phone as secondary match.
- **Gap 4:** No `import-services.ts` script (FR-IMP-3).
- **Gap 5:** No `import-appointments.ts` script (FR-IMP-4).
- **No API endpoints** for import (Phase 2 per FR-IMP-2).
- **No BullMQ processor** for import (Phase 2 per FR-IMP-2).

### Implementation

#### Step 1: Update `import-clients.ts` — add job tracking

Modify the existing script to:

1. **Accept `--source-platform` flag** (default: `CSV_GENERIC`). Validate against `SourcePlatform` enum.

2. **Create ImportJob record** at the start of the import:
   ```ts
   const importJob = await prisma.importJob.create({
     data: {
       tenantId,
       sourcePlatform: sourcePlatform,
       importType: 'CLIENTS',
       status: 'PROCESSING',
       initiatedById: adminUserId, // new required param or use a platform admin sentinel
     },
   });
   ```

3. **Create ImportRecord for each row** (inside the per-row try/catch):
   ```ts
   await prisma.importRecord.create({
     data: {
       importJobId: importJob.id,
       rowNumber: lineNum,
       status: created ? 'IMPORTED' : skipped ? 'SKIPPED_DUPLICATE' : 'ERROR',
       targetTable: 'users',
       targetId: existingUser?.id ?? null,
       rawData: row as Prisma.InputJsonValue,
       errorMessage: errorMsg ?? null,
     },
   });
   ```

4. **Update ImportJob on completion** with stats and status:
   ```ts
   await prisma.importJob.update({
     where: { id: importJob.id },
     data: {
       status: errorCount > 0 ? 'COMPLETED' : 'COMPLETED', // FAILED only if fatal
       completedAt: new Date(),
       stats: { total: dataRows, created, updated, skipped, errors: errorCount },
       errorLog: errors.length > 0 ? errors : Prisma.DbNull,
     },
   });
   ```

5. **Add phone-based secondary deduplication.** When email match is not found, check for existing user by phone number before creating.

6. **Add platform-specific column mappings.** Define a mapping object keyed by `SourcePlatform`:
   ```ts
   const COLUMN_MAPPINGS: Record<string, Record<string, string>> = {
     BOOKSY: { 'Client Email': 'email', 'Client Name': 'name', 'Phone': 'phone' },
     CSV_GENERIC: { email: 'email', name: 'name', phone: 'phone', tags: 'tags', notes: 'notes' },
     // Add others as needed
   };
   ```
   Apply mapping after reading the header row to normalize column names.

7. **Skip ImportJob/ImportRecord creation in dry-run mode** (dry run should remain side-effect-free).

#### Step 2: Create `import-services.ts` script (FR-IMP-3)

**File:** `scripts/admin/import-services.ts`

```
Usage: pnpm admin:import-services <tenant-id> <csv-file> [--dry-run] [--skip-duplicates] [--update-existing] [--source-platform BOOKSY|CSV_GENERIC|...]
```

CSV columns (CSV_GENERIC): `name`, `duration_minutes`, `price`, `currency`, `description`, `category`

Logic:
1. Create `ImportJob` with `importType: 'SERVICES'`
2. Parse CSV with platform-specific column mapping
3. Deduplicate on service name within tenant (exact match, case-insensitive)
4. For each row:
   - Create/update `Service` record
   - Create `ImportRecord` entry
5. Update `ImportJob` with stats on completion

Platform-specific mappings:
- **BOOKSY:** Map Booksy's service export columns (name, duration, price) to SavSpot schema
- **CSV_GENERIC:** Direct mapping with documented column names

#### Step 3: Create `import-appointments.ts` script (FR-IMP-4)

**File:** `scripts/admin/import-appointments.ts`

```
Usage: pnpm admin:import-appointments <tenant-id> <csv-file> [--dry-run] [--source-platform BOOKSY|CSV_GENERIC|...]
```

CSV columns (CSV_GENERIC): `client_email`, `service_name`, `start_time`, `end_time`, `status`, `notes`

Logic:
1. Create `ImportJob` with `importType: 'APPOINTMENTS'`
2. Parse CSV with platform-specific column mapping
3. For each row:
   - Resolve client by email (must already exist)
   - Resolve service by name within tenant (must already exist)
   - Create `Booking` with `status: 'COMPLETED'`, `source: 'IMPORT'`
   - Do NOT create payments, invoices, or calendar events for imported bookings
   - Create `ImportRecord` entry
4. Update `ImportJob` with stats

Constraints per spec:
- All imported appointments tagged `status = COMPLETED` and `source = IMPORT`
- No effect on payment flows or calendar sync
- Skip rows where client or service cannot be resolved (log as error)

#### Step 4: Add `admin:import-services` and `admin:import-appointments` to package.json scripts

Add script entries in root `package.json` (alongside existing `admin:import-clients`).

#### Tests

| Script | Test approach |
|--------|--------------|
| `import-clients.ts` | Integration test: run against test DB, verify ImportJob + ImportRecord created, verify phone dedup |
| `import-services.ts` | Integration test: run against test DB, verify services created, dedup on name |
| `import-appointments.ts` | Integration test: run against test DB, verify bookings created with COMPLETED/IMPORT, no side effects |

### Files Changed

| File | Change |
|------|--------|
| `scripts/admin/import-clients.ts` | Add ImportJob/ImportRecord tracking, phone dedup, source-platform flag, column mappings |
| `scripts/admin/import-services.ts` | **New** — service import CLI script |
| `scripts/admin/import-appointments.ts` | **New** — appointment history import CLI script |
| `package.json` | Add `admin:import-services` and `admin:import-appointments` script entries |

---

## Gap 3: 24-Hour Booking Reminders

**Spec reference:** PRD FR-COM-1a (Must, Phase 1), SRS-3 §19 — `sendBookingReminders`
**Priority:** Must (Phase 1)

### Current State

- **Job constant:** `JOB_SEND_BOOKING_REMINDERS = 'sendBookingReminders'` defined in `queue.constants.ts:56`
- **Dispatcher:** Routes `JOB_SEND_BOOKING_REMINDERS` to `communications.handle(job)` in `communications.dispatcher.ts:41`
- **Processor:** `communications.processor.ts:62` treats `JOB_SEND_BOOKING_REMINDERS` as alias for `JOB_PROCESS_POST_APPOINTMENT` — calls `handleProcessPostAppointment()` which sends **follow-up** emails (24h AFTER completion), NOT reminders.
- **Template:** `renderBookingReminder()` exists in `communications.service.ts:241-266` — fully implemented "Appointment Reminder" email with service name, date/time, and provider.
- **Schema:** `BookingReminder` model exists with `reminderType: 'BOOKING'`, `intervalDays`, deduplication unique constraint on `(bookingId, reminderType, intervalDays, channel)`.
- **Event type:** `REMINDER_DUE` and `ReminderDuePayload` defined in `event.types.ts:17, 59-69`.
- **Scheduler:** `JOB_SEND_BOOKING_REMINDERS` is NOT registered in `job-scheduler.service.ts`. The job never runs.
- **Reference implementation:** `send-payment-reminders.processor.ts` (165 lines) follows the exact same pattern needed — query for upcoming items, deduplicate via `BookingReminder` table, enqueue `deliverCommunication` job. Direct template to follow.

### Implementation

#### Step 1: Create `send-booking-reminders.processor.ts`

**File:** `apps/api/src/jobs/send-booking-reminders.processor.ts`

Modeled directly on `send-payment-reminders.processor.ts`:

```ts
@Injectable()
export class SendBookingRemindersHandler {
  private static readonly REMINDER_INTERVALS = [1] as const; // 1 day = 24h

  async handle(_job: Job): Promise<void> {
    // 1. Query CONFIRMED bookings starting in next 24-25 hours
    //    (25h window ensures 15-min cron doesn't miss any)
    const upcomingBookings = await this.prisma.$queryRaw<UpcomingBookingRow[]>`
      SELECT
        b.id,
        b.tenant_id,
        b.start_time,
        b.client_id,
        b.service_id,
        u.email AS client_email,
        u.name AS client_name,
        s.name AS service_name,
        t.name AS business_name,
        t.slug AS tenant_slug,
        t.branding
      FROM bookings b
      JOIN users u ON u.id = b.client_id
      JOIN services s ON s.id = b.service_id
      JOIN tenants t ON t.id = b.tenant_id
      WHERE b.status = 'CONFIRMED'
        AND b.start_time > NOW()
        AND b.start_time <= NOW() + INTERVAL '25 hours'
    `;

    // 2. For each booking, for each interval:
    //    a. Set tenant context
    //    b. Check BookingReminder dedup (bookingId, BOOKING, intervalDays=1, EMAIL)
    //    c. If not exists, create BookingReminder + enqueue deliverCommunication
    // 3. Log count of reminders sent
  }
}
```

Key details:
- Query window is `NOW()` to `NOW() + 25 hours` (not exactly 24h) to ensure the 15-minute cron cycle doesn't miss bookings at the boundary.
- Deduplication via `BookingReminder` unique constraint prevents duplicate sends.
- Enqueue `JOB_DELIVER_COMMUNICATION` with `template: 'booking-reminder'` and data payload matching `renderBookingReminder()` parameters: `clientName`, `serviceName`, `dateTime`, `providerName`, plus branding fields.
- Set tenant context in transaction for RLS compliance.

#### Step 2: Register in dispatcher

The dispatcher (`communications.dispatcher.ts:41`) already routes `JOB_SEND_BOOKING_REMINDERS` to `communications.handle(job)`. However, the processor (`communications.processor.ts:62`) currently aliases it to `handleProcessPostAppointment()`.

**Fix:** Add a new case branch in `communications.processor.ts`:

```ts
case JOB_SEND_BOOKING_REMINDERS:
  await this.handleSendBookingReminders(job);
  break;
```

Where `handleSendBookingReminders` delegates to the new `SendBookingRemindersHandler.handle()`.

Alternatively, if the pattern follows `send-payment-reminders.processor.ts` (which is injected as a handler called from the dispatcher), inject `SendBookingRemindersHandler` into the dispatcher and route directly.

Check how `SendPaymentRemindersHandler` is wired to determine the correct pattern.

#### Step 3: Register in job scheduler

Add to the `schedules` array in `job-scheduler.service.ts:57`:

```ts
{ queue: this.commsQueue, name: JOB_SEND_BOOKING_REMINDERS, pattern: CRON_EVERY_15_MIN },
```

This runs the reminder check every 15 minutes, matching the payment reminders cadence.

#### Step 4: Remove the alias in processor

In `communications.processor.ts:62`, the current code:
```ts
case JOB_SEND_BOOKING_REMINDERS:
  await this.handleProcessPostAppointment();
```

must be changed to route to the new handler instead. The `JOB_SEND_BOOKING_REMINDERS` case should NOT fall through to `handleProcessPostAppointment()`.

#### Tests

**File:** `apps/api/src/jobs/send-booking-reminders.processor.spec.ts`

| Test case | Setup | Expected |
|-----------|-------|----------|
| Sends reminder for booking 23h away | CONFIRMED booking, start_time = now + 23h | BookingReminder created, communication job enqueued |
| Does not send for booking 26h away | CONFIRMED booking, start_time = now + 26h | No action |
| Does not send for CANCELLED booking | CANCELLED booking, start_time = now + 23h | No action |
| Does not send for PENDING booking | PENDING booking, start_time = now + 23h | No action (only CONFIRMED) |
| Deduplication prevents double send | Run twice for same booking | Only one BookingReminder, one communication job |
| Multiple bookings across tenants | 3 bookings, 2 tenants | 3 reminders with correct tenant context |

### Files Changed

| File | Change |
|------|--------|
| `apps/api/src/jobs/send-booking-reminders.processor.ts` | **New** — booking reminder handler |
| `apps/api/src/jobs/send-booking-reminders.processor.spec.ts` | **New** — unit tests |
| `apps/api/src/communications/communications.processor.ts` | Remove alias, route to new handler |
| `apps/api/src/jobs/job-scheduler.service.ts` | Register `JOB_SEND_BOOKING_REMINDERS` in schedules array |
| `apps/api/src/communications/communications.module.ts` | Provide `SendBookingRemindersHandler` (if needed based on wiring pattern) |

---

## Execution Order

The three gaps are independent and can be implemented in parallel. If done sequentially:

1. **Gap 1: Cancellation Policy** — Highest risk (money logic), most architectural change
2. **Gap 3: Booking Reminders** — Straightforward, follows existing pattern exactly
3. **Gap 2: Data Import** — Lowest risk, additive CLI changes

## Summary

| Gap | Spec Ref | New Files | Modified Files | Estimated Tests |
|-----|----------|-----------|----------------|-----------------|
| Cancellation Policy Evaluation | SRS-3 §2a | 2 | 3 | ~10 unit + integration |
| Data Import Tracking + Scripts | FR-IMP-1,3,4 | 2 | 2 | ~9 integration |
| 24h Booking Reminders | FR-COM-1a | 2 | 3 | ~6 unit |
| **Total** | | **6** | **8** | **~25** |
