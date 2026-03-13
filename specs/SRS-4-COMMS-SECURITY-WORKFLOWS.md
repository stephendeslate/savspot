# Savspot -- Software Requirements Specification: Communications, Security & Workflows

**Version:** 1.2 | **Date:** March 7, 2026 | **Author:** SD Solutions, LLC
**Document:** SRS Part 4 of 4

---

## 1. Template Engine

> **Phase 1 rendering:** In Phase 1, all transactional emails (FR-COM-1a) use hardcoded React Email components rendered server-side via `@react-email/render` and sent through Resend. No DB-stored templates or business customization. The template engine and sandboxed variable substitution below apply from Phase 2 onward (FR-COM-1b).

Business-authored templates run in a sandboxed engine with strict security controls.

| Category | Blocked Constructs | Rationale |
|----------|--------------------|-----------|
| Tags | `load`, `include`, `extends`, `ssi`, `debug` | Prevents code injection / file inclusion |
| Filters | `make_list`, `pprint` | Prevents data exfiltration |
| Attributes | Dunder patterns (`__class__`, `__import__`) | Prevents sandbox escape |
| Code | `import`, `exec`, `eval`, `require` | Prevents arbitrary code execution |
| Size | Max 100 KB template body | Prevents resource exhaustion |
| Depth | Max 10 levels of context nesting | Prevents stack overflow |

Validation at **save time** and **render time**. Invalid templates rejected with error messages. Rendering failures log error, skip delivery, alert tenant admin -- partial messages never sent.

## 2. Context Variable System
80+ variables across 13 groups, generated type-safely per communication trigger.

| Group | Example Variables |
|-------|-------------------|
| client | `client.name`, `client.email`, `client.phone` |
| booking | `booking.service_name`, `booking.date`, `booking.time`, `booking.status` |
| financial | `booking.total_amount`, `booking.deposit_amount`, `booking.balance_due` |
| payment | `payment.amount`, `payment.method`, `payment.date`, `payment.receipt_url` |
| invoice | `invoice.number`, `invoice.total`, `invoice.due_date`, `invoice.pdf_url` |
| contract | `contract.title`, `contract.sign_url`, `contract.status` |
| admin | `admin.name`, `admin.email` |
| notification | `notification.title`, `notification.body` |
| system | `system.current_date`, `system.platform_name` |
| company | `company.name`, `company.logo_url`, `company.phone`, `company.address` |
| urls | `urls.booking_detail`, `urls.client_portal`, `urls.unsubscribe` |
| venue | `venue.name`, `venue.address`, `venue.map_url` |
| review | `review.submit_url`, `review.business_name` |

## 3. Layout Composition
At render time: `wrapper_template` wraps `header_template` + rendered `body_template` + `footer_template`. Business branding (logo, colors) injected via `company.*` context variables. Tenants may define multiple layouts (e.g., "Standard", "Minimal"); platform default applies when none set.

## 4. Template Versioning & Rollback
Every edit creates a `template_history` record (auto-incremented version, subject/body snapshot, acting user, optional reason). Admins can **rollback** to any version, creating a new history entry. If a tenant template key is inactive, the platform default is used.

## 5. Communications Circuit Breaker
Three-state pattern per provider (Resend, Plivo), stored in Redis. Config: `failure_threshold=5`, `recovery_timeout=60s`.

| State | Behavior |
|-------|----------|
| **CLOSED** | Normal delivery; track consecutive failures |
| **OPEN** | Sends queued. After timeout, transition to HALF_OPEN |
| **HALF_OPEN** | 1 probe send. Success -> CLOSED. Failure -> OPEN (increased timeout) |

When OPEN, critical comms (payment receipts, security alerts) fall back to alternate channel; non-critical queued with backoff.

## 6. Delivery Tracking & Bounce Handling
7 statuses: QUEUED, SENDING, SENT, DELIVERED, OPENED, BOUNCED, FAILED. Provider APIs polled every 5 min. **Hard bounces** -> BOUNCED + flag email for re-verification. **Soft bounces** -> retry x3. Failed deliveries retry up to 3 attempts, respecting circuit breaker.

## 7. Notification Type Registry

| Field | Description |
|-------|-------------|
| key | Unique ID, e.g., `booking.confirmed`, `payment.received` |
| category | SYSTEM, BOOKING, PAYMENT, CONTRACT, COMMUNICATION, MARKETING, REVIEW, CALENDAR |
| default_channels | JSON array, e.g., `["in_app","push","email"]` |
| priority | LOW, NORMAL, HIGH, CRITICAL |
| auto_expire_hours | Auto-mark read after N hours (nullable) |
| is_system | `true` = cannot be disabled by user |

## 8. Notification Preference System
32+ boolean toggles: 8 categories x 4 channels (email, push, SMS, in-app). Defaults: email/push ON, SMS OFF, in-app ON. Marketing all OFF (opt-in only). System notifications (`is_system=true`) bypass preferences -- UI hides toggle.

## 9. Digest Batching
`digest_frequency`: IMMEDIATE (default), HOURLY, DAILY, WEEKLY. Non-immediate notifications batch into `notification_digests`, sent as single email. Mid-compilation arrivals roll into next batch.

## 10. Push Token Lifecycle

> **Phase 3:** Push notification infrastructure ships with the native mobile app in Phase 3 (PRD §4.5). The specification below applies from Phase 3 onward. Phase 1-2 relies on email and browser push (VAPID) for transactional notifications (booking confirmations, reminders, receipts).

Tokens must match `ExponentPushToken[...]`; invalid rejected at registration. Records `device_type`, `is_active`, `failure_count`. Auto-deactivation: 5 consecutive failures or `DeviceNotRegisteredError`. Duplicates deduplicated by value (keep most recent). Inactive >90 days purged daily.

## 11. Quiet Hours
Evaluated in user's IANA timezone when `quiet_hours_start`/`quiet_hours_end` configured:

| Channel | Behavior During Quiet Hours |
|---------|-----------------------------|
| SMS | Suppressed; queued until end |
| Push | Delivered silently (no sound) |
| Email / In-app | Unaffected |

## 12. Contract State Machine
```
           +---------+
           |  DRAFT  |
           +----+----+
                | send
           +----+----+
           |   SENT  |
           +----+----+
                | sign (partial)
      +---------+---------+
      | PARTIALLY_SIGNED  |
      +---------+---------+
                | all signatures
           +----+----+
           |  SIGNED |----> AMENDED
           +----+----+
           |         |
      expiry_date  void
           v         v
       +-------+ +------+
       |EXPIRED| | VOID |
       +-------+ +------+
```

| From | To | Trigger |
|------|----|---------|
| DRAFT | SENT | Business sends contract |
| SENT | PARTIALLY_SIGNED | First signature (multi-party) |
| SENT | SIGNED | All signatures (single-signer) |
| PARTIALLY_SIGNED | SIGNED | All required signatures collected |
| SIGNED | AMENDED | Amendment signed by all parties |
| SENT/PARTIALLY_SIGNED | EXPIRED | `expiry_date` passes |
| Any | VOID | Business voids (mandatory reason; SIGNED contracts require void_reason) |

## 13. Multi-Party Signatures

> **Progressive complexity:** Contracts are entirely optional. A service with no `contract_template_id` skips the contract step in the booking flow. When a business first creates a contract template, the signature configuration determines complexity: a single entry in `parties` creates a simple single-signer flow; multiple entries enable the full multi-party system below. Most individuals and small businesses will never configure contracts.

Six roles: **CLIENT, WITNESS, COMPANY_REP, GUARDIAN, PARTNER, OTHER**. Order enforced via `contract_signatures.order`. Each captures: signature data (DRAWN/TYPED/UPLOADED), IP, user agent, **device fingerprint** (screen, timezone, platform). Simultaneous signers serialized via row-level locking.

## 14. Contract Amendments
7 statuses: REQUESTED, DRAFT, SENT_FOR_REVIEW, APPROVED, SIGNED, REJECTED, CANCELLED. `sections_changed` JSON: `{section, old_value, new_value}`. `value_change` tracks monetary impact. Only allowed on **SIGNED** contracts.

## 15. Legal Compliance
E-SIGN Act: signer must accept disclosure (`legal_disclosure_accepted=true`) and provide `electronic_consent_at` before signing. Content **frozen at send time**. `signature_confidence` (0.0-1.0) stored per signature.

## 16. Quote State Machine

> **Progressive complexity:** Quotes are activated only when a business uses `CUSTOM` pricing or manually creates a quote from the Admin CRM. Services with FIXED, HOURLY, or TIERED pricing calculate totals automatically and do not require quotes. Most individuals and small businesses will never use the quote system.

```
  +-------+  send  +------+
  | DRAFT |------->| SENT |
  +---+---+        +--+---+
      |               |    \
      | revise    accept  reject
      v               v      v
  +-------+    +----------+ +----------+
  | DRAFT |    | ACCEPTED | | REJECTED |
  | (v N) |    +----+-----+ +----------+
  +-------+         | signal: contract + invoice
  expiry ->  +---------+
             | EXPIRED |
             +---------+
```

| From | To | Trigger |
|------|----|---------|
| DRAFT | SENT | Business sends quote |
| SENT | ACCEPTED | Client accepts with signature |
| SENT | REJECTED | Client rejects |
| SENT | EXPIRED | `valid_until` passes |
| DRAFT/SENT | DRAFT (v N) | Business revises |

## 17. Quote Versioning
`UNIQUE(booking_id, version)`. Revising auto-increments version and copies line items. Previous versions immutable for audit.

## 18. Quote Options
Multiple `quote_options` per quote (e.g., "Standard", "Premium"), each with child `quote_option_items`. Client selects one (`is_selected=true`) during acceptance. Independent totals and line-item breakdowns.

## 19. Quote Acceptance Flow
`SELECT ... FOR UPDATE` row lock prevents double-accept (409 on conflict). On ACCEPTED, signal fires atomically: (1) generate contract from template, (2) generate invoice from line items. Expired quote -> 409. (See SRS-2 for invoicing; SRS-3 for payments.)

## 20. Stage Execution Rules

**Zero-config defaults:** During onboarding, business-type presets create default workflow automations as concrete rows in `workflow_automations`. The defaults per category are:

| Category | Default Automations Created |
|----------|-----------------------------|
| PROFESSIONAL | BOOKING_CONFIRMED -> confirmation email; REMINDER_DUE -> 24h reminder; BOOKING_COMPLETED -> 24h follow-up email with rebooking prompt deep-link (FR-BFW-19) |
| SALON | BOOKING_CONFIRMED -> confirmation email; REMINDER_DUE -> 24h reminder; BOOKING_COMPLETED -> 24h follow-up email with rebooking prompt deep-link (FR-BFW-19) |
| STUDIO | BOOKING_CONFIRMED -> confirmation email; REMINDER_DUE -> 24h reminder; BOOKING_COMPLETED -> 24h follow-up email with rebooking prompt deep-link (FR-BFW-19) |
| FITNESS | BOOKING_CONFIRMED -> confirmation email; REMINDER_DUE -> 24h reminder; BOOKING_COMPLETED -> 24h follow-up email with rebooking prompt deep-link (FR-BFW-19) |
| VENUE | BOOKING_CONFIRMED -> confirmation email; REMINDER_DUE -> 48h reminder; BOOKING_COMPLETED -> follow-up (Phase 1: strictly transactional follow-up, no review solicitation; Phase 2+: includes review request link when review system is available). No rebooking prompt for VENUE preset — venues are event-based, not recurring. |
| OTHER | BOOKING_CONFIRMED -> confirmation email; REMINDER_DUE -> 24h reminder; BOOKING_COMPLETED -> 24h follow-up email with rebooking prompt deep-link (FR-BFW-19) |

> **Rebooking prompt (FR-BFW-19):** Included in the BOOKING_COMPLETED follow-up email for all recurring-service presets (PROFESSIONAL, SALON, STUDIO, FITNESS, OTHER). The prompt is a prominently placed link in the follow-up email body: "Ready for your next appointment? Book in seconds → [savspot.co/{slug}?service={id}&provider={id}]". The deep-link URL parameters pre-select the same service and provider so the client begins on the date/time picker step. This is a communication enhancement, not a separate workflow automation step — it is rendered conditionally in the follow-up email template based on the service's preset category.

These are concrete `workflow_automations` rows. **In Phases 1-2, preset automation configuration is locked** — businesses cannot add new automations, delete existing ones, or modify trigger/action configuration. The `is_active` toggle is the one exception: businesses can disable or re-enable individual automations via the Admin CRM. The preset function is not stored — it writes data and is forgotten. In Phase 3 (FR-CRM-16: Workflow automation builder), businesses gain full CRUD control over automations and can add advanced automation (20 trigger types -- see §21 for canonical list, multi-stage workflows with progression conditions).

> **Hardcoded platform communications** (not part of the automation system — always sent, not configurable or disableable):
> - **Payment receipt:** On `payment_intent.succeeded` webhook, sends receipt email via `deliverCommunication` (FR-PAY-9).
> - **Booking cancellation confirmation:** On any booking cancellation (client-initiated, admin-initiated, payment timeout, approval timeout), sends cancellation confirmation email to the client with cancellation reason and any refund details.
> - **MANUAL_APPROVAL notification:** When a booking is created for a service with `confirmation_mode = MANUAL_APPROVAL`, sends an in-app notification (and email) to the tenant's OWNER/ADMIN roles alerting them that a booking requires their approval. Includes booking details and a direct link to the Admin CRM booking detail.
> - **No-show notification:** When a booking is marked NO_SHOW (by `processCompletedBookings` job Phase A or admin via `POST /api/bookings/:id/no-show`), sends a notification to the tenant's OWNER/ADMIN roles and fires the `BOOKING_NO_SHOW` event (see §21).
> - **Provider SMS notification (Phase 1, FR-COM-2a):** On BOOKING_CONFIRMED (online booking), BOOKING_CANCELLED, BOOKING_RESCHEDULED, BOOKING_WALK_IN, and PAYMENT_RECEIVED events, `deliverProviderSMS` (see §40) sends a real-time SMS to the OWNER's phone. This is hardcoded (always active when OWNER has a phone number) because real-time provider awareness is critical for parallel-run scenarios. Configurable on/off in Admin CRM settings.
> - **Browser push notification (Phase 1, FR-NOT-6):** On BOOKING_CONFIRMED, BOOKING_CANCELLED, BOOKING_WALK_IN, and PAYMENT_RECEIVED events, `deliverBrowserPush` (see §40a) sends a Web Push notification to active Admin CRM browser sessions for OWNER/ADMIN roles.
> - **Email verification, password reset, and team invitation emails** are also hardcoded system communications.
>
> These are transactional requirements, not workflow automations.

**Advanced stage execution:** Ordered stages execute by `order`. Each performs its `automation_type` (EMAIL, TASK, QUOTE, CONTRACT, QUESTIONNAIRE, REMINDER, NOTIFICATION) at `trigger_time` (ON_CREATION, AFTER_X_DAYS, X_DAYS_BEFORE_BOOKING), then waits for `progression_condition` (QUOTE_ACCEPTED, PAYMENT_RECEIVED, CONTRACT_SIGNED, TASKS_COMPLETED). Concurrent advancement serialized via row lock.

> **Free vs. Pro boundary:** Simple trigger-action automations (`workflow_automations` table -- flat event-to-action pairs created by presets or configured by the business) are free for all tenants. Advanced multi-stage workflows (`workflow_templates` + `workflow_stages` -- multi-step processes with progression conditions and stage ordering) require a Pro subscription (`tenants.subscription_tier` = PRO). See BRD §1-2 for revenue model.

## 21. Trigger Events
20 event types that start workflows or advance stages:

| Category | Events |
|----------|--------|
| Booking | BOOKING_CREATED, BOOKING_CONFIRMED, BOOKING_CANCELLED, BOOKING_RESCHEDULED, BOOKING_COMPLETED, BOOKING_NO_SHOW, BOOKING_WALK_IN |
| Payment | PAYMENT_RECEIVED, PAYMENT_FAILED, PAYMENT_OVERDUE, DEPOSIT_RECEIVED, FULL_PAYMENT_RECEIVED |
| Contract | CONTRACT_SENT, CONTRACT_SIGNED |
| Quote | QUOTE_SENT, QUOTE_ACCEPTED, QUOTE_REJECTED |
| Other | QUESTIONNAIRE_SUBMITTED, REMINDER_DUE, REVIEW_SUBMITTED |

> **Clarification:** `BOOKING_CREATED` fires when a booking record is first persisted in `PENDING` state (i.e., after session completion and payment initiation). `BOOKING_CONFIRMED` fires on the `PENDING -> CONFIRMED` transition (payment received or manual approval). For auto-confirm services, both events fire in quick succession. `BOOKING_WALK_IN` fires when a walk-in booking is created via the Quick-Add action (FR-BFW-18); it is distinct from `BOOKING_CONFIRMED` so workflow automations can distinguish online bookings from walk-ins (e.g., suppressing confirmation email for walk-ins who are physically present).

## 22. Per-Booking Overrides

| Override Type | Effect |
|---------------|--------|
| SKIP | Stage bypassed entirely |
| DISABLE_AUTOMATION | Automation manual-only |
| CUSTOM_TIMING | Override `trigger_time`/`trigger_days` |
| ADD_STAGE | Insert stage after specified position (circular dep validation) |

All overrides require `reason` for audit. Soft-deleted templates: active bookings continue with stage snapshot.

## 23. Outgoing Webhooks
Signed with `HMAC-SHA256(secret, body)` via `X-Savspot-Signature` header. Retry: 3 attempts, exponential backoff (10s, 60s, 300s). Auto-disabled after **10 consecutive failures**; admin notified. Rate: 100/min per tenant.

## 24. Payment Deadline Automation

> **Scope:** Payment deadline automation applies to **CONFIRMED bookings with outstanding invoices**. For MANUAL_APPROVAL bookings still in PENDING state (no invoice exists), the approval deadline is handled separately via `services.approval_deadline_hours` and the `enforceApprovalDeadlines` job — see SRS-3 §2.

Payment deadline is derived from `invoices.due_date`. Reminders are sent at 7, 3, and 1 days before `due_date`. Duplicate prevention: `UNIQUE(booking_id, reminder_type, interval_days, channel)`. Each reminder is sent at most once per booking per channel per interval. On deadline: auto-cancel behavior is controlled by `services.auto_cancel_on_overdue` (null = platform default `true`). When enabled (null or `true`): the `enforcePaymentDeadlines` job auto-cancels the booking and sends a cancellation notification. When `false`: the booking is flagged OVERDUE but not auto-cancelled; admin is notified. In both cases, the `PAYMENT_OVERDUE` event (see §21) is fired when an invoice transitions to OVERDUE status (`due_date` passed and `amount_paid < total`), enabling workflow automations triggered by this event. Payment after cancel: refund, notify to re-book. Rescheduled: regenerate reminders.

## 25. Session & Reservation Cleanup

> **Canonical job definitions:** Reservation expiry, abandoned session recovery, and booking reminder jobs are defined in **SRS-3 §16 and §19** as the single source of truth. The canonical jobs are:
>
> | Job | Interval | Purpose |
> |-----|----------|---------|
> | `expireReservations` | **Every 5 min** | Release expired `date_reservations` (matches 5-min default hold) |
> | `abandonedBookingRecovery` | Hourly | Mark 1h-idle sessions as ABANDONED; send recovery email |
> | `sendBookingReminders` | Every 15 min | 24h/48h booking reminders |
>
> Session abandonment standardized to **1 hour** (see SRS-1, SRS-2). Reservation expiry interval is 5 minutes to match the default `date_reservations.expires_at = now+5min` hold duration.

## 26. Authentication Flows
**Registration:** `POST /auth/register` -> Zod -> bcrypt (12 rounds) -> user (`email_verified=false`) -> verification email -> 201. Signed token, 24h expiry.
**Login:** `POST /auth/login` -> credentials -> `email_verified` -> MFA if enabled -> RS256 JWT (15-min access, 7-day refresh) -> httpOnly cookie (web) / tokens (mobile, Phase 3).
**Token Refresh:** `POST /auth/refresh` -> validate -> blacklist old (rotation) -> new pair. Phase 1-2 is web-only: tokens are stored in httpOnly cookies. Mobile secure token storage (Keychain/Keystore) ships in Phase 3 (PRD §4.5 FR-MOB-6).
**Tenant Resolution:** JWT -> `tenant_id` -> `SET app.current_tenant` -> RLS isolation.
**Role Model:** `users.role` = platform-level (`PLATFORM_ADMIN`/`USER`). Business roles (`OWNER`/`ADMIN`/`STAFF`) on `tenant_memberships`. NestJS guards enforce the Tenant Role Permission Matrix (SRS-2 §3) on every Admin CRM request; `permissions` JSONB overrides can narrow base role access. (See SRS-1 §7 for RLS, SRS-2 §3 for the full matrix.)

## 27. Rate Limiting
Redis sliding window. `X-RateLimit-*` headers on all responses.

| Scope | Rate | Applies To |
|-------|------|------------|
| `auth/login` | 5/min per IP | Login |
| `auth/register` | 3/min per IP | Registration |
| `auth/forgot-password` | 3/min per IP | Password reset request |
| `auth/reset-password` | 5/min per IP | Password reset submit |
| `auth/verify-email` | 5/min per IP | Email verification |
| `auth/refresh` | 10/min per user | Token refresh |
| `auth/mfa` | 5/min per user | MFA verification |
| `api/public` | 100/min per IP | Unauthenticated |
| `api/authenticated` | 300/min per user | Authenticated |
| `api/admin` | 500/min per user | Admin CRM |
| `api/booking-session` | 20/min per IP | Session creation |
| `api/payment` | 10/min per user | Payment intents |
| `webhook/:provider` | 500/min per IP | Payment provider webhooks (e.g., Stripe, Adyen, PayPal) |
| `webhook/outbound` | 100/min per tenant | Outgoing webhooks |
| `file-upload` | 10/min per user | File uploads |
| `api/v1` | Per key config | Public API |
| `mcp/tools` | 60/min per key | MCP tools |

> **Test mode:** Rate limits may be adjusted in test environments to prevent E2E test flakiness. Production limits are as specified above. See CLAUDE.md memory for test-mode adjustments.

## 28. Security Measures

| Measure | Implementation |
|---------|---------------|
| Tenant isolation | PostgreSQL RLS + NestJS middleware |
| Password hashing | bcrypt (12 rounds) |
| JWT signing | RS256, 15-min access, refresh rotation |
| API key storage | SHA-256 hash, prefix lookup, per-key rate limit |
| Input validation | Zod schemas shared client/server |
| XSS prevention | CSP headers + DOMPurify |
| CSRF protection | SameSite=Strict + CSRF tokens |
| SQL injection | Prisma parameterized queries |
| HTTPS | HSTS 1-year, TLS 1.3 only |
| Encryption at rest | AES-256 for tokens/PII via Prisma middleware |
| Secret management | Fly.io/Vercel env vars, never in code |
| Dependency scanning | npm audit + Snyk in CI |

## 29. Audit Logging
All admin actions, auth events, sensitive data access in `audit_logs`. Actions: CREATE, UPDATE, DELETE, READ, LOGIN, LOGOUT, EXPORT, IMPORT, SIGN, VOID, SEND, ACCEPT, REJECT, PASSWORD_CHANGE, MFA_ENABLE, MFA_DISABLE. Actor types: USER, SYSTEM, API_KEY, WEBHOOK. Stores `old_values`/`new_values` JSON. **Retention:** 2 years; archived to R2 after 90 days.

## 30. GDPR Compliance

| Requirement | Implementation |
|-------------|---------------|
| Consent management | Granular opt-in/opt-out records per purpose |
| Right to access | `GET /api/users/me/data-export` (JSON) |
| Right to erasure | `DELETE /api/users/me` with 30-day grace |
| Data portability | Standardized JSON export |
| Data portability (business) | Tenant data archive via Admin CRM (FR-CRM-26); OWNER-initiated; see §41a `processTenantDataExport` |
| Breach notification | 72-hour deadline tracking |
| Data minimization | Only necessary fields; retention enforced |
| Lawful basis | Documented per category (consent, contract, legitimate interest) |

## 30a. Legal Compliance Documents

| Document | Requirement | Acceptance Mechanism | Phase |
|----------|------------|---------------------|-------|
| **Terms of Service** | Governs the business owner's use of the Savspot platform. Displayed and accepted during business registration. | Checkbox + timestamp stored on `tenants.tos_accepted_at` and `tenants.tos_version`. Updated ToS requires re-acceptance on next admin login. | Must -- Phase 1 |
| **Privacy Policy** | Covers data collection, processing purposes, third-party sharing (Stripe, Resend, Plivo), data retention periods, and user rights. | Linked in all booking page footers, client portal footer, and email footers. Client consent captured via CONFIRMATION step checkbox (see SRS-1 §8). | Must -- Phase 1 |
| **Data Processing Agreement (DPA)** | Required by GDPR Article 28 when Savspot processes personal data on behalf of the tenant. Covers data processing scope, security measures, sub-processor list, breach notification obligations, and data return/deletion on termination. | Self-service acceptance via Admin CRM during or after onboarding. Acceptance stored on `tenants.dpa_accepted_at` and `tenants.dpa_version`. | Must -- Phase 1 |
| **Acceptable Use Policy** | Covers prohibited content, abuse prevention, and platform integrity rules. | Linked from ToS. Violation may result in tenant suspension. | Should -- Phase 1 |

> **Content responsibility:** Legal document content (ToS, Privacy Policy, DPA, AUP) is authored by legal counsel, not generated by the engineering team. The platform provides the acceptance, storage, and versioning mechanism. Document content is stored as static pages on the marketing site and versioned by date.

### 30b. Data Retention & Archival Policy

Default retention periods by entity type. Configurable per region (BRD BR-RULE-7).

| Entity | Active Retention | Archival | Deletion | Rationale |
|--------|-----------------|----------|----------|-----------|
| Bookings | Indefinite (while tenant active) | Archive to cold storage after 3 years | On tenant deletion (§41a) or client data-erasure request | Financial record-keeping; tax audit trail |
| Invoices & Payments | 7 years from creation | Archive to R2 after 2 years | After retention period + tenant deletion | Tax/accounting compliance (IRS, HMRC) |
| Booking Sessions (Redis → PG) | 90 days in PostgreSQL | Purge after 90 days | Automatic | Diagnostic/analytics value only |
| Communications (emails, SMS logs) | 2 years | Archive to R2 after 1 year | After retention period or client erasure request | Dispute resolution; GDPR minimization |
| Audit Logs | 2 years (§29) | Archive to R2 after 90 days (§29) | After retention period | Compliance; already specified in §29 |
| File Uploads (R2) | Indefinite (while tenant active) | N/A (R2 is already object storage) | On tenant deletion or file owner erasure request | Low marginal cost; business needs gallery history |
| Expired date_reservations | 30 days post-expiry | Purge after 30 days | Automatic | No business value post-expiry |
| Notification history | 1 year | Purge after 1 year | Automatic | Debugging only |

**Enforcement:** A scheduled background job (`cleanupRetentionPolicy`, daily at 03:00 UTC) processes each entity type against its retention threshold. Archived records are moved to Cloudflare R2 with a `retention_archived_at` timestamp. Purged records are hard-deleted. The job runs after `processCompletedBookings` (SRS-3 §16) to avoid conflicts.

> **Regional override:** Tenants in jurisdictions with longer mandatory retention (e.g., 10 years for German tax records) can have retention periods extended via a `retention_overrides` JSONB column on the `tenants` table. Default values above apply when no override is set. Regional overrides are a Phase 3 feature; Phase 1 uses the defaults above.

### 30c. Tenant Suspension Mechanism

**Trigger:** Platform admin executes `pnpm admin:suspend-tenant --tenant-id <id> --reason <reason>` (PRD FR-PADM-7).

**Immediate effects:**
1. `tenants.status` set to `'suspended'`
2. Booking page returns `HTTP 451 Unavailable For Legal Reasons` with a generic message ("This booking page is temporarily unavailable")
3. All active `booking_sessions` for the tenant are expired (Redis keys deleted, PG records marked `EXPIRED`)
4. Tenant admin users can still log in to view data but cannot create/edit services, accept bookings, or process payments
5. Existing confirmed bookings remain valid — clients are not affected for already-confirmed bookings
6. Tenant owner receives email notification with suspension reason and appeal instructions

**Unsuspend:** `pnpm admin:unsuspend-tenant --tenant-id <id>` sets status back to `'active'`. Booking page immediately becomes accessible. No automatic notification — admin manually communicates if needed.

**Deactivation:** `tenants.status = 'deactivated'` is reserved for voluntary account closure by the tenant owner (Phase 2+). Deactivated tenants follow the data retention policy (§30b) and GDPR deletion procedures (§41a).

> **RLS enforcement:** The existing RLS policies (SRS-1 §7) filter by `tenant_id`. Suspension enforcement is at the application layer (NestJS guard checks `tenants.status` on every authenticated request). This avoids modifying RLS policies, which are security-critical.

## 31. PCI DSS Compliance

| Requirement | Implementation |
|-------------|---------------|
| Card data | Provider-side tokenization (Stripe Elements in Phase 1) -- no card data on Savspot servers |
| Security testing | Automated scanning; annual pen test |
| Access control | RBAC + RLS; least privilege |
| Logging | Payment actions in audit_logs |

## 32. CCPA Compliance

| Requirement | Implementation |
|-------------|---------------|
| Do Not Sell | No selling; privacy policy disclosure |
| Right to know | Data export endpoint |
| Right to delete | Cascading account deletion |
| Opt-out | Marketing preference center |

## 33. CAN-SPAM Compliance

> **Phase 1 note:** All Phase 1 automated emails (booking confirmation, reminders, payment receipts) are transactional and generally exempt from CAN-SPAM opt-out requirements. The follow-up email (FR-COM-4) is kept strictly transactional in Phase 1 — no review solicitation or promotional content (see §20 VENUE preset clarification). As a best practice, all Phase 1 email templates include a minimal unsubscribe footer link that adds the recipient to a suppression list for non-essential emails (follow-ups). The suppression list is checked by `deliverCommunication` before sending follow-up emails. Full unsubscribe management and preference center ships in Phase 2 (FR-COM-8).

| Requirement | Implementation |
|-------------|---------------|
| Unsubscribe | One-click in all marketing emails; minimal unsubscribe link in Phase 1 follow-up emails as precautionary best practice |
| Honor opt-out | Within 24 hours; Phase 1: suppression list checked before non-essential sends |
| Sender ID | Business name + address in footer |

## 34. WCAG 2.1 AA Accessibility

| Requirement | Target |
|-------------|--------|
| WCAG 2.1 AA | All public-facing pages |
| Keyboard nav | Full functionality without mouse |
| Screen readers | ARIA labels on all interactive elements |
| Contrast | 4.5:1 normal, 3:1 large text |
| Reduced motion | `prefers-reduced-motion` respected |

shadcn/ui + Radix primitives. axe-core in CI. Quarterly screen reader audit.

## 35. Breach Response Lifecycle

| Status | Entry Condition | Actions |
|--------|----------------|---------|
| DETECTED | Alert or manual report | Create incident; assign responder |
| INVESTIGATING | Analysis begins | Assess scope and affected data |
| CONFIRMED | Breach validated | Calculate GDPR 72h deadline |
| CONTAINED | Threat neutralized | Revoke creds; patch vuln |
| NOTIFYING | Notifications begin | DPA, admins, affected users |
| RESOLVED | Remediation complete | Root cause doc; close |

## 36. Rich Text Editor
TipTap-based. Used for contract templates, email templates, service descriptions, business profiles.

| Feature | Supported |
|---------|-----------|
| Bold/italic/underline/strikethrough, headings (H1-H3), lists, links | Yes |
| Images (inline, gallery), tables | Yes |
| Merge fields (`{{client.name}}`) | Contract/email templates only |
| Code blocks, embeds | No |

Output: HTML. DOMPurify sanitization on save and render.

## 37. Widget Implementation
Pro-tier JS snippet from CDN (Cloudflare R2). Modes: popup, inline iframe, redirect. Iframe sandbox + PostMessage bridge. **50 KB gzipped** max. Async loading. `WIDGET` source attribution. Service pre-selection via URL params. Guest checkout.

## 38. Mobile Offline Support (Phase 3)

> **Phase 3:** Mobile offline support ships with the native mobile app in Phase 3 (PRD §4.5). Phase 1-2 is web-only; mobile-responsive web (FR-BP-5) covers client booking scenarios.

React Native + Expo. **MMKV** (key-value) + **TanStack Query** persistence. Offline: view cached bookings/businesses. Zustand (client state) + TanStack Query (server). Biometric via `expo-local-authentication`. Secure tokens: Keychain (iOS) / Keystore (Android).

## 39. Analytics
**Free:** Today's bookings, revenue, new clients, pending actions. **Pro:** Trends (daily/weekly/monthly, YoY), revenue (gross/net/by service/avg), clients (new vs returning, LTV, source), conversion funnel, source attribution (DIRECT, DIRECTORY, API, WIDGET, REFERRAL). Daily aggregation into `booking_flow_analytics`. (See SRS-1.)

## 40. Background Jobs -- Communications & Notifications

| Job | Queue | Schedule | Purpose |
|-----|-------|----------|---------|
| `deliverCommunication` | communications | On trigger | Render + send via provider |
| `trackDeliveryStatus` | communications | 5 min | Poll for delivery/open/bounce |
| `processDigests` | communications | Hourly/Daily/Weekly | Batch + send digest email |
| `cleanupExpiredNotifications` | communications | Daily 3 AM | Mark expired as read |
| `cleanupInactivePushTokens` | communications | Daily 4 AM | Purge tokens >90 days inactive **(Phase 3)** |
| `retryFailedDeliveries` | communications | 10 min | Retry FAILED (max 3) |
| `sendMorningSummary` | communications | Daily at configurable per-tenant time (default 7:30 AM tenant timezone) | For each tenant with at least one booking today: query the day's bookings, compose SMS summary ("Today: {N} bookings. Next: {Client} at {Time} ({Service}, {Duration})."), deliver via SMS provider (Plivo) to the OWNER's phone (FR-COM-10). Skip tenants with no phone on OWNER record or who have disabled morning summary. Rate: one SMS per tenant per day. |
| `sendWeeklyDigest` | communications | Monday 08:00 UTC (configurable) | For each active tenant: compute prior week stats (bookings completed, revenue collected, booking page views from PostHog, no-show count, new clients). Compose and send email digest to OWNER (FR-COM-11). Skip tenants with zero activity in the week. |
| `processPostAppointmentTriggers` | communications | Every 15 min | Scan for bookings where `status = COMPLETED` AND `updated_at` is within the last 15 min. For each: (1) enqueue review request communication (email + SMS in Phase 2) to be delivered 2 hours after completion — check `communications` table to avoid duplicate sends; (2) enqueue rebooking prompt inclusion in the post-appointment follow-up email (FR-BFW-19 — deep-link pre-populated with same service/provider). Idempotent: deduplication via `UNIQUE(booking_id, reminder_type)` on `booking_reminders` table. |
| `deliverProviderSMS` | communications | Event-driven | Triggered by BOOKING_CONFIRMED, BOOKING_CANCELLED, BOOKING_RESCHEDULED, PAYMENT_RECEIVED, and BOOKING_WALK_IN events. Sends real-time SMS to the tenant OWNER's phone via SMS provider (Plivo) (FR-COM-2a). Respects quiet hours (SRS-4 §11). Message templates: "New booking: {Client} booked {Service} at {Time}" / "{Client} cancelled their {Time} appointment" / "Walk-in added: {Service} at {Time}" / "Payment received: ${Amount} from {Client}". Does NOT send for client-facing events (client SMS is Phase 2 per FR-COM-2b). |

> **Cross-reference:** Booking reminders (`sendBookingReminders`, every 15 min) and abandoned booking recovery (`abandonedBookingRecovery`, hourly) are canonically defined in SRS-3 §16. These jobs produce communications that are delivered via `deliverCommunication` above.

## 40a. Browser Push Notifications (Phase 1 — Admin CRM Web)

> **Distinct from mobile push (FR-NOT-2, Phase 3):** Browser push uses the Web Push API (service worker + push subscription) on the Next.js Admin CRM web app. It works on desktop and mobile browsers without a native app. Mobile app push (Expo Push Notifications to `device_push_tokens`) ships in Phase 3.

**Registration:** On Admin CRM first login, the browser is prompted for notification permission. On grant, a push subscription (`PushSubscription` object) is stored server-side linked to the `users` record. The subscription endpoint and keys are stored in a new `browser_push_subscriptions` table (id, user_id FK, endpoint, p256dh, auth, tenant_id FK, created_at, last_used_at). Multiple subscriptions per user are supported (different browsers/devices).

**Delivery:** When a BOOKING_CONFIRMED, BOOKING_CANCELLED, BOOKING_WALK_IN, or PAYMENT_RECEIVED event fires for a tenant, `deliverBrowserPush` is enqueued. It sends a Web Push notification to all active browser subscriptions for OWNER and ADMIN members of that tenant. Notification payload: `{ title: "SavSpot", body: "{notification body}", icon: "/icon-192.png", badge: "/badge-72.png", data: { booking_id, action_url } }`. Failed subscriptions (HTTP 410 Gone) are removed.

**Fallback:** If notification permission is denied, no browser push is registered. Real-time updates are delivered on the next page load via SSE (FR-NOT-5, Phase 2) when that feature ships. Phase 1 fallback: polling indicator in the Admin CRM header showing "last updated X minutes ago."

**Rate limiting:** Maximum 5 browser push notifications per user per hour (Redis token bucket) to prevent notification fatigue.

## 41. Background Jobs -- Workflows

| Job | Queue | Schedule | Purpose |
|-----|-------|----------|---------|
| `processWorkflowStages` | workflows | 5 min | Execute stages at trigger_time |
| `sendPaymentReminders` | payments | 15 min | 7/3/1-day payment reminders before deadline (see §24) |
| `enforcePaymentDeadlines` | payments | Daily 6 AM | Auto-cancel past deadline |
| `expireQuotes` | workflows | Hourly | EXPIRED past `valid_until` |
| `expireContracts` | workflows | Hourly | EXPIRED past `expiry_date` |
| `fireWebhooks` | workflows | Event-driven | Deliver webhook payloads |
| `retryFailedWebhooks` | workflows | 10 min | Retry in backoff window |

> **Cross-reference:** Reservation expiry (`expireReservations`, every 5 min), abandoned session cleanup (`abandonedBookingRecovery`, hourly), and booking reminders (`sendBookingReminders`, every 15 min) are canonically defined in SRS-3 §16/§19. See §25 above for the consolidated reference. `fireWebhooks` and `retryFailedWebhooks` above handle **outgoing tenant-configured webhooks** (§23). Payment provider webhook retries are handled by `processWebhookRetries` in SRS-3 §17 on the `payments` queue — distinct from these outgoing webhook jobs.

## 41a. Background Jobs -- GDPR & Data Requests

| Job | Queue | Schedule | Purpose |
|-----|-------|----------|---------|
| `cleanupRetentionPolicy` | gdpr | Daily 03:00 UTC | Process each entity type against retention thresholds defined in §30b. Archive eligible records to Cloudflare R2 with `retention_archived_at` timestamp; hard-delete records past archival retention. Runs after `processCompletedBookings` (SRS-3 §16) to avoid conflicts. |
| `processDataExportRequest` | gdpr | On request | Gather all user data across tables (bookings, payments, invoices, communications, contracts, reviews, notifications), generate JSON archive, upload to R2, set `data_requests.export_url` and `status = COMPLETED`. Auto-expires R2 URL after 7 days. |
| `processTenantDataExport` | gdpr | On request | Gather all tenant-scoped data (services, venues, availability_rules, bookings, invoices, payments, communications, reviews, clients derived from bookings), generate JSON/CSV archive, upload to R2, set `data_requests.export_url` and `status = COMPLETED`. Auto-expires R2 URL after 7 days. Requires `data_requests.tenant_id` to be set and requesting user to have OWNER role. Supports FR-CRM-26. |
| `processAccountDeletion` | gdpr | Daily 5 AM | Process DELETION requests past 30-day grace period (FR-CP-14): cascade-delete or anonymize user data across all tenants, revoke active sessions, delete push tokens, send confirmation email before deletion. Sets `data_requests.status = COMPLETED`. |

> **Queue:** `gdpr` queue with concurrency 2 (data-intensive operations). Export requests are enqueued when `POST /api/users/me/data-export` is called (or `GET` -- which creates the request and enqueues the job). Tenant export requests are enqueued when `POST /api/tenants/:id/data-export` is called (FR-CRM-26). Deletion requests are enqueued at the end of the 30-day grace period by the scheduled `processAccountDeletion` job scanning for eligible `data_requests` rows (`request_type = DELETION`, `status = PENDING`, `requested_at + 30 days <= now()`). Failed jobs are retried up to 3 times before being dead-lettered with admin notification.

## 41b. Background Jobs -- Support Triage

| Job | Queue | Schedule | Purpose |
|-----|-------|----------|---------|
| `triageSupportTicket` | support | Event-driven (PostgreSQL LISTEN/NOTIFY on `support_tickets` INSERT) | Open Claw detects new ticket (`status = 'NEW'`). Pipeline: (1) set `status = 'AI_INVESTIGATING'`; (2) enrich `source_context` with tenant config snapshot, recent Sentry errors matching tenant/user, and relevant booking/payment state; (3) route to Qwen3 (local) for tickets matching known patterns (FAQ matches, configuration guidance, documented workarounds), or escalate to Claude Code for complex diagnostic requiring code-level investigation; (4) AI populates `ai_diagnosis`; (5) determine resolution: auto-respond (`status = 'AI_RESOLVED'`, draft `ai_response`, send email via Resend), or escalate (`status = 'NEEDS_MANUAL_REVIEW'`, notify developer via Slack/email). |
| `supportEscalationAlert` | support | Every 30 min | Scan for `NEEDS_MANUAL_REVIEW` tickets older than 4 hours without developer response. Send Slack/email alert. Re-alert every 4 hours until addressed. |
| `autoCloseSupportTickets` | support | Daily 02:00 UTC | Transition `AI_RESOLVED` tickets to `CLOSED` when `resolved_at + 7 days <= now()` and `user_satisfaction IS NOT NULL OR resolved_at + 7 days <= now()`. |
| `supportQualityDigest` | support | Weekly (Monday 09:00 UTC) | Generate digest: AI resolution count by category, AI resolution rate, sample of auto-responses for quality review, tickets reopened after auto-resolution (indicating AI misdiagnosis), tickets rated unhelpful. Delivered to developer via email. |

> **Queue:** `support` queue with concurrency 1 (AI pipeline has limited concurrent capacity on local hardware). Ticket triage is event-driven via PostgreSQL `LISTEN/NOTIFY` when a new row is inserted into `support_tickets` with `status = 'NEW'`. The AI pipeline reads the ticket, relevant context, and recent platform state to formulate a response. Auto-resolution targets: common onboarding questions (matched against help center articles), payment setup issues (detectable from tenant `payment_provider_onboarded` status), booking configuration guidance (detectable from service config state), and known bugs with existing workarounds. Complex issues involving payment disputes, refund approvals, data integrity, account disputes, or multi-tenant interactions are always escalated to `NEEDS_MANUAL_REVIEW`. CRITICAL severity tickets bypass AI resolution entirely and notify the developer immediately via Slack + SMS. Repeat tickets (same `submitted_by` + same `category` within 7 days) are auto-escalated regardless of AI confidence.
>
> **Prior art:** LifePlace includes a production support ticket system with categorization, status tracking, and assignment. The Savspot implementation extends this with the AI triage pipeline, leveraging the same Open Claw + Qwen3 infrastructure used for development monitoring (SRS-1 §12, §13). Supports FR-SUP-3, FR-SUP-4. Pipeline specification: BRD §8a.

## 42. Edge Cases -- Communications

| Scenario | Handling |
|----------|---------|
| Template rendering failure | Log; skip; alert admin; no partial sends |
| Provider outage (breaker OPEN) | Critical -> alt channel; others queued |
| Duplicate push tokens | Dedup by value; keep most recent |
| Digest timing overlap | Rolls into next batch |
| System notification unsubscribe | `is_system` cannot be disabled; toggle hidden |
| Tenant overrides platform template | Tenant wins; fallback if inactive |
| Cross-timezone quiet hours | User's timezone, not UTC |
| Invalid Expo token | Rejected at registration |
| Bounce handling | Hard -> BOUNCED + flag; soft -> retry x3 |

## 43. Edge Cases -- Contracts & Quotes

| Scenario | Handling |
|----------|---------|
| Accept expired quote | 409; prompt new version |
| Simultaneous signers | Row lock; second retries |
| Quote accepted, payment fails | ACCEPTED; contract created; invoice UNPAID |
| Amendment on unsigned contract | Rejected |
| Void SIGNED contract | Allowed with `void_reason` |
| Quote version conflict | `UNIQUE(booking_id, version)` |
| Multi-device signing | Per-signature fingerprint; latest valid per role |
| Template updated post-send | No effect; frozen at send |
| Concurrent quote acceptance | `SELECT FOR UPDATE`; second gets 409 |

## 44. Edge Cases -- Workflows

| Scenario | Handling |
|----------|---------|
| Template deleted, bookings active | Soft-delete; stage snapshot preserved |
| Automation target missing | Log; skip; notify admin |
| Override circular dep | Validated: cannot ref later stages |
| Webhook failing | Auto-disable after 10 failures; notify admin |
| Payment after auto-cancel | Refund; notify to re-book |
| Duplicate reminders | UNIQUE constraint prevents |
| Rescheduled after reminders set | Delete PENDING; regenerate |
| Concurrent stage advancement | Row lock; second queued |
| Tenant with only default automations | Confirmation email fires on booking; no workflow stages to process |
| Contract template deleted while services reference it | Null out `contract_template_id` on affected services; contract step removed from their booking flows |
| Business upgrades from simple to advanced automation (Phase 3) | Existing default automation rows preserved; new rows added alongside; no migration event. In Phases 1-2, preset automation configuration is locked (only `is_active` toggle is exposed). |

---

## 45. Intelligent Operations (Phase 2)

> **Design principle:** All features in this section are deterministic computations on structured data, not generative AI. They require no LLM inference in production and have zero marginal cost per tenant. They are implemented as BullMQ scheduled jobs following the existing dispatcher pattern (see `specs/bullmq-processor-consolidation.md`). Full strategic rationale in [AI-STRATEGY.md](AI-STRATEGY.md).

### 45.1 Smart Reminder Timing (FR-AI-1)

**Problem:** Fixed-interval reminders (24h before) are suboptimal. Some clients confirm immediately when reminded 2 hours before; others need 48 hours to rearrange their schedule. One-size-fits-all timing leads to unnecessary no-shows.

**Solution:** Compute per-client optimal reminder timing from historical data.

**Data inputs:**
- `communications` table: delivery timestamps and confirmation responses for past reminders
- `bookings` table: no-show vs. attended outcomes correlated with reminder timing
- Minimum data threshold: 5+ prior bookings with reminder history for a client before personalized timing activates

**Algorithm:**
1. For each client with sufficient history, compute the reminder lead time that correlates with the highest attendance rate
2. Bucket into intervals: 2h, 4h, 12h, 24h, 48h (discrete buckets, not continuous)
3. Select the bucket with the highest attendance correlation
4. Store as `client_profiles.optimalReminderLeadHours` (nullable Int)
5. When null or insufficient data, fall back to default (24h)

**Job specification:**

| Field | Value |
|-------|-------|
| Job name | `computeOptimalReminderTiming` |
| Queue | `QUEUE_COMMUNICATIONS` |
| Schedule | Daily 3 AM UTC |
| Scope | All clients with 5+ bookings where reminder was sent |
| Output | Updates `client_profiles.optimalReminderLeadHours` |
| Tenant context | Iterates all active tenants; `tenant_id` in job payload per existing convention |

**Integration point:** The existing reminder scheduling logic (hourly job) checks `clientProfile.optimalReminderLeadHours` when scheduling the next reminder for a booking. If the value exists, it overrides the default interval. If null, default behavior is unchanged.

**New data field:**
- `client_profiles.optimalReminderLeadHours` -- nullable Int, default null. Computed daily. Not user-editable. Tenant-scoped (a client may have different response patterns at different businesses).

### 45.2 No-Show Risk Scoring (FR-AI-2)

**Problem:** Business owners have no advance warning about which appointments are likely to result in no-shows. Proactive confirmation for high-risk bookings can reduce no-show rates.

**Solution:** Compute a no-show risk score for each upcoming booking based on historical patterns.

**Data inputs:**
- Client's historical no-show rate (already computed as `noShowCount` in CRM aggregation)
- Client's total booking count (existing)
- Booking lead time (days between booking creation and appointment date)
- Day of week of the appointment
- First-time vs. returning client flag
- Service type (some services have inherently higher no-show rates)

**Algorithm:**
1. Base risk from client no-show rate: `clientNoShowRate = noShowCount / totalBookings`
2. Adjust for lead time: bookings made >14 days in advance have 1.3x risk multiplier; <24h have 0.7x
3. Adjust for first-time client: 1.5x multiplier (industry data: first-time clients no-show at higher rates)
4. Compute composite score: weighted combination normalized to 0.0-1.0
5. Map to display tier: LOW (0-0.3), MEDIUM (0.3-0.6), HIGH (0.6-1.0)

**Job specification:**

| Field | Value |
|-------|-------|
| Job name | `computeNoShowRiskScores` |
| Queue | `QUEUE_BOOKINGS` |
| Schedule | Daily 4 AM UTC |
| Scope | All CONFIRMED bookings in next 7 days |
| Output | Updates `bookings.noShowRiskScore` (Float, 0.0-1.0) |

**Frontend integration:** Calendar events (FR-CRM-2) and appointment list (FR-CRM-27) read `booking.noShowRiskScore` and render:
- LOW (0-0.3): no indicator (default state)
- MEDIUM (0.3-0.6): amber dot
- HIGH (0.6-1.0): red dot

No tooltip or explanation text referencing "AI" or "prediction." The indicator is presented the same way a "first-time client" badge would be -- a factual visual cue.

**New data field:**
- `bookings.noShowRiskScore` -- nullable Float, default null. Computed daily for upcoming bookings. Not user-editable. Null for historical bookings (not backfilled).

### 45.3 Rebooking Interval Detection (FR-AI-3)

**Problem:** The rebooking prompt (FR-BFW-19) sends at a fixed delay after appointment completion. Clients have individual rebooking cadences -- a haircut client rebooks every 3 weeks, a massage client every 6 weeks. Fixed timing misses the optimal window.

**Solution:** Compute per-client-service rebooking interval from booking history.

**Data inputs:**
- `bookings` table: all COMPLETED bookings for a given client-service pair, ordered by appointment date
- Minimum data threshold: 3+ completed bookings of the same service by the same client

**Algorithm:**
1. For each client-service pair with 3+ completed bookings, compute intervals between consecutive appointments
2. Take the median interval (days) -- median is robust to outliers (e.g., a vacation gap)
3. Store as `client_profiles.reBookingIntervalDays` -- this is the client's dominant interval across their most-booked service at this tenant
4. For multi-service clients, compute per-service intervals and store the primary (most-booked) service interval on the client profile. Per-service intervals stored in a `client_rebooking_intervals` join or JSONB if granularity is needed in Phase 3.

**Job specification:**

| Field | Value |
|-------|-------|
| Job name | `computeRebookingIntervals` |
| Queue | `QUEUE_BOOKINGS` |
| Schedule | Daily 3 AM UTC (can share with reminder timing job) |
| Scope | All clients with 3+ COMPLETED bookings |
| Output | Updates `client_profiles.reBookingIntervalDays` |

**Integration point:** The follow-up email/SMS (FR-COM-4) that includes the rebooking prompt (FR-BFW-19) is currently sent at a fixed delay (24h after completion). When `clientProfile.reBookingIntervalDays` is populated, the rebooking prompt is instead scheduled for `completionDate + reBookingIntervalDays - 3 days` (3-day lead time to allow scheduling). If the computed send date is in the past (interval shorter than 3 days), send immediately. If null, fall back to default 24h.

**New data field:**
- `client_profiles.reBookingIntervalDays` -- nullable Int, default null. Computed daily. Not user-editable. Tenant-scoped (a client's rebooking cadence at a barber differs from their cadence at a spa).

### 45.4 Slot Demand Analysis (FR-AI-4)

**Problem:** Business owners set availability rules once and rarely revisit them. Some slots sit consistently empty while others fill immediately. Without data, owners can't make informed scheduling decisions.

**Solution:** Weekly analysis of booking patterns that surfaces actionable insights as dashboard cards.

**Data inputs:**
- `bookings` table: booking timestamps (day of week, hour) for the last 90 days
- `availability_rules` table: which slots are currently offered
- Minimum data threshold: 30+ bookings in analysis window

**Algorithm:**
1. For each offered time slot (day-of-week + hour block), compute:
   - Fill rate: bookings / weeks offered (0.0-1.0)
   - Average days-to-fill: how far in advance the slot is typically booked
   - Cancellation rate for that slot
2. Flag slots with:
   - Fill rate < 0.2 for 6+ consecutive weeks → "Consistently empty" card
   - Fill rate > 0.9 AND average days-to-fill < 2 → "High demand, fills fast" card
   - Cancellation rate > 0.3 → "High cancellation" card
3. Generate max 3 cards per tenant per week (avoid noise)
4. Cards include the data ("Tuesday 3-5pm: 12% filled over 6 weeks") and a suggested action ("Consider blocking this slot or running a promotion")

**Job specification:**

| Field | Value |
|-------|-------|
| Job name | `computeSlotDemandAnalysis` |
| Queue | `QUEUE_BOOKINGS` |
| Schedule | Weekly, Sunday 2 AM UTC |
| Scope | All tenants with 30+ bookings in last 90 days |
| Output | Writes to `slot_demand_insights` table (see SRS-2 §13b) |

**Frontend integration:** Dashboard (FR-CRM-1) reads slot demand insights and renders as dismissible cards in a "Schedule Insights" section. Cards are shown below the existing metrics (today's bookings, revenue, new clients). Dismissed cards are recorded (user ID + insight hash) and not shown again for the same data pattern.

**New data storage:**
- `slot_demand_insights` table (SRS-2 §13b) -- stores computed insights with `is_dismissed` tracking. Max 3 active per tenant, 7-day expiry.

### 45.5 Cross-Tenant Benchmarking Pipeline (FR-AI-5)

**Problem:** Individual businesses operate in isolation with no visibility into how they compare against peers. A barber with a 20% no-show rate doesn't know if that's normal or terrible for their category.

**Solution:** Aggregate anonymized metrics across tenants by business category. Phase 2 builds the data collection pipeline; Phase 3 activates user-facing comparisons when sufficient data exists.

**Pipeline specification:**

| Field | Value |
|-------|-------|
| Job name | `computeCategoryBenchmarks` |
| Queue | `QUEUE_GDPR` (reuse -- low-frequency analytics jobs) |
| Schedule | Daily 5 AM UTC |
| Scope | All active tenants grouped by `tenants.category` |
| Output | Refreshes `category_benchmarks` table |

**Metrics aggregated:**

| Metric | Computation | Display Format |
|--------|------------|----------------|
| No-show rate | Median of per-tenant no-show rates | "Your no-show rate: 18%. Category median: 12%." |
| Slot utilization | Median of (booked slots / offered slots) per tenant | "Your utilization: 65%. Category median: 72%." |
| Rebooking rate | Median of (returning clients / total unique clients) per tenant | "Returning client rate: 45%. Category median: 58%." |
| Average booking value | Median of per-tenant average booking value | "Your avg booking: $42. Category median: $38." |

**Privacy controls (see also BR-RULE-9):**
1. Minimum 4 tenants per category before any benchmarks are computed
2. Use median (not mean) to prevent outlier inference
3. No tenant identifiers in the `category_benchmarks` table
4. Tenants with `benchmarkOptOut = true` excluded from both contributing data and viewing benchmarks
5. Terms of Service clause required before activation (Phase 3)

**`category_benchmarks` table:** See SRS-2 §13b for canonical schema. Key columns: `business_category`, `metric_key`, `p25`/`p50`/`p75` (percentile distribution), `sample_size` (must be ≥4), `computed_at`.

**Phase 3 activation:** When `tenantCount >= 50` for a category, the dashboard (FR-CRM-1) renders benchmark comparison cards. Cards show the tenant's own metric alongside the category median, with directional indicator (above/below/at median). No ranking or percentile -- just "you vs. median" to avoid competitive anxiety.

### 45.6 Smart Morning Summary (FR-AI-6)

**Problem:** The existing morning summary (FR-COM-10) is a flat list of the day's bookings. It doesn't highlight what the business owner should pay attention to.

**Solution:** Enrich the existing morning summary payload with contextual intelligence derived from data already computed by other jobs (no-show risk, first-time client flags, schedule gaps).

**Enrichment fields added to the morning summary template:**

| Field | Source | Example |
|-------|--------|---------|
| High-risk appointments | `bookings.noShowRiskScore > 0.6` | "Heads up: your 2pm has a history of cancellations" |
| First-time clients | `bookings` joined with client booking count = 1 | "First visit: Sarah M. at 11am" |
| Schedule gaps | Comparison of booked vs. available slots | "Gap: 1-3pm is open" |
| Yesterday's no-shows | `bookings` with status NO_SHOW from prior day | "Yesterday: 1 no-show (James D. at 4pm)" |

**Implementation:** This is not a new BullMQ job. The existing `morningDigest` handler in `CommunicationsDispatcher` is enhanced to query additional data when building the summary payload. The SMS/email template adds conditional sections that render only when enrichment data exists. Tenants with insufficient data (no risk scores computed, no prior bookings) receive the standard flat list -- no degraded experience.

---

*End of SRS Part 4 of 4. Cross-references: SRS-1 (Architecture & Infrastructure, including Progressive Complexity in Section 8), SRS-2 (Data Model & API Reference), SRS-3 (Booking, Payments & Availability Logic), [AI-STRATEGY.md](AI-STRATEGY.md) (AI Strategy & Competitive Intelligence).*