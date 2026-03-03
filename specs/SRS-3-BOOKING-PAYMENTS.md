# Savspot -- Software Requirements Specification: Booking, Payments & Availability Logic

**Version:** 1.1 | **Date:** February 27, 2026 | **Author:** SD Solutions, LLC
**Document:** SRS Part 3 of 4

---

## 1. Scope

This document specifies the booking lifecycle, availability resolution, payment processing, and pricing logic for the Savspot platform. It covers state machines, concurrency control, calendar integration, PaymentProvider workflows (Stripe Connect in Phase 1; Adyen, PayPal in Phase 3+), invoice generation, and background job definitions. All features in this document follow the progressive complexity principle (see SRS-1 Section 8): the pricing engine, availability engine, and booking flow adapt to what the business has configured. A zero-config service uses flat pricing, preset availability, and a minimal booking flow. For system architecture and infrastructure, see **SRS-1**. For entity schemas and data models, see **SRS-2**. For communications, security policies, and end-to-end workflows, see **SRS-4**.

---

## 2. Booking State Machine

```
+----------+  confirm   +-----------+  check_in  +-------------+  complete  +-----------+
| PENDING  |----------->| CONFIRMED |----------->| IN_PROGRESS |---------->| COMPLETED |
+----+-----+            +-----+-----+            +------+------+           +-----------+
     |                        |   |                     |                        ^
     | cancel                 |   | auto_complete       | cancel                 |
     v                        |   | (Phase 1 path:      v                        |
+-----------+                 |   |  end_time passed,  +-----------+             |
| CANCELLED |                 |   |  no check-in)      | CANCELLED |             |
+-----------+                 |   +---------------------------------------->-----+
     ^                        |
     | timeout                | no_show
     |                        v
(from PENDING)          +-----------+
                        |  NO_SHOW  |
                        +-----------+
```

### Transition Rules

| From | To | Trigger | Guard / Side Effect |
|------|----|---------|---------------------|
| PENDING | CONFIRMED | `confirm` | Behavior depends on `services.confirmation_mode` (see below) |
| PENDING | CANCELLED | `cancel` | Records `cancellation_reason`; releases reservation |
| PENDING | CANCELLED | `timeout` | No payment within configured window |
| CONFIRMED | IN_PROGRESS | `check_in` | Staff initiates; sets `checked_in_at` (Phase 2 -- FR-CRM-23) |
| CONFIRMED | COMPLETED | `auto_complete` | `processCompletedBookings` job (Phase B): fires when `end_time` has passed, `check_in_status = 'PENDING'` (no check-in occurred), and booking was not marked NO_SHOW. This is the Phase 1 completion path — check-in/check-out is Phase 2. |
| CONFIRMED | CANCELLED | `cancel` | Cancellation policy evaluated (see §2a below); refund amount determined; calendar event deleted |
| CONFIRMED | NO_SHOW | `no_show` | Scheduled job after end_time + grace period |
| IN_PROGRESS | COMPLETED | `complete` | Sets `checked_out_at`; excess-hour fees calculated |
| IN_PROGRESS | CANCELLED | `cancel` | Partial-use refund policy applies (Phase 2 — uses the same `evaluateCancellationPolicy()` algorithm as CONFIRMED→CANCELLED; negative `hours_until_start` naturally falls into late-cancel or no-refund windows. For HOURLY services, a time-consumed-based refund algorithm is Phase 2 scope.) |

Invalid transitions raise `InvalidBookingTransitionError`. Every transition is audit-logged. Booking source is tracked via the `source` enum: `DIRECT`, `DIRECTORY`, `API`, `WIDGET`, `REFERRAL`, `WALK_IN`.

### Walk-In Booking Entry Point

Walk-in bookings enter the state machine at CONFIRMED, bypassing the PENDING state entirely:

```
(WALK_IN Quick-Add action) --> CONFIRMED --> IN_PROGRESS --> COMPLETED
                                    |
                                    | cancel (admin only)
                                    v
                                CANCELLED
```

| Entry Point | How | Guard | Side Effect |
|-------------|-----|-------|-------------|
| `POST /api/tenants/:id/bookings/walk-in` | Staff-initiated from calendar view Quick-Add (FR-CRM-28) | Authentication required (OWNER/ADMIN/STAFF); validates service active, time slot available | Sets `source = WALK_IN`; fires `BOOKING_CONFIRMED` event immediately; creates calendar event (OUTBOUND); does NOT send client confirmation email (walk-in is already present); optional: SMS provider notification if FR-COM-2a configured |

**Walk-in availability check:** The walk-in endpoint performs the same slot availability check as the standard booking flow (conflict detection against existing bookings and INBOUND calendar events per §6). If the slot is taken, returns `HTTP 409 CONFLICT`. This prevents double-booking even in the walk-in path.

**No reservation token:** Walk-in bookings do not create `booking_sessions` or `date_reservations` records. The CONFIRMED status is written directly to `bookings` in an atomic transaction with the availability conflict check using `SELECT FOR UPDATE` on the `date_reservations` shadow lock mechanism (adapted for walk-ins — see §6 for the locking protocol).

### Confirmation Mode Behavior

The `services.confirmation_mode` field (default: `AUTO_CONFIRM`) controls how bookings transition from PENDING to CONFIRMED:

| Mode | Trigger | Behavior |
|------|---------|----------|
| `AUTO_CONFIRM` | Payment SUCCEEDED (or booking created for free service / tenant without payment provider / offline payment path) | System automatically fires `confirm` transition. `BOOKING_CREATED` and `BOOKING_CONFIRMED` events fire in quick succession. Client sees immediate confirmation. |
| `MANUAL_APPROVAL` | Staff action via `POST /api/bookings/:id/confirm` | Booking remains PENDING after payment until a staff member (OWNER/ADMIN) explicitly confirms. `BOOKING_CREATED` fires at booking creation; `BOOKING_CONFIRMED` fires only on staff approval. Client sees "Pending Approval" status. |

**MANUAL_APPROVAL side effects:**
- Payment is still collected at booking time (deposit or full, per `deposit_config`). If staff rejects (cancels) the booking, a full refund is issued automatically.
- A notification is sent to the tenant's OWNER/ADMIN roles when a new booking requires approval.
- The `timeout` transition applies: if staff does not confirm or cancel within `services.approval_deadline_hours` (default: platform-configured 48 hours), the booking is auto-cancelled with `cancellation_reason = APPROVAL_TIMEOUT` and a full refund is issued. This timeout is independent of the payment deadline automation (SRS-4 §24), which derives from `invoices.due_date` — no invoice exists in PENDING state because invoices are created on booking confirmation (see §10). The `enforceApprovalDeadlines` job (hourly) checks PENDING bookings with `MANUAL_APPROVAL` confirmation mode and auto-cancels those past their deadline.

### Booking Source Determination

The booking `source` is set at session creation time based on the entry point:

| Entry Point | Source | Phase | How Determined |
|-------------|--------|-------|----------------|
| Booking page (`savspot.co/{slug}`) | `DIRECT` | 1 | Default for all booking page sessions |
| Walk-in Quick-Add from Admin CRM calendar view | `WALK_IN` | 1 | `POST /api/tenants/:id/bookings/walk-in` endpoint sets source server-side |
| Booking page via referral link (`?ref={code}`) | `REFERRAL` | 3 | Query parameter matched against `referral_links.code` |
| Embeddable widget | `WIDGET` | 2 | Widget SDK passes `source=WIDGET` in session creation |
| Public API v1 (`/api/v1/...`) | `API` | 3 | API layer sets source automatically |
| MCP server tools | `API` | 3 | MCP proxy sets source automatically |
| Platform directory | `DIRECTORY` | 4 | Directory UI passes `source=DIRECTORY` in session creation |

**Phase 1:** Bookings originate from the booking page (`DIRECT`) or the Admin CRM walk-in Quick-Add action (`WALK_IN`). The `source` field is set server-side — clients cannot override it. WALK_IN bookings bypass the session/reservation flow entirely (see §2 Walk-In Entry Point). See SRS-3 §11 for how source affects commission eligibility. WALK_IN bookings are commission-free (no platform-sourced client acquisition involved).

### Cancellation Policy Evaluation {#2a}

When a CONFIRMED booking is cancelled, the system evaluates `services.cancellation_policy` to determine the refund amount:

```
evaluateCancellationPolicy(service, booking):
  policy = service.cancellation_policy
  if policy == null:
    policy = { free_cancellation_hours: 24, late_cancel_fee_type: "percentage",
               late_cancel_fee_amount: 0, no_refund_hours: 0 }  // default: free cancel 24h before

  hours_until_start = (booking.start_time - now()) / 3600

  // Free cancellation window
  if hours_until_start >= policy.free_cancellation_hours:
    return { refund_type: FULL_REFUND, refund_amount: booking.total_amount, fee: 0 }

  // No-refund window (if configured)
  if policy.no_refund_hours > 0 AND hours_until_start <= policy.no_refund_hours:
    return { refund_type: NO_REFUND, refund_amount: 0, fee: booking.total_amount }

  // Late cancellation fee
  switch policy.late_cancel_fee_type:
    "percentage":
      fee = booking.total_amount * (policy.late_cancel_fee_amount / 100)
    "fixed":
      fee = min(policy.late_cancel_fee_amount, booking.total_amount)

  refund_amount = booking.total_amount - fee
  return { refund_type: PARTIAL_REFUND, refund_amount: round(refund_amount, 2), fee: round(fee, 2) }
```

The cancellation result determines the payment provider refund amount. `cancellation_reason` is recorded on the booking. Cancellation policy details are displayed to the client in the Client Portal before they confirm cancellation (FR-CP-4).

---

## 3. Check-in State Machine (Phase 2 -- see FR-CRM-23)

> **Phase note:** The check-in/check-out state machine and schema fields (SRS-2 §4) are designed and ready for implementation. UI requirements are deferred to Phase 2 (FR-CRM-23). Schema fields are nullable and have no impact on Phase 1 booking flows.

```
+---------+  staff_check_in  +------------+  staff_check_out  +-------------+
| PENDING |----------------->| CHECKED_IN |------------------>| CHECKED_OUT |
+----+----+                  +------------+                   +-------------+
     |                                                         (fees calculated)
     | no_show_job
     v
+---------+
| NO_SHOW |
+---------+
```

**Fields:** `check_in_status`, `checked_in_at`, `checked_out_at`, `checked_in_by` (staff FK), `checked_out_by` (staff FK). Early check-in and late checkout fees are derived from venue operating rules as `excess_hours * excess_hour_price`.

---

## 4. Session Lifecycle

```
Client starts wizard
        |
        v
+---------------------------+
| Resolve booking steps     |
| from service config       |
| (see SRS-1 Section 8)    |
+------------+--------------+
             |
             v
+---------------------------+
| Redis session created     |
| Key: session:{id}         |
| TTL: 1 hour               |
| resolved_steps stored     |
+------------+--------------+
             |
    Each step: PATCH updates Redis + extends TTL
    (only resolved steps are rendered)
             |
             v
+---------------------------+
| Date selected             |
| date_reservation created  |
| Token lock: 5 min expiry  |
| DB + SELECT FOR UPDATE    |
+------------+--------------+
             |
             v
+---------------------------+
| Payment processed         |
| atomic_process_            |
|   downpayment_received()  |
| - Locks reservation row   |
| - Creates booking         |
| - Cancels competing       |
|   reservations            |
| - Loser: auto-refund      |
+------------+--------------+
             |
      +------+------+
      |             |
  Success        Abandoned
      |          (no activity
      v           for 1 hour)
+-----------+   +-----------+
| COMPLETED |   | EXPIRED   |
| Persisted |   | Reservation|
| to DB;    |   | released;  |
| Redis key |   | recovery   |
| deleted   |   | email      |
+-----------+   | queued     |
                +-----------+
```

Session status enum: `IN_PROGRESS`, `COMPLETED`, `ABANDONED`, `EXPIRED`. Active sessions live in Redis; completed and expired sessions are flushed to PostgreSQL as the source of truth.

---

## 5. First-to-Pay-Wins Concurrency

When two sessions hold overlapping date reservations and both attempt payment:

1. `atomic_process_downpayment_received()` executes `SELECT FOR UPDATE` on the `date_reservations` row matching the reservation token.
2. The first transaction to commit wins -- the booking is created (PENDING or CONFIRMED) and the reservation status becomes CONFIRMED.
3. All competing reservations for the same slot are set to RELEASED.
4. The losing payer's transaction detects the slot is taken, triggers an automatic refund via the payment provider, and returns a `DATE_TAKEN` error to the client.
5. If the reservation expired during a slow payment provider response, the expiry job checks for in-flight payments before releasing the slot.

---

## 6. Availability Resolution Engine

The engine evaluates slot availability by layering the following rules in order. Rules at higher priority numbers override lower ones. **A zero-config service needs only layer 1 (preset availability rules) and layer 5 (existing bookings) -- all other layers activate only when their data is configured.**

| Priority | Rule | Effect | Required? |
|----------|------|--------|-----------|
| 1 | `availability_rules` (recurring) | Defines open windows per day-of-week, per service/venue. Service-specific rules override tenant-level rules. | Yes -- preset creates default tenant rules during onboarding |
| 2 | `buffer_before_minutes / buffer_after_minutes` on service | Subtracts buffer time from each open slot: effective start = `start_time - buffer_before_minutes`; effective end = `end_time + buffer_after_minutes`. Prevents back-to-back bookings without cleanup time. Default: 0 for both. | Only when service has non-zero buffer values |
| 3 | `blocked_dates` | One-off blocks (holidays, maintenance) remove entire days | Only when blocked_dates rows exist |
| 4 | `calendar_events` (INBOUND, `booking_id = null`) | External calendar events from connected calendars block overlapping slots. INBOUND events are treated as hard blocks **identical to SavSpot bookings** — no distinction is made between a SavSpot booking and an external calendar block from the client's perspective. This is the critical layer for the parallel-run design partner scenario (savspot-gtm-distribution-strategy.md §4.3): Booksy appointments exported to Google Calendar and synced INBOUND to SavSpot block time slots in the availability resolver, preventing double-booking without requiring Booksy API access. | Only when FR-CAL-10 is configured (Phase 1) |
| 5 | Existing bookings | CONFIRMED and IN_PROGRESS bookings block their time range (including buffer times per Layer 2). PENDING bookings have an associated `date_reservations` token — the pessimistic lock prevents competing bookings from claiming the same slot during the reservation hold window. WALK_IN bookings (source = WALK_IN) participate in this check immediately on creation. | Always (core booking integrity, BR-RULE-5) |
| 6 | Advance window | Rejects dates outside `min_booking_advance_days..max_booking_advance_days` | Always (defaults: 1 to 365 days) |

All availability is computed in the tenant's configured timezone and stored in UTC. The API returns only open slots — blocked reasons are never exposed to clients (slots display as "Unavailable"). No distinction between SavSpot bookings and INBOUND calendar blocks is exposed to clients (FR-CAL-13).

**Resolution for service-specific vs. tenant-level rules:** If a service has its own `availability_rules` rows, those are used exclusively. If a service has no service-specific rules, the tenant-level rules (no `service_id`) apply. This allows businesses to set hours once for all services, then override for specific services that have different hours.

---

## 7. Calendar Integration

### One-Way Push (Outbound)

On booking confirm, reschedule, or cancel, the `calendarEventPush` job creates, updates, or deletes an event in the connected Google or Outlook calendar. Events include: client name, service, time, location, and a Savspot deep link.

### Two-Way Sync (Inbound)

The `calendarTwoWaySync` job runs at the connection's configured frequency (default 15 min, per `calendar_connections.sync_frequency_minutes`). It pulls external events from selected calendars (`calendar_connections.sync_calendars` specifies which calendar IDs to include per FR-CAL-11) and writes them as INBOUND `calendar_events` with `booking_id = null`. The availability engine (§6 Layer 4) treats these as hard blocks.

**Parallel-run design partner scenario:** A barber using both Booksy and SavSpot connects their Google Calendar to SavSpot with TWO_WAY sync. Booksy exports appointments to Google Calendar (one-way). SavSpot picks up those Google Calendar events as INBOUND blocks during the 15-minute sync cycle. This creates a ~20–45 minute latency window before a Booksy appointment appears blocked in SavSpot. For appointments typically booked hours or days in advance, this latency is acceptable. See savspot-gtm-distribution-strategy.md §4.3 for the full bridge architecture.

**Sync-on-demand (FR-CAL-15):** `POST /api/calendar/connections/:id/sync` triggers an immediate `calendarTwoWaySync` for the connection, bypassing the polling schedule. Rate-limited to 4 calls per hour per connection (Redis token bucket). Used when a provider wants real-time accuracy (e.g., after taking a walk-in on another platform). Returns `{ synced_at, events_added, events_removed }`.

### Token Refresh and Error Handling

| Scenario | Behavior |
|----------|----------|
| Token nearing expiry | `calendarTokenRefresh` job (hourly) uses refresh_token to obtain new access_token |
| Refresh fails | Connection status set to ERROR; re-auth notification sent to business owner |
| Push fails (transient) | Retry with exponential backoff (3 attempts) |
| Push fails (permanent) | Log error; admin notification; connection status indicator shows ERROR |
| Manual sync | "Sync Now" button (FR-CAL-15) triggers immediate `calendarTwoWaySync` for the connection; rate-limited 4/hour |
| Conflict detected | If external event overlaps an existing booking, a conflict notification is sent (FR-CAL-14) |

Providers supported: `GOOGLE`, `MICROSOFT`. Sync direction per connection: `ONE_WAY` (outbound only) or `TWO_WAY` (outbound + INBOUND blocking).

---

## 8. Payment State Machine

```
+---------+ initiate +---------+ process +------------+ succeed +-----------+
| CREATED |--------->| PENDING |-------->| PROCESSING |-------->| SUCCEEDED |
+---------+          +----+----+         +------+-----+         +--+--+--+--+
                          |                     |                   |  |  |
                          | timeout/fail        | fail          dispute |  partial
                          v                     v                   |  |  refund
                     +---------+           +---------+         +---v--+ |  +----v--------------+
                     | FAILED  |<----------| FAILED  |         |DISPU-| |  | PARTIALLY_REFUNDED|
                     +---------+           +---------+         | TED  | |  +--------+----------+
                                                               +------+ |           |
                                                                  full refund  full refund
                                                                        |           |
                                                                   +----v-----------v--+
                                                                   |     REFUNDED      |
                                                                   +-------------------+
```

### Transition Rules

| From | To | Trigger |
|------|----|---------|
| SUCCEEDED | PARTIALLY_REFUNDED | Partial refund processed (refund amount < payment amount) |
| SUCCEEDED | REFUNDED | Full refund processed |
| SUCCEEDED | DISPUTED | Payment provider dispute webhook received (e.g., Stripe `charge.dispute.created`) |
| PARTIALLY_REFUNDED | REFUNDED | Remaining balance refunded |
| DISPUTED | SUCCEEDED | Dispute resolved in merchant's favor (e.g., Stripe `charge.dispute.closed` with `status = won`) |
| DISPUTED | REFUNDED | Dispute resolved in client's favor (e.g., Stripe `charge.dispute.closed` with `status = lost`); provider auto-refunds the charge |

### Blocked Transitions

| Blocked | Reason |
|---------|--------|
| FAILED -> SUCCEEDED | Must re-initiate through PROCESSING |
| REFUNDED -> SUCCEEDED | Terminal state; no reversal |
| PARTIALLY_REFUNDED -> SUCCEEDED | Cannot reverse a refund |
| CREATED -> SUCCEEDED | Must pass through PENDING and PROCESSING |
| DISPUTED -> PARTIALLY_REFUNDED | Dispute resolution is binary (won/lost); partial outcomes are not supported by most payment providers including Stripe |

Every transition is recorded in `payment_state_history` with `from_state`, `to_state`, `reason`, `triggered_by` (SYSTEM / WEBHOOK / ADMIN / CLIENT), and a metadata JSONB column capturing gateway response and idempotency keys. Invalid transitions raise `InvalidPaymentTransitionError`.

---

## 9. Pricing Models

**Zero-config default:** Every service starts with `pricing_model = FIXED` and `base_price` set during creation. Advanced pricing models are activated by setting the relevant nullable fields on the service (see SRS-2 `services` table). The pricing engine resolves the model from configured data:

```
resolvePrice(service, booking):
  switch service.pricing_model:
    FIXED:   return service.base_price
    HOURLY:  return service.base_price + max(0, actual_hours - service.base_hours) * service.excess_hour_price
    TIERED:  return matchTier(service.tier_config, booking.guest_count).price
    CUSTOM:  return admin_entered_amount (from quote)
```

> **Note:** `services.pricing_unit` (PER_EVENT, PER_PERSON, PER_HOUR) is a display label only and is not used in price calculation. It controls how the UI formats the price string (e.g., "$50/person", "$100/hour"). The `pricing_model` field determines which algorithm `resolvePrice()` uses.

| Model | Formula | Use Case | Activation |
|-------|---------|----------|------------|
| FIXED (default) | `total = base_price` | Flat-rate services (most individuals, salons, studios) | Automatic -- just set `base_price` |
| HOURLY | `total = base_price + max(0, actual_hours - base_hours) * excess_hour_price` | Time-based services with included hours | Set `pricing_model = HOURLY` + configure `base_hours` and `excess_hour_price` |
| TIERED | `total = tier.price` where `tier = first tier where min <= guest_count <= max` | Per-person pricing with volume brackets (venues, events) | Set `pricing_model = TIERED` + configure `tier_config` JSONB + `guest_config` |
| CUSTOM | `total = admin_entered_amount` | Negotiated or quote-based pricing | Set `pricing_model = CUSTOM`; price determined via quotes |

**Pricing Model Companion Field Validation:**

When `pricing_model` is set or updated via the API (`POST /api/tenants/:id/services` or `PATCH /api/services/:id`), the following companion fields are validated. Requests that violate these rules are rejected with HTTP 422 and a descriptive error message.

| pricing_model | Required Companion Fields | Validation Rules |
|---------------|--------------------------|------------------|
| FIXED | _(none beyond core fields)_ | `base_price` must be >= 0 (already NOT NULL) |
| HOURLY | `base_hours`, `excess_hour_price` | Both must be non-null and > 0. `base_hours` must be a positive decimal. `excess_hour_price` must be a positive decimal. |
| TIERED | `tier_config`, `guest_config` | Both must be non-null. `tier_config` must be a non-empty JSONB array where each element has `min_guests` (INT >= 0), `max_guests` (INT >= `min_guests`), and `price` (DECIMAL >= 0). Tiers must be contiguous and non-overlapping. `guest_config` must contain at minimum `{min, max}` where `min >= 1` and `max >= min`. |
| CUSTOM | _(none beyond core fields)_ | Price is determined via quotes; no companion fields required. |

> When switching `pricing_model` (e.g., HOURLY -> FIXED), the API does NOT null out orphaned companion fields (e.g., `base_hours` remains). The pricing engine only reads fields relevant to the active model. This avoids data loss if the tenant switches back.

Pricing unit (`PER_EVENT`, `PER_PERSON`, `PER_HOUR`) determines the multiplier axis; nullable and irrelevant for FIXED model. Guest count on a tier boundary uses the lower tier. Discounts apply post-calculation: `PERCENTAGE` reduces by `value%`, `FIXED` subtracts a flat amount, `FREE_HOURS` reduces billable hours. Only one discount per invoice is permitted.

**Discount precedence rule:** When multiple AUTOMATIC discounts qualify for the same booking, the system selects the **highest-value** discount (computed against the booking total). Ties are broken by most-recent `created_at`. The selected discount is recorded on the invoice; non-selected qualifying discounts are ignored. CODE_REQUIRED and ADMIN_ONLY discounts are not subject to automatic precedence -- they are applied explicitly.

### Discount Validation Algorithm

The `POST /api/discounts/validate` endpoint evaluates a discount code against a booking context:

```
validateDiscount(code, booking_context):
  discount = findByCode(code, tenant_id)
  if !discount OR !discount.is_active:        return INVALID_CODE
  if discount.application != CODE_REQUIRED:    return INVALID_CODE  // only CODE_REQUIRED validated here
  if now() < discount.valid_from:              return NOT_YET_VALID
  if now() > discount.valid_until:             return EXPIRED
  if discount.usage_count >= discount.usage_limit: return USAGE_EXCEEDED
  if booking_context.subtotal < discount.min_order_amount: return MIN_ORDER_NOT_MET
  if discount.product_scope AND booking_context.service_id NOT IN discount.product_scope.service_ids:
                                               return SERVICE_NOT_ELIGIBLE
  // Calculate applicable amount
  switch discount.type:
    PERCENTAGE: applicable_amount = booking_context.subtotal * (discount.value / 100)
    FIXED:      applicable_amount = min(discount.value, booking_context.subtotal)
    FREE_HOURS: applicable_amount = min(discount.value, booking_context.excess_hours) * service.excess_hour_price
  return { valid: true, discount_id, applicable_amount, type }
```

On invoice creation, `usage_count` is incremented atomically. Only one discount per invoice (see §21 Edge Case #8).

---

## 10. Invoice Lifecycle

1. **Creation:** Generated on booking confirmation when `total_amount > 0`. Free bookings (service with `base_price = 0`) skip invoice creation entirely. Status: DRAFT. Invoice number is unique per tenant (sequential). **`due_date` calculation:** For full-payment bookings, `due_date = booking.start_time` (balance must be settled before the booking occurs). For deposit bookings (where deposit was collected at booking time), `due_date` for the remaining balance defaults to `booking.start_time - 7 days` (balance due one week before the event). If `booking.start_time` is less than 7 days away, `due_date = booking.created_at + 3 days`. Businesses can override `due_date` manually via `PATCH /api/invoices/:id` in the Admin CRM.
2. **Line items:** Each service, add-on, excess-hour fee, and discount is a separate `invoice_line_items` row with `quantity`, `unit_price`, `tax_rate_id`, and computed `tax_amount`.
3. **Tax calculation:** `line_tax = quantity * unit_price * tax_rate.rate`. When `is_inclusive = true`: `tax = line_total - (line_total / (1 + rate))`. Default tax rate applied unless overridden per line.
4. **Totals:** `subtotal = SUM(line_totals)`, `tax_amount = SUM(line_taxes)`, `discount_amount` applied, `total = subtotal + tax_amount - discount_amount`.
5. **PDF generation:** `generateInvoicePdf` job renders with tenant branding and uploads to R2 storage. `pdf_url` is set on the invoice record.
6. **Status flow:** DRAFT -> SENT -> PARTIALLY_PAID -> PAID (or OVERDUE if past `due_date`, CANCELLED on booking cancellation). `amount_paid` is a running total updated on each succeeded payment.

### Post-Checkout Invoice Amendment (Phase 2 -- excess hours)

When a staff member checks out a booking with excess hours (SRS-3 §3, FR-CRM-23):

1. Calculate excess fee: `excess_hours * excess_hour_price` (recorded on `bookings.excess_hours` and `bookings.excess_hour_fee`)
2. Add a new `invoice_line_items` row: description="Excess hours ({N}h @ {rate}/h)", quantity=excess_hours, unit_price=excess_hour_price, with applicable tax
3. Update `invoices.subtotal`, `invoices.tax_amount`, and `invoices.total` to reflect the new line item
4. Set `invoices.status` to PARTIALLY_PAID if any prior payment has been collected (`amount_paid > 0`), or SENT if no payment has been collected (`amount_paid = 0`). This covers all scenarios: deposit-only collection, full payment before amendment (status was PAID but new total now exceeds `amount_paid`), and no prior payment.
5. Create a new payment intent via the PaymentProvider interface for the difference: `new_total - amount_paid`
6. Send amended invoice notification to client via the communications system

> This flow applies only when a service uses HOURLY pricing with `excess_hour_price` configured, and the booking extends beyond `base_hours`. Services with FIXED pricing are unaffected by checkout.

---

## 11. Payment Provider Integration

**Architecture:** All payment processing goes through the `IPaymentProvider` abstraction interface, injected via NestJS DI based on the tenant's `payment_provider` column. Stripe Connect Express is the Phase 1 implementation. Adyen and PayPal Commerce Platform are planned for Phase 3. Regional providers (GCash/Maya, Razorpay, Mollie) are planned for Phase 4. The interface defines: `createConnectedAccount()`, `getOnboardingStatus()`, `createPaymentIntent()`, `confirmPayment()`, `processRefund()`, `verifyWebhookSignature()`, `handleWebhook()`, `getProviderName()`, `getSupportedCurrencies()`, `getSupportedCountries()`.

**Onboarding:** For Stripe (Phase 1), Express accounts via `stripe.accountLinks.create()`. Payment provider connection is optional during initial onboarding (booking page works without it -- bookings are confirmed without online payment, allowing businesses to collect payment offline). Tenant's `payment_provider_onboarded` flag must be `true` before any payment intent creation; otherwise the payment step is excluded from the booking flow (see SRS-1 Section 8 dynamic step resolution). If a tenant later connects a payment provider, the payment step automatically appears in their booking flows.

**Offline Payment Path (First-Class):** When `payment_provider` is `OFFLINE` or `payment_provider_onboarded` is `false`, booking confirms without online payment. Invoice generates with 'Pay Later' status. Business marks paid manually via Admin CRM. This supports businesses in countries where online payment providers are unavailable and serves as the critical safety valve for the PaymentProvider abstraction.

**Payment Intent Flow:**
1. Server calculates total from pricing model + line items.
2. `paymentProvider.createPaymentIntent(amount, currency, platform_fee, metadata)` — each implementation translates `platform_fee` into the provider's native fee collection mechanism (see provider table above).
3. Client confirms via provider-side tokenization (Stripe Elements in Phase 1); provider sends payment success webhook.

**Fee Calculation (Two Separate Components):**

Savspot collects two distinct fees via the payment provider's platform fee mechanism. Both are computed server-side and summed into a single `platform_fee` on the payment intent. The combined platform fee (`processing_fee` + `referral_commission`) is passed to `paymentProvider.createPaymentIntent()` as the `platform_fee` parameter. Each `IPaymentProvider` implementation maps this to the provider's native fee mechanism:

| Provider | Native Mechanism | Phase |
|----------|-----------------|-------|
| Stripe Connect | `application_fee_amount` on PaymentIntent | 1 |
| Adyen for Platforms | Split payment with commission amount | 3 |
| PayPal Commerce | `partner_fee` in Order API | 3 |
| Offline | N/A — fee recorded locally only | 1 |

These fees are **in addition to** the provider's own processing fee (e.g., Stripe ~2.9% + $0.30 in the US), which the provider deducts from the connected account's balance before any platform fees.

```
// 1. Processing fee -- ALWAYS applied to every transaction
processing_fee = payment_amount * 0.01   // 1.0% of the actual payment amount (not booking_total)
// For full payments: payment_amount == booking_total, so fee == booking_total * 0.01
// For deposits/balance: each payment carries 1.0% of its own amount; sum across all payments == booking_total * 0.01

// 2. Referral commission -- ONLY on first platform-sourced booking per client per tenant
referral_commission = 0
IF booking.source IN (DIRECTORY, API, REFERRAL)
  AND NOT EXISTS (
    SELECT 1 FROM bookings
    WHERE client_id = current_client_id
      AND tenant_id = current_tenant_id
      AND source IN ('DIRECTORY', 'API', 'REFERRAL')
      AND status NOT IN ('CANCELLED')
      AND created_at < current_booking.created_at
  ):
  referral_commission = min(booking_total * platform_referral_rate, platform_referral_cap)
  // platform_referral_rate: Savspot-configured, default 0.20 (20%), may vary by region or promotion
  // platform_referral_cap: Savspot-configured, default $500 (50000 minor units); prevents sticker shock on high-value bookings

// Combined fee passed to payment provider (provider-agnostic value passed to IPaymentProvider.createPaymentIntent())
platform_fee_amount = processing_fee + referral_commission
```

**Effective merchant cost example ($100 booking, US, direct source, Stripe provider):**
- Provider processing fee: ~$3.20 (Stripe 2.9% + $0.30) — deducted by provider from connected account
- Savspot platform fee: $1.00 (1.0%) — collected via platform_fee_amount
- Business receives: ~$95.80
- Total effective rate: ~3.9% + $0.30

The processing fee rate (1.0%) and referral commission rate (15-20%, capped at $500 default per booking) are Savspot platform-level configuration, not tied to subscription tier. Both components are recorded separately on the `payments` record (`processing_fee` and `referral_commission` columns) for revenue reporting and auditability. The `platform_fee` column stores the sum. See BRD Section 1 (Revenue Model) and BR-RULE-2/BR-RULE-3 for business rules.

### Deposit Payment Flow (FR-PAY-3)

When a service has `deposit_config` configured (non-null), the payment step collects a deposit instead of the full amount. The remaining balance is tracked on the invoice and collected later.

**Deposit Calculation:**

```
resolvePaymentAmount(service, booking_total):
  if service.deposit_config == null:
    return { type: FULL_PAYMENT, amount: booking_total }

  switch service.deposit_config.type:
    "percentage":
      deposit_amount = booking_total * (service.deposit_config.amount / 100)
    "fixed":
      deposit_amount = min(service.deposit_config.amount, booking_total)

  deposit_amount = round(deposit_amount, 2)   // cents precision
  if deposit_amount >= booking_total:
    return { type: FULL_PAYMENT, amount: booking_total }  // deposit >= total, collect full

  return { type: DEPOSIT, amount: deposit_amount }
```

**Payment Step Behavior:**

1. During booking flow, `resolvePaymentAmount()` determines whether the payment step collects a deposit or full payment.
2. The PRICING_SUMMARY step displays either "Total: $X" (full payment) or "Deposit due now: $X of $Y total" (deposit) based on the resolved type.
3. The PaymentIntent is created with the resolved amount. `payments.type` is set to `DEPOSIT` or `FULL_PAYMENT` accordingly.
4. `processing_fee` is calculated per-payment on the payment amount (1.0% of the actual payment). `referral_commission` (when eligible) is always calculated on `booking_total` regardless of payment type and is collected in full on the **first** payment (deposit). Balance payments carry only the `processing_fee` (no additional referral commission). Each subsequent payment incurs its own `processing_fee` on the amount paid.

**Deposit Fee Example ($100 booking, $30 deposit, eligible for referral commission at 20%):**
- Deposit payment `platform_fee_amount`: processing_fee ($0.30 = 1.0% of $30) + referral_commission ($20.00 = 20% of $100 booking_total) = $20.30
- Balance payment `platform_fee_amount`: processing_fee ($0.70 = 1.0% of $70) + $0.00 referral (already collected) = $0.70

**Remaining Balance Tracking:**

- On invoice creation, `invoices.total` reflects the full booking amount. `invoices.amount_paid` starts at the deposit amount after the first SUCCEEDED payment.
- The remaining balance is: `invoices.total - invoices.amount_paid`.
- The business collects the remaining balance via the Admin CRM (`POST /api/payments/create-intent` with `booking_id` and requested amount), or the system sends payment reminders per SRS-4 §24.
- Each subsequent payment creates a new `payments` row with `type = FULL_PAYMENT` and the remaining amount. `invoices.amount_paid` is updated on each SUCCEEDED payment.

**Event Firing:**

| Event | When Fired |
|-------|------------|
| `DEPOSIT_RECEIVED` | A DEPOSIT-type payment transitions to SUCCEEDED |
| `FULL_PAYMENT_RECEIVED` | A FULL_PAYMENT-type payment transitions to SUCCEEDED AND `invoices.amount_paid >= invoices.total` |
| `PAYMENT_RECEIVED` | Any payment transitions to SUCCEEDED (fires alongside DEPOSIT_RECEIVED or FULL_PAYMENT_RECEIVED) |

**Booking State on Deposit:**

- For `AUTO_CONFIRM` services: booking transitions to CONFIRMED immediately on deposit receipt (full payment is not required for confirmation).
- For `MANUAL_APPROVAL` services: booking remains PENDING until staff confirms, regardless of deposit status.

---

## 12. Over-payment Prevention

Before creating any PaymentIntent, the server validates:

```
allowed = invoice.total - SUM(payments WHERE status = SUCCEEDED)
IF requested_amount > allowed THEN reject with OVERPAYMENT_BLOCKED
```

The payment provider's payment intent amount must exactly match the server-validated amount. Client-side amounts are never trusted.

---

## 13. Gateway Circuit Breaker

Three-state pattern for payment provider API calls (state stored in Redis, per-provider):

| State | Behavior | Transition |
|-------|----------|------------|
| CLOSED | Normal operation; track consecutive failures | failures >= 5 -> OPEN |
| OPEN | All calls fail-fast (no provider request) | After `recovery_timeout` (60s) -> HALF_OPEN |
| HALF_OPEN | Allow 1 probe call | Success -> CLOSED; Failure -> OPEN (timeout doubled) |

Thresholds: `failure_threshold = 5`, `recovery_timeout = 60s` (doubles on repeated failures from HALF_OPEN).

---

## 14. Webhook Processing & Dead Letter Queue

1. **Receipt:** POST `/api/payments/webhooks/:provider` (e.g., `/api/payments/webhooks/stripe`) verifies provider-specific signature via `paymentProvider.verifyWebhookSignature()`, writes to `payment_webhook_logs`.
2. **Idempotency:** `event_id` unique constraint prevents reprocessing. Duplicate webhooks return HTTP 200 immediately.
3. **Processing:** Event type is routed to the appropriate handler (e.g., `payment_intent.succeeded` -> update payment state machine).
4. **Retry on failure:** `processWebhookRetries` job (every 10 min) re-processes failed logs where `retry_count < max_retries` (default 5).
5. **Dead letter:** After max retries, the log entry is moved to `webhook_dead_letters` with the final error message.
6. **Resolution:** Admin UI allows viewing, manual retrying, or marking dead-lettered webhooks as resolved. `resolved_by` and `resolved_at` are recorded.

---

## 15. Payment Retry & Reconciliation

**Retry backoff formula:**
```
next_retry_delay = base_delay * 2^(retry_count - 1) * (1 +/- 0.3 * random)
```
Default `base_delay = 30 min`, `max_retries = 5`. After max retries, payment is dead-lettered and admin is alerted.

**Daily reconciliation** (`reconcilePayments`, 2:00 AM): Compares local payment records against payment provider API responses (per-provider).

| Mismatch Type | Description | Action |
|---------------|-------------|--------|
| `AMOUNT_MISMATCH` | Local and provider amounts differ | Admin alert with both values |
| `STATUS_MISMATCH` | Local and provider statuses differ | Admin alert; auto-correct if provider is authoritative |
| `MISSING_LOCAL` | Provider has payment not in local DB | Create record; flag for review |
| `MISSING_REMOTE` | Local record not found in provider | Flag as potential orphan |

**Orphan detection** (`detectOrphanPayments`, hourly): Flags stale PENDING (>1h), stale PROCESSING (>30min), and succeeded-without-booking records.

---

## 16. Background Jobs -- Booking

| # | Job | Queue | Schedule | Purpose |
|---|-----|-------|----------|---------|
| 1 | `expireReservations` | bookings | Every 5 min | Release expired `date_reservations`; set status EXPIRED |
| 2 | `abandonedBookingRecovery` | bookings | Hourly | Send recovery email for sessions abandoned after 1 hour |
| 3 | `processCompletedBookings` | bookings | Every 30 min | Single job with deterministic two-phase execution: **(Phase A)** Mark NO_SHOW: CONFIRMED bookings past `end_time + services.no_show_grace_minutes` (default 30 min) where `check_in_status = 'PENDING'` (no check-in occurred; Phase 2+ — requires check-in feature) or explicitly flagged via `POST /api/bookings/:id/no-show`. Fires `BOOKING_NO_SHOW` event. **(Phase B)** Auto-complete: Remaining CONFIRMED bookings past `end_time` with `check_in_status != 'PENDING'` (staff interacted — client was checked in) or `check_in_status = 'PENDING'` and not marked NO_SHOW in Phase A → transition to COMPLETED. Fires `BOOKING_COMPLETED` event. In Phase 1, Phase A effectively only processes admin-flagged no-shows (check-in feature is Phase 2, so `check_in_status` is always `'PENDING'` and the grace-period condition alone is insufficient without explicit flagging); Phase B handles all other bookings. In Phase 2+, Phase A handles check-in-aware no-shows. |
| 4 | `sendBookingReminders` | communications | Every 15 min | 24h and 48h reminders for upcoming bookings |
| 5 | `calendarTwoWaySync` | calendar | Per-connection frequency | Pull external events to block availability |
| 6 | `calendarTokenRefresh` | calendar | Hourly | Refresh expiring Google/Outlook OAuth tokens |
| 7 | `calendarEventPush` | calendar | On confirm/reschedule/cancel | Push outbound event to connected calendar |
| 8 | `enforceApprovalDeadlines` | bookings | Hourly | Auto-cancel PENDING bookings with MANUAL_APPROVAL past `services.approval_deadline_hours` (default 48h); issue full refund; send cancellation notification |

---

## 17. Background Jobs -- Payments

| # | Job | Queue | Schedule | Purpose |
|---|-----|-------|----------|---------|
| 1 | `retryFailedPayments` | payments | Every 30 min | Retry FAILED payments with exponential backoff |
| 2 | `reconcilePayments` | payments | Daily 2:00 AM | Compare local records vs. payment provider; flag mismatches |
| 3 | `detectOrphanPayments` | payments | Hourly | Find stale PENDING/PROCESSING and orphan payments |
| 4 | `processWebhookRetries` | payments | Every 10 min | Re-process failed webhook logs; dead-letter after max |
| 5 | `generateInvoicePdf` | invoices | On invoice create | Render branded PDF; upload to R2 storage |
| 6 | `syncToAccounting` | accounting | Every 30 min | Sync invoices/payments to QuickBooks/Xero **(Phase 3)** |
| 7 | `refreshAccountingTokens` | accounting | Hourly | Refresh expiring accounting OAuth tokens **(Phase 3)** |
| 8 | `analyticsAggregation` | analytics | Daily 1:00 AM | Aggregate booking session data into `booking_flow_analytics` daily rows (step_metrics, conversion_rate, bounce_rate, avg_completion_time_sec, total_revenue). Per-tenant, per-flow. **(Phase 3 -- Premium Analytics; see SRS-4 §39)** |

---

## 18. Background Job Queues

| # | Queue | Purpose | Concurrency |
|---|-------|---------|-------------|
| 1 | `bookings` | Reservation expiry, no-show detection, abandonment recovery, approval deadline enforcement | 5 |
| 2 | `payments` | Payment retries, reconciliation, orphan detection, webhooks, payment reminders, deadline enforcement | 5 |
| 3 | `calendar` | Calendar sync, token refresh, event push | 3 |
| 4 | `communications` | Booking reminders, receipts, notifications, delivery tracking, digests, push token cleanup (see SRS-4 §40) | 10 |
| 5 | `accounting` | Accounting sync, token refresh | 2 |
| 6 | `invoices` | PDF generation, invoice delivery | 3 |
| 7 | `dead-letter` | Failed jobs requiring manual intervention | 1 |
| 8 | `high-priority` | Time-sensitive operations (refunds, concurrency resolution) | 5 |
| 9 | `gdpr` | Data export generation, account deletion processing (see SRS-4 §41a) | 2 |
| 10 | `analytics` | Daily analytics aggregation into `booking_flow_analytics` **(Phase 3)** | 2 |
| 11 | `workflows` | Workflow stage processing, quote/contract expiry, outbound webhook delivery (see SRS-4 §41) | 3 |

---

## 19. Scheduled Jobs

This table covers booking, payment, and calendar-domain scheduled jobs. For communications, notifications, workflow, and GDPR jobs see SRS-4 §40 (6 jobs), §41 (7 jobs), and §41a (2 jobs). **Note:** `sendPaymentReminders` (every 15 min) and `enforcePaymentDeadlines` (daily 6 AM) are payment-domain jobs canonically defined in SRS-4 §41 due to their dependency on the payment deadline automation specification in SRS-4 §24. They run on the `payments` queue.

| # | Job | Cron | Description |
|---|-----|------|-------------|
| 1 | `expireReservations` | `*/5 * * * *` | Release expired date reservation locks |
| 2 | `abandonedBookingRecovery` | `0 * * * *` | Recover sessions abandoned after 1-hour timeout |
| 3 | `processCompletedBookings` | `*/30 * * * *` | Two-phase: (A) flag no-shows past grace period; (B) auto-complete remaining CONFIRMED bookings past `end_time` |
| 4 | `sendBookingReminders` | `*/15 * * * *` | Send 24h/48h booking reminders |
| 5 | `retryFailedPayments` | `*/30 * * * *` | Retry failed payments with backoff |
| 6 | `reconcilePayments` | `0 2 * * *` | Daily payment provider reconciliation |
| 7 | `detectOrphanPayments` | `0 * * * *` | Hourly orphan payment detection |
| 8 | `processWebhookRetries` | `*/10 * * * *` | Retry failed payment provider webhook logs |
| 9 | `calendarTokenRefresh` | `0 * * * *` | Refresh expiring calendar OAuth tokens |
| 10 | `refreshAccountingTokens` | `0 * * * *` | Refresh expiring accounting OAuth tokens (Phase 3) |
| 11 | `analyticsAggregation` | `0 1 * * *` | Daily analytics aggregation (Phase 3) |
| 12 | `enforceApprovalDeadlines` | `0 * * * *` | Auto-cancel PENDING bookings with MANUAL_APPROVAL past approval deadline |

---

## 20. Edge Cases -- Booking

| # | Case | Resolution |
|---|------|------------|
| 1 | Race condition on popular slot | `SELECT FOR UPDATE` serializes; loser gets `DATE_TAKEN` + auto-refund |
| 2 | Reservation expiry during payment | Expiry job checks for in-flight payments before releasing |
| 3 | Calendar token expiry during sync | Connection set to ERROR; re-auth notification to owner |
| 4 | Guest checkout account claiming | Guest checkout silently creates a passwordless user record from the guest's email and name (see SRS-2 §3 `users` table note). `bookings.client_id` is set to this user's ID at booking time, preserving the NOT NULL constraint. A `consent_records` entry for `DATA_PROCESSING` is created alongside the user record, capturing the privacy/terms acceptance from the CONFIRMATION step (see SRS-1 §8). **Account claim flow:** When a guest later registers with the same email, the system detects the existing passwordless user record (no `password_hash`, `email_verified = false`). Instead of creating a new user, the registration flow claims the existing record: sets `password_hash`, marks `email_verified = true`, and links any OAuth providers. All prior bookings, payments, invoices, and communications are already associated via `client_id` -- no data migration is needed. If the registration email doesn't match any existing user, a new user record is created normally. Account claiming is idempotent and logged in `audit_logs`. |
| 5 | Timezone edge cases | Availability computed in tenant timezone; stored/compared in UTC |
| 6 | Advance window violations | API rejects dates outside min/max booking advance range |
| 7 | Buffer overlap | Availability engine subtracts service `buffer_before_minutes`/`buffer_after_minutes` before returning slots |
| 8 | Rescheduling limits | `services.max_reschedule_count` (null = unlimited); when `bookings.reschedule_count >= service.max_reschedule_count`, reschedule attempts are rejected with HTTP 422 |
| 9 | Late checkout fee | Calculated as `excess_hours * excess_hour_price` on staff check-out |
| 10 | Free service booking | No invoice created; no payment step in flow; booking auto-confirms |
| 11 | No payment provider connected | Payment step excluded from booking flow; booking confirms without online payment; offline payment path active |
| 12 | Service config changes mid-session | Session uses `resolved_steps` captured at session creation; config changes do not affect in-progress sessions |
| 13 | Guest config added to existing service | Existing bookings unaffected (null guest data); new bookings include guest step |
| 14 | Midnight UTC crossing | `date_reservations.reserved_date` stores the **tenant-local date** (derived from `start_time` converted to `tenants.timezone`), not the UTC date. This ensures availability queries by date (which operate in tenant timezone per §6) match correctly. The `start_time`/`end_time` TIMESTAMPTZ fields remain the authoritative time range for overlap checks. |

---

## 21. Edge Cases -- Payments

| # | Case | Resolution |
|---|------|------------|
| 1 | Over-payment attempt | Validate `amount <= invoice_remaining` before PaymentIntent creation |
| 2 | Webhook replay / duplicate | `event_id` unique constraint; duplicates return 200 without reprocessing |
| 3 | Partial refund then dispute | Dispute handler adjusts based on net amount after refunds |
| 4 | Currency mismatch | Payment currency must match invoice currency; multi-currency tenants use separate invoices |
| 5 | Payment provider not onboarded | Block PaymentIntent creation; return `ONBOARDING_REQUIRED` error; booking can proceed via offline payment path |
| 6 | Concurrent payment + refund | State machine blocks REFUNDED while payment is PROCESSING; refund waits |
| 7 | Dead letter resolution | Admin UI to view, retry, or manually resolve dead-lettered webhooks |
| 8 | Discount stacking | Only one discount per invoice; enforced at invoice creation |
| 9 | Tax-inclusive calculation | `tax = line_total - (line_total / (1 + rate))` when `is_inclusive = true` |
| 10 | Tiered pricing boundary | Guest count on exact tier boundary uses the lower tier |
| 11 | Reconciliation mismatches | Four types (`AMOUNT_MISMATCH`, `STATUS_MISMATCH`, `MISSING_LOCAL`, `MISSING_REMOTE`) with distinct admin alerts |