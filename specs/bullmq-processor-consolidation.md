# BullMQ Processor Consolidation Plan

**Date:** 2026-03-06
**Problem:** Multiple `@Processor(QUEUE_X)` classes per queue create competing BullMQ Worker instances. Jobs are round-robin distributed across workers, so a job can land on the wrong processor, return early via the `job.name` guard, and be marked "completed" without executing.

**Impact:** Event-driven jobs (data export, support triage, invoice PDF generation) can be silently dropped. Cron jobs are partially resilient (they retry on the next tick) but still waste cycles.

---

## Current State

| Queue | Workers | Processor Locations |
|-------|---------|-------------------|
| `QUEUE_BOOKINGS` | 4 | `jobs/expire-reservations`, `jobs/abandoned-recovery`, `jobs/process-completed-bookings`, `jobs/enforce-approval-deadlines` |
| `QUEUE_PAYMENTS` | 3 | `jobs/send-payment-reminders`, `jobs/enforce-payment-deadlines`, `jobs/retry-failed-payments` |
| `QUEUE_COMMUNICATIONS` | 6 | `communications/communications`, `sms/sms`, `sms/morning-summary`, `sms/weekly-digest`, `browser-push/browser-push`, `jobs/support-triage` |
| `QUEUE_GDPR` | 3 | `jobs/cleanup-retention`, `jobs/data-export`, `jobs/account-deletion` |
| `QUEUE_CALENDAR` | 4 | `calendar/calendar-push`, `calendar/calendar-sync`, `calendar/calendar-token`, `calendar/calendar-watch-renewal` |
| `QUEUE_INVOICES` | 1 | `jobs/generate-invoice-pdf` (no issue — single worker) |

**Total:** 21 processor classes, but should be 6 workers (one per queue).

---

## Solution: Dispatcher Pattern

For each queue with multiple processors, create a single `@Processor` dispatcher class that:
1. Is the only `WorkerHost` for that queue
2. Routes jobs by `job.name` to injected handler services
3. Each existing processor becomes a plain `@Injectable()` service (no longer extends `WorkerHost` or uses `@Processor`)

### Architecture

```
@Processor(QUEUE_BOOKINGS)
BookingsDispatcher
  ├── process(job) → switch(job.name)
  │     ├── expireReservations       → ExpireReservationsHandler.handle(job)
  │     ├── abandonedBookingRecovery → AbandonedRecoveryHandler.handle(job)
  │     ├── processCompletedBookings → ProcessCompletedBookingsHandler.handle(job)
  │     └── enforceApprovalDeadlines → EnforceApprovalDeadlinesHandler.handle(job)
  └── (unknown job.name) → logger.warn + return
```

### Per-Queue Changes

**QUEUE_BOOKINGS** — New: `jobs/bookings.dispatcher.ts`
- Handlers: `ExpireReservationsHandler`, `AbandonedRecoveryHandler`, `ProcessCompletedBookingsHandler`, `EnforceApprovalDeadlinesHandler`

**QUEUE_PAYMENTS** — New: `jobs/payments.dispatcher.ts`
- Handlers: `SendPaymentRemindersHandler`, `EnforcePaymentDeadlinesHandler`, `RetryFailedPaymentsHandler`

**QUEUE_COMMUNICATIONS** — New: `communications/communications.dispatcher.ts`
- Handlers: `CommunicationsHandler` (existing deliverCommunication + sendBookingReminders), `SmsHandler`, `MorningSummaryHandler`, `WeeklyDigestHandler`, `BrowserPushHandler`, `SupportTriageHandler`
- Spans 4 modules (communications, sms, browser-push, jobs) — the dispatcher lives in communications (where the queue is most central)

**QUEUE_GDPR** — New: `jobs/gdpr.dispatcher.ts`
- Handlers: `CleanupRetentionHandler`, `DataExportHandler`, `AccountDeletionHandler`

**QUEUE_CALENDAR** — New: `calendar/calendar.dispatcher.ts`
- Handlers: `CalendarPushHandler`, `CalendarSyncHandler`, `CalendarTokenHandler`, `CalendarWatchRenewalHandler`

**QUEUE_INVOICES** — No change (already single processor)

### Migration Steps per Queue

1. Create dispatcher class with `@Processor(QUEUE_X)` + `extends WorkerHost`
2. Refactor each existing processor:
   - Remove `@Processor()` decorator and `extends WorkerHost`
   - Add `@Injectable()` decorator
   - Rename `process(job)` → `handle(job)` (clarity)
   - Remove the `job.name` guard (dispatcher handles routing)
   - Keep constructor DI unchanged
3. Update module `providers`: replace individual processor registrations with dispatcher + handlers
4. For cross-module handlers (QUEUE_COMMUNICATIONS), export handler services and import modules into the dispatcher's module

### Bonus Fix

**DataExportProcessor** injects `UploadService` but `JobsModule` doesn't import `UploadModule`. This will be fixed as part of the GDPR dispatcher — `UploadModule` gets imported into `JobsModule`.

---

## Execution Order

1. `QUEUE_GDPR` (3 handlers, all in `jobs/`, fixes DataExport DI bug) — **DONE**
2. `QUEUE_BOOKINGS` (4 handlers, all in `jobs/`) — **DONE**
3. `QUEUE_PAYMENTS` (3 handlers, all in `jobs/`) — **DONE**
4. `QUEUE_CALENDAR` (4 handlers, all in `calendar/`) — **DONE**
5. `QUEUE_COMMUNICATIONS` (6 handlers, spans 4 modules) — **DONE**

---

## Implementation Status: COMPLETE

All 6 queues consolidated. `@Processor` count reduced from 21 to 6 (5 dispatchers + 1 standalone processor for QUEUE_INVOICES).

| Queue | Dispatcher | Location |
|-------|-----------|----------|
| QUEUE_BOOKINGS | `BookingsDispatcher` | `jobs/bookings.dispatcher.ts` |
| QUEUE_PAYMENTS | `PaymentsDispatcher` | `jobs/payments.dispatcher.ts` |
| QUEUE_GDPR | `GdprDispatcher` | `jobs/gdpr.dispatcher.ts` |
| QUEUE_CALENDAR | `CalendarDispatcher` | `calendar/calendar.dispatcher.ts` |
| QUEUE_COMMUNICATIONS | `CommunicationsDispatcher` | `communications/communications.dispatcher.ts` |
| QUEUE_INVOICES | `GenerateInvoicePdfProcessor` | (single processor, no dispatcher needed) |

### Bonus fixes included:
- `UploadModule` imported into `JobsModule` (fixes `DataExportHandler` DI for `UploadService`)
- `SupportTriageHandler` moved from `JobsModule` to `CommunicationsModule` (avoids circular deps)
