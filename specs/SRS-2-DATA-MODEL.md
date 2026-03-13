# Savspot -- Software Requirements Specification: Data Model & API Reference

**Version:** 1.2 | **Date:** March 7, 2026 | **Author:** SD Solutions, LLC
**Document:** SRS Part 2 of 4

---

## 1. Scope

This document defines every persistent data model and the complete API surface for Savspot. For architecture see **SRS-1**; for booking/payment logic see **SRS-3**; for comms/security/workflow logic see **SRS-4**.

**Resolutions applied:** (a) `users.role` is platform-level only (`PLATFORM_ADMIN`, `USER`); business roles live on `tenant_memberships`. (b) `bookings.source` includes `REFERRAL`. (c) `reviews`, `api_keys`, `blocked_dates` fully defined. (d) Session abandonment: 1 hour (Redis TTL). (e) Progressive complexity: advanced service features use nullable JSONB columns; null = feature inactive and hidden. Business-type presets write concrete default data during onboarding (see SRS-1 Section 8).

> **Concurrent edit strategy:** All admin-editable resources (`services`, `venues`, `availability_rules`, `invoices`, `booking_addons`, etc.) include an `updated_at` column maintained by Prisma's `@updatedAt` directive. API `PATCH`/`PUT` endpoints accept an optional `If-Match` header containing the resource's `updated_at` timestamp. If the header is present and the stored `updated_at` differs, the endpoint returns `409 Conflict` with the current resource state. This optimistic locking is advisory in Phase 1 — the header is optional, and clients that omit it get last-writer-wins behavior. Phase 2+ admin UI will include the header by default.

## 2. Entity Relationship Diagram

```
+----------+       +-------------------+       +---------+
| tenants  |--1:N--| tenant_memberships|--N:1--| users   |
+----+-----+       | (OWNER/ADMIN/STAFF|       +----+----+
     |              +-------------------+            |
     |--1:N--> services --N:M--> service_providers   |
     |              (via service_providers join)      |
     |--1:N--> venues                                |
     |         services/venues ---N:1--> bookings <--N:1-- users (client)
     |                                      |
     |--1:N--> booking_flows/sessions       +--1:N--> payments/invoices
     |--1:N--> availability_rules           +--1:N--> contracts/quotes
     |--1:N--> blocked_dates/api_keys       +--1:N--> reviews/communications
     |--1:N--> calendar_connections --1:N--> calendar_events
     |--1:N--> accounting_connections (Phase 3)
     |--1:N--> client_profiles <--N:1-- users (client preferences, tenant-scoped)
     |--1:N--> import_jobs --1:N--> import_records
     |--1:N--> feedback
     +--1:N--> notifications <--N:1-- users
```

Tenant is root aggregate; all business data scoped via `tenant_id` + RLS. Booking is the central transaction entity.

## 3. Platform Tables

### `tenants`
| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| name/slug | VARCHAR | NOT NULL; slug UNIQUE | URL-safe slug |
| description | TEXT | | |
| category | ENUM | NOT NULL | VENUE, SALON, STUDIO, FITNESS, PROFESSIONAL, OTHER |
| category_description | VARCHAR | | Free-text self-description; captured when category = OTHER during onboarding (FR-ONB-12). Used for preset expansion analysis (see BRD §5). |
| logo_url | VARCHAR | | Logo image URL (R2) |
| cover_photo_url | VARCHAR | | Cover/banner image URL (R2); displayed on booking page and Admin CRM profile (FR-ONB-3) |
| brand_color | VARCHAR | | Hex color |
| timezone | VARCHAR | NOT NULL | IANA |
| currency/country | VARCHAR | NOT NULL | ISO 4217 / ISO 3166-1 |
| address | JSONB | | {street, city, state, postal, country, lat, lng} |
| contact_email, contact_phone | VARCHAR | | |
| payment_provider | ENUM | DEFAULT 'STRIPE' | STRIPE, ADYEN, PAYPAL, OFFLINE; selects PaymentProvider implementation at runtime via NestJS DI |
| payment_provider_account_id | VARCHAR | | Provider-specific connected account ID (e.g., Stripe Connect Express acct_xxx) |
| payment_provider_onboarded | BOOLEAN | DEFAULT false | |
| subscription_tier | ENUM | DEFAULT 'FREE' | FREE, PRO |
| subscription_provider_id | VARCHAR | | Subscription billing provider ID (Phase 2 -- manually managed via database in Phase 1; see BRD §2) |
| is_published | BOOLEAN | DEFAULT false | Transitions to `true` when tenant completes Phase A onboarding (first service created). Controls visibility in platform directory (Phase 4). Does NOT gate booking page access -- unpublished tenants can still share their booking URL directly. Transitions back to `false` only via admin action. |
| search_vector | tsvector | | Auto-maintained by trigger (see §15); weighted: name='A', description='B' |
| tos_accepted_at | TIMESTAMPTZ | | Timestamp of Terms of Service acceptance; null if not yet accepted |
| tos_version | VARCHAR | | Version identifier of the accepted ToS (e.g., "2026-02-25") |
| dpa_accepted_at | TIMESTAMPTZ | | Timestamp of Data Processing Agreement acceptance; null if not yet accepted |
| dpa_version | VARCHAR | | Version identifier of the accepted DPA |
| status | VARCHAR(20) | NOT NULL DEFAULT 'active' | Enum: active, suspended (Phase 1), deactivated (Phase 2+ — voluntary closure by tenant owner). Controls tenant access and booking page visibility. See SRS-4 §30c. |
| retention_overrides | JSONB | | Per-tenant retention period overrides for regional compliance (e.g., `{"invoices_years": 10}` for German tax law). NULL = use defaults from SRS-4 §30b. Phase 3. |
| created_at, updated_at | TIMESTAMPTZ | NOT NULL | |

### `users`
| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| email | VARCHAR | UNIQUE, NOT NULL | |
| password_hash | VARCHAR | | Nullable (OAuth-only) |
| name | VARCHAR | NOT NULL | |
| phone, avatar_url | VARCHAR | | |
| role | ENUM | DEFAULT 'USER' | **PLATFORM_ADMIN or USER only** |
| email_verified | BOOLEAN | DEFAULT false | |
| google_id, apple_id | VARCHAR | UNIQUE | Nullable |
| locale, timezone | VARCHAR | | |
| mfa_enabled | BOOLEAN | DEFAULT false | Phase 2 (FR-AUTH-11) |
| mfa_secret | VARCHAR | | TOTP secret, AES-256 encrypted; Phase 2 |
| mfa_recovery_codes | JSONB | | Hashed recovery codes; Phase 2 |
| created_at, updated_at | TIMESTAMPTZ | NOT NULL | |

> A user is a "client" implicitly when they have bookings but no `tenant_memberships` row for that tenant.
>
> **Guest checkout user creation (FR-BFW-17):** When a guest (unauthenticated) completes a booking, the system silently creates a passwordless user record from the email and name captured during the booking flow. This preserves the NOT NULL constraint on `bookings.client_id`. The created user has `password_hash = NULL` (same as OAuth-only users) and `email_verified = false`. If the guest later registers with the same email, the existing user record is claimed: password is set, email is verified, and all prior booking history is already linked via `client_id`. No merge is required because the user record was created at booking time. See SRS-3 §20 Edge Case #4 for the account claim flow.

### `tenant_memberships`
| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| tenant_id | UUID | FK->tenants, NOT NULL | RLS key |
| user_id | UUID | FK->users, NOT NULL | UNIQUE(tenant_id, user_id) |
| role | ENUM | NOT NULL | OWNER, ADMIN, STAFF |
| permissions | JSONB | | Granular overrides |
| created_at | TIMESTAMPTZ | NOT NULL | |

### `team_invitations`
| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| tenant_id | UUID | FK->tenants, NOT NULL | RLS key |
| invited_by | UUID | FK->users, NOT NULL | |
| invitee_email | VARCHAR | NOT NULL | |
| role | ENUM | NOT NULL | ADMIN, STAFF |
| token | VARCHAR | UNIQUE, NOT NULL | Signed invitation token |
| status | ENUM | DEFAULT 'PENDING' | PENDING, ACCEPTED, EXPIRED, REVOKED |
| expires_at | TIMESTAMPTZ | NOT NULL | Default 7 days from creation |
| accepted_at | TIMESTAMPTZ | | |
| created_at | TIMESTAMPTZ | NOT NULL | |

> **Unique:** (tenant_id, invitee_email, status='PENDING') -- prevents duplicate pending invitations. On acceptance, a `tenant_memberships` row is created and the invitation status is set to ACCEPTED. Supports FR-CRM-11.

### `platform_admin` (v1 Note)

> **Phase 1:** The `PLATFORM_ADMIN` role (on `users.role`) grants full database-level access for platform operations: tenant management, commission rate configuration, dead-letter resolution, and breach response. There is no dedicated admin dashboard in Phase 1 -- platform administration is performed via CLI scripts (`pnpm admin:*` — see PRD §4.7, FR-PADM-1 through FR-PADM-5) and payment provider dashboards. A platform admin web dashboard is planned for Phase 2+ (FR-PADM-6).

### Tenant Role Permission Matrix

The `tenant_memberships.role` field determines the base permission set. The `permissions` JSONB column can narrow (but never widen) these defaults per member.

**Enforcement:** NestJS guards check `tenant_memberships.role` (and `permissions` overrides) on every Admin CRM request after tenant resolution (SRS-4 §26). Unauthorized requests return HTTP 403.

> **Phase 1 implementation scope:** The full permission matrix is specified and the data model supports it from day one. However, Phase 1 enforcement is simplified: the NestJS guard checks `tenant_memberships.role` at the role level (OWNER = full access, ADMIN = full access minus tenant settings and team management ownership actions, STAFF = read + check-in + record offline payment + send messages + edit client notes). The granular `permissions` JSONB override evaluation is deferred to Phase 2 (when FR-CRM-11 team management becomes a real use case and OWNER needs to restrict individual members). This reduces Phase 1 guard implementation from 30+ individual permission checks to 3 role-level checks, while preserving the data model for full granularity in Phase 2.

#### Domain Permissions

| Domain | Action | OWNER | ADMIN | STAFF |
|--------|--------|:-----:|:-----:|:-----:|
| **Tenant Settings** | View business profile, branding, booking page config | Yes | Yes | No |
| | Edit business profile, branding, booking page config | Yes | No | No |
| | Manage payment provider (connect/disconnect) | Yes | No | No |
| | Manage API keys (create/rotate/delete) | Yes | No | No |
| | Manage subscription & billing | Yes | No | No |
| | Configure tax rates | Yes | Yes | No |
| | Manage custom domain (Pro) | Yes | No | No |
| **Services** | View services list & details | Yes | Yes | Yes |
| | Create / edit / archive services | Yes | Yes | No |
| | Configure pricing (tiers, deposits, addons) | Yes | Yes | No |
| | Configure intake forms, guest tracking, contracts | Yes | Yes | No |
| **Availability** | View availability rules & schedule | Yes | Yes | Yes |
| | Create / edit / delete availability rules | Yes | Yes | No |
| | Create / edit / delete date overrides | Yes | Yes | No |
| **Bookings** | View all bookings (list, detail, calendar) | Yes | Yes | Yes |
| | Approve / reject (MANUAL_APPROVAL) | Yes | Yes | No |
| | Cancel / reschedule bookings | Yes | Yes | No |
| | Check in / check out (Phase 2) | Yes | Yes | Yes |
| | Mark no-show (`POST /api/bookings/:id/no-show`) | Yes | Yes | No |
| **Clients (CRM)** | View client list & profiles (tenant-scoped) | Yes | Yes | Yes |
| | Edit client notes & tags | Yes | Yes | Yes |
| | Merge duplicate client records | Yes | Yes | No |
| | Export client data | Yes | Yes | No |
| **Invoices & Payments** | View invoices & payment history | Yes | Yes | Yes |
| | Edit invoice (due_date, status, line items) | Yes | Yes | No |
| | Issue manual refund | Yes | Yes | No |
| | Record offline payment | Yes | Yes | Yes |
| **Quotes** | View quotes | Yes | Yes | Yes |
| | Create / send / revise quotes | Yes | Yes | No |
| **Contracts** | View contracts | Yes | Yes | Yes |
| | Create / send / void contracts | Yes | Yes | No |
| **Discounts** | View discount codes | Yes | Yes | Yes |
| | Create / edit / deactivate discount codes | Yes | Yes | No |
| **Gallery** | View gallery photos | Yes | Yes | Yes |
| | Upload / edit / delete gallery photos | Yes | Yes | No |
| **Reviews** | View reviews | Yes | Yes | Yes |
| | Respond to / report reviews | Yes | Yes | No |
| **Venues** | View venues | Yes | Yes | Yes |
| | Create / edit / archive venues | Yes | Yes | No |
| **Communications** | View message threads & notifications | Yes | Yes | Yes |
| | Send messages to clients | Yes | Yes | Yes |
| | Configure workflow automations (simple) | Yes | Yes | No |
| | Configure workflow templates (advanced, Pro) | Yes | Yes | No |
| **Calendar Sync** | View connected calendars | Yes | Yes | Yes |
| | Connect / disconnect external calendars | Yes | Yes | No |
| **Analytics** | View dashboard metrics (free) | Yes | Yes | No |
| | View advanced reports / export (Pro) | Yes | Yes | No |
| **Team** | View team members & pending invitations | Yes | Yes | No |
| | Invite members (ADMIN or STAFF) | Yes | Yes | No |
| | Remove team members | Yes | No | No |
| | Change member roles | Yes | No | No |
| | Edit member permission overrides | Yes | No | No |
| | Transfer ownership | Yes | No | No |
| **Webhooks / API** | View webhook configs | Yes | Yes | No |
| | Create / edit / delete webhooks | Yes | Yes | No |

#### Notification Routing

| Notification | OWNER | ADMIN | STAFF |
|-------------|:-----:|:-----:|:-----:|
| New booking (auto-confirmed) | Yes | Yes | Yes |
| Booking requires approval (MANUAL_APPROVAL) | Yes | Yes | No |
| Booking cancelled by client | Yes | Yes | Yes |
| Booking no-show | Yes | Yes | No |
| Payment received | Yes | Yes | No |
| Payment overdue | Yes | Yes | No |
| New review submitted | Yes | Yes | No |
| New client message | Yes | Yes | Yes |
| Contract signed | Yes | Yes | No |
| Quote accepted/rejected | Yes | Yes | No |

#### `permissions` JSONB Override Schema

The `permissions` column on `tenant_memberships` allows OWNER to **restrict** a member's access below their base role. It cannot grant access beyond the role's defaults. When `permissions` is `NULL`, the full base role applies.

```jsonc
// Example: ADMIN restricted from financial operations
{
  "deny": [
    "invoices.edit",
    "payments.refund",
    "analytics.view"
  ]
}

// Example: STAFF granted client note editing but denied messaging
{
  "deny": [
    "communications.send"
  ]
}
```

**Override keys** follow the pattern `{domain}.{action}`:

| Key | Default: ADMIN | Default: STAFF | Description |
|-----|:-:|:-:|---|
| `tenant.edit` | deny | deny | Edit business profile & branding |
| `tenant.payment_provider` | deny | deny | Manage payment provider connection |
| `tenant.api_keys` | deny | deny | Manage API keys |
| `services.edit` | allow | deny | Create/edit/archive services |
| `availability.edit` | allow | deny | Manage availability rules |
| `bookings.approve` | allow | deny | Approve/reject MANUAL_APPROVAL bookings |
| `bookings.cancel` | allow | deny | Cancel/reschedule bookings |
| `bookings.checkin` | allow | allow | Check in/out (Phase 2) |
| `bookings.noshow` | allow | deny | Mark no-show |
| `clients.edit` | allow | allow | Edit client notes & tags |
| `clients.merge` | allow | deny | Merge duplicate clients |
| `clients.export` | allow | deny | Export client data |
| `invoices.edit` | allow | deny | Edit invoice details |
| `payments.refund` | allow | deny | Issue refunds |
| `payments.record` | allow | allow | Record offline payments |
| `quotes.edit` | allow | deny | Create/send/revise quotes |
| `contracts.edit` | allow | deny | Create/send/void contracts |
| `discounts.edit` | allow | deny | Manage discount codes |
| `gallery.edit` | allow | deny | Upload/edit/delete photos |
| `reviews.respond` | allow | deny | Respond to reviews |
| `venues.edit` | allow | deny | Manage venues |
| `communications.send` | allow | allow | Send messages to clients |
| `automations.edit` | allow | deny | Configure workflow automations |
| `calendar.manage` | allow | deny | Connect/disconnect calendars |
| `analytics.view` | allow | deny | View analytics & reports |
| `team.view` | allow | deny | View team members |
| `team.invite` | allow | deny | Invite team members |
| `webhooks.edit` | allow | deny | Manage webhooks |

> **OWNER** permissions cannot be overridden -- OWNER always has full access. The `permissions` column is only evaluated for ADMIN and STAFF roles. OWNER is the only role that can modify another member's `permissions`.

> **Resolution logic:** On each request, the guard loads the member's `role` and `permissions`. If `permissions` is NULL, the base role matrix applies. If `permissions.deny` contains the required key, access is denied (HTTP 403) regardless of base role. Unknown keys are ignored.

## 4. Booking Domain

### `booking_sessions`
| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| tenant_id | UUID | FK->tenants, NOT NULL | RLS key |
| booking_flow_id | UUID | FK->booking_flows | |
| service_id | UUID | FK->services | Nullable until service selected; set at session creation for single-service tenants, set during SERVICE_SELECTION step for multi-service tenants. Required before date reservation. Used by `resolveBookingSteps()` (SRS-1 §8). |
| client_id | UUID | FK->users | Nullable (guest) |
| source | ENUM | NOT NULL, DEFAULT 'DIRECT' | DIRECT, DIRECTORY, API, WIDGET, REFERRAL -- determined server-side at session creation from request context (see SRS-3 §2). Carried forward to `bookings.source` on completion. |
| current_step | INT | DEFAULT 0 | Index into resolved step list |
| resolved_steps | JSONB | NOT NULL | Step list resolved at session creation from service config (see SRS-1 Section 8) |
| data | JSONB | | Accumulated form data; keys correspond to resolved steps only |
| reservation_token | VARCHAR | UNIQUE | Links to date_reservations |
| reservation_expires_at | TIMESTAMPTZ | | |
| status | ENUM | NOT NULL | IN_PROGRESS, COMPLETED, ABANDONED, EXPIRED |
| created_at, updated_at | TIMESTAMPTZ | NOT NULL | Redis 1h TTL; flushed to PG |

### `bookings`
| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| tenant_id | UUID | FK->tenants, NOT NULL | RLS key |
| client_id, service_id | UUID | FK, NOT NULL | |
| venue_id, booking_flow_id | UUID | FK | Nullable |
| status | ENUM | NOT NULL | PENDING, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW |
| start_time, end_time | TIMESTAMPTZ | NOT NULL | UTC |
| total_amount | DECIMAL | NOT NULL | |
| currency | VARCHAR(3) | NOT NULL | |
| guest_count | INT | | Null when service has no guest_config |
| guest_details | JSONB | | Null when no age tiers; `[{age_tier, count}]` when configured |
| notes | TEXT | | |
| questionnaire_responses | JSONB | | Null when service has no intake_form_config |
| source | ENUM | NOT NULL | DIRECT, DIRECTORY, API, WIDGET, REFERRAL, **WALK_IN** -- Phase 1: DIRECT and WALK_IN used; WIDGET (Phase 2), REFERRAL/API (Phase 3), DIRECTORY (Phase 4); see SRS-3 §2. WALK_IN bookings bypass the session/reservation flow and enter CONFIRMED directly from the Quick-Add action (FR-BFW-18, FR-CRM-28). |
| metadata | JSONB | | |
| check_in_status | ENUM | DEFAULT 'PENDING' | PENDING, CHECKED_IN, CHECKED_OUT, NO_SHOW. **(Phase 2+ — FR-CRM-23.)** In Phase 1, always PENDING. NO_SHOW in this field indicates check-in never occurred within grace period; booking's `status` field also transitions to NO_SHOW. See SRS-3 §3 and §16 Job #3. |
| checked_in_at/out_at | TIMESTAMPTZ | | |
| checked_in_by/out_by | UUID | FK->users | Staff attribution |
| original_start_date | DATE | | Preserved on first reschedule |
| reschedule_count | INT | DEFAULT 0 | |
| cancellation_reason | ENUM | | CLIENT_REQUEST, PAYMENT_TIMEOUT, APPROVAL_TIMEOUT, DATE_TAKEN, ADMIN |
| cancelled_at | TIMESTAMPTZ | | |
| excess_hours, excess_hour_fee | DECIMAL | DEFAULT 0 | Late checkout overage |
| no_show_risk_score | DECIMAL(3,2) | | **(Phase 2, FR-AI-2)** AI-computed no-show probability (0.00-1.00) for upcoming bookings. Null = not yet computed. See SRS-4 §45.2. |
| created_at, updated_at | TIMESTAMPTZ | NOT NULL | |

### `booking_state_history`
id (PK), booking_id (FK->bookings, NOT NULL), tenant_id (FK->tenants, NOT NULL, RLS), from_state (ENUM -- booking status), to_state (ENUM -- booking status), reason (VARCHAR), triggered_by (ENUM: SYSTEM, ADMIN, CLIENT, WEBHOOK), metadata (JSONB), created_at (TIMESTAMPTZ, NOT NULL).

> Mirrors `payment_state_history` structure. Every booking state transition (SRS-3 §2) creates a row. Provides structured audit trail with `from_state`/`to_state` semantics for debugging, support, and compliance. Indexed on `(booking_id, created_at)`.

### `date_reservations`
id (PK), tenant_id (FK, RLS), session_id (FK->booking_sessions), venue_id (FK, nullable), service_id (FK, NOT NULL), reserved_date (DATE), start_time/end_time (TIMESTAMPTZ), token (UUID UNIQUE -- SELECT FOR UPDATE target), expires_at (default now+5min), status (HELD/CONFIRMED/RELEASED/EXPIRED), created_at.

> **Timezone clarification:** `reserved_date` stores the **tenant-local date** (derived from `start_time` converted to `tenants.timezone`), not the UTC date. This ensures date-based availability queries (which operate in tenant timezone per SRS-3 §6) align with the tenant's operating calendar. Overlap detection uses `start_time`/`end_time` TIMESTAMPTZ, not `reserved_date`. See SRS-3 §20 Edge Case #14 for the midnight UTC crossing scenario.

> **Status disambiguation:** `date_reservations.status = CONFIRMED` indicates the reservation lock has been converted to a booking. This is distinct from `bookings.status = CONFIRMED` (the booking has been confirmed by the system or staff). Use table context to disambiguate.

### `availability_rules`
id (PK), tenant_id (FK, RLS), venue_id/service_id (FK, nullable = applies to all), day_of_week (INT 0-6), start_time/end_time (TIME), is_active (BOOL DEFAULT true), created_at.

> **Zero-config default:** During onboarding, the business-type preset creates default recurring availability rules for the tenant (e.g., Mon-Fri 9-5 for PROFESSIONAL, Mon-Sat 9-6 for SALON). Each rule is a `day_of_week` + `start_time`/`end_time` row. These are concrete rows the business can modify or delete. A service with no service-specific rules inherits the tenant-level rules (rules where `service_id IS NULL`). One-off date blocks use the separate `blocked_dates` table. Buffer times are on the `services` table (`buffer_before_minutes`, `buffer_after_minutes`) rather than on availability rules, keeping the rule model simple.

### `blocked_dates` [NEW]
id (PK), tenant_id (FK, RLS), venue_id/service_id (FK, nullable = all), blocked_date (DATE), reason (VARCHAR), created_by (FK->users), created_at.

### `booking_flows`
id (PK), tenant_id (FK, RLS), name, is_default (BOOL), step_overrides (JSONB -- optional manual step ordering/customization; when null, steps are auto-resolved from service config per SRS-1 Section 8), settings (JSONB), min_booking_advance_days (INT, DEFAULT 1), max_booking_advance_days (INT, DEFAULT 365), created_at.

> **Zero-config default:** When a service has no explicit booking flow linked, the platform resolves steps dynamically from the service's configured data. The `step_overrides` field allows businesses to manually reorder or customize steps, but this is optional -- the auto-resolved flow works for most businesses.

### `calendar_connections`
id (PK), tenant_id/user_id (FK, RLS), provider (GOOGLE/MICROSOFT), access_token/refresh_token (AES-256 encrypted), token_expires_at, calendar_id, sync_direction (ONE_WAY/TWO_WAY), sync_calendars (JSONB — array of external calendar IDs to sync for INBOUND blocking, per FR-CAL-11), sync_frequency_minutes (DEFAULT 15), last_synced_at, status (ACTIVE/DISCONNECTED/ERROR), error_message, ical_feed_token (UUID UNIQUE — generated on connection creation; used as auth token for the iCal feed URL per FR-CAL-16; Phase 2).

> **Status transitions:** ACTIVE → ERROR on token refresh failure or sync failure (re-auth notification sent to tenant). ERROR → ACTIVE on subsequent successful token refresh or manual reconnection. DISCONNECTED is set when tenant explicitly removes the calendar connection.

### `calendar_events`
id (PK), tenant_id (FK, RLS), calendar_connection_id (FK), booking_id (FK, nullable — null means this is an INBOUND block from an external calendar, not a SavSpot booking), external_event_id, direction (OUTBOUND/INBOUND), start_time/end_time (TIMESTAMPTZ UTC), title, synced_at, created_at.

> **INBOUND blocking behavior (FR-CAL-10, SRS-3 §6):** INBOUND events with `booking_id = null` represent external calendar blocks (e.g., Booksy appointments synced via Google Calendar in the parallel-run design partner scenario). These participate in the availability resolver as hard blocks, identical to SavSpot bookings. The availability query treats INBOUND calendar events as occupied time slots. Clients see these slots as simply "Unavailable" — no event details are exposed (FR-CAL-13).

## 5. Payment Domain

### `payments`
| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| tenant_id | UUID | FK->tenants, NOT NULL | RLS key |
| booking_id | UUID | FK, NOT NULL | |
| invoice_id | UUID | FK | Nullable |
| provider_transaction_id | VARCHAR | | Provider-specific transaction ID (e.g., Stripe PaymentIntent pi_xxx, Adyen pspReference) |
| amount | DECIMAL | NOT NULL | |
| platform_fee | DECIMAL | | Sum of processing_fee + referral_commission |
| processing_fee | DECIMAL | | 1.0% of the payment amount (not booking_total); always present on succeeded payments. Across all payments for a booking, the sum of processing fees equals 1.0% of booking_total. This is Savspot's platform fee, separate from the payment provider's own processing fee (e.g., Stripe ~2.9% + $0.30) charged to the connected account. See SRS-3 §11 deposit fee example. |
| referral_commission | DECIMAL | | 15-20% of booking_total, capped at platform_referral_cap (default $500); only on first platform-sourced booking per client per tenant (see SRS-3 §11) |
| currency | VARCHAR(3) | NOT NULL | |
| status | ENUM | NOT NULL | CREATED, PENDING, PROCESSING, SUCCEEDED, FAILED, DISPUTED, REFUNDED, PARTIALLY_REFUNDED |
| type | ENUM | NOT NULL | DEPOSIT, FULL_PAYMENT, INSTALLMENT (reserved for Phase 3 -- FR-PAY-5 payment plans; not used in Phase 1-2), REFUND |
| retry_count | INT | DEFAULT 0 | |
| next_retry_at | TIMESTAMPTZ | | Exponential backoff |
| metadata | JSONB | | |
| created_at | TIMESTAMPTZ | NOT NULL | |

### `payment_state_history`
id (PK), payment_id (FK), tenant_id (FK->tenants, NOT NULL, RLS), from_state/to_state (ENUM), reason, triggered_by (SYSTEM/WEBHOOK/ADMIN/CLIENT), metadata (JSONB), created_at.

### `payment_disputes`
id (PK), payment_id/tenant_id (FK, RLS), provider_dispute_id, reason (DUPLICATE/FRAUDULENT/PRODUCT_UNACCEPTABLE/OTHER), status (OPEN/UNDER_REVIEW/WON/LOST/CLOSED), amount, evidence_due_by, resolved_at, created_at.

### `payment_webhook_logs` / `webhook_dead_letters`
Webhook logs: id (PK), gateway (STRIPE/ADYEN/PAYPAL), event_id (UNIQUE), event_type, raw_data (JSONB), processed (BOOL), processing_error, retry_count, created_at. Dead letters: id (PK), webhook_log_id (FK), final_error, retry_count, resolved (BOOL), resolved_by (FK->users), resolved_at, created_at.

### `invoices`
id (PK), tenant_id (FK, RLS), booking_id (FK), invoice_number (UNIQUE per tenant), subtotal/tax_amount/discount_amount/total/amount_paid (DECIMAL), currency, status (DRAFT/SENT/PARTIALLY_PAID/PAID/OVERDUE/CANCELLED) — see SRS-3 §10 for status flow, due_date, pdf_url (R2), created_at.

### `invoice_line_items`
id (PK), invoice_id (FK), description, quantity, unit_price, tax_rate_id (FK->tax_rates), tax_amount, discount_amount, total, sort_order.

### `services` (full field reference)

**Core fields (always required -- zero-config minimum):**

| Column | Type | Constraints | Default | Notes |
|--------|------|-------------|---------|-------|
| id | UUID | PK | | |
| tenant_id | UUID | FK->tenants, NOT NULL | | RLS key |
| name | VARCHAR | NOT NULL | | Service display name |
| description | TEXT | | | |
| duration_minutes | INT | NOT NULL | 60 | Default from preset |
| base_price | DECIMAL | NOT NULL | 0 | Flat price for FIXED model; base price for HOURLY; 0 = free |
| currency | VARCHAR(3) | NOT NULL | (from tenant) | Inherited from tenant at creation |
| pricing_model | ENUM | NOT NULL | FIXED | FIXED, HOURLY, TIERED, CUSTOM |
| is_active | BOOLEAN | | true | |
| sort_order | INT | | 0 | |
| created_at, updated_at | TIMESTAMPTZ | NOT NULL | | |

**Optional complexity fields (nullable -- null means feature inactive and hidden):**

| Column | Type | Default | When Null | When Configured |
|--------|------|---------|-----------|-----------------|
| pricing_unit | ENUM | null | Irrelevant (FIXED uses base_price directly) | PER_EVENT, PER_PERSON, PER_HOUR -- display-only label for UI formatting (e.g., '$50/person', '$100/hour'). Does NOT affect price calculation -- `pricing_model` determines the algorithm. See SRS-3 §9. |
| base_hours | DECIMAL | null | Irrelevant (FIXED model) | Included hours for HOURLY model |
| excess_hour_price | DECIMAL | null | No excess hour charges | Price per hour beyond base_hours |
| tier_config | JSONB | null | FIXED pricing used | Array of `{min_guests, max_guests, price}` tiers for TIERED model |
| guest_config | JSONB | null | No guest tracking; guest step hidden in booking flow | `{min, max}` for simple guest count; `{min, max, age_tiers: [{label, min_age, max_age, price_modifier}]}` for age-range pricing |
| deposit_config | JSONB | null | Full payment or free (no deposit) | `{type: "percentage"\|"fixed", amount, due_at: "booking"\|"custom"}` |
| intake_form_config | JSONB | null | No questionnaire step in booking flow | **(Phase 2 — FR-BFW-5.)** `{fields: [{key, label, type, required, options}]}`. In Phase 1, always null; questionnaire step not rendered. |
| contract_template_id | UUID | null | No contract step in booking flow | FK->contract_templates; contract step appears with signature capture |
| buffer_before_minutes | INT | 0 | No buffer | Minutes blocked before booking starts |
| buffer_after_minutes | INT | 0 | No buffer | Minutes blocked after booking ends |
| cancellation_policy | JSONB | null | Default free cancellation 24h before start | `{free_cancellation_hours: 24, late_cancel_fee_type: "percentage"\|"fixed", late_cancel_fee_amount: 50, no_refund_hours: 0}` -- see SRS-3 §2 cancellation policy evaluation |
| auto_cancel_on_overdue | BOOLEAN | null | Platform default (true = auto-cancel enabled) | When `false`, overdue bookings are flagged OVERDUE but not auto-cancelled; see SRS-4 §24 |
| max_reschedule_count | INT | null | Unlimited reschedules | Maximum number of times a booking for this service can be rescheduled; see SRS-3 §20 Edge Case #8 |
| no_show_grace_minutes | INT | null | Platform default (30 minutes) | Grace period after `end_time` before a CONFIRMED booking is marked NO_SHOW by the `processCompletedBookings` job Phase A (SRS-3 §16) |
| confirmation_mode | ENUM | AUTO_CONFIRM | Instant confirmation | AUTO_CONFIRM, MANUAL_APPROVAL -- preset sets this per category |
| approval_deadline_hours | INT | null | Platform default (48 hours) | Maximum hours staff has to confirm or cancel a MANUAL_APPROVAL booking before auto-cancel. Independent of invoice due_date (no invoice exists in PENDING state). Only relevant when `confirmation_mode = MANUAL_APPROVAL`. See SRS-3 §2. |
| images | JSONB | null | No service images | Array of image URLs |
| venue_id | UUID | null | Service not tied to any venue | FK->venues; when non-null, limits this service to the specified venue. Booking flow filters available services by selected venue. When set, the VENUE_SELECTION step is auto-resolved (pre-filled) or skipped in the booking flow (see SRS-1 §8). |
| category_id | UUID | null | Uncategorized | FK->service_categories; for grouping services on booking page |
| search_vector | tsvector | | | Auto-maintained by trigger (see §15); weighted: name='A', description='B' |

> **Progressive complexity principle:** A valid service requires only `name`, `duration_minutes`, and `base_price`. All other fields have defaults or are nullable. The booking flow, admin CRM, and API responses adapt to which fields are configured. See SRS-1 Section 8 for the dynamic booking step resolution algorithm.

### `venues`
| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| tenant_id | UUID | FK->tenants, NOT NULL | RLS key |
| name | VARCHAR | NOT NULL | Venue display name |
| description | TEXT | | |
| address | JSONB | | {street, city, state, postal, country, lat, lng} |
| capacity | INT | | Maximum guest/attendee count |
| images | JSONB | | Array of image URLs |
| is_active | BOOLEAN | DEFAULT true | |
| sort_order | INT | DEFAULT 0 | |
| search_vector | tsvector | | Auto-maintained by trigger (see §15); weighted: name='A', description='B' |
| created_at, updated_at | TIMESTAMPTZ | NOT NULL | |

> **Relationship to services:** A venue is a bookable location. Services can optionally be linked to a venue via `bookings.venue_id`. Venue-specific availability rules use `availability_rules.venue_id`. Venue-specific blocked dates use `blocked_dates.venue_id`. Gallery photos can be scoped to a venue via `gallery_photos.venue_id`. For businesses that don't use venues (e.g., freelancers, salons), this table has no rows and all venue-related FKs remain null.

### `service_addons` (Phase 2)
| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| tenant_id | UUID | FK->tenants, NOT NULL | RLS key |
| service_id | UUID | FK->services, NOT NULL | |
| name | VARCHAR | NOT NULL | Add-on display name |
| description | TEXT | | |
| price | DECIMAL | NOT NULL | |
| is_active | BOOLEAN | DEFAULT true | |
| sort_order | INT | DEFAULT 0 | |
| is_required | BOOLEAN | DEFAULT false | When true, this add-on is automatically included and cannot be deselected |
| created_at, updated_at | TIMESTAMPTZ | NOT NULL | |

> **Phase 2 (FR-BFW-6):** Service add-ons (e.g., extra equipment, premium options) are optional purchasable items attached to a service. When a service has active add-ons, the ADD_ONS step appears in the booking flow (see SRS-1 §8 step resolution). Selected add-ons are recorded in `bookings.metadata` and as separate `invoice_line_items` rows. This table is empty in Phase 1; the step resolution algorithm's addons check evaluates to false.

### `service_categories`
id (PK), tenant_id (FK->tenants, RLS), name (VARCHAR, NOT NULL), description (TEXT), sort_order (INT, DEFAULT 0), is_active (BOOLEAN, DEFAULT true), created_at (TIMESTAMPTZ, NOT NULL).

> **Purpose:** Groups services for display on the booking page and Admin CRM. Referenced by `services.category_id` (nullable FK). A tenant with no categories has all services uncategorized; a tenant with categories can organize services into logical groups (e.g., "Hair Services", "Nail Services" for a salon). Categories are optional and have no impact on booking flow or pricing.

### `service_providers` (Phase 2 UI; schema Phase 1) [NEW]
| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| service_id | UUID | FK->services, NOT NULL | |
| user_id | UUID | FK->users, NOT NULL | Must have a `tenant_memberships` row for this tenant |
| tenant_id | UUID | FK->tenants, NOT NULL | RLS key; denormalized for query efficiency |
| created_at | TIMESTAMPTZ | NOT NULL | |

**Primary key:** (service_id, user_id)

> **Purpose:** Enables per-provider service assignment in multi-provider businesses (FR-CRM-30). When a service has rows in `service_providers`, the booking flow filters the provider selection step to only show those providers. When a service has no rows, all active providers (tenant_memberships with OWNER/ADMIN/STAFF role) are eligible — this preserves the zero-config behavior for solo operators.
>
> **Schema Phase 1, UI Phase 2:** The table ships in Phase 1 migrations for forward compatibility so that multi-provider shops can begin without a schema migration when Phase 2 ships the assignment UI. In Phase 1, the table is always empty — the booking flow resolver treats an empty `service_providers` set as "all providers eligible" (identical to the behavior when no team management is configured). The Admin CRM provider-service assignment UI is Phase 2 (FR-CRM-30).
>
> **Solo operator behavior:** A tenant with one provider (OWNER only) never triggers the provider selection step in the booking flow regardless of `service_providers` configuration. Data presence is configuration — one provider means no provider step.

### `client_profiles` [NEW]
| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| tenant_id | UUID | FK->tenants, NOT NULL | RLS key; preferences are tenant-scoped |
| client_id | UUID | FK->users, NOT NULL | The client whose profile this is |
| preferences | JSONB | | Structured preference data, e.g., `{"hairType": "4C", "preferredStyle": "Mid skin fade", "beardStyle": "Lined up", "productAllergies": "None", "notes": "Prefers clippers on neck"}` |
| tags | JSONB | | Array of custom tags for CRM filtering, e.g., `["VIP", "Regular"]` |
| internal_rating | INT | CHECK 1-5 | Private staff rating; not visible to client |
| optimal_reminder_lead_hours | DECIMAL | | **(Phase 2, FR-AI-1)** AI-computed optimal hours before appointment to send reminder. Null = use default (24h). See SRS-4 §45.1. |
| rebooking_interval_days | INT | | **(Phase 2, FR-AI-3)** AI-computed median days between appointments for this client at this tenant. Null = use default rebooking prompt timing. See SRS-4 §45.3. |
| created_at | TIMESTAMPTZ | NOT NULL | |
| updated_at | TIMESTAMPTZ | NOT NULL | |

**Unique:** (tenant_id, client_id)

> **Purpose:** Stores the tenant's knowledge of a client — preferences, tags, and internal notes — independently of the global `users` record. Because `users` is a global, cross-tenant table (BR-RULE-4), tenant-specific client data cannot live there. `client_profiles` is the per-tenant extension: a barber's knowledge of a client's preferred fade style does not need to be visible to another business using SavSpot.
>
> **Visibility:** On the appointment view (FR-CRM-28), the `preferences` JSON is displayed alongside the booking details — client name, service, time, and preferences — without requiring navigation to the full client profile. This is the primary consumer of this data.
>
> **Progressive complexity:** A tenant with no configured preferences simply has no `client_profiles` rows. The preferences section in the client profile UI shows an empty state ("Add preferences to personalize this client's experience") rather than a blank field. Data presence is configuration.
>
> **API:** GET/PATCH `/api/tenants/:id/clients/:clientId/profile` — creates the record if absent (upsert), merges preference keys on update. Part of the client profile response in `GET /api/tenants/:id/clients/:clientId`.

### `discounts`
id (PK), tenant_id (FK, RLS), name, code, type (PERCENTAGE/FIXED/FREE_HOURS), value, application (AUTOMATIC/CODE_REQUIRED/ADMIN_ONLY), valid_from/until, usage_limit, usage_count, min_order_amount, product_scope (JSONB), is_active, created_at.

### `tax_rates`
id (PK), tenant_id (FK, RLS), name, rate (DECIMAL), region, is_inclusive, is_default, is_active.

### `accounting_connections` (Phase 3)
id (PK), tenant_id (FK, RLS), provider (QUICKBOOKS/XERO), access_token/refresh_token (encrypted), token_expires_at, company_id, category_mappings (JSONB), last_synced_at, status (ACTIVE/DISCONNECTED/ERROR), error_message.

## 6. Communication Domain

### `communications`
| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| tenant_id | UUID | FK->tenants, NOT NULL | RLS key |
| recipient_id | UUID | FK->users, NOT NULL | |
| booking_id | UUID | FK | Nullable |
| channel | ENUM | NOT NULL | EMAIL, SMS, IN_APP |
| template_key | VARCHAR | | |
| subject | VARCHAR | | |
| body | TEXT | NOT NULL | Rendered |
| status | ENUM | NOT NULL | QUEUED, SENDING, SENT, DELIVERED, OPENED, BOUNCED, FAILED |
| provider_message_id | VARCHAR | | Resend/Plivo ID |
| sent_at, delivered_at, opened_at | TIMESTAMPTZ | | |
| failure_reason | VARCHAR | | |
| metadata | JSONB | | |
| created_at | TIMESTAMPTZ | NOT NULL | |

### `communication_templates`
id (PK), tenant_id (FK, nullable=platform default), key (UNIQUE per tenant), name, channel (EMAIL/SMS), subject_template, body_template, layout_id (FK->email_layouts), is_active, is_system, sandbox_validated, validation_errors (JSONB), created_at, updated_at.

### `email_layouts`
id (PK), tenant_id (FK, nullable), name, header_template, footer_template, wrapper_template (contains `{{content}}`), created_at, updated_at.

### `template_history`
id (PK), template_id (FK), version (INT), subject_template, body_template, changed_by (FK->users), change_reason, created_at.

## 7. Notification Domain

### `notification_types`
id (PK), key (UNIQUE), name, category (SYSTEM/BOOKING/PAYMENT/CONTRACT/COMMUNICATION/MARKETING/REVIEW/CALENDAR), default_channels (JSONB), priority (LOW/NORMAL/HIGH/CRITICAL), auto_expire_hours, is_system, description.

### `notifications`
id (PK), user_id (FK), tenant_id (FK, nullable), type_id (FK), title, body, data (JSONB), is_read (DEFAULT false), read_at, expires_at, created_at.

### `notification_preferences`
id (PK), user_id (FK, UNIQUE), digest_frequency (IMMEDIATE/HOURLY/DAILY/WEEKLY), quiet_hours_start/end (TIME), quiet_hours_timezone, preferences (JSONB -- 8 categories x 4 channels), updated_at.

### `notification_digests`
id (PK), user_id (FK), frequency, notification_ids (JSONB), status (PENDING/SENT/FAILED), scheduled_for, sent_at, created_at.

### `device_push_tokens`
id (PK), user_id (FK), token (UNIQUE, ExponentPushToken format), device_type (IOS/ANDROID), device_name, is_active (DEFAULT true, auto-deactivated after 5 failures), failure_count, last_used_at, created_at.

> **Phase 3:** Push notification delivery requires the native mobile app (PRD §4.5, Phase 3). The `device_push_tokens` table schema is included in Phase 1 migrations for completeness, but token registration and push delivery are Phase 3 features. See SRS-4 §10 for push token lifecycle.

### `browser_push_subscriptions`
id (PK), user_id (FK->users, NOT NULL), tenant_id (FK->tenants, NOT NULL, RLS key), endpoint (VARCHAR, NOT NULL), p256dh (VARCHAR, NOT NULL), auth (VARCHAR, NOT NULL), last_used_at (TIMESTAMPTZ), created_at (TIMESTAMPTZ, NOT NULL).

> **Web Push (Phase 1):** Stores browser push subscription data for Admin CRM real-time notifications (new booking alerts, payment confirmations). Multiple subscriptions per user supported (different browsers/devices). See SRS-4 §26a for registration flow and delivery mechanics.

## 8. Contract & Quote Domain

### `contract_templates`
id (PK), tenant_id (FK, RLS), name, content (HTML with merge fields), signature_requirements (JSONB: [{role, required, order}]), category, is_active, version, created_at, updated_at.

### `contracts`
id (PK), tenant_id (FK, RLS), booking_id (FK), template_id (FK), quote_id (FK, nullable), content (frozen HTML), status (DRAFT/SENT/PARTIALLY_SIGNED/SIGNED/EXPIRED/VOID/AMENDED), expiry_date, signed_at, voided_at, voided_by (FK), void_reason, document_hash (VARCHAR), created_at, updated_at.

### `contract_signatures`
id (PK), contract_id (FK), signer_id (FK), role (CLIENT/WITNESS/COMPANY_REP/GUARDIAN/PARTNER/OTHER), signature_data (Base64), signature_type (DRAWN/TYPED/UPLOADED), signed_at, ip_address, user_agent, device_fingerprint (JSONB), legal_disclosure_accepted, electronic_consent_at (TIMESTAMPTZ -- E-SIGN Act: timestamp when signer accepted electronic disclosure), signature_confidence (DECIMAL 0.0-1.0 -- confidence score per signature), order, created_at.

### `contract_amendments`
id (PK), contract_id (FK), requested_by (FK), status (REQUESTED/DRAFT/SENT_FOR_REVIEW/APPROVED/SIGNED/REJECTED/CANCELLED), sections_changed (JSONB), value_change (DECIMAL), reason, reviewed_by (FK), reviewed_at, signed_at, created_at, updated_at.

### `quotes`
id (PK), tenant_id (FK, RLS), booking_id (FK), version (INT), status (DRAFT/SENT/ACCEPTED/REJECTED/EXPIRED), subtotal, tax_total, total, currency, valid_until, notes, accepted_at, accepted_signature, sent_at, created_at, updated_at. **Unique:** (booking_id, version).

### `quote_line_items`
id (PK), quote_id (FK), product_id (FK->services, nullable), description, quantity, unit_price, tax_rate, total, excess_hours, excess_rate, sort_order, created_at.

### `quote_options` / `quote_option_items`
Options: id (PK), quote_id (FK), name, description, total, is_selected, sort_order, created_at. Option items: id (PK), option_id (FK), product_id (FK, nullable), description, quantity, unit_price, tax_rate, total.

## 9. Workflow Domain

### `workflow_automations` [NEW -- Progressive Complexity]

Simple, flat automation records created by business-type presets during onboarding. These cover the common case (send an email when a booking is confirmed, send a reminder 24h before). **Preset automation configuration is locked in Phases 1-2:** businesses cannot add new automations, delete existing ones, or modify trigger/action configuration. The one exception is the `is_active` toggle — businesses can disable or re-enable individual automations via the Admin CRM without deleting them. Full CRUD control over automations is available in Phase 3 (FR-CRM-16: Workflow automation builder). Businesses that need advanced multi-stage workflows with progression conditions use `workflow_templates` + `workflow_stages` instead (Phase 3).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| tenant_id | UUID | FK->tenants, NOT NULL | RLS key |
| trigger_event | ENUM | NOT NULL | BOOKING_CREATED, BOOKING_CONFIRMED, BOOKING_CANCELLED, BOOKING_RESCHEDULED, BOOKING_COMPLETED, BOOKING_NO_SHOW, BOOKING_WALK_IN, PAYMENT_RECEIVED, REMINDER_DUE (subset of 20 workflow events -- see SRS-4 §21 for canonical list; BOOKING_CREATED included for MANUAL_APPROVAL notification use cases) |
| action_type | ENUM | NOT NULL | SEND_EMAIL, SEND_SMS, SEND_PUSH, SEND_NOTIFICATION |
| action_config | JSONB | NOT NULL | `{template_key, channel, timing: {type: "immediate"\|"before_booking"\|"after_event", minutes}}` |
| is_active | BOOLEAN | DEFAULT true | Business can disable without deleting |
| created_at | TIMESTAMPTZ | NOT NULL | |

> **Relationship to workflow_templates:** `workflow_automations` is the simple path -- flat trigger-action pairs with no stages, no progression conditions, no ordering. When a business needs multi-stage workflows (e.g., send quote -> wait for acceptance -> send contract -> wait for signature -> send invoice), they use `workflow_templates` + `workflow_stages`. Both systems can coexist for the same tenant; `workflow_automations` handles simple event-driven actions while `workflow_templates` handles complex multi-step processes.

### `workflow_templates`
id (PK), tenant_id (FK, RLS), name, description, trigger_event (ENUM -- 20 events; see SRS-4 §21 for canonical list), is_default, is_active, created_at, updated_at.

### `workflow_stages`
id (PK), template_id (FK), name, order (INT, UNIQUE per template), automation_type (EMAIL/TASK/QUOTE/CONTRACT/QUESTIONNAIRE/REMINDER/NOTIFICATION), automation_config (JSONB), trigger_time (ON_CREATION/AFTER_X_DAYS/X_DAYS_BEFORE_BOOKING), trigger_days, progression_condition (QUOTE_ACCEPTED/PAYMENT_RECEIVED/CONTRACT_SIGNED/TASKS_COMPLETED), is_optional, created_at.

### `booking_workflow_overrides`
id (PK), booking_id (FK), stage_id (FK, nullable), override_type (SKIP/DISABLE_AUTOMATION/CUSTOM_TIMING/ADD_STAGE), override_config (JSONB), reason (NOT NULL, audit trail), created_by (FK), created_at.

### `workflow_webhooks`
id (PK), tenant_id (FK, RLS), name, url, secret (HMAC-SHA256), events (JSONB), is_active, last_triggered_at, failure_count (disabled after 10), created_at, updated_at.

### `booking_reminders`
id (PK), booking_id (FK), tenant_id (FK, RLS), reminder_type (BOOKING/PAYMENT/QUESTIONNAIRE_REMINDER), interval_days, scheduled_for, sent_at, channel (EMAIL/SMS/PUSH), status (PENDING/SENT/SKIPPED/FAILED), created_at. **Unique:** (booking_id, reminder_type, interval_days, channel).

## 10. Frontend Domain

### `booking_flow_analytics` (Phase 3 -- Pro Analytics)
id (PK), tenant_id (FK, RLS), flow_id (FK), date (DATE), step_metrics (JSONB), total_sessions, completed_sessions, conversion_rate, total_revenue, bounce_rate, avg_completion_time_sec, created_at. **Unique:** (tenant_id, flow_id, date).

> Supports FR-CRM-12 premium conversion analytics (flow completion rate, step drop-off, abandonment rate). Table is empty in Phase 1-2; data collection begins in Phase 3.

### `message_threads` / `messages` / `message_read_status` / `message_attachments`
Threads: id (PK), tenant_id (FK, RLS), booking_id (FK, nullable), subject, priority (LOW/NORMAL/HIGH/URGENT), status (OPEN/CLOSED/ARCHIVED), created_at, updated_at. Messages: id (PK), thread_id (FK), sender_id (FK), body, is_internal (DEFAULT false), created_at, updated_at. Read status: id (PK), message_id (FK), user_id (FK), read_at; UNIQUE(message_id, user_id). Attachments: id (PK), message_id (FK), file_name, file_url (R2), file_size, mime_type, created_at.

### `gallery_photos`
id (PK), tenant_id (FK, RLS), venue_id/service_id (FK, nullable), category, url (R2), thumbnail_url, alt_text, caption, is_featured, sort_order, width, height, file_size, created_at.

### `onboarding_tours`
id (PK), user_id (FK), tour_key, completed_at, dismissed_at, steps_completed, total_steps, created_at. **Unique:** (user_id, tour_key). No tenant_id (user-scoped).

## 11. Security Domain

### `audit_logs`
id (PK), tenant_id (FK, nullable), entity_type, entity_id, action (CREATE/UPDATE/DELETE/READ/LOGIN/LOGOUT/EXPORT/IMPORT/SIGN/VOID/SEND/ACCEPT/REJECT/PASSWORD_CHANGE/MFA_ENABLE/MFA_DISABLE), actor_id (FK, nullable), actor_type (USER/SYSTEM/API_KEY/WEBHOOK), old_values/new_values (JSONB), ip_address, user_agent, metadata (JSONB), timestamp. **Indexes:** (tenant_id, entity_type, entity_id), (actor_id, timestamp). **Retention:** 2 years; archived to R2 after 90 days.

### `security_breaches`
id (PK), breach_type (UNAUTHORIZED_ACCESS/DATA_LEAK/CREDENTIAL_COMPROMISE/BRUTE_FORCE/etc.), severity (LOW/MEDIUM/HIGH/CRITICAL), status (DETECTED/INVESTIGATING/CONFIRMED/CONTAINED/NOTIFYING/RESOLVED), title, description, detected_at, confirmed_at, contained_at, resolved_at, gdpr_notification_deadline (detected_at+72h), affected_tenant_ids (JSONB), affected_user_count, root_cause, remediation_steps, assigned_to (FK), created_at, updated_at.

### `breach_notifications`
id (PK), breach_id (FK), recipient_type (DPA/TENANT_ADMIN/AFFECTED_USER), recipient_id (FK, nullable), channel (EMAIL/IN_APP/POSTAL), sent_at, content, created_at.

### `affected_users`
id (PK), breach_id (FK), user_id (FK), data_types_exposed (JSONB), notified_at, created_at. **Unique:** (breach_id, user_id).

### `data_requests`
| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| user_id | UUID | FK->users, NOT NULL | Requesting user |
| tenant_id | UUID | FK->tenants, nullable | Set for tenant exports (TENANT_EXPORT); null for user (GDPR) exports. See FR-CRM-26. |
| request_type | ENUM | NOT NULL | EXPORT, DELETION, TENANT_EXPORT |
| status | ENUM | DEFAULT 'PENDING' | PENDING, PROCESSING, COMPLETED, FAILED |
| requested_at | TIMESTAMPTZ | NOT NULL | |
| completed_at | TIMESTAMPTZ | | |
| deadline_at | TIMESTAMPTZ | NOT NULL | GDPR: requested_at + 30 days |
| export_url | VARCHAR | | R2 download URL for EXPORT type; auto-expires |
| notes | TEXT | | Admin notes |
| created_at | TIMESTAMPTZ | NOT NULL | |

> **GDPR Article 12 compliance:** Tracks data subject requests with deadlines. EXPORT requests generate a JSON archive uploaded to R2. DELETION requests enter a 30-day grace period (FR-CP-14) before cascading deletion. TENANT_EXPORT requests (FR-CRM-26) generate a full tenant data archive (services, bookings, clients, invoices, payments, communications) for the OWNER; requires `tenant_id` to be set. Supports FR-CP-13 (data export), FR-CP-14 (account deletion), and FR-CRM-26 (business data export).

### `consent_records`
| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| user_id | UUID | FK->users, NOT NULL | Consenting user |
| purpose | ENUM | NOT NULL | DATA_PROCESSING, MARKETING, ANALYTICS, THIRD_PARTY_SHARING, FOLLOW_UP_EMAILS |
| consented | BOOLEAN | NOT NULL | Current consent state |
| consented_at | TIMESTAMPTZ | NOT NULL | When consent was granted |
| withdrawn_at | TIMESTAMPTZ | | When consent was withdrawn (null if active) |
| ip_address | INET | | IP address at time of consent action |
| user_agent | TEXT | | Browser/device at time of consent action |
| consent_text_version | VARCHAR | | Version identifier of the consent text presented |
| created_at | TIMESTAMPTZ | NOT NULL | |

> **Unique:** (user_id, purpose) -- one active record per user per purpose. On consent withdrawal, `consented` is set to `false` and `withdrawn_at` is recorded; the row is updated in-place to maintain the unique constraint. Consent history is tracked in `audit_logs` (action = UPDATE on consent_records). Supports FR-CP-13 and FR-CP-14 (GDPR consent management -- see SRS-4 §30). **Phase 1** (Must -- aligns with FR-CP-13 and FR-CP-14). The `FOLLOW_UP_EMAILS` purpose is used as the Phase 1 lightweight suppression mechanism for CAN-SPAM compliance (see SRS-4 §33): when a client clicks the unsubscribe link in a follow-up email, a consent withdrawal is recorded for this purpose, and `deliverCommunication` checks this before sending follow-up emails. Superseded by the full notification preferences system in Phase 2 (FR-COM-8).

### `referral_links` (Phase 3)
| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| tenant_id | UUID | FK->tenants, NOT NULL | RLS key |
| code | VARCHAR | NOT NULL | UNIQUE per tenant; URL-safe slug |
| name | VARCHAR | NOT NULL | Human label (e.g., "Partner X referral") |
| created_by | UUID | FK->users, NOT NULL | |
| usage_count | INT | DEFAULT 0 | Incremented on each booking attributed |
| is_active | BOOLEAN | DEFAULT true | |
| expires_at | TIMESTAMPTZ | | Nullable; never-expiring if null |
| created_at | TIMESTAMPTZ | NOT NULL | |

> **Phase 3:** Referral links generate shareable URLs (`savspot.co/{slug}?ref={code}`) that tag bookings with `source = REFERRAL`. When a client books via a referral link, the booking source is set to REFERRAL and the referral commission logic in SRS-3 §11 applies. See BRD §BR-RULE-2 for commission rules. This table is empty in Phase 1-2; all bookings default to `source = DIRECT`.

## 12. New Models

### `reviews` [NEW]
| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| tenant_id | UUID | FK->tenants, NOT NULL | RLS key |
| booking_id | UUID | FK->bookings, UNIQUE | One review per booking |
| client_id | UUID | FK->users, NOT NULL | |
| rating | INT | NOT NULL, CHECK 1-5 | |
| title | VARCHAR | | Optional headline |
| body | TEXT | | Review text |
| is_published | BOOLEAN | DEFAULT true | Business can hide |
| response | TEXT | | Owner reply |
| responded_at | TIMESTAMPTZ | | |
| responded_by | UUID | FK->users | |
| created_at, updated_at | TIMESTAMPTZ | NOT NULL | |

> **Booking eligibility guard:** Reviews can only be submitted when `bookings.status = 'COMPLETED'`. The `POST /api/reviews` endpoint validates this condition and returns HTTP 422 (`BOOKING_NOT_ELIGIBLE_FOR_REVIEW`) if the booking is in any other status (PENDING, CONFIRMED, IN_PROGRESS, CANCELLED, NO_SHOW). This prevents reviews on bookings that haven't occurred and ensures data integrity.

### `review_photos` [NEW]
id (PK), review_id (FK->reviews, NOT NULL), url (VARCHAR, R2 storage), thumbnail_url (VARCHAR), sort_order (INT, DEFAULT 0), created_at (TIMESTAMPTZ, NOT NULL).

> Supports FR-MOB-10 (Phase 3, deferred with mobile app): review submission with photos. Photos are uploaded to R2 and referenced by review. Phase 2 web review submission uses the existing upload flow without a dedicated photo table.

### `api_keys` [NEW]
| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| tenant_id | UUID | FK->tenants, NOT NULL | RLS key |
| name | VARCHAR | NOT NULL | Human label |
| prefix | VARCHAR(8) | NOT NULL | Visible lookup prefix |
| key_hash | VARCHAR | NOT NULL | SHA-256 hash |
| scopes | JSONB | NOT NULL | ["bookings:read",...] |
| rate_limit | INT | DEFAULT 60 | Req/min |
| last_used_at | TIMESTAMPTZ | | |
| expires_at | TIMESTAMPTZ | | Nullable |
| is_active | BOOLEAN | DEFAULT true | |
| created_by | UUID | FK->users, NOT NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | |
| revoked_at | TIMESTAMPTZ | | |

> Full key shown once at creation. Lookup by prefix; verify by SHA-256 comparison.

### `notes` (Phase 2) [NEW]
id (PK), tenant_id (FK->tenants, RLS), author_id (FK->users, NOT NULL), entity_type (ENUM: BOOKING/CLIENT, NOT NULL), entity_id (UUID, NOT NULL -- FK to bookings or users depending on entity_type), body (TEXT, NOT NULL), is_pinned (BOOLEAN, DEFAULT false), created_at (TIMESTAMPTZ, NOT NULL), updated_at (TIMESTAMPTZ, NOT NULL).

> **FR-CRM-14 (Phase 2):** Internal notes on bookings and clients. Staff-only; not visible to clients. Indexed on `(tenant_id, entity_type, entity_id)` for efficient lookup. A booking's notes are displayed in the booking detail view; a client's notes are displayed in the client profile view.

## 12a. Support Domain

### `support_tickets` [NEW]
| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| tenant_id | UUID | FK->tenants | Nullable — platform-level tickets (non-tenant-specific) have null tenant_id |
| submitted_by | UUID | FK->users, NOT NULL | |
| category | ENUM | NOT NULL | BUG, FEATURE_REQUEST, QUESTION, ACCOUNT_ISSUE, PAYMENT_ISSUE, OTHER |
| severity | ENUM | NOT NULL, DEFAULT 'LOW' | LOW, MEDIUM, HIGH, CRITICAL |
| subject | VARCHAR | NOT NULL | |
| body | TEXT | NOT NULL | |
| status | ENUM | NOT NULL, DEFAULT 'NEW' | NEW, AI_INVESTIGATING, AI_RESOLVED, NEEDS_MANUAL_REVIEW, RESOLVED, CLOSED |
| ai_diagnosis | TEXT | | AI-generated diagnosis and context (tenant config, recent errors, relevant logs) |
| ai_response | TEXT | | AI-drafted response sent to user (when status = AI_RESOLVED) |
| ai_resolution_type | ENUM | | FAQ_MATCH, CONFIGURATION_GUIDANCE, KNOWN_WORKAROUND, CODE_FIX_PREPARED, null (when not AI-resolved) |
| resolved_by | ENUM | | AI, DEVELOPER |
| resolved_at | TIMESTAMPTZ | | |
| developer_notes | TEXT | | Developer notes on resolution (for NEEDS_MANUAL_REVIEW tickets) |
| source_context | JSONB | | Auto-captured at submission: page URL, browser/device info, tenant config snapshot, user's recent actions |
| user_satisfaction | BOOLEAN | | User response to "Was this helpful?" prompt on AI_RESOLVED tickets; null until rated |
| related_ticket_id | UUID | FK->support_tickets | Links reopened tickets to their predecessor |
| created_at, updated_at | TIMESTAMPTZ | NOT NULL | |

> **AI triage workflow (FR-SUP-3, FR-SUP-4, BRD §8a):** Open Claw monitors this table for `status = 'NEW'` tickets via polling (every 60 seconds). On new ticket detection, Open Claw enriches `source_context` with relevant Sentry errors and tenant configuration, sets `status = 'AI_INVESTIGATING'`, then routes to Qwen3 (local) for investigation. For complex issues (payment failures, data integrity, security), Open Claw escalates to Claude Code. The AI populates `ai_diagnosis`, and either sends a response (setting `ai_response` and `status = 'AI_RESOLVED'`) or escalates (setting `status = 'NEEDS_MANUAL_REVIEW'` with developer notification via Slack/email). `AI_RESOLVED` tickets auto-transition to `CLOSED` after 7 days unless the user reopens. Repeat tickets (same `submitted_by` + same `category` within 7 days) are auto-escalated to `NEEDS_MANUAL_REVIEW` regardless of AI confidence. CRITICAL severity tickets bypass AI resolution entirely.
>
> **Indexes:** `(status, created_at)` for triage queue queries; `(submitted_by, category, created_at)` for repeat-ticket detection.
>
> **Not tenant-scoped via RLS:** Support tickets are platform-level records. The `tenant_id` provides context but is not used for RLS isolation — platform admin and the AI pipeline service account must read tickets across all tenants. Access is restricted to PLATFORM_ADMIN role and the submitting user (for their own tickets).

## 12b. Product Feedback Domain

### `feedback` [NEW]
| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| tenant_id | UUID | FK->tenants, NOT NULL | RLS key |
| submitted_by | UUID | FK->users, NOT NULL | |
| type | ENUM | NOT NULL | FEATURE_REQUEST, UX_FRICTION, COMPARISON_NOTE, GENERAL |
| context_page | VARCHAR | | Which Admin CRM page the user was on when submitting |
| body | TEXT | NOT NULL | |
| screenshot_url | VARCHAR | | Cloudflare R2 reference; nullable |
| status | ENUM | NOT NULL, DEFAULT 'NEW' | NEW, ACKNOWLEDGED, PLANNED, SHIPPED, DECLINED |
| developer_notes | TEXT | | Internal notes on disposition |
| created_at, updated_at | TIMESTAMPTZ | NOT NULL | |

> **Distinct from `support_tickets`:** Support tickets (§12a) are "something is broken" or "how do I do X?" — routed through the AI triage pipeline. Feedback is "I wish this existed" or "this workflow feels wrong" — routed to the developer feedback queue (FR-FBK-3). The `COMPARISON_NOTE` type is specifically for parallel-run competitive intelligence: when a design partner reports "Booksy does X better," this is captured as a COMPARISON_NOTE, not a bug report, so competitive gaps are systematically tracked.
>
> **Status lifecycle:** NEW → ACKNOWLEDGED (developer has seen it) → PLANNED (on the roadmap) → SHIPPED (feature built) or DECLINED (not building). When status moves to SHIPPED, an optional in-app notification is sent to the submitter (FR-FBK-2). This closed-loop feedback creates engagement with design partners.
>
> **Not tenant-scoped via RLS:** Like support_tickets, feedback is a platform-level record. The `tenant_id` provides context but platform admin must read across all tenants. The submitting user can only see their own feedback via the `submitted_by` FK.
>
> **In-app widget (FR-FBK-1):** Rendered as a floating button in Admin CRM. Contextual metadata (context_page, tenant_id, submitted_by) captured automatically at submission time.

## 13a. Data Import Domain [NEW]

### `import_jobs`
| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| tenant_id | UUID | FK->tenants, NOT NULL | RLS key |
| source_platform | ENUM | NOT NULL | BOOKSY, FRESHA, SQUARE, VAGARO, MINDBODY, CSV_GENERIC, JSON_GENERIC |
| import_type | ENUM | NOT NULL | CLIENTS, SERVICES, APPOINTMENTS, FULL |
| status | ENUM | NOT NULL, DEFAULT 'PENDING' | PENDING, MAPPING, PROCESSING, COMPLETED, FAILED |
| file_url | VARCHAR | | Cloudflare R2 reference to uploaded file; nullable for CLI-initiated imports |
| column_mapping | JSONB | | Maps source column names to SavSpot target fields. Auto-populated from pre-built platform profiles; manually overridable in self-service wizard (FR-IMP-2). Example: `{"First Name": "first_name", "Cell": "phone"}` |
| stats | JSONB | | `{total_rows, imported, skipped_duplicates, errors}` |
| error_log | JSONB | | Array of `{row_number, field, error_message}` for failed rows |
| initiated_by | UUID | FK->users | Nullable for CLI-initiated imports (platform admin) |
| created_at, completed_at | TIMESTAMPTZ | NOT NULL, nullable | |

### `import_records`
| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| import_job_id | UUID | FK->import_jobs, NOT NULL | |
| row_number | INT | NOT NULL | Source row number for error reporting |
| status | ENUM | NOT NULL | IMPORTED, SKIPPED_DUPLICATE, ERROR |
| target_table | VARCHAR | NOT NULL | 'users', 'services', 'bookings' — the table where the record was created |
| target_id | UUID | | FK to created/matched record; null on ERROR |
| raw_data | JSONB | NOT NULL | Original row from source file |
| error_message | TEXT | | Null unless status = ERROR |

> **Deduplication logic (clients):** Match on email (primary) or phone (secondary). On match: merge empty fields on existing record (update null/empty fields with imported values, preserve existing non-empty data), set status = SKIPPED_DUPLICATE, record matched `target_id`. On no match: create user record, set status = IMPORTED. Email uniqueness is enforced at the platform level (BR-RULE-4 — users are cross-tenant). Phone is tenant-scoped for fallback matching.
>
> **Phase 1 CLI:** `pnpm admin:import-clients --file /path/to/clients.csv --platform BOOKSY --tenant {slug} [--commit]`. Without `--commit`, prints validation report only. With `--commit`, executes import. Wraps the NestJS ImportService, same RLS and validation logic as the API.
>
> **Phase 2 self-service:** POST `/api/tenants/:id/import` (multipart/form-data: file + source_platform). Creates `import_job` with status MAPPING. GET `/api/import-jobs/:id` returns job status and stats for polling. Background BullMQ job (`processImportJob`) handles deduplication and row creation.

## 13b. Intelligent Operations Domain (Phase 2) [NEW]

### `category_benchmarks` (Phase 2-3, FR-AI-5)
| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| business_category | ENUM | NOT NULL | Maps to `tenants.category` |
| metric_key | VARCHAR | NOT NULL | e.g., `no_show_rate`, `avg_rebooking_days`, `utilization_rate` |
| p25 | DECIMAL | NOT NULL | 25th percentile |
| p50 | DECIMAL | NOT NULL | Median |
| p75 | DECIMAL | NOT NULL | 75th percentile |
| sample_size | INT | NOT NULL | Number of tenants in sample (must be ≥4 per BR-RULE-9) |
| computed_at | TIMESTAMPTZ | NOT NULL | |

**Unique:** (business_category, metric_key)

> **Privacy controls (BR-RULE-9):** Minimum 4-tenant threshold per category before benchmarks are computed. Uses median (not mean) to prevent single-tenant skew. Tenants may opt out via `tenants.benchmark_opt_out`. Data is aggregated — no individual tenant data is exposed. Computed by `computeCategoryBenchmarks` BullMQ job (QUEUE_GDPR, daily 5 AM UTC). Phase 3 activation at 50+ tenants. See SRS-4 §45.5 and [AI-STRATEGY.md](AI-STRATEGY.md) §4.

### `slot_demand_insights` (Phase 2, FR-AI-4)
| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| tenant_id | UUID | FK->tenants, NOT NULL | RLS key |
| insight_type | ENUM | NOT NULL | HIGH_DEMAND_SLOT, LOW_FILL_SLOT, CANCELLATION_PATTERN |
| day_of_week | INT | | 0-6 (Sunday-Saturday) |
| time_slot | TIME | | Start time of analyzed slot |
| metric_value | DECIMAL | NOT NULL | Fill rate, cancellation rate, or days-to-fill depending on type |
| recommendation | TEXT | | Human-readable actionable insight |
| is_dismissed | BOOLEAN | DEFAULT false | Tenant dismissed this card |
| dismissed_by | UUID | FK->users | User who dismissed this insight; null if not dismissed |
| computed_at | TIMESTAMPTZ | NOT NULL | |
| expires_at | TIMESTAMPTZ | NOT NULL | Insights expire after 7 days to force re-computation |

> **Dashboard integration (FR-AI-4):** Max 3 active (non-dismissed, non-expired) insights per tenant. Displayed as dismissible cards on the Admin CRM dashboard. Computed by `computeSlotDemandAnalysis` BullMQ job (QUEUE_BOOKINGS, weekly Sunday 2 AM UTC). See SRS-4 §45.4.

## 13. API Architecture

| Layer | Base Path | Auth | Audience |
|-------|-----------|------|----------|
| Internal API | `/api/...` | JWT (cookie/bearer) | Admin CRM, Client Portal, Mobile |
| Booking Page API | `/api/booking-pages/` | None (public) | Booking page visitors |
| Embed API (Phase 2) | `/api/embed/` | None (CORS) | Widget |
| Public API v1 (Phase 3) | `/api/v1/` | API key | Headless consumers |
| MCP Server | Separate process | API key | AI agents |

**API Versioning Strategy:**

| Scope | Strategy | Details |
|-------|----------|---------|
| Internal API (`/api/...`) | Unversioned; breaking changes gated by deployment | Admin CRM, Client Portal, and Mobile app are first-party clients deployed in lockstep. No version negotiation needed. Breaking changes are coordinated via the monorepo CI pipeline (SRS-1 §10). |
| Public API (`/api/v1/...`, Phase 3) | URL-based versioning | New major versions (`/api/v2/`) introduced only for breaking changes. Previous version supported for minimum 6 months with deprecation headers (`Sunset`, `Deprecation` per RFC 8594). |
| Webhook payloads | Versioned via `api_version` field in payload | Consumers register a preferred API version; payloads are serialized to that version. Default: latest. |

> **Phase 1 scope:** Only internal API exists. No versioning overhead. Public API versioning (v1) ships with Phase 3.

## 14. Complete API Endpoint Catalog

**Auth:** POST `register`, `login`, `refresh`, `google`, `apple`, `logout`, `forgot-password`, `reset-password` (all under `/api/auth/`)

**Tenants:** POST `/api/tenants`, GET `/api/tenants/:slug`, PATCH `/api/tenants/:id`, POST `/api/tenants/:id/connect-payment-provider`

**Services/Venues:** GET|POST `/api/tenants/:id/services`, PATCH|DELETE `/api/services/:id`; same pattern for venues. GET response includes a computed `active_features` array per service (e.g., `["GUEST_TRACKING", "TIERED_PRICING", "DEPOSIT", "MANUAL_APPROVAL"]`), derived server-side from non-null optional fields. This powers the Admin CRM list view complexity indicators without requiring the client to inspect every nullable field. POST accepts optional `copy_from_service_id` (UUID). When provided, all nullable optional fields from the source service are copied to the new service. Core fields (`name`, `duration_minutes`, `base_price`) must still be provided in the request body. The `contract_template_id` FK is copied (linking to the same template, not duplicating it). The `venue_id` is NOT copied (must be explicitly set). Returns 404 if `copy_from_service_id` doesn't exist or belongs to a different tenant.

**Service Categories:** GET|POST `/api/tenants/:id/service-categories`, PATCH|DELETE `/api/service-categories/:id`

**Availability:** GET `/api/tenants/:id/availability` (?service_id&date), GET|POST `.../rules`, PATCH `/api/availability/rules/:id`

**Blocked Dates:** GET|POST `/api/tenants/:id/blocked-dates`, DELETE `/api/blocked-dates/:id`

**Booking Flow:** GET|PATCH `/api/tenants/:id/booking-flow`, POST `/api/booking-sessions`, PATCH `/api/booking-sessions/:id`, POST `.../complete`

**Bookings:** GET `/api/bookings`(list)|`/:id`, PATCH `/:id`, POST `/:id/cancel`|`/confirm`|`/no-show`(admin marks NO_SHOW)|`/check-in`|`/check-out`|`/reschedule` (accepts new date/time; preserves `original_start_date` on first reschedule; increments `reschedule_count`; fires `BOOKING_RESCHEDULED` event; regenerates payment reminders -- see SRS-4 §24)

**Clients:** GET `/api/tenants/:id/clients` (paginated list with search/filter; aggregates distinct clients from bookings for the tenant), GET `/api/tenants/:id/clients/:clientId` (client profile with booking history, payment history, and notes scoped to the requesting tenant). No dedicated `tenant_clients` table -- client lists are derived from `bookings` grouped by `client_id` with user details joined from `users`. Supports FR-CRM-4. POST `/api/tenants/:id/clients/import` (import clients from CSV; body: `multipart/form-data` with CSV file -- columns: `name`, `email`, `phone`; returns validation preview: `{ valid: ClientRow[], duplicates: ClientRow[], errors: ClientRow[] }`; requires `?commit=true` query param to execute import; deduplicates by `email` against existing `users` table; creates `user` records for new entries, associates existing users as tenant clients; max 1,000 rows per import; ADMIN only; FR-CRM-18). GET `/api/tenants/:id/clients/export` (export tenant's client list as CSV; columns: `name`, `email`, `phone`, `total_bookings`, `last_booking_date`; streams response with `Content-Type: text/csv`; ADMIN only; FR-CRM-18).

**Payments:** POST `/api/payments/create-intent`|`/refund`, GET `/api/payments/history`, POST `/api/payments/webhooks/:provider` (e.g., `/api/payments/webhooks/stripe`)

**Invoices:** GET `/api/invoices`|`/:id`|`/:id/pdf`, PATCH `/api/invoices/:id` (admin: update `due_date`, `status` for manual corrections; OWNER/ADMIN only), POST `/:id/send`

**Discounts:** GET|POST `/api/discounts`, PATCH `/:id`, POST `/validate`

**Booking Pages (public):** GET `/api/booking-pages/:slug`|`/:slug/services`|`/:slug/qr` (returns QR code PNG for the booking URL; generated server-side via `qrcode` npm package; FR-BP-7). `/:slug/services` response groups services by category: `{ categories: [{ id, name, description, services: [...] }], uncategorized: [...] }`. When no categories exist, all services appear in `uncategorized`. Frontend renders category headers only when `categories` is non-empty.

**Reviews:** POST `/api/reviews` (validates `bookings.status = 'COMPLETED'`; returns 422 if booking not eligible), GET `/api/tenants/:id/reviews`, GET `/api/reviews/:id`, PATCH `/api/reviews/:id` (admin: set `response`/`responded_at`/`responded_by`, toggle `is_published`; supports FR-CRM-24)

**Walk-In Bookings:** POST `/api/tenants/:id/bookings/walk-in` — creates a CONFIRMED booking directly from the Quick-Add action (FR-BFW-18, FR-CRM-28). Body: `{ service_id, start_time, client_id? (nullable — creates guest if absent), notes? }`. Authentication required (OWNER/ADMIN/STAFF). Sets `source = WALK_IN`, `status = CONFIRMED`, skips session and reservation token flows. Fires `BOOKING_CONFIRMED` event immediately. Returns the created booking.

**Client Profiles:** GET `/api/tenants/:id/clients/:clientId/profile` — returns the `client_profiles` record for the (tenant, client) pair; creates an empty record if absent (upsert semantics). PATCH `/api/tenants/:id/clients/:clientId/profile` — updates preference fields (merge semantics: provided keys update, absent keys preserve). OWNER/ADMIN/STAFF. Included in the `GET /api/tenants/:id/clients/:clientId` response as a `profile` sub-object.

**Calendar Sync:** POST `/api/calendar/connections/:id/sync` — triggers an immediate sync cycle outside the polling schedule (FR-CAL-15). Rate-limited to 4 calls per hour per connection (Redis token bucket). Returns `{ synced_at, events_added, events_removed }`.

**iCal Feed:** GET `/api/ical/:tenant_slug/:provider_slug.ics?token={feed_token}` — public endpoint, no session auth. Token is per-connection, stored on `calendar_connections.ical_feed_token` (UUID, generated on creation). Feed includes VEVENT entries for confirmed bookings. Phase 2 (FR-CAL-16).

**Feedback:** POST `/api/feedback` — submits to `feedback` table. Body: `{ type, body, screenshot? (base64 or R2 pre-signed upload) }`. Context metadata (context_page, tenant_id, submitted_by) injected server-side. GET `/api/admin/feedback` — platform admin only; filterable by type, tenant, status.

**Import Jobs:** POST `/api/tenants/:id/import` — multipart/form-data with CSV file + `source_platform`. Creates import job, returns `{ job_id }`. GET `/api/import-jobs/:id` — returns job status, stats, error log. Phase 2 self-service (FR-IMP-2).

**Service Providers:** GET `/api/services/:id/providers` — lists providers assigned to a service. POST/DELETE `/api/services/:id/providers/:userId` — assign or remove a provider from a service. OWNER/ADMIN only. Phase 2 (FR-CRM-30).

**Communications:** POST `/api/communications/send`, GET|POST `.../templates`, PATCH `.../templates/:id`, GET `.../templates/:id/history`, POST `.../templates/:id/rollback`|`/preview`, GET `.../history`, GET|POST `/api/email-layouts`, PATCH `/:id`

**Notifications:** GET `/api/notifications`, PATCH `/:id/read`|`/read-all`, GET|PATCH `.../preferences`, POST|DELETE `.../push-tokens(/:id)`, GET `/api/notifications/stream` (Phase 2 -- SSE endpoint for real-time notification delivery; see FR-NOT-1, FR-NOT-5)

**Contracts:** GET|POST `/api/contracts`, GET|PATCH `/:id`, POST `/:id/send`|`/sign`|`/void`|`/amendments`, PATCH `/api/contracts/amendments/:id`, GET|POST|PATCH `/api/contract-templates(/:id)`

**Quotes:** GET|POST `/api/quotes`, GET|PATCH `/:id`, POST `/:id/send`|`/accept`|`/reject`|`/revise`|`/remind`

**Calendar:** GET `/api/calendar/connections`, POST `.../connect/:provider`, GET `.../callback/:provider`, DELETE|PATCH `.../connections/:id`, POST `.../connections/:id/sync`

**Accounting (Phase 3):** POST `/api/accounting/connect/:provider`, GET `.../callback/:provider`, DELETE `.../connections/:id`, PATCH `.../mappings`, POST `.../sync`, GET `.../status`

**Analytics:** GET `/api/analytics/dashboard`(free)|`/bookings`|`/revenue`|`/clients`|`/export`(premium)

**Tenant Data Export (FR-CRM-26):** POST `/api/tenants/:id/data-export` (OWNER only; enqueues `processTenantDataExport` job; returns 202 with `data_requests` ID), GET `/api/tenants/:id/data-export/:requestId` (poll status + download URL; OWNER only)

**Gallery Photos:** GET `/api/tenants/:id/gallery` (?venue_id&service_id -- filter by scope; omit for all), POST `/api/tenants/:id/gallery` (create record after upload confirm; accepts url, venue_id, service_id, category, alt_text, caption, is_featured, sort_order), PATCH `/api/gallery/:id` (update metadata: alt_text, caption, is_featured, sort_order, category), DELETE `/api/gallery/:id`

**File Uploads:** POST `/api/uploads/presign` (returns a presigned Cloudflare R2 upload URL with a unique key; accepts `content_type`, `file_name`, `context` -- e.g., "gallery", "logo", "review_photo"), POST `/api/uploads/confirm` (validates the upload completed, records metadata, returns the public CDN URL). Rate limit: 10/min per user (see SRS-4 §27). Used by: gallery photos, business logos/covers, review photos, contract template images, message attachments.

**File Upload Constraints:**

| Context | Max File Size | Allowed MIME Types | Max Files |
|---------|--------------|-------------------|-----------|
| Gallery photos | 10 MB | `image/jpeg`, `image/png`, `image/webp` | 50 per service |
| Business logo | 2 MB | `image/jpeg`, `image/png`, `image/svg+xml` | 1 per tenant |
| Contract attachments | 5 MB | `image/jpeg`, `image/png`, `application/pdf` | 10 per contract |
| Questionnaire uploads | 5 MB | `image/jpeg`, `image/png`, `application/pdf` | 5 per response |
| Cover photo | 5 MB | `image/jpeg`, `image/png`, `image/webp` | 1 per tenant |
| Review photos | 5 MB | `image/jpeg`, `image/png`, `image/webp` | 3 per review |
| Message attachments | 10 MB | `image/jpeg`, `image/png`, `image/webp`, `application/pdf` | 5 per message |

**Tenant Storage Quota:**

| Tier | Storage Limit | Enforcement |
|------|--------------|-------------|
| Free | 500 MB | `POST /api/uploads/presign` returns `413` when quota exceeded |
| Pro | 5 GB | Same enforcement; quota displayed in admin settings |

> **Implementation:** The `POST /api/uploads/presign` endpoint validates `content_type` against allowed MIME types and `file_size` against the context-specific limit before generating the presigned URL. Total tenant storage is tracked via `SUM(file_size)` across `gallery_photos` and other upload tables. Quota enforcement is per-tenant, not per-user.

**Team Members:** GET `/api/tenants/:id/members`, PATCH `/api/members/:id` (update role/permissions), DELETE `/api/members/:id` (remove from team)

**Team Invitations:** POST `/api/tenants/:id/invitations`, GET `/api/tenants/:id/invitations`, DELETE `/api/invitations/:id/revoke`, POST `/api/invitations/accept` (token in body)

**API Keys:** GET|POST `/api/tenants/:id/api-keys`, DELETE `/api/api-keys/:id`, POST `/api/api-keys/:id/rotate`

**Tax Rates:** GET|POST `/api/tenants/:id/tax-rates`, PATCH|DELETE `/api/tax-rates/:id`

**Referral Links (Phase 3):** GET|POST `/api/tenants/:id/referral-links`, PATCH|DELETE `/api/referral-links/:id`

**User Profile:** GET|PATCH `/api/users/me`, GET `/api/users/me/data-export` (GDPR data export -- see SRS-4 §30), DELETE `/api/users/me` (account deletion with 30-day grace -- see SRS-4 §30)

**Consent:** GET `/api/users/me/consents` (returns all consent records for the authenticated user), PATCH `/api/users/me/consents/:purpose` (grant or withdraw consent for a specific purpose; body: `{consented: boolean}`; records IP address and user agent; audit-logged)

**Onboarding Tours:** GET `/api/users/me/tours`, PATCH `/api/users/me/tours/:tourKey` (mark completed or dismissed)

**Support Tickets:** POST `/api/support-tickets` (submit ticket; captures `source_context` automatically; authenticated users only), GET `/api/support-tickets/mine` (list own tickets with status), GET `/api/support-tickets/:id` (view own ticket detail including `ai_response`), PATCH `/api/support-tickets/:id/reopen` (creates new linked ticket via `related_ticket_id` if `status = CLOSED`), PATCH `/api/support-tickets/:id/satisfaction` (body: `{helpful: boolean}`; sets `user_satisfaction`). **Platform Admin only:** GET `/api/admin/support-tickets` (list all tickets; filterable by status, severity, category), PATCH `/api/admin/support-tickets/:id` (update status, developer_notes, resolved_by)

**Messaging (Phase 2):** GET|POST `/api/tenants/:id/messages/threads`, GET `/api/messages/threads/:id`, POST `/api/messages/threads/:id/messages`, PATCH `/api/messages/threads/:id` (close/archive), POST `/api/messages/:id/read`

**Notes (Phase 2):** GET|POST `/api/tenants/:id/notes` (?entity_type&entity_id), PATCH|DELETE `/api/notes/:id`

**Embed (Phase 2):** GET `/api/embed/:slug/config`|`/availability`, POST `.../session`

**Service Add-ons (Phase 2):** GET|POST `/api/services/:id/addons`, PATCH|DELETE `/api/service-addons/:id`

**Workflow Automations (Phase 1):** GET `/api/tenants/:id/workflow-automations` (list preset automations for tenant), PATCH `/api/workflow-automations/:id` (toggle `is_active` only; rejects all other field changes in Phase 1-2; full CRUD in Phase 3)

**Workflow Templates (Phase 3):** GET|POST `/api/tenants/:id/workflow-templates`, GET|PATCH|DELETE `/api/workflow-templates/:id`

**Workflow Stages (Phase 3):** GET|POST `/api/workflow-templates/:id/stages`, PATCH|DELETE `/api/workflow-stages/:id`

**Workflow Webhooks (Phase 3):** GET|POST `/api/tenants/:id/webhooks`, PATCH|DELETE `/api/webhooks/:id`, POST `/api/webhooks/:id/test`

**Public API v1 (Phase 3):** GET `/api/v1/businesses(/:id)`|`.../services`|`.../availability`; POST|PATCH `/api/v1/booking-sessions(/:id)`, POST `.../complete`; GET|DELETE `/api/v1/bookings/:id`

## 15. Search Infrastructure

**Technology:** PostgreSQL Full-Text Search (FTS) + pg_trgm extension for fuzzy matching. No external search service in Phase 1; migrate to Meilisearch if directory scales past 100K listings (see SRS-1 §2).

### Indexes

| Table | Column(s) | Index Type | Purpose |
|-------|-----------|------------|---------|
| tenants | name, description | GIN (tsvector) | Business name/description search |
| tenants | name | GIN (pg_trgm) | Fuzzy/typo-tolerant name search |
| tenants | category | B-tree | Category filtering |
| tenants | (address->>'lat'), (address->>'lng') | GiST (point) | Location-based radius search |
| services | name, description | GIN (tsvector) | Service search within a tenant |
| venues | name, description | GIN (tsvector) | Venue search within a tenant |

### Performance Indexes (Non-Search)

| Table | Column(s) | Index Type | Purpose |
|-------|-----------|------------|---------|
| bookings | (tenant_id, service_id, status, start_time, end_time) | B-tree composite | Availability conflict checks (SRS-3 §6) |
| bookings | (tenant_id, client_id) | B-tree composite | Client booking history and client list aggregation (SRS-2 §14 Clients) |
| bookings | (client_id, tenant_id, source, status, created_at) | B-tree composite | Commission eligibility query (SRS-3 §11) |
| bookings | (tenant_id, start_time) | B-tree composite | Dashboard date-range queries, calendar view |
| bookings | (tenant_id, status) | B-tree composite | Status-filtered listing (e.g., pending approvals, no-shows) |
| payments | (booking_id, status) | B-tree composite | Payment lookup per booking; over-payment prevention (SRS-3 §12) |
| payments | (tenant_id, created_at) | B-tree composite | Revenue reporting queries |
| date_reservations | (service_id, reserved_date, status) | B-tree composite | Reservation conflict detection (SRS-3 §5) |
| communications | (tenant_id, recipient_id, created_at) | B-tree composite | Communication history per client |
| booking_sessions | (tenant_id, status, updated_at) | B-tree composite | Abandoned session detection job |

> **Note:** All tenant-scoped tables implicitly benefit from the RLS policy index on `tenant_id`. The composite indexes above are optimized for specific high-frequency query patterns. Additional indexes (e.g., on `booking_reminders`, `workflow_automations`) use the indexes documented inline on their table definitions.

### tsvector Maintenance

Auto-updated via PostgreSQL trigger on INSERT/UPDATE:

```sql
CREATE FUNCTION tenants_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A')
    || setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B');
  RETURN NEW;
END $$ LANGUAGE plpgsql;
```

A `search_vector` tsvector column is added to `tenants`, `services`, and `venues` tables for FTS. The `search_businesses` MCP tool (§16) uses these indexes for full-text + location queries.

### Location Search

Radius queries use the GiST point index:

```sql
WHERE point(address->>'lng', address->>'lat') <@> point(:lng, :lat) < :radius_miles
```

## 16. MCP Server Tools (Phase 3)

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `search_businesses` | Search by category, location, availability | query, category, location, date_range, price_range, sort_by |
| `get_business_details` | Business info, services, pricing, reviews | business_id |
| `check_availability` | Available slots for business + service | business_id, service_id, date |
| `create_booking` | Create booking for slot | business_id, service_id, start_time, client_info, payment_method_id |
| `get_booking_status` | Check booking status | booking_id |
| `cancel_booking` | Cancel booking | booking_id, reason |

---

*End of SRS Part 2. For architecture see SRS-1. For booking/payment logic see SRS-3. For comms/security/workflow see SRS-4.*