# SavSpot Phase 2 — Implementation Plan

**Version:** 2.1
**Date:** 2026-03-10
**Status:** Approved
**Changelog:**
- v2.1 — Second gap verification pass: fixed contracts tier-gating to align with BR-RULE-8 (basic contracts on Free tier), clarified benchmark UI as Phase 3, added FR-CRM-29 guided preference templates, expanded platform admin dashboard with FR-FBK-3 feedback queue and FR-SUP-4 support dashboard, documented BRD pricing model departures, added SMS→booking dependency.
- v2.0 — Gap analysis pass: aligned all algorithms/thresholds with SRS-4 §45, added quotes system, expanded contracts to multi-party, fixed data model to match schema reality, added API endpoints, testing strategy, deployment plan, and 12 previously missing features.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Resolved Decisions](#2-resolved-decisions)
3. [Scope Deferrals](#3-scope-deferrals)
4. [Workstream 1: Subscription Billing Infrastructure](#4-workstream-1-subscription-billing-infrastructure)
5. [Workstream 2: Communications & Notifications Enhancement](#5-workstream-2-communications--notifications-enhancement)
6. [Workstream 3: Advanced Booking Features](#6-workstream-3-advanced-booking-features)
7. [Workstream 4: Contracts & Quotes](#7-workstream-4-contracts--quotes)
8. [Workstream 5: Authentication & Security Hardening](#8-workstream-5-authentication--security-hardening)
9. [Workstream 6: Embeddable Widget](#9-workstream-6-embeddable-widget)
10. [Workstream 7: Intelligent Operations AI](#10-workstream-7-intelligent-operations-ai)
11. [Workstream 8: Remaining Items](#11-workstream-8-remaining-items)
12. [Dependency Graph & Execution Order](#12-dependency-graph--execution-order)
13. [Data Model Changes](#13-data-model-changes)
14. [API Endpoints](#14-api-endpoints)
15. [Testing Strategy](#15-testing-strategy)
16. [Deployment & Rollout](#16-deployment--rollout)
17. [Risk Register](#17-risk-register)

---

## 1. Executive Summary

Phase 2 builds on the production-ready Phase 1 platform (87 Prisma models, 39 NestJS modules, 920 tests, live at savspot.co) to add subscription billing, advanced communications, booking flow enhancements, contracts & quotes, an embeddable widget, and invisible AI operations.

**Scope:** ~130 requirements across 8 workstreams (mobile app deferred to Phase 3).

**Key decisions made:**
- 2-tier pricing (Free / Pro $10) with AI free on all tiers
- SMS migration from Twilio to Plivo (~$36K/year savings at scale)
- Digital signatures built in-house with `signature_pad` (no third-party API)
- Embed widget uses iframe + lightweight JS SDK (same as Calendly/Acuity)
- AI Operations use pure SQL + TypeScript heuristics (no LLMs, no Python)

---

## 2. Resolved Decisions

### 2.1 Subscription Tiers — 2 Tiers (Free + Pro)

Simplified to 2 tiers. A single Pro tier at $10/mo unlocks all features, maximizing conversion with zero decision paralysis. The 1% processing fee on all transactions provides baseline revenue from day one.

**Note:** Tier names use the Prisma `SubscriptionTier` enum values: `FREE`, `PRO`. Enum migration from the previous `FREE`/`PREMIUM`/`ENTERPRISE` values is required.

| | **Free** | **Pro** ($10/mo) |
|---|---|---|
| **Target** | Solo practitioner testing | Any business ready to grow |
| **Staff** | 1 | Unlimited |
| **Bookings** | 100/mo | Unlimited |
| **Core booking + calendar** | Yes | Yes |
| **Client management** | Basic | Full (history, notes, tags, custom fields) |
| **Email notifications** | Yes | Yes + customizable templates |
| **SMS notifications** | No | 500/mo included |
| **AI Smart Reminders** | Yes | Yes |
| **AI No-show Risk** | Yes | Yes |
| **AI Rebooking Optimization** | Yes | Yes |
| **Online payments** | Stripe (3.9%+30c) | Stripe (3.9%+30c) |
| **Embeddable widget** | Redirect only | Branded popup/inline |
| **Analytics** | Basic | Advanced |
| **Team management** | No | Full RBAC + granular permissions |
| **Multi-location** | No | Yes |
| **Contracts & quotes** | Basic (single-signer) | Full (multi-party) |
| **AI Voice Receptionist** | No | Add-on ($49/mo) |
| **Priority support** | No | Yes |

**BR-RULE-8 compliance (progressive complexity):** Contracts & quotes follow "data presence is configuration" — basic single-signer contracts are available on Free tier, activated by creating a contract template. Multi-party signing (6 signer roles) is the Pro-gated enhancement. Team management similarly follows BR-RULE-8: adding staff activates team features; RBAC granularity is the Pro-gated enhancement.

**Payment processing:** All tiers pay 3.9% + 30c per transaction (2.9% Stripe fee + 1.0% SavSpot platform fee per BRD BR-RULE-3). The 1% platform fee applies to all transactions on all tiers.

**Annual billing:** 20% discount ($8/mo, billed annually at $96/yr).

**BRD alignment notes:** The BRD now reflects 2-tier pricing (Free/$10 Pro) per this plan. The following tier-specific limits are plan additions that supplement the BRD tier table:
- Free tier: 100 bookings/month cap, 1 staff limit, "Basic" client management (history visible, notes/tags gated to Pro)
- Pro: Unlimited staff, 500 SMS/month allocation, all features unlocked
- Annual billing: 20% discount (not in BRD or PRD)

**Phase 3+ features NOT in Phase 2 tier table:**
- Custom domain booking page (FR-BP-8, Phase 4)
- Accounting integrations / QuickBooks / Xero (FR-ACCT-*, Phase 3)
- API access for custom integrations (Phase 3)
- Workflow automation CRUD (FR-CRM-16, Phase 3 — Phase 1-2 uses preset automations with `is_active` toggle only per SRS-2 §9)

**Rationale:**
- $10/mo aggressively undercuts Acuity ($16-49), Vagaro ($30), Booksy ($29.99), and Mindbody ($99-700)
- 2-tier simplicity eliminates decision paralysis and reduces support burden
- All features at Pro means no upsell friction once a business converts
- 1% processing fee on all transactions ensures revenue from day one regardless of subscription status
- Invisible AI free on all tiers creates a competitive moat and data flywheel
- AI Voice Receptionist as usage-priced add-on ($49/mo for 200 calls) has real compute costs justifying separate pricing

### 2.2 AI Operations — SQL + TypeScript Heuristics, No LLMs

All AI Operations features are tabular data problems where simple statistics outperform LLMs in accuracy, speed, cost, and determinism. Algorithms align with SRS-4 §45 specifications.

| Feature | Approach | Rationale |
|---|---|---|
| Smart Reminder Timing | Attendance-correlated lead time buckets (SRS-4 §45.1) | <10 features, overfits with ML |
| No-Show Risk | Multiplicative scoring formula (SRS-4 §45.2) | Logistic regression beats LLMs on tabular data |
| Rebooking Interval | SQL window functions (median interval) | Robust to outliers per spec |
| Slot Demand Analysis | SQL aggregation with insight cards (SRS-4 §45.4) | Descriptive analytics |
| Cross-Tenant Benchmarking | SQL aggregation (privileged, no RLS) | Pure reporting |
| Morning Summary | Template-based (optional Ollama polish later) | Templates get 90% there |

Architecture: BullMQ cron jobs pre-compute all results. Zero external dependencies. If morning summary prose quality matters later, use local Ollama (qwen2.5-coder:7b) at zero marginal cost.

### 2.3 SMS Provider — Migrate from Twilio to Plivo

| Metric | Twilio (current) | Plivo (recommended) |
|---|---|---|
| Effective cost/SMS (US) | ~$0.011 | ~$0.005 |
| 500K msgs/month cost | $5,500 | $2,500 |
| Annual savings | — | ~$36,000 |
| Inbound SMS | $0.0075/msg | Free |
| 10DLC registration | Full | Full (auto, <24h) |
| International coverage | 180+ countries | 220+ countries |
| Node.js SDK | Excellent | Good |

**Migration strategy:**
1. Create `SmsProvider` interface abstraction
2. Implement `PlivoSmsProvider` alongside existing Twilio
3. Feature-flag switch (environment variable `SMS_PROVIDER=plivo|twilio`)
4. 48-72h canary period running both
5. Full cutover after delivery rate validation
6. Estimated effort: 2-3 days

### 2.4 Digital Signatures — Built In-House with Canvas Capture

Every competitor (Vagaro, Fresha, Mindbody) builds signature capture in-house. Third-party APIs (DocuSign, BoldSign) cost $0.75-2.00/signature — at 10K sigs/month that's $90K+/year.

Canvas-based signatures are legally sufficient under ESIGN Act (US) and eIDAS SES (EU) for service waivers and agreements. Legal validity depends on the audit trail, not the signature image.

**Implementation:**
- Library: `signature_pad` (npm, 10K+ GitHub stars)
- Storage: SVG data URI + signed document as PDF in Cloudflare R2
- Signature types: DRAWN (canvas), TYPED (typed name), UPLOADED (image upload)
- Audit trail per SRS-2 §8 and SRS-4 §15: document SHA-256 hash, signer IP, user agent, device fingerprint (JSONB: screen resolution, timezone, platform), UTC timestamp, `electronic_consent_at`, `legal_disclosure_accepted`, `signature_confidence`, template version
- Multi-party support with 6 signer roles: CLIENT, WITNESS, COMPANY_REP, GUARDIAN, PARTNER, OTHER (SRS-4 §13)

**Reconsider third-party only if** Qualified Electronic Signatures (QES) are needed for EU regulatory compliance in future phases.

### 2.5 Embed Widget — Iframe + Lightweight JS SDK

Same architecture as Calendly, Acuity, SimplyBook.me, and Cal.com. Iframe wins over Web Components because:
- Stripe Payment Element has known issues inside Shadow DOM
- Complete style/security isolation from host page
- PCI DSS 4.0 compliant (payment context is controlled origin)
- No code duplication — embed route reuses same Next.js booking flow

**Components:**
- Loader SDK (`packages/embed-widget/`): Vanilla TS, ~5 KB gzipped, handles modes + iframe + postMessage
- Embed Route (`apps/web/src/app/embed/book/[slug]/`): Same booking flow, minimal chrome

---

## 3. Scope Deferrals

The following PRD Phase 2 requirements are **explicitly deferred to Phase 3** based on scope prioritization. The PRD Phase Matrix should be amended to reflect these changes.

### 3.1 Mobile App — Deferred to Phase 3

| Requirement | Priority | Reason for Deferral |
|---|---|---|
| FR-MOB-1: Business booking page viewing | Must | Entire mobile app deferred |
| FR-MOB-2: Booking flow wizard | Must | Entire mobile app deferred |
| FR-MOB-3: Client portal on mobile | Must | Entire mobile app deferred |
| FR-MOB-4a/4b: Push notifications with per-channel config | Must | Depends on mobile app |
| FR-MOB-5: Biometric auth (Face ID / Fingerprint) | Must | Depends on mobile app |
| FR-MOB-6: Secure token storage (Keychain/Keystore) | Must | Depends on mobile app |
| FR-MOB-7: Offline mode | Should | Depends on mobile app |
| FR-MOB-8/9: Deep linking | Must | Depends on mobile app |
| FR-MOB-10: Review submission with photos | Should | Depends on mobile app |
| FR-AUTH-9: Biometric auth | Must | Depends on mobile app |
| FR-NOT-2: Mobile push notifications | Must | Depends on mobile app |

**Also deferred with mobile:**
- EAS Build CI/CD pipeline (SRS-1 §4)
- `deploy-mobile.yml` GitHub Actions workflow (SRS-1 §6)
- Maestro E2E tests (SRS-1 §11)
- `cleanupInactivePushTokens` BullMQ job (SRS-4 §40)
- Mobile secure token storage (SRS-4 §26)
- `DevicePushToken` registration endpoints
- `review_photos` table (FR-MOB-10 — web review submission uses existing upload flow without dedicated photo table)

**Browser-based push notifications** (VAPID, already implemented in Phase 1) and **SSE real-time delivery** remain in Phase 2 scope.

### 3.2 Other Phase 3+ Deferrals

| Requirement | Phase | Reason |
|---|---|---|
| FR-BP-8: Custom domain booking page | Phase 4 | Infrastructure complexity |
| FR-ACCT-1–9: Accounting integrations | Phase 3 | Third-party API work |
| FR-CRM-16: Workflow automation CRUD | Phase 3 | Phase 1-2 uses preset automations only |
| FR-AI-8: MCP server / headless API | Phase 3 | Depends on stable API surface |
| Per-booking workflow overrides (SRS-4 §22) | Phase 3 | Depends on workflow CRUD |

---

## 4. Workstream 1: Subscription Billing Infrastructure

**Priority: MUST | Dependencies: None (foundational) | Complexity: High**

This is the revenue engine — gates all premium features in later workstreams.

### 4.1 Stripe Billing Integration (FR-PAY-17)

- Create `subscriptions` module (`apps/api/src/subscriptions/`)
- Integrate Stripe Billing API: Products, Prices, Subscriptions
- Map subscription tiers (`FREE`, `PRO`) to Stripe Products
- Handle plan creation, upgrade/downgrade with proration
- Automated recurring invoicing via Stripe
- Store `subscription_provider_id` on Tenant (column exists, currently manual)
- Add subscription state fields to Tenant: `subscriptionStatus` (enum: ACTIVE, PAST_DUE, CANCELED, TRIALING), `subscriptionCurrentPeriodEnd`, `subscriptionGracePeriodEnd`
- Stripe Billing uses SavSpot's **direct Stripe account** (separate from tenant Connect accounts used for booking payments)

### 4.2 Feature Entitlement Middleware (FR-PAY-18)

- Create `FeatureEntitlementGuard` in `common/guards/`
- Decorator: `@RequiresFeature('embed_widget')` or `@RequiresTier('PRO')`
- Check `tenant.subscription_tier` + feature add-on subscriptions
- Return 403 with clear error when feature not entitled
- Cache entitlements in Redis with 5-minute TTL (invalidate immediately on subscription change webhook)
- Feature flag mapping: tier → feature set (stored in code, not DB)

### 4.3 Subscription Lifecycle Webhooks (FR-PAY-19)

- Handle Stripe webhook events:
  - `invoice.payment_failed` — begin grace period (3 days per PRD FR-PAY-19)
  - `customer.subscription.deleted` — deactivate premium features
  - `customer.subscription.updated` — tier change, handle up/downgrade
  - `invoice.paid` — reactivate if previously past_due, clear grace period
- Grace period: **3 days** after payment failure before feature lockout (per PRD)
- Involuntary churn: downgrade to FREE tier after grace period, preserve all data
- Reactivation: restore previous tier features on successful payment
- Idempotent webhook processing using existing `PaymentWebhookLog` pattern

### 4.4 Self-Service Subscription Management UI (FR-PAY-20)

- Admin CRM page: `/settings/subscription`
- Plan comparison/selection with feature matrix
- Feature marketplace (add-on purchases, e.g., AI Voice Receptionist)
- Billing history table (pull from Stripe API)
- Payment method management (Stripe Customer Portal or custom)
- Cancellation flow with retention offer
- Usage meters (SMS count, staff count vs tier limit)

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/subscriptions/plans` | List available plans and pricing |
| GET | `/api/subscriptions/current` | Current subscription details + usage |
| POST | `/api/subscriptions/checkout` | Create Stripe Checkout Session for upgrade |
| POST | `/api/subscriptions/portal` | Create Stripe Customer Portal session |
| POST | `/api/subscriptions/webhook` | Stripe Billing webhook handler |
| GET | `/api/subscriptions/entitlements` | Current tier's feature entitlements |

### Files to Create/Modify

| Action | Path | Description |
|--------|------|-------------|
| Create | `apps/api/src/subscriptions/` | Module: controller, service, DTOs, webhook handler |
| Create | `apps/api/src/common/guards/feature-entitlement.guard.ts` | Entitlement guard |
| Create | `apps/api/src/common/decorators/requires-feature.decorator.ts` | Feature decorator |
| Create | `apps/web/src/app/(dashboard)/settings/subscription/` | Subscription management page |
| Modify | `packages/shared/src/enums/` | Subscription status enum, feature entitlement constants |
| Modify | `prisma/schema.prisma` | Subscription state fields on Tenant, SubscriptionStatus enum |

---

## 5. Workstream 2: Communications & Notifications Enhancement

**Priority: MUST | Dependencies: WS8.1 (SMS Migration) should complete first | Complexity: High**

Upgrades Phase 1's hardcoded emails to a full template engine and adds in-app notifications with real-time delivery.

### 5.1 Email Template Engine (FR-COM-1b, FR-COM-3, FR-COM-5)

- DB-stored templates with variable substitution (`{{client_name}}`, `{{booking_date}}`, etc.)
- `CommunicationTemplate` model already exists — build CRUD + rendering engine
- Keep React Email as underlying renderer, populate from DB templates
- **Template security sandbox (SRS-4 §1):**
  - Blocked constructs: `load`, `include`, `extends`, `ssi`, `debug` tags; `make_list`, `pprint` filters; dunder patterns (`__`); `import`/`exec`/`eval`/`require`
  - Max body size: 100 KB
  - Max context nesting: 10 levels
  - Validation at both save time AND render time
  - **Rendering failure handling:** Log error, skip delivery, alert tenant admin. Partial messages are NEVER sent.
- **Context variable system (SRS-4 §2):** 80+ variables across 13 groups (business, booking, client, service, payment, invoice, calendar, provider, portal, review, contract, quote, system)
- **Layout composition (SRS-4 §3):** Wrapper wraps Header + Body + Footer. Business branding applied via wrapper (logo, colors, footer)
- **Template versioning (SRS-4 §4):** Uses existing `TemplateHistory` model — store version snapshots with `changed_by`, `change_reason`. Rollback to any previous version.
- Template editor UI in Admin CRM (`/settings/communications/templates`)

### 5.2 SMS Template System (FR-COM-2b)

- Extend SMS module with DB-stored templates
- Booking confirmation, 24h reminder, 2h reminder via SMS
- SMS template management UI alongside email templates
- Character count / segment estimation in editor
- SMS opt-in tracking per client

### 5.3 Notification Type Registry (SRS-4 §7)

Foundation for notification preferences and digest batching:
- Registry of notification types with fields: `key` (e.g., `booking.confirmed`), `category` (SYSTEM, BOOKING, PAYMENT, CONTRACT, COMMUNICATION, MARKETING, REVIEW, CALENDAR), `default_channels` (JSON array), `priority` (LOW, NORMAL, HIGH, CRITICAL), `auto_expire_hours`, `is_system`
- System notifications (e.g., payment failure alerts) bypass user preferences
- Notification dispatch respects registry defaults + user overrides
- `NotificationType` model already exists in schema — populate with registry data via seed/migration

### 5.4 In-App Notification Center (FR-NOT-1, FR-CRM-13)

- `Notification` model exists — build real-time delivery
- Bell icon + dropdown in Admin CRM header
- Mark as read/unread, bulk actions
- Notification list page: `/notifications` with filtering by type/category/status
- Unread count badge in navigation

### 5.5 Real-Time Delivery via SSE (FR-NOT-5)

- SSE endpoint: `GET /api/notifications/stream`
- NestJS SSE controller using `@Sse()` decorator
- Tenant-scoped event streams via Redis pub/sub
- Reconnection handling on client (EventSource API)
- Heartbeat every 30s to keep connection alive
- Connection limit: 5 per user (to prevent resource exhaustion)

### 5.6 Notification Preferences per Channel (FR-NOT-4, FR-CP-8)

- `NotificationPreference` model exists — build UI
- Per-notification-type toggles: in-app, email, push (browser), SMS
- JSON schema for `preferences` field: `{ "booking.confirmed": { "email": true, "sms": true, "in_app": true, "push": false } }`
- Both Admin CRM and Client Portal settings pages
- Respect preferences in all notification dispatch paths
- Default preferences from notification type registry (§5.3)

### 5.7 Email Notification Digest (FR-NOT-3)

- `NotificationDigest` model exists — build digest aggregation
- Four frequencies per SRS-4 §9: **IMMEDIATE** (default), **HOURLY**, **DAILY**, **WEEKLY** (PRD FR-NOT-3 lists 3; HOURLY added per SRS-4 §9 spec)
- BullMQ cron jobs for hourly/daily/weekly digest compilation and send
- Digest email template with grouped notifications by category
- Mid-compilation arrivals roll into next batch
- Respect per-user digest frequency preference

### 5.8 Delivery Tracking (FR-COM-6)

- **7 delivery statuses per SRS-4 §6:** QUEUED, SENDING, SENT, DELIVERED, OPENED, BOUNCED, FAILED
- Provider status polling every 5 minutes via BullMQ recurring job (`trackDeliveryStatus`)
- **Bounce handling:**
  - Hard bounce: flag email address for re-verification, disable future sends until re-verified
  - Soft bounce: retry up to 3 times with exponential backoff
- **Failed delivery retry:** Up to 3 attempts, respecting circuit breaker state
- Communication log UI in Admin CRM: `/communications/log`
- Post-appointment review request via both email AND SMS in Phase 2 (FR-COM-4)

### 5.9 Communications Circuit Breaker (SRS-4 §5)

- Three-state circuit breaker per provider (Resend email, Plivo SMS) stored in Redis
- States: CLOSED (normal) → OPEN (after 5 consecutive failures) → HALF_OPEN (after 60s recovery timeout)
- When OPEN: critical comms fall back to alternate channel; non-critical queued with exponential backoff
- `retryFailedDeliveries` BullMQ job processes queued items when circuit closes

### 5.10 Quiet Hours (SRS-4 §11)

- SMS suppressed during quiet hours — queued until quiet hours end
- Push notifications delivered silently (no sound/vibration)
- Email and in-app notifications unaffected
- Evaluated in user's IANA timezone using `quiet_hours_start` / `quiet_hours_end` from notification preferences
- All SMS dispatch paths check quiet hours before sending (SRS-4 §40)

### 5.11 Unsubscribe Management & Preference Center (FR-COM-8)

- Public preference center page: `/preferences/:token`
- One-click unsubscribe (List-Unsubscribe header in all non-transactional emails)
- Per-category opt-out (marketing, reminders, follow-ups)
- CAN-SPAM / GDPR compliant
- Token-based authentication (no login required)

### 5.12 In-App Messaging (FR-COM-7, FR-CP-7)

- `MessageThread`, `Message`, `MessageReadStatus`, `MessageAttachment` models exist
- Business-to-client messaging in Admin CRM (`/messages`) and Client Portal (`/portal/messages`)
- Unread count badges in both navigation contexts
- File attachment support via existing upload service
- Thread list + conversation view

### 5.13 Manual Compose from Admin CRM (FR-COM-9, FR-CRM-8)

- Communication center page: `/communications`
- Compose email/SMS to individual client or segment
- Template selection + customization before send
- Send history with delivery status
- Scheduled send option

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET/POST/PUT/DELETE | `/api/communication-templates` | Template CRUD |
| GET | `/api/communication-templates/:id/history` | Template version history |
| POST | `/api/communication-templates/:id/rollback/:version` | Rollback to version |
| GET | `/api/communication-templates/variables` | Available template variables |
| GET | `/api/notifications` | List notifications (paginated) |
| GET | `/api/notifications/stream` | SSE real-time stream |
| PATCH | `/api/notifications/:id/read` | Mark as read |
| POST | `/api/notifications/read-all` | Mark all as read |
| GET/PUT | `/api/notification-preferences` | Get/update preferences |
| GET/PUT | `/api/notification-preferences/digest` | Get/update digest frequency |
| GET | `/api/communications/log` | Delivery tracking log |
| GET/POST | `/api/preferences/:token` | Public preference center |
| GET/POST | `/api/messages/threads` | List/create message threads |
| GET | `/api/messages/threads/:id` | Get thread with messages |
| POST | `/api/messages/threads/:id/messages` | Send message in thread |
| PATCH | `/api/messages/threads/:id/read` | Mark thread as read |
| POST | `/api/communications/compose` | Send email/SMS from Admin CRM |

### Files to Create/Modify

| Action | Path | Description |
|--------|------|-------------|
| Modify | `apps/api/src/communications/` | Template engine, delivery tracking, circuit breaker, compose |
| Modify | `apps/api/src/notifications/` | SSE endpoint, digest logic, type registry |
| Create | `apps/api/src/messaging/` | Messaging module |
| Create | `apps/web/src/app/(dashboard)/settings/communications/` | Template editor UI |
| Create | `apps/web/src/app/(dashboard)/communications/` | Communication center + log |
| Create | `apps/web/src/app/(dashboard)/messages/` | Admin CRM messaging |
| Create | `apps/web/src/app/(dashboard)/notifications/` | Notification list page |
| Modify | `apps/web/src/components/notifications/` | Notification center dropdown |
| Create | `apps/web/src/app/(portal)/portal/messages/` | Client messaging UI |
| Create | `apps/web/src/app/(public)/preferences/[token]/` | Unsubscribe/preference center |

---

## 6. Workstream 3: Advanced Booking Features

**Priority: MUST/SHOULD mix | Dependencies: WS1 (add-on pricing) | Complexity: Medium-High**

### 6.1 Questionnaire Step (FR-BFW-5) — MUST

- Dynamic form fields defined per-service in `services.intake_form_config` JSONB (per SRS-2 §4; step ordering controlled by `booking_flows.step_overrides`)
- Field types: text, textarea, select, multi-select, date, file upload
- Questionnaire responses stored on BookingSession
- Render step in public booking flow + Admin CRM booking detail + embed widget
- Conditional field visibility (show field B if field A = X)

### 6.2 Add-On/Package Selection Step (FR-BFW-6) — SHOULD

- `ServiceAddon` model exists — build CRUD API + UI
- Add `is_required` Boolean field to `ServiceAddon` (migration needed — **spec amendment**: not in SRS-2 §4 `service_addons` table; needed for required vs. optional add-on UX)
- Add-on management in service settings
- Add-on selection step in booking flow with pricing display
- Add-on totals included in booking price calculation
- Invoice line items for each add-on

### 6.3 Booking Flow Builder UI (FR-ONB-11) — SHOULD

- Drag-and-drop step configuration page in Admin CRM
- Visual preview of booking flow
- Enable/disable/reorder steps per service
- Currently steps auto-resolve from service config — builder provides manual override
- Step-level configuration (required/optional, custom labels)

### 6.4 Check-In/Check-Out Management (FR-CRM-23) — SHOULD

**Note:** Check-in fields (`checked_in_at`, `checked_out_at`, `check_in_status`, `checked_in_by`, `checked_out_by`) and `CheckInStatus` enum (PENDING, CHECKED_IN, CHECKED_OUT, NO_SHOW) already exist in the Prisma schema. No migration needed for these fields.

- Staff-initiated check-in from booking detail or calendar day view
- Check-in state machine: PENDING → CHECKED_IN → CHECKED_OUT
- PENDING → NO_SHOW (via automated detection or manual staff action)
- **No-show auto-detection:** Update existing `processCompletedBookings` job Phase A — CONFIRMED bookings past `end_time + no_show_grace_minutes` where `check_in_status = 'PENDING'` are auto-marked NO_SHOW (SRS-3 §16)
- **Excess-hour fee calculation on checkout (HOURLY services):** `excess_hours * excess_hour_price`
- **Post-checkout invoice amendment (SRS-3 §10):** Create new invoice line item for excess hours → update invoice totals → create new Stripe PaymentIntent → send amended invoice notification
- Partial-use refund for IN_PROGRESS → CANCELLED (time-consumed-based for HOURLY services)
- Staff attribution: `checked_in_by` and `checked_out_by` FK fields track which staff member performed each action

### 6.5 Provider-Service Assignment UI (FR-CRM-30) — SHOULD

- `ServiceProvider` join table exists — build management UI
- Assign/unassign providers to services
- Provider availability affects slot calculation
- Provider selection step in booking flow (if multiple providers for a service)
- Provider schedule display in calendar view

### 6.6 Client Portal Review Submission (FR-CP-11) — SHOULD

- Client portal page: `/portal/reviews/new`
- Post-appointment review flow: star rating + text
- Link from booking detail page after COMPLETED status
- Uses existing review API
- Automated review request sent 2h after booking completion via email AND SMS (FR-COM-4) — integrate with existing `processPostAppointmentTriggers` job

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET/POST/PATCH/DELETE | `/api/services/:id/addons` | Service add-on CRUD |
| GET/PUT | `/api/services/:id/booking-flow` | Booking flow step configuration |
| POST | `/api/bookings/:id/check-in` | Staff check-in action |
| POST | `/api/bookings/:id/check-out` | Staff check-out action |
| GET/POST/DELETE | `/api/services/:id/providers` | Provider-service assignment |
| POST | `/api/portal/reviews` | Client review submission |

### Files to Create/Modify

| Action | Path | Description |
|--------|------|-------------|
| Modify | `apps/api/src/booking-flow/` | Questionnaire, add-on step logic |
| Modify | `apps/api/src/services/` | Add-on CRUD endpoints |
| Modify | `apps/api/src/bookings/` | Check-in/check-out logic, invoice amendment |
| Modify | `apps/api/src/jobs/processors/` | Update `processCompletedBookings` Phase A |
| Create | `apps/web/src/components/booking/steps/` | New step renderer components |
| Modify | `apps/web/src/app/(dashboard)/settings/booking-flow/` | Flow builder UI |
| Create | `apps/web/src/app/(portal)/portal/reviews/` | Client review submission page |
| Modify | `prisma/schema.prisma` | Add `is_required` to ServiceAddon |

---

## 7. Workstream 4: Contracts & Quotes

**Priority: MUST | Dependencies: None | Complexity: High**

This is a new workstream identified in gap analysis. The PRD defines 12 Phase 2 requirements for contracts and quotes (GAP-5.1–5.4, GAP-10.1–10.6), with 7 at Must priority.

### 7.1 Contract State Machine (GAP-5.4, SRS-4 §12) — MUST

`Contract`, `ContractTemplate`, `ContractSignature`, `ContractAmendment` models already exist in schema.

**7-status lifecycle:** DRAFT → SENT → PARTIALLY_SIGNED → SIGNED → (AMENDED | EXPIRED | VOID)

- DRAFT: Business creates/edits contract from template
- SENT: Contract sent to signers; content frozen at this point (immutable after send)
- PARTIALLY_SIGNED: At least one but not all required signatures collected
- SIGNED: All required signatures collected; triggers post-signing actions
- AMENDED: New version created from signed contract (via ContractAmendment)
- EXPIRED: Auto-transition after configurable expiry period
- VOID: Manually voided by business admin (allowed from ANY status including SIGNED per SRS-4 §43 edge case; requires `void_reason`. Note: SRS-4 §12 state table says "Any except SIGNED" but §43 explicitly overrides this for SIGNED contracts with reason.)

### 7.2 Multi-Party Signatures (GAP-5.1, SRS-4 §13) — MUST

- 6 signer roles per SRS-4 §13: `CLIENT`, `WITNESS`, `COMPANY_REP`, `GUARDIAN`, `PARTNER`, `OTHER`
- Configurable signature requirements per `ContractTemplate.signature_requirements` (JSONB): which roles are required, minimum count per role
- Signing order: sequential or parallel (configurable per template)
- Row-level locking (`SELECT ... FOR UPDATE`) for simultaneous signers to prevent race conditions
- Each signature creates a `ContractSignature` record with full audit trail

### 7.3 E-SIGN Act / eIDAS Compliance (GAP-5.3, SRS-4 §15) — MUST

Each `ContractSignature` record must include:
- `ip_address` — signer's IP
- `user_agent` — browser/device string
- `device_fingerprint` (JSONB) — screen resolution, timezone, platform, browser plugins
- `electronic_consent_at` (TIMESTAMPTZ) — explicit consent timestamp
- `legal_disclosure_accepted` (Boolean) — signer accepted legal disclosure
- `signature_data` — SVG data URI from `signature_pad`
- `signature_type` — DRAWN, TYPED, or UPLOADED
- `signature_confidence` (DECIMAL) — confidence score for signature quality
- `role` — signer role from 6-role enum
- `order` — signing order position

Document hash (SHA-256) stored on Contract, computed from frozen content at SENT transition.

### 7.4 Contract Amendments (GAP-5.2, SRS-4 §14) — SHOULD

- `ContractAmendment` model exists — build section-level change tracking
- Amendment creates new contract version; original remains immutable
- Track which sections changed, previous values, and amendment reason
- Amendment requires re-signing by affected parties

### 7.5 Contract in Booking Flow (FR-BFW-9) — SHOULD

- Display contract terms during booking step
- Capture client signature using `signature_pad`
- Contract step renders template with variable substitution
- Signed contract linked to booking

### 7.6 Client Portal Contract Viewing (FR-CP-6) — SHOULD

- Client portal page: `/portal/contracts`
- View all contracts (signed and pending)
- Sign pending contracts from portal
- Download signed contract PDFs

### 7.7 Contract Management in Admin CRM (FR-CRM-15) — COULD

- Admin page: `/contracts`
- Template management: create, edit, version, activate/deactivate
- Contract status tracking dashboard
- Void/expire contracts
- Download signed PDFs

### 7.8 Quote Versioning (GAP-10.1, SRS-4 §16) — MUST

`Quote`, `QuoteLineItem`, `QuoteOption`, `QuoteOptionItem` models already exist in schema.

- Quote versioning with `UNIQUE(booking_id, version)` constraint
- Revising a quote increments version, preserves previous version as read-only
- Quote status lifecycle per SRS-2 §8 and SRS-4 §16: DRAFT → SENT → ACCEPTED / REJECTED / EXPIRED (no VIEWED state — track views via activity log instead)

### 7.9 Quote Line Items (GAP-10.2, SRS-4 §17) — MUST

- Line items with: description, quantity, unit price, tax rate, discount, line total
- Excess hours breakdown for HOURLY services
- Tax calculation per line item
- Subtotal, tax total, discount total, grand total

### 7.10 Quote Options (GAP-10.3) — SHOULD

- Multiple pricing alternatives per quote (e.g., "Basic Package" vs "Premium Package")
- `QuoteOption` with name, description; `QuoteOptionItem` with line items per option
- Client selects one option during acceptance

### 7.11 Quote Acceptance with Signature (GAP-10.4, SRS-4 §18) — MUST

- Client views quote in portal or via email link
- Acceptance requires digital signature (reuse `signature_pad`)
- Atomic acceptance with row locking (`SELECT ... FOR UPDATE`) to prevent double-acceptance
- Acceptance triggers quote-to-invoice conversion

### 7.12 Quote-to-Contract/Invoice Conversion (GAP-10.5, SRS-4 §19) — MUST

- On acceptance: auto-generate invoice from quote line items (or selected option)
- If contract template linked: auto-generate contract with quote data
- Conversion via NestJS event signals (EventEmitter pattern)
- Idempotent — conversion only happens once per quote version

### 7.13 Quote Reminders & Activity Tracking (GAP-10.6) — SHOULD

- Automated quote reminder emails (configurable: 3 days, 7 days after send)
- Activity log: sent, viewed, reminder sent, accepted, rejected, expired
- Quote expiry after configurable period (default 30 days)

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET/POST/PUT/DELETE | `/api/contract-templates` | Contract template CRUD |
| GET/POST | `/api/contracts` | List/create contracts |
| GET | `/api/contracts/:id` | Contract detail with signatures |
| POST | `/api/contracts/:id/send` | Send contract for signing |
| POST | `/api/contracts/:id/sign` | Submit signature |
| POST | `/api/contracts/:id/void` | Void a contract |
| POST | `/api/contracts/:id/amend` | Create amendment |
| GET | `/api/portal/contracts` | Client portal contract list |
| POST | `/api/portal/contracts/:id/sign` | Client portal signature |
| GET/POST | `/api/quotes` | List/create quotes |
| GET/PATCH | `/api/quotes/:id` | Get/update quote |
| POST | `/api/quotes/:id/send` | Send quote to client |
| POST | `/api/quotes/:id/accept` | Accept quote (with signature) |
| POST | `/api/quotes/:id/reject` | Reject quote |
| POST | `/api/quotes/:id/revise` | Create revised version of quote |
| POST | `/api/quotes/:id/remind` | Send reminder for pending quote |
| GET | `/api/portal/quotes` | Client portal quote list |
| POST | `/api/portal/quotes/:id/accept` | Client portal acceptance |

### Files to Create/Modify

| Action | Path | Description |
|--------|------|-------------|
| Create | `apps/api/src/contracts/` | Contracts module: controller, service, state machine |
| Create | `apps/api/src/quotes/` | Quotes module: controller, service, state machine |
| Create | `apps/web/src/app/(dashboard)/contracts/` | Admin CRM contract management |
| Create | `apps/web/src/app/(dashboard)/quotes/` | Admin CRM quote management |
| Create | `apps/web/src/app/(portal)/portal/contracts/` | Client portal contracts |
| Create | `apps/web/src/app/(portal)/portal/quotes/` | Client portal quotes |
| Modify | `apps/api/src/booking-flow/` | Contract step in booking flow |
| Modify | `apps/web/src/components/booking/steps/` | Contract step renderer |
| Modify | `prisma/schema.prisma` | Add `document_hash` to Contract if missing |

---

## 8. Workstream 5: Authentication & Security Hardening

**Priority: SHOULD | Dependencies: None | Complexity: Medium**

### 8.1 MFA / TOTP for Business Admins (FR-AUTH-11)

**Note:** MFA fields (`mfa_enabled`, `mfa_secret`, `mfa_recovery_codes`) already exist on the User model. No migration needed.

- TOTP setup flow: generate secret → display QR code → verify code
- MFA challenge on login (after password verification, before token issuance)
- Recovery code generation (10 codes) and one-time use
- AES-256 encrypt `mfa_secret` at rest — encryption key stored in environment variable `MFA_ENCRYPTION_KEY`, key rotation supported via re-encryption job
- Skip MFA for OAuth logins (Google, Apple)
- MFA management UI in security settings: `/settings/security`
- **Audit logging:** Emit `MFA_ENABLE` and `MFA_DISABLE` audit log events per SRS-4 §29

### 8.2 Granular Permissions (SRS-1 §2, FR-CRM-11)

**Note:** `permissions` JSONB field already exists on TenantMembership.

- Permission evaluation: role defaults (from SRS-2 §3 permission matrix) merged with JSONB overrides
- JSONB overrides can only **narrow** base role access (cannot grant beyond role)
- Permission management UI in team settings: `/settings/team`
- Guards updated to check: role base permissions → JSONB overrides → final decision
- Permission presets for common configurations (e.g., "Front Desk", "Junior Stylist")
- Permissions covered: bookings (view/create/edit/cancel), clients (view/edit), services (manage), payments (view/process/refund), team (manage), settings (manage), reports (view)

### 8.3 Optimistic Locking Default (SRS-1 §2)

- `If-Match` / `ETag` headers enforced by default (advisory in Phase 1)
- 409 Conflict response on version mismatch with `updatedAt` as version token
- Apply to: booking update, service update, client update, contract update, quote update endpoints
- Client-side handling: on 409, refetch resource, show diff to user, allow merge or overwrite (not silent auto-retry)

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/mfa/setup` | Generate TOTP secret + QR code |
| POST | `/api/auth/mfa/verify` | Verify TOTP code and enable MFA |
| POST | `/api/auth/mfa/disable` | Disable MFA (requires current TOTP) |
| POST | `/api/auth/mfa/recovery` | Use recovery code |
| POST | `/api/auth/mfa/challenge` | Submit TOTP during login |
| GET/PUT | `/api/team/:memberId/permissions` | Get/update member permissions |

### Files to Create/Modify

| Action | Path | Description |
|--------|------|-------------|
| Modify | `apps/api/src/auth/` | MFA setup/verify/challenge endpoints |
| Create | `apps/web/src/app/(dashboard)/settings/security/` | MFA setup UI |
| Modify | `apps/api/src/common/guards/` | Permission guard with JSONB override evaluation |
| Modify | `apps/web/src/app/(dashboard)/settings/team/` | Permissions UI |
| Modify | `apps/api/src/common/interceptors/` | ETag/If-Match enforcement interceptor |

---

## 9. Workstream 6: Embeddable Widget

**Priority: SHOULD | Dependencies: WS1 (feature entitlement) | Complexity: Medium-High**

### 9.1 Widget Loader SDK

Evolve existing `packages/embed-widget/` from redirect-only to full widget.

**Target:** ~5 KB gzipped vanilla TypeScript (no React, no framework).

```
packages/embed-widget/src/
  savspot-embed.ts          # Entry point, config parsing, SavSpot instance
  modes/
    button.ts               # "Book Now" button that opens popup
    popup.ts                # Modal overlay with iframe
    inline.ts               # Iframe embedded in page section
  iframe-manager.ts         # Creates iframe, postMessage protocol
  styles.ts                 # Inline CSS for button/modal chrome
  types.ts                  # Public API types
```

**Public API:**

```html
<!-- Script tag (simple) -->
<script src="https://cdn.savspot.com/embed/v2/savspot-embed.js"
  data-slug="my-salon"
  data-mode="popup"
  data-service="haircut-uuid"
  data-color="#6366f1"
  data-text="Book Now"
  data-source="website-hero"
></script>
```

```typescript
// Programmatic API (for SPAs)
const widget = SavSpot.init({
  slug: 'my-salon',
  mode: 'popup',
  service: 'haircut-uuid',
  source: 'website-hero',
  onBooked: (booking) => { /* callback */ },
  onClose: () => { /* callback */ },
});
widget.open();
widget.destroy();
```

**CDN deployment:** Vite IIFE build → Cloudflare R2 + Cloudflare CDN with versioned paths (`/embed/v2/savspot-embed.js`). Cache-Control: 1 year with content hash in filename for cache busting.

### 9.2 Embed Booking Route

```
apps/web/src/app/embed/book/[slug]/
  layout.tsx    # Minimal layout: no nav, no footer, transparent bg
  page.tsx      # Re-uses existing booking flow components (including new WS3 steps)
```

- Reads branding from tenant config, applies colors/logo
- Accepts query params: `service`, `source`, `mode`
- Sends postMessage events: `savspot:ready`, `savspot:resize`, `savspot:booked`, `savspot:close`
- Sets `Content-Security-Policy: frame-ancestors` with tenant-allowed domains (stored in tenant config)
- Supports all booking flow steps including questionnaire, add-ons, contract (from WS3)

### 9.3 Widget Modes

- **Button mode (FR-EMB-1):** "Book Now" button, click redirects (free tier) or opens popup (paid)
- **Popup/modal mode (FR-EMB-2):** Full booking wizard in overlay. Full-screen on mobile.
- **Inline mode (FR-EMB-3):** Iframe in page section, auto-resizes via ResizeObserver + postMessage.

### 9.4 Widget Features

- **Branding inheritance (FR-EMB-5):** Colors, logo from tenant config
- **Pro gating (FR-EMB-13):** Redirect = FREE, popup/inline + branding = PRO
- **Embed code generator (FR-EMB-6, FR-CRM-20):** Admin CRM at `/settings/embed` — mode selection, customization, live preview, copy-to-clipboard
- **Source tracking (FR-EMB-9):** `WIDGET` booking source for attribution analytics
- **Pre-select service (FR-EMB-10):** Via URL params or SDK config
- **Real-time availability (FR-EMB-11):** Same availability engine as main booking page
- **Guest checkout (FR-EMB-12):** No SavSpot account required for booking
- **Async loading (FR-EMB-7):** Does not block host page rendering
- **Responsive (FR-EMB-8):** Desktop/tablet/mobile in all modes
- **CORS:** Embed API endpoints allow requests from tenant-configured allowed domains

### 9.5 Embed API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/embed/:slug/config` | Widget configuration + branding |
| GET | `/api/embed/:slug/availability` | Slot availability for date range |
| POST | `/api/embed/:slug/session` | Create booking session |
| GET | `/api/embed/:slug/services` | Service list for widget |

Rate limiting: 100 requests/minute per IP for embed endpoints.

### PostMessage Protocol

```typescript
// iframe → parent
{ type: 'savspot:ready' }
{ type: 'savspot:resize', height: number }
{ type: 'savspot:booked', booking: { id, service, datetime } }
{ type: 'savspot:close' }

// parent → iframe
{ type: 'savspot:open', service?: string }
{ type: 'savspot:theme', colors: { primary, background } }
```

### Files to Create/Modify

| Action | Path | Description |
|--------|------|-------------|
| Modify | `packages/embed-widget/` | Full rebuild: popup, inline, branding modes |
| Create | `apps/api/src/embed/` | Embed API module |
| Create | `apps/web/src/app/embed/book/[slug]/` | Embed booking route |
| Modify | `apps/web/src/app/(dashboard)/settings/embed/` | Enhanced generator UI |

---

## 10. Workstream 7: Intelligent Operations AI

**Priority: SHOULD | Dependencies: WS3.4 (check-in data improves no-show accuracy) | Complexity: Medium**

All features use pure SQL + TypeScript. No LLMs, no Python, no external APIs. **All algorithms, thresholds, and job schedules align with SRS-4 §45.**

### 10.1 Smart Reminder Timing (FR-AI-1, SRS-4 §45.1)

**Algorithm:** Compute per-client reminder lead time correlating with highest attendance rate across discrete buckets (2h, 4h, 12h, 24h, 48h).

- Data inputs: `communications` table (delivery timestamps, confirmation responses) + `bookings` table (attendance outcomes)
- Minimum data threshold: **5+ prior bookings** with reminder history (per SRS-4 §45.1)
- Fallback to default (24h) for clients below threshold
- Store `optimal_reminder_lead_hours` on ClientProfile (new field — migration needed)
- Booking reminder scheduler uses client-specific timing instead of fixed 24h/2h
- **BullMQ cron job: daily at 3:00 AM UTC** (queue: `QUEUE_COMMUNICATIONS`)

### 10.2 No-Show Risk Prediction (FR-AI-2, SRS-4 §45.2)

**Algorithm:** Multiplicative scoring per SRS-4 §45.2:

```
base_score = client_historical_no_show_rate
adjustments:
  × 1.3  if lead_time > 14 days
  × 0.7  if lead_time < 24 hours
  × 1.5  if first_time_client
  × day_of_week_factor (from tenant historical data)
  × service_type_factor (from tenant historical data)

final_score = clamp(base_score × adjustments, 0.0, 1.0)
```

- Data inputs: client no-show rate, total booking count, lead time, **day of week**, first-time flag, **service type**
- Display tiers: LOW (0–0.3), MEDIUM (0.3–0.6), HIGH (0.6–1.0)
- Store `no_show_risk_score` (DECIMAL 0.00–1.00) on Booking (new field — migration needed)
- Display risk badge in Admin CRM booking list/detail
- Flag HIGH risk (>0.6) bookings in morning summary
- **BullMQ cron job: daily at 4:00 AM UTC** (per SRS-4 §45.2) — recompute for next 7 days of bookings (queue: `QUEUE_BOOKINGS`)

### 10.3 Rebooking Interval Detection (FR-AI-3, SRS-4 §45.3)

**Algorithm:** **Median** interval (robust to outliers, per SRS-4 §45.3 — NOT mean/AVG):

```sql
SELECT client_id, service_id,
       PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY interval_days) as median_interval,
       COUNT(*) as booking_count
FROM (
  SELECT client_id, service_id,
         EXTRACT(DAY FROM start_time - LAG(start_time) OVER (
           PARTITION BY client_id, service_id ORDER BY start_time
         )) as interval_days
  FROM bookings
  WHERE status IN ('COMPLETED')
) intervals
WHERE interval_days IS NOT NULL
GROUP BY client_id, service_id
HAVING COUNT(*) >= 3  -- minimum 3+ completed bookings per SRS-4 §45.3
```

- Store `rebooking_interval_days` on ClientProfile (new field — migration needed)
- Trigger rebooking prompt: scheduled for `completion_date + rebooking_interval_days - 3 days` (3-day lead time per spec)
- If computed send date is in the past (interval < 3 days), send immediately
- **BullMQ cron job: daily at 3:00 AM UTC** (queue: `QUEUE_BOOKINGS`)

### 10.4 Slot Demand Analysis (FR-AI-4, SRS-4 §45.4)

**Algorithm:** Per SRS-4 §45.4 — compute fill rate, avg days-to-fill, cancellation rate per slot.

- Minimum data threshold: **30+ bookings** in analysis window (trailing 90 days)
- **Three insight card types:**
  - "Consistently empty": fill rate < 0.2 for 6+ consecutive weeks
  - "High demand": fill rate > 0.9 AND avg days-to-fill < 2
  - "High cancellation": cancellation rate > 0.3
- Max **3 cards per tenant per week**
- Cards are **dismissible** — track dismissal with user ID + insight hash
- Card **expiry: 7 days** after generation
- Create `slot_demand_insights` table matching SRS-2 §13b schema: `insight_type` (ENUM: HIGH_DEMAND_SLOT, LOW_FILL_SLOT, CANCELLATION_PATTERN), `time_slot`, `day_of_week`, `metric_value`, `recommendation` (TEXT), `is_dismissed`, `dismissed_by` (**spec amendment**: not in SRS-2 §13b table but required by SRS-4 §45.4 "record user ID + insight hash"), `expires_at`
- Surface insights as cards on Admin CRM dashboard
- **BullMQ cron job: Sundays at 2:00 AM UTC** (queue: `QUEUE_BOOKINGS`)

### 10.5 Cross-Tenant Benchmarking Pipeline (FR-AI-5, SRS-4 §45.5)

- Phase 2 scope: **data collection and background computation only**. User-facing benchmark comparison UI ships in **Phase 3** when 50+ tenants exist (per PRD FR-AI-5). The API endpoint below returns data for internal/admin use; the tenant-facing dashboard component is Phase 3.
- Create `category_benchmarks` table matching SRS-2 §13b schema: `business_category`, `metric_key`, `p25`, `p50`, `p75`, `sample_size`, `computed_at`. Unique constraint on `(business_category, metric_key)`.
- Aggregate anonymized metrics by category (VENUE, SALON, STUDIO, FITNESS, PROFESSIONAL, OTHER)
- Metrics: median bookings/month, no-show rate, avg booking value, utilization rate
- Minimum **4 tenants** per category before computing (per BRD BR-RULE-9)
- Use median (not mean) for aggregation
- **Tenant opt-out:** Add `benchmark_opt_out` Boolean to Tenant model. Opting out excludes tenant's data from aggregation and hides benchmarks from their dashboard. Opt-out toggle in `/settings/privacy`.
- Display format (Phase 3 UI): "you vs. median" only — NO percentile ranking per SRS-4 §45.5 (e.g., "Your no-show rate: 18%. Category median: 12%." — not "better than X% of salons")
- **BullMQ cron job: daily at 5:00 AM UTC** (queue: `QUEUE_GDPR`, privileged connection — no RLS)

### 10.6 Enhanced Smart Morning Summary (FR-AI-6, SRS-4 §45.6)

Extend existing morning summary **SMS** (per SRS-4 §40 `sendMorningSummary` job — delivered to OWNER's phone) with four enrichment fields per SRS-4 §45.6. For enhanced summaries with more detail than SMS allows, also send an email version:

1. **High-risk appointments:** Today's bookings with no-show risk > 0.6 (from 10.2)
2. **First-time clients:** `clientId` with booking count = 1 for this tenant
3. **Schedule gaps:** Time blocks with no bookings during business hours
4. **Yesterday's no-shows:** List of bookings marked NO_SHOW the previous day (per SRS-4 §45.6)

Template-based rendering. If natural language prose quality is desired later, use local Ollama (qwen2.5-coder:7b) at zero marginal cost.

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/ai/insights/demand` | Slot demand insight cards for dashboard |
| POST | `/api/ai/insights/:id/dismiss` | Dismiss an insight card |
| GET | `/api/ai/insights/benchmarks` | Tenant's benchmark comparisons |
| GET | `/api/ai/clients/:id/risk` | Client's no-show risk data |
| GET | `/api/ai/clients/:id/rebooking` | Client's rebooking interval data |

### Files to Create/Modify

| Action | Path | Description |
|--------|------|-------------|
| Create | `apps/api/src/ai-operations/` | New module: service, controller, cron processors |
| Create | `apps/api/src/jobs/processors/compute-client-insights.processor.ts` | Daily insights job |
| Create | `apps/api/src/jobs/processors/compute-demand-analysis.processor.ts` | Weekly demand job |
| Create | `apps/api/src/jobs/processors/compute-benchmarks.processor.ts` | Daily benchmarks job |
| Modify | `apps/api/src/jobs/processors/send-morning-summary.processor.ts` | Enhanced summary |
| Modify | `prisma/schema.prisma` | New tables + fields (see §13) |
| Modify | `apps/web/src/app/(dashboard)/dashboard/` | Insight cards on dashboard |
| Create | `apps/web/src/components/ai-insights/` | Risk badges, insight cards |

---

## 11. Workstream 8: Remaining Items

**Priority: SHOULD/COULD | Dependencies: Various**

### 11.1 SMS Provider Migration (Twilio → Plivo)

**Must complete before WS2 communications work begins** to avoid building on Twilio then reworking.

- Create `SmsProvider` interface abstraction if not already present
- Implement `PlivoSmsProvider` alongside existing Twilio
- Feature flag for provider switching (env var `SMS_PROVIDER`)
- Canary period: 48-72h running both providers
- Re-register 10DLC campaigns on Plivo
- Update status callback handlers for Plivo webhook format
- Estimated effort: 2-3 days

### 11.2 Calendar Enhancements

- **Outlook/365 Calendar OAuth (FR-CAL-2):** New OAuth flow using Microsoft Graph API, sync adapter following same pattern as Google Calendar
- **iCal feed export (FR-CAL-16):** `GET /api/ical/:tenant_slug/:provider_slug.ics` with `ical_feed_token` UUID auth, read-only .ics feed generation

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/calendar/outlook/auth` | Initiate Outlook OAuth |
| GET | `/api/calendar/outlook/callback` | OAuth callback |
| GET | `/api/ical/:tenant_slug/:provider_slug.ics` | iCal feed |

### 11.3 Data Import Self-Service UI (FR-IMP-2, FR-IMP-3, FR-IMP-5)

- `ImportJob` model exists — build wizard UI in Admin CRM: `/settings/import`
- **Supported entity types:** Clients AND Services (FR-IMP-3 specifies service import in Phase 2)
- Steps: file upload (CSV/XLSX), column mapping, data preview, confirmation
- Background BullMQ job for processing
- Status tracking page: `/settings/import/history` — list past jobs, status, record counts, error log
- Downloadable error report

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/imports` | Upload file and start import job |
| GET | `/api/imports` | List import jobs |
| GET | `/api/imports/:id` | Import job status + error details |
| GET | `/api/imports/:id/errors` | Download error report |

### 11.4 Review Management (FR-CRM-24)

- Admin CRM page: `/reviews`
- View all reviews with filtering/sorting
- Reply to reviews (existing review API supports replies)
- Toggle publish/unpublish status
- Review moderation queue with flagged reviews

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/reviews` | List reviews (admin, with moderation filters) |
| POST | `/api/reviews/:id/reply` | Reply to review |
| PATCH | `/api/reviews/:id/publish` | Toggle publish status |

### 11.5 Client Preference Templates (FR-CRM-29 Phase 2)

Phase 1 provides free-form preference capture/display on the `clients.preferences` JSONB column. Phase 2 adds guided service-specific preference templates:

- Create preference template schema per service category (e.g., hair salon: "Hair Type", "Color History", "Product Allergies"; fitness: "Injuries", "Goals", "Experience Level")
- Templates stored in `service_preference_templates` JSONB on Service model (data presence is configuration — null = use free-form only)
- Staff sees structured form when capturing preferences for clients booked into that service
- Preferences display in appointment detail view alongside free-form notes
- No new API endpoints — extend existing `PATCH /api/clients/:id` with structured preferences payload

### 11.6 Internal Notes Enhancement (FR-CRM-14)

- `Note` model and module exist — enhance UI
- Attach notes to bookings and clients
- Notes timeline in booking/client detail views
- Rich text support (markdown)

### 11.7 Platform Admin Web Dashboard (FR-PADM-6, FR-FBK-3, FR-SUP-4)

Replace Phase 1 CLI scripts with web UI. Separate Next.js route group: `/admin`.

**Tenant management:**
- List, search, activate/deactivate tenants
- Subscription oversight: tier distribution, MRR, churn
- Platform metrics: total bookings, active tenants, revenue

**Product feedback queue (FR-FBK-3 Phase 2):**
- Web dashboard table replacing Phase 1 CLI `pnpm admin:feedback`
- Filters by type, tenant, status (NEW, ACKNOWLEDGED, PLANNED, SHIPPED, DECLINED)
- Bulk acknowledge and status update actions
- COMPARISON_NOTE items flagged prominently as competitive intelligence

**Support ticket dashboard (FR-SUP-4 Phase 2):**
- Web dashboard replacing Phase 1 CLI support ticket viewer
- Ticket queue by status (NEW, AI_INVESTIGATING, AI_RESOLVED, NEEDS_MANUAL_REVIEW, RESOLVED, CLOSED)
- AI resolution rate metric and escalation queue
- Weekly quality digest of AI-resolved tickets

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/tenants` | List all tenants (platform admin only) |
| PATCH | `/api/admin/tenants/:id/status` | Activate/deactivate tenant |
| GET | `/api/admin/metrics` | Platform-wide metrics |
| GET | `/api/admin/subscriptions/overview` | Subscription analytics |
| GET | `/api/admin/feedback` | List feedback items (filters: type, tenant, status) |
| PATCH | `/api/admin/feedback/bulk-status` | Bulk status update for feedback items |
| GET | `/api/admin/support/tickets` | List support tickets (filters: status, severity) |
| GET | `/api/admin/support/metrics` | AI resolution rate, escalation count |

### 11.8 Tenant Deactivation (SRS-4 §30c)

- Voluntary account closure flow: `/settings/account/close`
- Set `tenants.status = 'deactivated'`
- Grace period before data deletion (30 days)
- Data export before closure — uses existing `processTenantDataExport` infrastructure from `data_requests` module (GDPR compliance)
- Scheduled deletion BullMQ job after grace period
- **User-level account deletion** (distinct from tenant deactivation): handled by existing `processAccountDeletion` job (SRS-4 §41a, daily 5 AM UTC, `gdpr` queue) via `data_requests` pipeline (FR-CP-14). Verify Phase 1 implementation covers the 30-day grace period and data anonymization.

### 11.9 Data Retention Cleanup (SRS-4 §30b)

- Daily BullMQ job at 3:00 AM UTC (`cleanupRetentionPolicy`, queue: `gdpr`, concurrency: 2 per SRS-4 §41a)
- Retention thresholds per entity type:
  - Booking sessions: 90 days after completion
  - Expired reservations: 30 days
  - Notification history: 1 year
  - Communications: 2 years
  - Audit logs: 2 years
  - Invoices/payments: 7 years (regulatory)
- Archival to Cloudflare R2 before deletion; set `retention_archived_at` timestamp on archived records
- Respects `benchmark_opt_out` — opted-out tenant data excluded from any archival aggregation

### 11.10 Migration Readiness Dashboard (FR-CRM-31) — COULD

- Read-only Admin CRM widget on dashboard
- "Switch Score" metrics: client coverage %, service coverage, calendar sync status, Stripe onboarding status, booking volume trend
- Low priority — implement if time permits

---

## 12. Dependency Graph & Execution Order

```
Sprint 1-2:  WS1 (Subscription Billing) ─────────────────┐
             WS5 (Auth/Security)                          │
             WS8.1 (SMS Migration) ──┐                    │
                                     ▼                    ▼
Sprint 2-4:  WS2 (Comms & Notifications) ← needs SMS  WS6 needs WS1
             WS3 (Booking Features) ──┐                   │
             WS4 (Contracts & Quotes)  │                  │
                                       ▼                  │
Sprint 3-5:  WS6 (Embed Widget) ← needs WS1 + WS3       │
             WS7 (AI Operations) ← needs WS3.4 check-in  │
                                                          │
Sprint 5-6:  WS8 (Remaining Items)                        │
                                                          │
Sprint 7:    Integration testing, polish, launch
```

### Dependencies (All Captured)

| Dependency | Reason |
|---|---|
| WS8.1 (SMS) → WS2 (Comms) | Build SMS templates on Plivo, not Twilio |
| WS1 (Billing) → WS6 (Embed) | Widget premium gating needs entitlement guard |
| WS3.4 (Check-in) → WS7 (AI) | No-show risk accuracy improves with check-in data |
| WS3 (Booking) → WS6 (Embed) | Embed route must support new booking steps (questionnaire, add-ons, contract) |
| WS2 (Comms) → WS4 (Contracts) | Contract send/sign notifications need comms infrastructure |
| WS2 (Comms) → WS8.4 (Reviews) | Review response notifications to clients |
| WS8.1 (SMS) → WS3 (Booking, FR-COM-4) | Post-appointment review request SMS (2h after COMPLETED) requires Plivo SMS infrastructure |
| WS1 (Billing) separate from Stripe Connect | Stripe Billing uses platform's direct Stripe account, not tenant Connect accounts |

### Parallelization Strategy

| Parallel Group | Workstreams | Rationale |
|---|---|---|
| Group A (Sprint 1-2) | WS1 + WS5 + WS8.1 | No shared dependencies |
| Group B (Sprint 2-4) | WS2 + WS3 + WS4 | Minor touchpoints; WS4 starts after WS2 comms basics land |
| Group C (Sprint 3-5) | WS6 + WS7 | Independent after WS1 + WS3 deliver |
| Group D (Sprint 5-6) | WS8 remaining items | Interleaved as capacity allows |

### Critical Path

WS8.1 (SMS Migration) → WS2 (Communications) → WS4 (Contract notifications)
WS1 (Subscription Billing) → WS6 (Embed Widget premium gating)

---

## 13. Data Model Changes

### New Prisma Migrations Required

**Migration 1: AI Operations Fields**

| Model | Field | Type | Notes |
|-------|-------|------|-------|
| `Booking` | `no_show_risk_score` | `Decimal(3,2)?` | AI-computed, nullable |
| `ClientProfile` | `optimal_reminder_lead_hours` | `Decimal?` | AI-computed |
| `ClientProfile` | `rebooking_interval_days` | `Int?` | AI-computed |
| `Tenant` | `benchmark_opt_out` | `Boolean` default `false` | Privacy opt-out |

**Migration 2: Subscription State**

| Model | Field | Type | Notes |
|-------|-------|------|-------|
| `Tenant` | `subscription_status` | `SubscriptionStatus` enum | ACTIVE, PAST_DUE, CANCELED, TRIALING |
| `Tenant` | `subscription_current_period_end` | `DateTime?` | Stripe period end |
| `Tenant` | `subscription_grace_period_end` | `DateTime?` | Grace period deadline |

New enum: `SubscriptionStatus` (ACTIVE, PAST_DUE, CANCELED, TRIALING)

**Migration 3: Service Add-on Enhancement**

| Model | Field | Type | Notes |
|-------|-------|------|-------|
| `ServiceAddon` | `is_required` | `Boolean` default `false` | Required vs optional add-on |

**Migration 4: Slot Demand Insights Table**

Per SRS-2 §13b:

```prisma
model SlotDemandInsight {
  id              String    @id @default(uuid())
  tenantId        String
  insightType     SlotInsightType  // HIGH_DEMAND_SLOT, LOW_FILL_SLOT, CANCELLATION_PATTERN
  dayOfWeek       Int
  timeSlot        DateTime  @db.Time
  metricValue     Decimal
  recommendation  String
  isDismissed     Boolean   @default(false)
  dismissedBy     String?
  expiresAt       DateTime
  computedAt      DateTime  @default(now())
  tenant          Tenant    @relation(fields: [tenantId], references: [id])
}
```

New enum: `SlotInsightType` (HIGH_DEMAND_SLOT, LOW_FILL_SLOT, CANCELLATION_PATTERN)

**Migration 5: Category Benchmarks Table**

Per SRS-2 §13b:

```prisma
model CategoryBenchmark {
  id                String           @id @default(uuid())
  businessCategory  BusinessCategory
  metricKey         String
  p25               Decimal
  p50               Decimal
  p75               Decimal
  sampleSize        Int
  computedAt        DateTime         @default(now())

  @@unique([businessCategory, metricKey])
}
```

**Migration 6: Contract Document Hash** (**spec amendment**: `document_hash` not in SRS-2 §8 `contracts` table but required by SRS-4 §15 for content integrity verification)

| Model | Field | Type | Notes |
|-------|-------|------|-------|
| `Contract` | `document_hash` | `String?` | SHA-256, set when status → SENT |

### Fields That Already Exist (NO migration needed)

These were incorrectly listed as new in v1.0:

| Model | Fields | Status |
|-------|--------|--------|
| `Booking` | `checked_in_at`, `checked_out_at`, `check_in_status`, `checked_in_by`, `checked_out_by` | Already exist |
| `CheckInStatus` enum | `PENDING`, `CHECKED_IN`, `CHECKED_OUT`, `NO_SHOW` | Already exists |
| `User` | `mfa_enabled`, `mfa_secret`, `mfa_recovery_codes` | Already exist |
| `TenantMembership` | `permissions` (JSONB) | Already exists |

### Existing Models to Verify Before Implementation

| Model | Verification Needed |
|-------|-------------------|
| `ServiceAddon` | Confirm pricing fields; add `is_required` |
| `Contract` / `ContractTemplate` / `ContractSignature` | Confirm all SRS-4 §15 audit fields exist (device_fingerprint, electronic_consent_at, signature_type, role, etc.) |
| `ContractAmendment` | Confirm section-level tracking fields |
| `Quote` / `QuoteLineItem` / `QuoteOption` / `QuoteOptionItem` | Confirm all SRS-4 §16-19 fields |
| `MessageThread` / `Message` | Confirm participant tracking mechanism |
| `CommunicationTemplate` | Confirm variable schema; versioning via `TemplateHistory` |
| `NotificationType` | Confirm registry fields (key, category, default_channels, priority) |
| `NotificationPreference` | Confirm JSON schema supports per-channel toggles |
| `NotificationDigest` | Confirm aggregation fields |
| `ImportJob` / `ImportRecord` | Confirm error tracking fields |
| `BrowserPushSubscription` | Confirm Phase 1 creation (SRS-2 §7) |
| `ConsentRecord` | Confirm Phase 1 creation (SRS-2 §11) |
| `DataRequest` | Confirm Phase 1 creation (SRS-2 §11); verify `processAccountDeletion` job exists (SRS-4 §41a) |
| `BookingReminder` | Confirm Phase 1 creation (SRS-2 §9) |
| `WorkflowAutomation` | Confirm Phase 1 creation (SRS-2 §9) |

### Migration Ordering

Migrations should be run in numbered order. Each can be combined into per-sprint batches:
- Sprint 1: Migration 2 (Subscription State)
- Sprint 2: Migration 1 (AI Fields), Migration 3 (Add-on), Migration 6 (Contract hash)
- Sprint 3: Migration 4 (Demand Insights), Migration 5 (Benchmarks)

All migrations are additive (new fields/tables, no renames, no drops) and safe for zero-downtime deployment.

---

## 14. API Endpoints

Complete endpoint inventory across all workstreams. See individual workstream sections for details.

| Workstream | New Endpoints | Existing Endpoints Modified |
|---|---|---|
| WS1: Subscriptions | 6 | 0 |
| WS2: Communications | 17 | 2 (notifications, preferences) |
| WS3: Booking Features | 6 | 3 (booking-flow, bookings, services) |
| WS4: Contracts & Quotes | 16 | 0 |
| WS5: Auth/Security | 6 | 2 (auth login, team) |
| WS6: Embed Widget | 4 | 0 |
| WS7: AI Operations | 5 | 0 |
| WS8: Remaining Items | 16 | 3 (reviews, calendar, import) |
| **Total** | **76** | **10** |

---

## 15. Testing Strategy

### 15.1 Unit Tests (Per Workstream)

Every new service and controller must have unit tests. Target: 90%+ branch coverage on business logic.

| Workstream | Critical Test Areas |
|---|---|
| WS1 | Subscription lifecycle state machine, entitlement guard logic, webhook idempotency |
| WS2 | Template variable substitution (including XSS prevention), circuit breaker state transitions, quiet hours evaluation, digest batching |
| WS3 | Check-in state machine transitions, excess hour calculation, add-on price aggregation |
| WS4 | Contract state machine (7 states), multi-party signature ordering, quote acceptance with row locking, quote-to-invoice conversion |
| WS5 | TOTP generation/verification, recovery code consumption, permission JSONB merge logic, ETag version comparison |
| WS6 | PostMessage protocol, CORS validation, embed config generation |
| WS7 | No-show risk formula (verify against known test cases), rebooking interval median calculation, demand insight card generation thresholds |
| WS8 | SMS provider abstraction (both providers), import column mapping, data retention threshold logic |

### 15.2 Integration Tests

| Area | What to Test |
|---|---|
| Stripe Billing webhooks | All webhook event types with Stripe CLI test fixtures; idempotent processing; grace period timing |
| Template rendering | End-to-end: template + variables → rendered email; blocked construct rejection |
| Contract signing flow | Multi-party: create → send → partial sign → complete sign → verify audit trail |
| Quote lifecycle | Create → send → accept with signature → auto-generate invoice |
| SSE connections | Connection establishment, event delivery, reconnection, multi-tenant isolation |
| Check-in → No-show | Booking past grace period with PENDING check-in → auto NO_SHOW transition |

### 15.3 E2E Tests (Playwright)

| Suite | Flows Covered |
|---|---|
| `subscription-flow.spec.ts` | Free → Pro upgrade, billing history, cancellation |
| `booking-flow-advanced.spec.ts` | Booking with questionnaire + add-ons + contract signing |
| `notification-preferences.spec.ts` | Set preferences, verify notification delivery respects them |
| `embed-widget.spec.ts` | All three modes (button, popup, inline) on test host page |
| `contract-signing.spec.ts` | Multi-party contract: create, send, sign by multiple parties |
| `quote-flow.spec.ts` | Create quote, client accepts, verify invoice generation |
| `mfa-flow.spec.ts` | MFA setup, login with TOTP, recovery code usage |
| `communication-center.spec.ts` | Template creation, manual compose, delivery tracking |

### 15.4 Performance & Load Tests

| Area | Target |
|---|---|
| SSE connections | 1,000 concurrent connections per server instance |
| Embed widget load time | < 200ms to first interactive (loader SDK) |
| Template rendering | < 500ms for complex templates with 50+ variables |
| AI cron jobs | Complete within BullMQ timeout (5 minutes per tenant batch) |

### 15.5 AI Operations Validation

- Backtest no-show risk formula against 6 months of historical booking data
- Compare predicted no-show scores against actual outcomes
- Track precision/recall per risk tier (LOW/MEDIUM/HIGH)
- Validate rebooking interval accuracy: median computed interval vs actual next booking date

---

## 16. Deployment & Rollout

### 16.1 Feature Flag Strategy

Feature flags via environment variables for **deployment rollout gating** (simple, no external service). These are distinct from SRS-1 §8's "data presence is configuration" principle: deployment flags control whether code paths are active during phased rollout, while progressive complexity (BR-RULE-8) controls tenant-level feature visibility via data presence. All deployment flags are removed once a feature is fully rolled out:

| Flag | Default | Purpose |
|---|---|---|
| `SMS_PROVIDER` | `twilio` | SMS provider switch (twilio/plivo) |
| `FEATURE_SUBSCRIPTIONS` | `false` | Enable subscription billing |
| `FEATURE_EMBED_ADVANCED` | `false` | Enable popup/inline widget modes |
| `FEATURE_AI_OPERATIONS` | `false` | Enable AI insight computation |
| `FEATURE_CONTRACTS` | `false` | Enable contracts module |
| `FEATURE_QUOTES` | `false` | Enable quotes module |
| `FEATURE_MFA` | `false` | Enable MFA setup option |

Features behind flags can be deployed to production and enabled incrementally per tenant for canary testing.

### 16.2 Data Backfill Plan

When computed fields are added, existing data needs initial population:

| Field | Backfill Strategy |
|---|---|
| `no_show_risk_score` | Run `compute-client-insights` job once after deploy; existing bookings get scored |
| `optimal_reminder_lead_hours` | Same job; clients below threshold get NULL (use default 24h) |
| `rebooking_interval_days` | Same job; clients with < 3 bookings get NULL |
| `benchmark_opt_out` | Default `false` — no backfill needed |
| `subscription_status` | Set ACTIVE for all existing tenants in migration |

### 16.3 Zero-Downtime Deployment

All migrations are additive (new nullable fields, new tables, new enums). Deployment order:
1. Run Prisma migration (adds fields/tables)
2. Deploy new code (reads new fields, falls back gracefully if NULL)
3. Run backfill jobs
4. Enable feature flags

No breaking changes to existing API contracts.

### 16.4 Monitoring & Observability

New monitoring required for Phase 2:

| Component | Monitoring |
|---|---|
| BullMQ cron jobs (4 new AI jobs + digest jobs) | Job completion rate, duration, failure alerts via Sentry |
| SSE connections | Active connection count per server, Redis pub/sub lag |
| Stripe Billing webhooks | Webhook delivery success rate, processing latency |
| Circuit breaker | State transitions logged, alerts on OPEN state |
| Template rendering | Render failures logged + admin notification |
| Embed widget | CDN cache hit rate, error rate from postMessage protocol |

### 16.5 Stripe Configuration

- **Stripe Billing** (subscriptions): Uses SavSpot's **direct Stripe account** (platform-level)
- **Stripe Connect** (booking payments): Uses tenant Connect accounts (unchanged from Phase 1)
- These are separate Stripe product lines. Billing API key is a platform secret; Connect uses per-tenant OAuth tokens.
- Test mode: Use Stripe Test Clocks for subscription lifecycle testing. Use Stripe CLI for webhook testing locally.

### 16.6 Secrets Management

| Secret | Storage | Rotation |
|---|---|---|
| `MFA_ENCRYPTION_KEY` | Environment variable | Support key rotation via re-encryption BullMQ job |
| Stripe Billing API key | Environment variable | Standard Stripe key rotation |
| Plivo Auth ID/Token | Environment variable | Standard rotation |
| iCal feed tokens | Database (per calendar connection) | Regenerable by user |

---

## 17. Risk Register

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Stripe Billing complexity delays WS1, blocks WS6 | High | Medium | Start WS1 first; use Stripe Customer Portal for billing UI to reduce custom code; use Stripe Test Clocks |
| Template engine XSS via user-authored templates | High | Medium | Blocked construct list (SRS-4 §1); validation at save AND render; allowlist variable names; rendering failures never send partial messages |
| SSE scalability under load | Medium | Low | Redis pub/sub; 5 connections/user limit; graceful degradation to polling; monitor connection count |
| Plivo migration disrupts SMS delivery | High | Low | Canary period with both providers; monitor delivery rates; instant rollback via env var |
| Contract multi-party signing race conditions | High | Medium | Row-level locking (`SELECT ... FOR UPDATE`); comprehensive integration tests |
| Quote-to-invoice conversion idempotency | Medium | Medium | Idempotency key on conversion; event-driven with deduplication |
| Check-in/no-show state complexity | Medium | Medium | Comprehensive state machine tests; clear transition rules per SRS-3 §3 |
| Cross-tenant benchmark privacy | High | Low | Minimum 4 tenants per category; opt-out mechanism; anonymized aggregation only |
| Embed widget host page conflicts | Medium | Medium | Iframe isolation; CSP frame-ancestors with tenant domain allowlist; cross-browser E2E tests |
| Feature entitlement cache stale | Medium | Low | Redis 5-min TTL + immediate invalidation on webhook; eventual consistency acceptable |
| AI algorithm drift over time | Low | Medium | Quarterly backtest validation; log prediction vs outcome for model monitoring |
| Circuit breaker false opens | Medium | Low | Tune threshold (5 failures) and recovery (60s); alert on state changes; manual override |
