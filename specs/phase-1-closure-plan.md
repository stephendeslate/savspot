# Phase 1 Closure Plan

**Date:** 2026-03-07 | **Author:** SD Solutions, LLC
**Status:** COMPLETE — All gaps implemented and tested (785 tests, 51 test files)
**Purpose:** Close all verified Phase 1 gaps with implementation details, test specifications, and dependency ordering.

---

## 1. Gap Summary

### 1.1 Must-Priority (blocks launch)

| # | Gap | PRD Ref | Root Cause |
|---|-----|---------|------------|
| M1 | Calendar event push not wired to booking events | FR-CAL-3, FR-CAL-4, FR-CAL-5 | CalendarPushHandler exists but no @OnEvent listeners enqueue JOB_CALENDAR_EVENT_PUSH jobs |
| M2 | Deposit payments not implemented | FR-PAY-3 | PaymentType.DEPOSIT exists in schema but no resolvePaymentAmount() logic; processPaymentIntent() hardcodes FULL_PAYMENT |
| M3 | Platform referral commission not implemented | FR-PAY-11 | referralCommission column exists on Payment model but no eligibility check or calculation logic |
| M4 | Manual approval staff notification missing | FR-COM-1a | BOOKING_CREATED event emitted for PENDING bookings but no listener sends staff notification email |
| M5 | Booking flow config frontend missing | FR-CRM-9 | Backend GET/PATCH endpoints exist (booking-flow module) but no frontend settings page |

### 1.2 Should-Priority (important, not blocking)

| # | Gap | PRD Ref | Root Cause |
|---|-----|---------|------------|
| S1 | Post-setup prompts | FR-ONB-6 | No structured post-onboarding prompts on dashboard |
| S2 | Setup progress tracking | FR-ONB-10 | No setup completion state tracked; no resume capability |
| S3 | Booking modification request | FR-CP-3 | Client portal has cancel but no reschedule request flow |
| S4 | Business data export | FR-CRM-26 | GDPR user export exists; tenant-level TENANT_EXPORT not implemented |
| S5 | Scheduled calendar sync | FR-CAL-12 | UI allows configuring frequency but no cron job runs periodic syncs |
| S6 | Calendar re-auth prompt | FR-CAL-9 | Error state shown but no "Re-authenticate" button |
| S7 | Calendar conflict notification | FR-CAL-14 | No detection when inbound event overlaps existing booking |
| S8 | Invoice PDF to R2 | FR-PAY-8 | HTML stored as data URI; actual PDF + R2 upload not done |
| S9 | Category selection telemetry | FR-ONB-12 | Category stored in DB but no analytics event emitted |

---

## 2. Implementation Details

### M1: Calendar Event Push Wiring

**Problem:** `CalendarPushHandler` has `handleBookingConfirmed()`, `handleBookingRescheduled()`, `handleBookingCancelled()` methods. `CalendarDispatcher` routes `JOB_CALENDAR_EVENT_PUSH` to the handler. But nothing listens to booking domain events and enqueues these jobs.

**Solution:** Create `CalendarEventListener` service in the calendar module.

**File:** `apps/api/src/calendar/calendar-event.listener.ts` (new)

**Implementation:**
```typescript
@Injectable()
export class CalendarEventListener {
  constructor(
    @InjectQueue(QUEUE_CALENDAR) private readonly calendarQueue: Queue,
    private readonly prisma: PrismaService,
  ) {}

  @OnEvent(BOOKING_CONFIRMED)
  async onBookingConfirmed(payload: BookingEventPayload): Promise<void> {
    // Find all ACTIVE calendar connections for this tenant
    const connections = await this.prisma.calendarConnection.findMany({
      where: { tenantId: payload.tenantId, status: 'ACTIVE' },
      select: { id: true },
    });
    // Enqueue one push job per connection
    for (const conn of connections) {
      await this.calendarQueue.add(JOB_CALENDAR_EVENT_PUSH, {
        eventType: BOOKING_CONFIRMED,
        connectionId: conn.id,
        tenantId: payload.tenantId,
        bookingId: payload.bookingId,
        serviceName: payload.serviceName,
        clientName: payload.clientName,
        startTime: payload.startTime.toISOString(),
        endTime: payload.endTime.toISOString(),
      });
    }
  }

  @OnEvent(BOOKING_RESCHEDULED)
  async onBookingRescheduled(payload: BookingRescheduledPayload): Promise<void> {
    // Same pattern: find connections, enqueue with previous/new times
  }

  @OnEvent(BOOKING_CANCELLED)
  async onBookingCancelled(payload: BookingCancelledPayload): Promise<void> {
    // Same pattern: find connections, enqueue with minimal data
  }
}
```

**Modifications:**
- `calendar.module.ts`: Add `CalendarEventListener` to providers, import `BullModule` (already imported), import `PrismaModule`
- `calendar-push.processor.ts` line 128: Add SavSpot booking link to event description: `\nView: ${baseUrl}/bookings/${bookingId}`

**Dependencies:** None (all infrastructure exists).

**Tests:** `apps/api/test/calendar-event-listener.spec.ts` (new)
- Test: confirmed booking enqueues push job for each active connection
- Test: no jobs enqueued when tenant has no active calendar connections
- Test: rescheduled booking includes previous/new times in job data
- Test: cancelled booking enqueues push job with correct eventType
- Test: Date objects serialized to ISO strings in job data
- Test: connections with status ERROR or DISCONNECTED are excluded

---

### M2: Deposit Payments

**Problem:** `processPaymentIntent()` in `payments.service.ts` always uses `booking.totalAmount` and hardcodes `type: 'FULL_PAYMENT'`. Service `depositConfig` is never read during payment processing.

**Solution:** Add `resolvePaymentAmount()` method and integrate into the booking session payment flow.

**File:** `apps/api/src/payments/payments.service.ts` (modify)

**New method:**
```typescript
resolvePaymentAmount(
  totalAmount: number,
  depositConfig: { type: 'PERCENTAGE' | 'FIXED'; amount: number } | null,
): { paymentType: 'DEPOSIT' | 'FULL_PAYMENT'; amount: number } {
  if (!depositConfig) {
    return { paymentType: 'FULL_PAYMENT', amount: totalAmount };
  }

  let depositAmount: number;
  if (depositConfig.type === 'PERCENTAGE') {
    depositAmount = Math.round((totalAmount * depositConfig.amount) / 100 * 100) / 100;
  } else {
    depositAmount = Math.min(depositConfig.amount, totalAmount);
  }

  // If deposit >= total, just charge full amount
  if (depositAmount >= totalAmount) {
    return { paymentType: 'FULL_PAYMENT', amount: totalAmount };
  }

  return { paymentType: 'DEPOSIT', amount: depositAmount };
}
```

**Modifications to `processPaymentIntent()`:**
1. Load service `depositConfig` alongside booking (add to include)
2. Call `resolvePaymentAmount(booking.totalAmount, service.depositConfig)`
3. Use returned `paymentType` instead of hardcoded `'FULL_PAYMENT'`
4. Use returned `amount` instead of `booking.totalAmount` for the PaymentIntent

**Modifications to `booking-sessions.service.ts`:**
1. Load `depositConfig` in session creation (add to service select at line 60)
2. Include `depositConfig` in session data sent to frontend
3. Frontend pricing summary step already receives service data — will need to display "Deposit: $X" vs "Total: $X"

**Frontend:** `pricing-summary-step.tsx` — when `depositConfig` exists, show deposit amount with note "Remaining balance of $X due before appointment"

**Tests:** `apps/api/test/deposit-payments.spec.ts` (new)
- Test: resolvePaymentAmount returns FULL_PAYMENT when depositConfig is null
- Test: resolvePaymentAmount calculates PERCENTAGE correctly (50% of $100 = $50 DEPOSIT)
- Test: resolvePaymentAmount calculates FIXED correctly ($30 fixed on $100 booking)
- Test: resolvePaymentAmount returns FULL_PAYMENT when deposit >= total (100% or fixed > total)
- Test: resolvePaymentAmount handles edge case of 0% deposit (returns FULL_PAYMENT)
- Test: processPaymentIntent creates DEPOSIT payment when service has depositConfig
- Test: processPaymentIntent creates FULL_PAYMENT when service has no depositConfig
- Test: Stripe PaymentIntent created with deposit amount, not total amount
- Test: platform fee calculated on deposit amount (not total)

---

### M3: Platform Referral Commission

**Problem:** `referralCommission` field exists on Payment model. Booking `source` tracks REFERRAL/API/DIRECTORY. But no eligibility check or calculation exists.

**Business Rules (BRD BR-RULE-2):**
- Commission on first booking only from platform-sourced channels (DIRECTORY, API, REFERRAL)
- Rate: configurable (default 20%), cap: configurable (default $500)
- Collected in full on first payment (deposit or full)
- DIRECT, WIDGET, WALK_IN are always commission-free

**Solution:** Add `calculateReferralCommission()` to `PaymentsService` and call during `processPaymentIntent()`.

**File:** `apps/api/src/payments/payments.service.ts` (modify)

**New method:**
```typescript
async calculateReferralCommission(
  tenantId: string,
  clientId: string,
  bookingSource: string,
  bookingTotal: number,
): Promise<number | null> {
  // Only platform-sourced channels are eligible
  const COMMISSION_SOURCES = ['DIRECTORY', 'API', 'REFERRAL'];
  if (!COMMISSION_SOURCES.includes(bookingSource)) return null;

  // Check if client has any prior platform-sourced, non-cancelled booking at this tenant
  const priorBooking = await this.prisma.booking.findFirst({
    where: {
      tenantId,
      clientId,
      source: { in: COMMISSION_SOURCES as never[] },
      status: { notIn: ['CANCELLED'] as never[] },
    },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
    take: 1,
  });

  // Not first platform booking — no commission
  if (priorBooking) return null;

  // Load platform config
  const commissionPercent = this.configService.get<number>(
    'referral_commission_percent', 20,
  );
  const commissionCapCents = this.configService.get<number>(
    'referral_commission_cap_cents', 50000,
  );

  const commissionCents = Math.min(
    Math.round(bookingTotal * 100 * commissionPercent / 100),
    commissionCapCents,
  );

  return commissionCents;
}
```

**Modifications to `processPaymentIntent()`:**
1. After calculating `processingFee`, call `calculateReferralCommission()`
2. Add `referralCommission` to `platformFeeAmount` passed to Stripe
3. Store `processingFee` and `referralCommission` separately on Payment record

**Platform config updates:**
- `scripts/admin/platform-config.ts`: Add `referral_commission_cap_cents` key (default 50000)
- Fix default `referral_commission_percent` from 5 to 20 (per BRD)

**Tests:** `apps/api/test/referral-commission.spec.ts` (new)
- Test: returns null for DIRECT source
- Test: returns null for WALK_IN source
- Test: returns null for WIDGET source
- Test: returns commission for first REFERRAL booking
- Test: returns commission for first API booking
- Test: returns commission for first DIRECTORY booking
- Test: returns null for second REFERRAL booking (same client + tenant)
- Test: commission calculated as percentage of booking total
- Test: commission capped at configured maximum
- Test: cancelled prior bookings don't count (client is still "new")
- Test: processPaymentIntent stores referralCommission on payment record
- Test: processPaymentIntent adds commission to Stripe application_fee_amount
- Test: commission collected on deposit payment (full commission, not proportional)

---

### M4: Manual Approval Staff Notification

**Problem:** When `service.confirmationMode === 'MANUAL_APPROVAL'`, booking enters PENDING state and `BOOKING_CREATED` event is emitted. No listener sends a notification to staff.

**Solution:** Add listener in `WorkflowEngineService` for `BOOKING_CREATED` that checks if the booking is PENDING and sends staff notification.

**File:** `apps/api/src/workflows/workflow-engine.service.ts` (modify)

**New handler:**
```typescript
@OnEvent(BOOKING_CREATED)
async handleBookingCreated(payload: BookingEventPayload): Promise<void> {
  // Check if booking is PENDING (i.e., MANUAL_APPROVAL service)
  const booking = await this.prisma.booking.findUnique({
    where: { id: payload.bookingId },
    select: { status: true },
  });

  if (booking?.status !== 'PENDING') return;

  // Find OWNER/ADMIN members to notify
  const members = await this.prisma.tenantMembership.findMany({
    where: { tenantId: payload.tenantId, role: { in: ['OWNER', 'ADMIN'] } },
    include: { user: { select: { email: true, firstName: true } } },
  });

  const tenant = await this.loadTenantBranding(payload.tenantId);

  for (const member of members) {
    await this.communicationsService.createAndSend({
      tenantId: payload.tenantId,
      recipientId: member.userId,
      recipientEmail: member.user.email,
      recipientName: member.user.firstName ?? 'Admin',
      channel: 'EMAIL',
      templateKey: 'staff-approval-required',
      templateData: {
        staffName: member.user.firstName ?? 'Admin',
        clientName: payload.clientName,
        serviceName: payload.serviceName,
        dateTime: this.formatDateTime(payload.startTime),
        businessName: tenant.name,
        logoUrl: tenant.logoUrl,
        brandColor: tenant.brandColor,
        approveUrl: `${process.env.WEB_URL}/bookings/${payload.bookingId}`,
      },
      bookingId: payload.bookingId,
    });
  }
}
```

**New email template:** Add `staff-approval-required` case in `communications.service.ts` `renderTemplate()`.

**Modifications:**
- `events/event.types.ts`: Verify `BOOKING_CREATED` constant exists (it does: `'booking.created'`)
- `communications.service.ts`: Add template rendering for `staff-approval-required`

**Tests:** `apps/api/test/manual-approval-notification.spec.ts` (new)
- Test: PENDING booking triggers email to all OWNER/ADMIN members
- Test: CONFIRMED booking (AUTO_CONFIRM) does NOT trigger staff notification
- Test: email includes client name, service name, date/time, approve link
- Test: multiple staff members each receive separate notification
- Test: tenant with no OWNER/ADMIN members does not throw

---

### M5: Booking Flow Config Frontend

**Problem:** Backend endpoints exist (`GET/PATCH /api/tenants/:id/booking-flow`) returning step resolution data. No frontend page renders this.

**Solution:** Create settings page following the tax-rates page pattern.

**File:** `apps/web/src/app/(dashboard)/settings/booking-flow/page.tsx` (new)

**Features:**
- Fetch `GET /api/tenants/{tenantId}/booking-flow` on load
- Display ordered list of all possible steps
- Active steps: green check icon, step label
- Inactive steps: gray icon, "Configure [feature] to enable" with link to relevant settings
- Per-service dropdown showing service-specific step resolution
- Read-only in Phase 1 (PATCH for step overrides deferred to Phase 2 builder)

**Step-to-settings mapping:**
- GUEST_COUNT inactive → link to service edit (add guest config)
- QUESTIONNAIRE inactive → link to service edit (add intake form)
- ADD_ONS inactive → link to service edit (add add-ons)
- PAYMENT inactive → link to payment settings (connect Stripe)

**Modifications:**
- Add "Booking Flow" link to settings sidebar navigation

**Tests:** `apps/web/src/app/(dashboard)/settings/booking-flow/__tests__/booking-flow-page.spec.tsx` (new)
- Test: renders page heading "Booking Flow"
- Test: displays all step types from API response
- Test: active steps show green indicator
- Test: inactive steps show configuration prompt with link
- Test: loading state shown while fetching
- Test: error state shown on fetch failure

---

### S1: Post-Setup Prompts

**File:** `apps/web/src/app/(dashboard)/dashboard/page.tsx` (modify)

**Implementation:** After the existing dashboard content, add a "Complete Your Setup" card that shows when setup steps are incomplete. Check signals:
- `services.length === 0` → "Add your first service"
- `!tenant.paymentProviderOnboarded` → "Connect payment provider"
- `availabilityRules.length === 0` → "Set your availability"

Each prompt links to the relevant settings page. Dismissible via onboarding tours API (`PATCH /api/users/me/tours/setup-prompts`).

**Tests:**
- Test: setup card shown when services are empty
- Test: setup card hidden when all steps complete
- Test: each prompt links to correct settings page
- Test: dismiss calls onboarding tours API

---

### S2: Setup Progress Tracking

**Implementation:** Use existing `onboarding_tours` table with tour keys for each setup step. Dashboard checks tour completion status to determine which prompts to show. No schema changes needed.

**Covered by S1 implementation** — the prompts double as progress indicators.

---

### S3: Booking Modification Request

**File:** `apps/web/src/app/(portal)/portal/bookings/[id]/page.tsx` (modify)
**File:** `apps/api/src/client-portal/client-portal.service.ts` (modify)

**Implementation:** Add "Request Reschedule" button alongside existing "Cancel" button. Client selects new preferred date/time. Backend creates a reschedule request (stores in booking `metadata` JSONB as `rescheduleRequest: { requestedAt, preferredDate, preferredTime, status }`). Staff sees request in booking detail and can approve (triggers actual reschedule) or decline.

**Tests:**
- Test: reschedule request button visible for CONFIRMED bookings
- Test: request stored in booking metadata
- Test: staff can approve request (triggers reschedule)
- Test: staff can decline request (clears metadata)

---

### S4: Business Data Export

**File:** `apps/api/src/jobs/tenant-export.processor.ts` (new)

**Implementation:** Follow data-export.processor.ts pattern. Gathers tenant data: services, bookings, clients, invoices, payments. Generates JSON archive. Uploads to R2. Updates DataRequest with `requestType: TENANT_EXPORT`.

**Endpoint:** Add `POST /api/tenants/:id/export` to tenants controller.

**Tests:**
- Test: gathers all tenant data categories
- Test: uploads to R2 and stores URL
- Test: updates DataRequest status to COMPLETED

---

### S5: Scheduled Calendar Sync

**File:** `apps/api/src/jobs/job-scheduler.service.ts` (modify)
**File:** `apps/api/src/calendar/calendar-scheduled-sync.processor.ts` (new)

**Implementation:** Add a cron job (every 15 min) that finds all ACTIVE calendar connections and enqueues `JOB_CALENDAR_TWO_WAY_SYNC` for each. Respects per-connection `syncFrequencyMinutes` by tracking last sync time.

**Tests:**
- Test: enqueues sync jobs for active connections only
- Test: skips connections synced within their frequency window
- Test: handles connections with different frequencies correctly

---

### S6: Calendar Re-Auth Prompt

**File:** `apps/web/src/app/(dashboard)/settings/calendar/page.tsx` (modify)

**Implementation:** When `connection.status === 'ERROR'`, show a "Re-authenticate" button that calls `POST /api/tenants/{tenantId}/calendar/connect` to get a new OAuth URL and redirects user.

**Tests:**
- Test: re-authenticate button visible when status is ERROR
- Test: button hidden when status is ACTIVE
- Test: clicking button initiates OAuth flow

---

### S7: Calendar Conflict Notification

**File:** `apps/api/src/calendar/calendar-sync.processor.ts` (modify)

**Implementation:** After inbound sync, check if any new/updated inbound events overlap existing CONFIRMED bookings. If so, create in-app notification for tenant OWNER/ADMIN.

**Tests:**
- Test: overlapping inbound event creates notification
- Test: non-overlapping event does not create notification
- Test: notification includes both event details

---

### S8: Invoice PDF to R2

**File:** `apps/api/src/jobs/generate-invoice-pdf.processor.ts` (modify)

**Implementation:** Replace data URI storage with actual PDF rendering (HTML-to-PDF via Puppeteer or similar) and R2 upload via existing UploadService.

**Tests:**
- Test: generates PDF buffer from HTML
- Test: uploads to R2 and stores URL on invoice

---

### S9: Category Selection Telemetry

**File:** `apps/api/src/tenants/tenants.service.ts` (modify)

**Implementation:** After tenant creation, emit a telemetry event with category selection. For Phase 1, log to structured logger (PostHog integration deferred). Store `categoryDescription` for OTHER selections.

**Tests:**
- Test: category logged on tenant creation
- Test: categoryDescription stored for OTHER

---

## 3. Dependency Graph & Execution Order

```
Wave 1 (independent, parallel):
  M1  Calendar event push wiring     [~150 lines + tests]
  M4  Manual approval notification   [~100 lines + tests]
  M5  Booking flow config frontend   [~250 lines + tests]
  S1  Post-setup prompts             [~100 lines + tests]
  S5  Scheduled calendar sync        [~80 lines + tests]
  S6  Calendar re-auth prompt        [~20 lines + tests]
  S9  Category selection telemetry   [~15 lines + tests]

Wave 2 (after Wave 1, parallel):
  M2  Deposit payments               [~200 lines + tests]
       depends on: none, but test after M1 to verify full flow
  M3  Referral commission            [~180 lines + tests]
       depends on: none, but shares processPaymentIntent() with M2
       M2 and M3 modify the same method — implement sequentially

Wave 3 (after Wave 2, parallel):
  S3  Booking modification request   [~150 lines + tests]
  S4  Business data export           [~200 lines + tests]
  S7  Calendar conflict notification [~80 lines + tests]
  S8  Invoice PDF to R2              [~100 lines + tests]
```

**M2 before M3 rationale:** Both modify `processPaymentIntent()`. Deposit changes the amount charged. Commission changes the fee structure. Implementing deposits first means commission calculation uses the correct base (booking total, not deposit amount — per BRD).

---

## 4. Test Summary

| Gap | Test File | Test Count | What's Tested |
|-----|-----------|------------|---------------|
| M1 | `calendar-event-listener.spec.ts` | 6 | Event → queue routing, connection filtering, serialization |
| M2 | `deposit-payments.spec.ts` | 9 | Amount resolution, percentage/fixed calc, Stripe integration |
| M3 | `referral-commission.spec.ts` | 12 | Eligibility rules, calculation, cap, first-booking detection |
| M4 | `manual-approval-notification.spec.ts` | 5 | PENDING detection, staff lookup, email dispatch |
| M5 | `booking-flow-page.spec.tsx` | 6 | Render, active/inactive steps, loading/error states |
| S1 | `setup-prompts.spec.tsx` | 4 | Signal detection, prompt display, dismiss |
| S3 | `booking-modification.spec.ts` | 4 | Request creation, approve/decline |
| S4 | `tenant-export.spec.ts` | 3 | Data gathering, R2 upload, status update |
| S5 | `calendar-scheduled-sync.spec.ts` | 3 | Connection selection, frequency respect, job enqueue |
| S7 | `calendar-conflict.spec.ts` | 3 | Overlap detection, notification creation |
| **Total** | | **~55** | |

---

## 5. Spec Document Updates Required

### PRD.md
- No changes needed (requirements are correct; implementation was incomplete)

### current-state-march-2026.md
- Section 11 "Phase 1 Completion Status": Update to reflect verified gaps (not "all 17 gaps implemented")
- Add new section: "Remaining Phase 1 Gaps" with this plan's gap list

### phase-1-gap-analysis.md
- Update header: change "~82% built, ~18% remaining" to reflect post-gap-closure state
- Add section: "Post-Implementation Verification (March 7, 2026)" documenting the 5 Must + 9 Should gaps found

### BRD.md
- No changes needed (business rules are correctly specified)

### SRS-3-BOOKING-PAYMENTS.md
- Add clarification in deposit payment section: deposit amount calculation algorithm (PERCENTAGE vs FIXED)
- Add clarification: referral commission collected in full on first payment (deposit or full), not proportional

---

## 6. Estimated Scope

| Priority | Items | Est. Lines (code + tests) |
|----------|-------|--------------------------|
| Must (M1-M5) | 5 | ~1,600 |
| Should (S1-S9) | 9 | ~1,200 |
| Spec updates | 3 files | ~200 |
| **Total** | | **~3,000** |

All implementations follow established codebase patterns. No architectural changes, no new dependencies (except possibly a PDF library for S8), no schema migrations required.
