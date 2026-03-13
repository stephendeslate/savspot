# Savspot -- Product Requirements Document

**Version:** 1.2 | **Date:** March 7, 2026 | **Author:** SD Solutions, LLC
**Document:** PRD

---

## 1. Priority Legend

| Priority | Meaning |
|----------|---------|
| **Must** | Required for the target phase launch |
| **Should** | High value; included if time permits |
| **Could** | Desirable; deferred without impact to launch |

---

## 2. Phase Matrix

| Phase | Timeline | Key Deliverables |
|-------|----------|-----------------|
| **Phase 1** | ~~Months 1-2.5~~ **COMPLETE** (March 2026) | Multi-tenant platform, business-type preset onboarding (zero-config to live booking page), dynamic booking flow (steps determined by service config), PaymentProvider abstraction interface with Stripe Connect as Phase 1 implementation, offline payment as first-class path, admin CRM with progressive disclosure, client portal, booking page, basic embed widget (redirect mode), two-way calendar sync (FR-CAL-10 moved to Phase 1), basic transactional email (confirmation, receipt, reminders, follow-ups), platform admin CLI scripts. **920 tests passing, live at savspot.co.** |
| **Soft Launch** | ~1 week post Phase 1 | Personally onboard 5–10 businesses across 1–2 verticals; observe real usage, booking completion, payment flow, and organic sharing behavior; gather signal to inform Phase 2 priorities (see PVD §8a) |
| **Phase 2** | Months 2.5-4 | Subscription billing infrastructure, advanced email/SMS templates, contracts, check-in/check-out, booking flow builder, notifications, questionnaires, add-ons, reviews, iCal feed export (FR-CAL-16), advanced widget (Pro), invisible AI operations (FR-AI-1 through FR-AI-6 -- see §3.15 and [AI-STRATEGY.md](AI-STRATEGY.md)) |
| **Phase 3** | Months 4-6 | Mobile app (React Native + Expo -- client booking experience, push notifications, biometric auth), MCP server (FR-AI-8), public API, AI Voice Receptionist (FR-AI-7, Pro), cross-tenant benchmarking UI, natural language business Q&A, workflow automation, advanced analytics (Pro), accounting (Pro), i18n, multi-currency, alternative payment providers (Adyen, PayPal Commerce Platform) via PaymentProvider abstraction |
| **Phase 4** | Demand-driven (post-launch) | AI recommendations, directory, custom domains, multi-location, partner program, regional payment providers — shipped when user base metrics justify each feature |

---

## 3. Domain Requirements

### 3.1 Onboarding

| ID | Requirement | Pri | Phase |
|----|------------|-----|-------|
| FR-ONB-1 | Two-phase guided setup: Phase A (required, <5 min) produces a live booking page; Phase B (optional, prompted post-setup) configures payments, availability overrides, and advanced features | Must | 1 |
| FR-ONB-2 | Business type selection (VENUE, SALON, STUDIO, FITNESS, PROFESSIONAL, OTHER) as first onboarding step; selection triggers a one-time preset function that writes category-appropriate defaults | Must | 1 |
| FR-ONB-3 | Business profile: name, description, logo, cover photos, location, contact (category already selected in FR-ONB-2) | Must | 1 |
| FR-ONB-4 | First service creation with minimal required fields: name, duration, price. Zero-config defaults applied from preset (availability, confirmation mode, pricing model) | Must | 1 |
| FR-ONB-5 | Booking page goes live immediately after first service creation with preset defaults; no payment setup, availability customization, or booking flow configuration required | Must | 1 |
| FR-ONB-6 | Post-setup prompts (non-blocking): customize availability, connect payment provider, configure advanced features relevant to business type | Must | 1 |
| FR-ONB-7 | Payment provider onboarding (Stripe Connect Express in Phase 1) -- available during or after initial setup; booking page functional without it (payment collected offline via first-class offline payment path) | Must | 1 |
| FR-ONB-8 | Unique booking URL (savspot.co/{business-slug}) issued upon completing Phase A. The slug defaults to a URL-safe version of the business name (e.g., "Kings Barbershop" → "kings-barbershop") and is customizable by the OWNER in business settings. Slug uniqueness enforced with sequential suffix on conflict (e.g., "kings-barbershop-2"). The slug is the business's primary shareable identity — it appears in Instagram bios, text messages, and social DMs, so it must be human-readable and memorable, not an auto-generated token. | Must | 1 |
| FR-ONB-9 | Custom domain support (book.mybusiness.com) | Could | 4 |
| FR-ONB-10 | Setup progress tracking with resume capability | Should | 1 |
| FR-ONB-11 | Booking flow builder: drag-and-drop step configuration with preview (accessible from Admin CRM post-onboarding, not required during initial setup). Note: SRS-1 Section 8 provides automatic step resolution from service config with optional `step_overrides` in `booking_flows`, which covers Phase 1 needs without a visual builder. | Should | 2 |
| FR-ONB-12 | Category selection telemetry: track distribution of business type selections via PostHog. For "OTHER", capture optional free-text self-description (stored as `tenants.category_description`). Used for preset expansion analysis (see BRD §5 Preset Expansion Strategy). | Should | 1 |

### 3.2 Booking Flow

| ID | Requirement | Pri | Phase |
|----|------------|-----|-------|
| FR-BFW-1 | Dynamic booking flow engine: steps included or excluded based on what the service has configured. A zero-config service with a price produces: date/time -> pricing summary -> payment -> confirmation. A free service produces: date/time -> confirmation. Steps for guest count, questionnaires, contracts, and add-ons appear only when their corresponding data exists on the service. See SRS-1 Section 8 for the step resolution algorithm. | Must | 1 |
| FR-BFW-2 | Service/Venue selection step with pricing, descriptions, images (always present if tenant has multiple services; auto-skipped for single-service tenants) | Must | 1 |
| FR-BFW-3 | Date & time picker with real-time availability, timezone-aware (always present) | Must | 1 |
| FR-BFW-4 | Guest count step: present only when service has `guest_config`. Renders age-range tiers only when `guest_config.age_tiers` is configured. Simple guest count (just a number) when age tiers absent. | Must | 1 |
| FR-BFW-5 | Questionnaire step with dynamic form fields: present only when service has intake form configured | Must | 2 |
| FR-BFW-6 | Package/add-on selection step with pricing: present only when service has add-ons configured | Should | 2 |
| FR-BFW-7 | Pricing summary step: adapts to pricing model. FIXED shows flat price. HOURLY shows base + excess. TIERED shows per-guest breakdown. Always shows taxes/discounts when applicable. Omitted entirely when price is zero/free. | Must | 1 |
| FR-BFW-8 | Payment step via provider-side tokenization (Stripe Elements in Phase 1); deposits or full payment. Present only when tenant has a payment provider connected and service has a non-zero price. | Must | 1 |
| FR-BFW-9 | Contract/agreement step with digital signature capture: present only when service has a linked contract template | Should | 2 |
| FR-BFW-10 | Confirmation step with .ics download; triggers calendar push (always present) | Must | 1 |
| FR-BFW-11 | Back/next navigation, progress indicator, step validation (adapts to actual steps in flow) | Must | 1 |
| FR-BFW-12 | Real-time availability check preventing double-booking | Must | 1 |
| FR-BFW-13 | Reservation token system holding slot for configurable duration | Must | 1 |
| FR-BFW-14 | Abandoned booking recovery (save progress, send reminder) | Should | 1 |
| FR-BFW-15 | Booking flow preview mode for business owners | Must | 1 |
| FR-BFW-16 | Conditional step logic based on previous selections | Could | 3 |
| FR-BFW-17 | Guest checkout with optional post-booking account creation | Should | 1 |
| FR-BFW-18 | Walk-in booking: bypass reservation token and PENDING state; enter CONFIRMED directly. Triggered from Admin CRM Quick-Add action (FR-CRM-28). Requires staff authentication. Walk-in bookings are tagged `source = WALK_IN` and are excluded from cancellation policy enforcement (booking is already in progress). No confirmation email for the walk-in entry point (barber may optionally send a receipt). See SRS-3 §2 for walk-in state machine entry point. | Must | 1 |
| FR-BFW-19 | Post-appointment rebooking prompt: when a booking is marked COMPLETED, include a "Book your next appointment" deep-link in the post-appointment follow-up email/SMS. The link pre-selects the same service and provider via URL parameters (savspot.co/{slug}?service={id}&provider={id}). This is the Phase 1 solution for recurring client relationships — it reduces re-booking to a single tap without implementing recurring booking automation. Full recurring booking automation (configurable frequency, automatic slot hold) is deferred beyond v1. | Should | 1 |

### 3.3 Calendar Integration

| ID | Requirement | Pri | Phase |
|----|------------|-----|-------|
| FR-CAL-1 | Google Calendar OAuth connection from Admin CRM | Must | 1 |
| FR-CAL-2 | Outlook/365 Calendar OAuth connection | Should | 2 |
| FR-CAL-3 | Auto-create calendar event on booking confirmation | Must | 1 |
| FR-CAL-4 | Auto-update calendar event on reschedule | Must | 1 |
| FR-CAL-5 | Auto-delete calendar event on cancellation | Must | 1 |
| FR-CAL-6 | Calendar events include client name, service, time, location, Savspot link | Must | 1 |
| FR-CAL-7 | Connect/disconnect calendars and select target from Admin CRM | Must | 1 |
| FR-CAL-8 | Calendar connection status indicator (connected/disconnected/error) | Must | 1 |
| FR-CAL-9 | Graceful expired-token handling with auto-refresh and re-auth prompt | Must | 1 |
| FR-CAL-10 | Read external calendar events (INBOUND direction) to block availability in Savspot. INBOUND events with `booking_id = null` are treated as hard unavailability blocks, identical to Savspot bookings — clients see the slot as simply "Unavailable" with no distinction between Savspot bookings and external calendar blocks. This is the critical infrastructure for the parallel-run design partner scenario (see savspot-gtm-distribution-strategy.md §4.3). **Moved from Phase 2 to Phase 1.** | Must | 1 |
| FR-CAL-11 | Select which external calendars to sync for blocking | Should | 1 |
| FR-CAL-12 | Configurable sync frequency (default 15 min) | Should | 1 |
| FR-CAL-13 | Blocked slots show as "Unavailable" -- no event details exposed | Should | 1 |
| FR-CAL-14 | Conflict notification if external event overlaps existing booking | Should | 1 |
| FR-CAL-15 | Manual "Sync Now" button (POST /api/calendar/connections/:id/sync) for immediate refresh outside the polling cycle. Rate-limited to 4 calls per hour per connection to prevent abuse. Displayed as a "Refresh Calendar" button in Admin CRM calendar settings. | Should | 1 |
| FR-CAL-16 | iCal feed export: expose each tenant's booking calendar as a read-only .ics feed at `https://api.savspot.co/ical/{tenant_slug}/{provider_slug}.ics`. Feed includes: event summary (service name), start/end time, BUSY status. No client PII in the feed. Enables platforms that support iCal import (including Booksy's one-time .ics import) to pull Savspot bookings. Authenticated via a per-connection token in the URL (not session auth). | Should | 2 |

### 3.4 Payments

| ID | Requirement | Pri | Phase |
|----|------------|-----|-------|
| FR-PAY-1 | PaymentProvider abstraction interface with Stripe Connect Express as Phase 1 implementation; all booking/payment logic calls the interface, never a provider directly | Must | 1 |
| FR-PAY-2 | Payment intent creation via PaymentProvider interface with platform fee deduction | Must | 1 |
| FR-PAY-3 | Deposit payments (configurable % or fixed amount) | Must | 1 |
| FR-PAY-4 | Full payment at time of booking | Must | 1 |
| FR-PAY-5 | Payment plans (installments with due dates) | Could | 3 |
| FR-PAY-6 | Refund processing (full or partial) with business approval | Must | 1 |
| FR-PAY-7 | Tenant-currency payment processing: each tenant operates in their configured currency (from `tenants.currency`) via the active payment provider. Full multi-currency support (multiple currencies per tenant, currency conversion, VAT/GST infrastructure, locale-aware formatting) is Phase 3. | Must | 1 |
| FR-PAY-8 | Invoice generation with business branding (PDF) | Should | 1 |
| FR-PAY-9 | Payment receipt sent via email automatically | Must | 1 |
| FR-PAY-10 | Payment provider webhook handling for payment lifecycle events (via PaymentProvider.handleWebhook) | Must | 1 |
| FR-PAY-11 | Platform referral commission calculation: 15-20% (default 20%) of first booking from platform-sourced clients (source in DIRECTORY, API, REFERRAL), capped at configurable maximum (default $500 per booking). Bookings from direct links (DIRECT, WIDGET) and walk-ins (WALK_IN) excluded. See BRD BR-RULE-2. | Must | 1 |
| FR-PAY-12 | Payout dashboard (link to provider's dashboard, e.g., Stripe Connect dashboard) | Must | 1 |
| FR-PAY-13 | Failed payment retry mechanism | Should | 1 |
| FR-PAY-14 | Offline payment first-class path: booking confirms without online payment, invoice with 'Pay Later' status, business marks paid manually. Critical for markets where online payment providers are unavailable. | Must | 1 |
| FR-PAY-15 | Alternative payment providers (Adyen, PayPal Commerce Platform) via PaymentProvider abstraction | Should | 3 |
| FR-PAY-16 | Regional payment providers (GCash/Maya for Philippines, Razorpay for India, Mollie for EU) via PaymentProvider abstraction | Could | 4 |
| FR-PAY-17 | Subscription billing via Stripe Billing: 2-tier plan creation (Free/$10 Pro), upgrade/downgrade with proration, automated recurring invoicing, payment method management. Annual billing at $8/mo ($96/yr). | Must | 2 |
| FR-PAY-18 | Feature entitlement middleware: verify `tenants.subscription_tier` and active feature subscriptions before serving Pro-gated requests. Returns HTTP 403 with upgrade prompt for unauthorized access. | Must | 2 |
| FR-PAY-19 | Subscription lifecycle webhook handling: payment failures with grace period (3 days), involuntary churn (downgrade to free after grace), reactivation | Must | 2 |
| FR-PAY-20 | Self-service subscription management in Admin CRM: plan selection, feature marketplace, billing history, payment method update, cancellation with feedback | Must | 2 |

### 3.5 Accounting Integration

| ID | Requirement | Pri | Phase |
|----|------------|-----|-------|
| FR-ACCT-1 | QuickBooks Online OAuth connection | Could | 3 |
| FR-ACCT-2 | Xero OAuth connection | Could | 3 |
| FR-ACCT-3 | Auto-sync invoices to accounting on creation | Could | 3 |
| FR-ACCT-4 | Auto-sync payments to accounting | Could | 3 |
| FR-ACCT-5 | Sync refunds and credits bi-directionally | Could | 3 |
| FR-ACCT-6 | Map Savspot categories to chart-of-accounts | Could | 3 |
| FR-ACCT-7 | Sync status dashboard in Admin CRM | Could | 3 |
| FR-ACCT-8 | Manual re-sync for individual/bulk invoices | Could | 3 |
| FR-ACCT-9 | Accounting gated behind Pro subscription | Could | 3 |

### 3.6 Communications

| ID | Requirement | Pri | Phase |
|----|------------|-----|-------|
| FR-COM-1a | Basic transactional email via Resend with platform-default templates. Covers all Phase 1 automated triggers: FR-COM-4 (booking confirmation, cancellation confirmation, 24h reminder, 24h follow-up), FR-PAY-9 (payment receipt), and MANUAL_APPROVAL staff notification. No custom template editor or business-branded templates in Phase 1 -- all emails use platform defaults. | Must | 1 |
| FR-COM-1b | Advanced transactional email: custom business-branded templates, variable substitution UI, template editor, reminder emails, SMS channel | Must | 2 |
| FR-COM-2a | SMS notifications to the business owner/provider for critical real-time events (via SMS provider — Twilio Phase 1, migrated to Plivo Phase 2): new booking received, booking cancelled by client, booking rescheduled. Content format: "{Client} booked {Service} at {Time} on {Date}." Provider SMS is Phase 1 because real-time provider awareness is required for the parallel-run design partner scenario — without it, SavSpot feels silent compared to Booksy's native push notifications. Low volume (3–5 bookings/week for soft launch). | Must | 1 |
| FR-COM-2b | SMS notifications to clients (via Plivo): booking confirmation, 24h reminder, 2h reminder. Shipped with full SMS template system in Phase 2 alongside advanced email (FR-COM-1b). | Must | 2 |
| FR-COM-3 | Email template engine with variable substitution | Must | 2 |
| FR-COM-4 | Automated triggers: confirmed, cancelled, 24h reminder, 24h follow-up, post-appointment review request (2h after COMPLETED, email + SMS Phase 2), rebooking prompt (FR-BFW-19, included in follow-up email Phase 1). Default reminder timing is category-dependent: VENUE bookings receive 48h reminder; all other categories receive 24h reminder (see BRD §5 Preset Defaults). Configurable per service in Phase 2+. | Must | 1 |
| FR-COM-10 | Morning summary notification: at a configurable time each morning (default 7:30 AM, tenant-timezone-aware), send an SMS to the business owner/provider listing that day's SavSpot bookings: "Today: {N} bookings. Next: {Name} at {Time} ({Service}, {Duration})." Configurable: on/off, delivery time, SMS vs. email. Delivered as a BullMQ scheduled job (see SRS-4). Disabled by default for tenants with zero bookings that day. | Should | 1 |
| FR-COM-11 | Weekly digest: Monday morning email to business owner summarizing the prior week: bookings completed, revenue collected, booking page views, no-show rate, new clients. Serves the "Switch Score" awareness function during parallel-run scenarios. Always email (not SMS). Configurable on/off. | Should | 1 |
| FR-COM-5 | Business-branded email templates (logo, colors, footer) | Should | 2 |
| FR-COM-6 | Delivery tracking (sent, delivered, opened, bounced, failed) | Should | 2 |
| FR-COM-7 | In-app messaging between business and client | Should | 2 |
| FR-COM-8 | Unsubscribe management and preference center | Must | 2 |
| FR-COM-9 | Manual email/SMS compose from Admin CRM | Should | 2 |

### 3.7 Notifications

| ID | Requirement | Pri | Phase |
|----|------------|-----|-------|
| FR-NOT-1 | In-app notifications (bell icon, dropdown, real-time via SSE) | Must | 2 |
| FR-NOT-2 | Push notifications for mobile (booking updates, reminders) | Must | 2 |
| FR-NOT-3 | Email notification digest (instant, daily, weekly) | Should | 2 |
| FR-NOT-4 | Notification preferences per channel (in-app, email, push, SMS) | Must | 2 |
| FR-NOT-5 | Real-time delivery via SSE | Should | 2 |
| FR-NOT-6 | Browser push notifications for Admin CRM (web push API, not native mobile push). When a client books through savspot.co/{slug}, the logged-in Admin CRM session receives an immediate browser push notification, even if the tab is not focused. The Admin CRM requests notification permission on first login. Fallback: if permission denied, real-time event is shown on next page load via SSE. Phase 1 only covers Admin CRM (provider-facing); client-facing push is Phase 3 mobile app (FR-MOB-4a). Requires service worker registration in the Next.js web app. | Should | 1 |

### 3.8 Contracts & Quotes

| ID | Requirement | Pri | Phase |
|----|------------|-----|-------|
| *(FR-CRM-15)* | *(See §4.4 Admin CRM for canonical contract management requirement)* | Could | 2 |
| FR-BFW-9 | Booking flow step: display terms and capture digital signature (present only when service has a linked contract template) | Should | 2 |
| FR-CP-6 | Client portal: contract viewing and digital signature capture | Should | 2 |
| GAP-5.1 | Multi-party signatures with 6 signer roles and configurable requirements | Must | 2 |
| GAP-5.2 | Contract amendments with section-level change tracking | Should | 2 |
| GAP-5.3 | Device fingerprinting and electronic consent for legal compliance | Must | 2 |
| GAP-5.4 | Extended contract status lifecycle (7 statuses) | Must | 2 |
| GAP-10.1 | Quote versioning with unique_together(booking, version) | Must | 2 |
| GAP-10.2 | Quote line items with tax, excess hours breakdown | Must | 2 |
| GAP-10.3 | Quote options for multiple pricing alternatives per quote | Should | 2 |
| GAP-10.4 | Quote acceptance with signature capture and atomic row locking | Must | 2 |
| GAP-10.5 | Quote-to-contract/invoice conversion via signals | Must | 2 |
| GAP-10.6 | Quote reminders and activity tracking | Should | 2 |

### 3.9 Workflow Automation

| ID | Requirement | Pri | Phase |
|----|------------|-----|-------|
| FR-CRM-16 | Workflow automation: configurable triggers and actions | Could | 3 |
| *(FR-COM-4)* | *(See §3.6 Communications -- automated triggers are a communications requirement delivered via workflow infrastructure)* | Must | 1 |
| GAP-7.1 | WorkflowTemplate with stages and trigger conditions | Must | 3 |
| GAP-7.2 | WorkflowStage with 7 automation types and 4 progression conditions | Must | 3 |
| GAP-7.3 | WorkflowTrigger with 20 event types (see SRS-4 §21 for canonical list) | Must | 3 |
| GAP-7.4 | Per-booking overrides (skip, disable, custom timing, add stage) | Should | 3 |
| GAP-7.5 | Outgoing webhooks with HMAC signature verification | Should | 3 |
| GAP-12.1 | Payment deadline automation with auto-cancel | Must | 1 |
| GAP-12.2 | Multi-interval reminders (7/3/1 day) with duplicate prevention | Must | 1 |
| GAP-12.3 | Session/reservation cleanup on scheduled intervals | Must | 1 |

### 3.10 Authentication & Security

| ID | Requirement | Pri | Phase |
|----|------------|-----|-------|
| FR-AUTH-1 | Email/password registration and login | Must | 1 |
| FR-AUTH-2 | Google OAuth login | Must | 1 |
| FR-AUTH-3 | Apple Sign-In | Should | 1 |
| FR-AUTH-4 | JWT access/refresh token rotation (RS256, 15-min access, 7-day refresh) | Must | 1 |
| FR-AUTH-5 | Token blacklisting on logout (Redis-backed) | Must | 1 |
| FR-AUTH-6 | Email verification on registration (signed token, 24h expiry) | Must | 1 |
| FR-AUTH-7 | Password reset via email link (single-use token, 1h expiry) | Must | 1 |
| FR-AUTH-8 | Two-tier RBAC: platform roles (PLATFORM_ADMIN, USER) + tenant roles (OWNER, ADMIN, STAFF via tenant_memberships) | Must | 1 |
| FR-AUTH-9 | Biometric auth in mobile app (Face ID / Fingerprint) | Must | 2 |
| FR-AUTH-10 | API key auth for agents/integrations (SHA-256 hashed, prefix lookup) | Must | 1 |
| FR-AUTH-11 | MFA (TOTP) for business admin accounts | Should | 2 |

### 3.11 Accessibility

| ID | Requirement | Target | Phase |
|----|------------|--------|-------|
| NFR-ACC-1 | WCAG 2.1 Level AA | All public-facing pages | 1 |
| NFR-ACC-2 | Keyboard navigation | Full functionality without mouse | 1 |
| NFR-ACC-3 | Screen reader compatibility | All interactive elements labeled (ARIA) | 1 |
| NFR-ACC-4 | Color contrast | Min 4.5:1 normal text, 3:1 large text | 1 |
| NFR-ACC-5 | Reduced motion | Respect `prefers-reduced-motion` | 1 |

---

### 3.13 Data Import (FR-IMP-*)

| ID | Requirement | Pri | Phase |
|----|------------|-----|-------|
| FR-IMP-1 | CLI-based client import (pnpm admin:import-clients): accepts CSV file path + source platform (BOOKSY, FRESHA, SQUARE, VAGARO, CSV_GENERIC, JSON_GENERIC). Pre-built column mappings for known platforms. Deduplication: match on email (primary) or phone (secondary); on match, merge empty fields and preserve existing data. Validation report before commit. Records job in `import_jobs` table with per-row tracking in `import_records` (SRS-2 §13a). | Must | 1 |
| FR-IMP-2 | Self-service import wizard in Admin CRM: file upload → column mapping screen (pre-filled for known platforms per FR-IMP-1 mappings, manually overridable for CSV_GENERIC) → data preview (first 20 rows) → confirm → background BullMQ job. Progress indicator while processing. Results summary (imported, skipped duplicates, errors) on completion. | Should | 2 |
| FR-IMP-3 | Service import: import services from CSV with platform-specific profiles (service name, duration, price, description). Same deduplication and job tracking as FR-IMP-1. Phase 1: CLI only. Phase 2: included in self-service wizard. | Should | 1 |
| FR-IMP-4 | Appointment history import: import past appointment records from exported CSV for CRM history context. Imported appointments are tagged `status = COMPLETED` and `source = IMPORT` and do not affect payment flows or calendar sync. Phase 1: CLI only. | Could | 1 |
| FR-IMP-5 | Import job status tracking in Admin CRM: list past import jobs with status (PENDING, MAPPING, PROCESSING, COMPLETED, FAILED), record counts (total, imported, skipped, errors), error log, and completion timestamp. OWNER/ADMIN can download the error log for failed rows. | Should | 2 |

### 3.14 Product Feedback (FR-FBK-*)

> **Distinct from support tickets (FR-SUP-1).** Support tickets are "something is broken" or "I can't figure out how to do X." Product feedback is "I wish this existed" or "this workflow feels wrong." These go through separate systems: support tickets → AI triage pipeline; product feedback → developer feedback queue. The `COMPARISON_NOTE` type is specifically valuable during design partner parallel-run scenarios.

| ID | Requirement | Pri | Phase |
|----|------------|-----|-------|
| FR-FBK-1 | In-app feedback widget: a persistent "Give Feedback" floating button or sidebar menu item in Admin CRM. Tap → select type (FEATURE_REQUEST, UX_FRICTION, COMPARISON_NOTE, GENERAL) → write feedback body → optionally attach screenshot → submit. Submits to `feedback` table (SRS-2 §12b). Contextual metadata auto-captured: user ID, tenant ID, current page. No login, no ticket number, no formality — should feel like texting. Always visible; never blocked by subscription tier. | Must | 1 |
| FR-FBK-2 | Feedback lifecycle: the `feedback` table supports status tracking (NEW, ACKNOWLEDGED, PLANNED, SHIPPED, DECLINED). Developer can update status and add internal notes. When status moves to SHIPPED, an optional in-app notification is sent to the submitter: "Your feedback about X has shipped!" This closes the loop with design partners who submit requests. | Should | 1 |
| FR-FBK-3 | Developer feedback queue: Phase 1 CLI script (pnpm admin:feedback) to list new feedback items filtered by type, tenant, and status. Phase 2: web dashboard table in the platform admin UI (FR-PADM-6) with filters, bulk acknowledge, and status update. COMPARISON_NOTE type items are flagged prominently as competitive intelligence. | Should | 1 |

### 3.12 Customer Support

| ID | Requirement | Pri | Phase |
|----|------------|-----|-------|
| FR-SUP-1 | In-app feedback/help link in Admin CRM sidebar and Client Portal footer; opens structured form submitting to `support_tickets` table (SRS-2 §12a) with category selection and optional screenshot attachment. Auto-captures contextual metadata (user ID, tenant ID, current page, browser/device info). Categories: BUG, FEATURE_REQUEST, QUESTION, ACCOUNT_ISSUE, PAYMENT_ISSUE, OTHER. | Must | 1 |
| FR-SUP-2 | Static help center with FAQ articles (10-15 articles covering onboarding, payments, booking management, cancellations, account management) hosted on marketing site | Should | 1 |
| FR-SUP-3 | AI-powered L1 support triage: Open Claw monitors incoming support tickets 24/7 (`support_tickets` with `status = 'NEW'`), routes to AI pipeline (Qwen3 local for known patterns; Claude Code for complex diagnostic) for investigation (`AI_INVESTIGATING`) and resolution. Auto-resolves common issues with drafted responses (`AI_RESOLVED`). Escalates unresolvable tickets to developer (`NEEDS_MANUAL_REVIEW`). CRITICAL severity tickets and PAYMENT_ISSUE refund approvals always escalate. See BRD §8a for full pipeline specification. Data model: SRS-2 §12a. | Must | 1 |
| FR-SUP-4 | Support ticket lifecycle management: `support_tickets` table with status tracking (NEW, AI_INVESTIGATING, AI_RESOLVED, NEEDS_MANUAL_REVIEW, RESOLVED, CLOSED), AI resolution notes, user satisfaction tracking ("Was this helpful?"), and repeat-ticket detection (same user + category within 7 days triggers auto-escalation). Developer dashboard (CLI in Phase 1, web in Phase 2) showing ticket queue by status, AI resolution rate, and escalation queue. Weekly quality digest of AI-resolved tickets. Data model: SRS-2 §12a. Background jobs: SRS-4 §41b. | Should | 1 |

### 3.15 Intelligent Operations (FR-AI-*)

> **Design principle:** AI features in this section deliver outcomes -- fewer no-shows, fuller calendars, less admin work -- without requiring user engagement with "AI." They are not labeled as AI in the UI. They modify existing workflows, not create new UI surfaces. This approach is informed by market data: explicit AI features see 22-28% adoption even in best cases (Toast 2025); invisible operational improvements have universal impact. See [AI-STRATEGY.md](AI-STRATEGY.md) for full strategic rationale.

| ID | Requirement | Pri | Phase |
|----|------------|-----|-------|
| FR-AI-1 | Smart reminder timing: determine optimal reminder send time per client based on booking history, confirmation response patterns, and day-of-week behavior. Overrides default fixed-interval timing (24h before) when sufficient client data exists (5+ prior bookings). Falls back to default when data is insufficient. Implemented as enhancement to existing BullMQ communication jobs, not a new system. | Should | 2 |
| FR-AI-2 | No-show risk indicator: compute risk level (low/medium/high) for upcoming bookings based on client no-show history, booking lead time, day-of-week patterns, and first-time vs. returning client status. Display as subtle colored indicator in calendar view (FR-CRM-2) and appointment list view (FR-CRM-27). Not labeled as "AI prediction" -- presented as a native UI element (e.g., amber dot). Computed by daily BullMQ job for next 7 days of bookings. | Should | 2 |
| FR-AI-3 | Rebooking interval detection: compute per-client-service rebooking cadence from booking history (median interval between consecutive bookings of same service by same client). When interval is established (3+ data points), trigger rebooking prompt (FR-BFW-19) at optimal timing rather than fixed delay. Store computed interval on client record. Recompute daily. | Should | 2 |
| FR-AI-4 | Slot demand analysis: weekly background job analyzing historical booking patterns to identify consistently empty vs. high-demand time slots per tenant. Surface as actionable dashboard card on admin dashboard (FR-CRM-1): "Tuesday 3-5pm has been empty for 6 weeks" or "Saturday 10am fills within 2 hours of opening -- consider extending morning hours." Cards are dismissible. Rendered only when analysis produces actionable signals (not noise). | Should | 2 |
| FR-AI-5 | Cross-tenant benchmarking pipeline: aggregate anonymized booking metrics (no-show rate, slot utilization, rebooking rate, average booking value) across tenants by business category. Data collection begins in Phase 2 (background job, daily refresh). User-facing benchmark comparisons activate in Phase 3 when 50+ tenants exist in a business category (activation gate — ensures statistical significance). Within active categories, a privacy floor of 4 tenants per filter applies (no benchmark shown for any filter combination with fewer than 4 tenants — prevents de-anonymization). See BRD BR-RULE-9. Tenant opt-out available in settings. Requires Terms of Service clause authorizing de-identified data aggregation. Legal precedent: Zendesk Benchmark, Gusto compensation benchmarking. See [AI-STRATEGY.md](AI-STRATEGY.md) §5.3 for privacy requirements. | Should | 2 |
| FR-AI-6 | Smart morning summary: upgrade existing morning summary (FR-COM-10) with contextual intelligence. In addition to the day's booking list, include: high no-show-risk appointments flagged, first-time clients noted, schedule gaps identified, yesterday's no-shows highlighted for follow-up. Same delivery channel (SMS or email) and BullMQ job as FR-COM-10 -- this is an enhancement, not a new feature. | Should | 2 |
| FR-AI-7 | AI Voice Receptionist: voice agent powered by local AI (Ollama in development, cloud inference in production) that answers business phone line after hours, checks real-time availability via existing availability resolver, and books appointments via existing booking session flow. Pro feature gated behind subscription (FR-PAY-18). Validated by industry data: 34% of appointment requests come after hours; Zenoti reports $3-4K/month revenue lift per location from AI receptionist. Phase 3 to allow prototype validation and subscription billing infrastructure (Phase 2) to be in place. | Should | 3 |
| FR-AI-8 | MCP server: expose booking, availability, and service data via Model Context Protocol for AI agent discoverability and booking. AI agents can discover businesses by category/location, check real-time availability, and complete bookings programmatically following the same business rules as human users (BR-RULE-6). Fresha reports 50% MoM growth in AI-referred bookings (Feb 2026) -- this is a distribution strategy, not a feature. API-first architecture from Phase 1 means implementation requires building the public interface, not re-architecting. | Must | 3 |

---

## 4. Surface Requirements

### 4.1 Booking Page (FR-BP-*)

| ID | Requirement | Pri | Phase |
|----|------------|-----|-------|
| FR-BP-1 | Branded page at `savspot.co/{slug}` | Must | 1 |
| FR-BP-2 | Display: logo, name, description, services with pricing. Services are grouped by `service_categories` on the booking page when categories exist. Each category renders as a labeled section (category name + optional description) containing its services. Uncategorized services appear in a default "Services" section. Single-category tenants or tenants with no categories display a flat list. This makes flow-length differences between simple and complex services feel intentional (e.g., "Tours & Tastings" vs. "Events & Receptions") rather than inconsistent. | Must | 1 |
| FR-BP-3 | "Book Now" CTA launching configured booking flow | Must | 1 |
| FR-BP-4 | Branding (logo, colors) configurable from Admin CRM | Must | 1 |
| FR-BP-5 | Mobile-responsive design | Must | 1 |
| FR-BP-6 | Shareable link with Open Graph meta tags and SEO fundamentals: canonical URLs (`savspot.co/{slug}`), dynamic `<title>` and `<meta description>` from business name and description, `robots: index, follow` for published booking pages | Must | 1 |
| FR-BP-7 | QR code generation for booking URL | Should | 1 |
| FR-BP-8 | Custom domain support (Pro) | Could | 4 |
| FR-BP-9 | JSON-LD structured data (schema.org `LocalBusiness` + `Service`) on booking pages; auto-generated `sitemap.xml` for all published booking pages | Should | 1 |

### 4.2 Embeddable Widget (FR-EMB-*)

| ID | Requirement | Pri | Phase |
|----|------------|-----|-------|
| FR-EMB-1 | JS snippet renders "Book Now" button or inline widget | Should | 2 |
| FR-EMB-2 | Popup/modal mode: booking wizard in overlay | Should | 2 |
| FR-EMB-3 | Inline iframe mode: wizard renders within host page | Should | 2 |
| FR-EMB-4 | Redirect mode: navigates to Savspot booking page (free for all tiers — functions as a styled external link) | Must | 1 |
| FR-EMB-5 | Inherits business branding from tenant config | Should | 2 |
| FR-EMB-6 | Embed code generator in Admin CRM with preview | Should | 2 |
| FR-EMB-7 | Async loading; does not block host page | Should | 2 |
| FR-EMB-8 | Responsive across desktop/tablet/mobile | Should | 2 |
| FR-EMB-9 | Track `WIDGET` source for attribution | Should | 2 |
| FR-EMB-10 | Pre-select service via URL params | Could | 2 |
| FR-EMB-11 | Real-time availability in date/time picker | Should | 2 |
| FR-EMB-12 | Guest checkout (no Savspot account needed) | Should | 2 |
| FR-EMB-13 | Inline and popup embed modes (FR-EMB-2, FR-EMB-3) with branding customization (FR-EMB-5) gated behind Pro subscription. Redirect mode (FR-EMB-4) is free for all tiers. | Should | 2 |

### 4.3 Client Portal (FR-CP-*)

| ID | Requirement | Pri | Phase |
|----|------------|-----|-------|
| FR-CP-1 | Dashboard: upcoming bookings, action items, recent activity | Must | 1 |
| FR-CP-2 | Booking detail: all info, status, timeline | Must | 1 |
| FR-CP-3 | Booking modification request (date/service change) | Should | 1 |
| FR-CP-4 | Cancellation with policy enforcement | Must | 1 |
| FR-CP-5 | Payment management: invoices, pay, receipts | Must | 1 |
| FR-CP-6 | Contract viewing and digital signature | Should | 2 |
| FR-CP-7 | In-app messaging with business | Should | 2 |
| FR-CP-8 | Notification preferences (email, push, in-app) | Must | 2 |
| FR-CP-9 | Profile management (info, password, linked accounts) | Must | 1 |
| FR-CP-10 | Booking history across all businesses | Must | 1 |
| FR-CP-11 | Review/rating submission | Should | 2 |
| FR-CP-12 | Saved/favorited businesses | Could | 4 |
| FR-CP-13 | Data export (GDPR) | Must | 1 |
| FR-CP-14 | Account deletion request | Must | 1 |

### 4.4 Admin CRM (FR-CRM-*)

| ID | Requirement | Pri | Phase |
|----|------------|-----|-------|
| FR-CRM-1 | Dashboard: today's bookings, revenue, new clients, pending actions | Must | 1 |
| FR-CRM-2 | Calendar view: day/week/month, drag-and-drop reschedule | Must | 1 |
| FR-CRM-3 | Booking management: CRUD, status changes | Must | 1 |
| FR-CRM-4 | Client management: contacts, search, profiles, history | Must | 1 |
| FR-CRM-5 | Service management: CRUD with progressive disclosure. Basic fields (name, duration, price) always visible. Advanced sections (guest config, tiered pricing, buffer times, contract linking, intake forms) collapsed by default, revealed on demand. Inactive features (no data configured) hidden entirely. **Service list view** displays visual complexity indicators per service: small badges/icons for active advanced features (e.g., "Guests," "Tiered," "Deposit," "Contract," "Manual Approval," "Intake Form"). Indicators are derived from the service's nullable fields — a badge appears when the corresponding field is non-null. This gives owners an at-a-glance view of each service's configuration without drill-down. **Service creation** offers "Start from scratch" or "Copy from [existing service]" when the tenant has existing services. Copying duplicates all optional configuration fields (`guest_config`, `tier_config`, `deposit_config`, `cancellation_policy`, `intake_form_config`, buffer times, `confirmation_mode`, `pricing_model` and its companion fields) into the new service. Core fields (name, duration, price) are blank and must be set by the owner. The copied service is independent — changes do not propagate back to the source. | Must | 1 |
| FR-CRM-6 | Venue/resource management: CRUD with availability rules. Zero-config default (preset hours) applied automatically; advanced rules (buffers, seasonal, blocked dates) added incrementally. | Must | 1 |
| FR-CRM-7 | Payment management: invoices, refunds, payout history | Must | 1 |
| FR-CRM-8 | Communication center: compose, templates, send history | Should | 2 |
| FR-CRM-9 | Booking flow configuration: visual step editor showing which steps are active based on service config. Steps for unconfigured features show as "Configure [feature] to add this step" with a setup link. | Must | 1 |
| FR-CRM-10 | Business settings: profile, branding, hours, timezone, currency. Progressive disclosure -- basic settings grouped first, advanced settings in collapsible sections. | Must | 1 |
| FR-CRM-11 | Team management: invite, roles, permissions. **Phase 1 scope:** invite members, assign ADMIN or STAFF role. Granular per-member permission overrides (`permissions` JSONB) deferred to Phase 2. | Should | 1 |
| FR-CRM-12 | Advanced analytics dashboard (Pro) | Should | 3 |
| FR-CRM-13 | Notification center: in-app notifications | Must | 2 |
| FR-CRM-14 | Notes system: internal notes on bookings and clients | Should | 2 |
| FR-CRM-15 | Contract management | Could | 2 |
| FR-CRM-16 | Workflow automation configuration | Could | 3 |
| FR-CRM-17 | Discount/promo code management | Should | 1 |
| FR-CRM-18 | Data import for clients: Phase 1 delivers an admin CLI script (pnpm admin:import-clients) that accepts a CSV file and a source platform identifier (BOOKSY, FRESHA, SQUARE, VAGARO, CSV_GENERIC). Pre-built column mappings for known platforms auto-map common schemas (Booksy: First Name, Last Name, Email, Phone, Notes). Deduplication by email (primary) or phone (secondary) — on match, merge empty fields and preserve existing data. Validation preview before commit. Source platform tracking via `import_jobs` table (SRS-2 §13a). Phase 2 delivers a self-service import wizard in Admin CRM (FR-IMP-2): file upload → column mapping screen (pre-filled for known platforms, manual override for CSV_GENERIC) → preview → confirm → background processing via BullMQ. This is a genuine competitive differentiator — all major competitors (GlossGenius, Glamiris, Goldie, Fluum, Bookedin) require emailing files to support for manual import. | Should | 1 |
| FR-CRM-19 | Booking page branding configuration | Must | 1 |
| FR-CRM-20 | Embed code generator (Pro) | Should | 2 |
| FR-CRM-21 | Calendar integration settings | Must | 1 |
| FR-CRM-22 | Accounting integration settings (Pro) | Could | 3 |
| FR-CRM-23 | Check-in/check-out management: staff-initiated check-in and check-out for confirmed bookings with staff attribution, no-show marking, and excess-hour fee calculation on checkout. See SRS-3 §3 for state machine. | Should | 2 |
| FR-CRM-24 | Review management: view submitted reviews, reply to reviews (sets `response` and `responded_at`), toggle `is_published` visibility. Data model supports this via SRS-2 §12 `reviews` table. | Should | 2 |
| FR-CRM-25 | Referral link management: generate, name, activate/deactivate, and track usage of referral links (`savspot.co/{slug}?ref={code}`). Bookings via referral links are tagged `source = REFERRAL` for commission eligibility (see BRD §BR-RULE-2). Data model: SRS-2 `referral_links` table. | Should | 3 |
| FR-CRM-26 | Business data export: OWNER can request a full tenant data archive (JSON/CSV) including services, bookings, client list, invoices, payments, and communications. Delivered as downloadable archive via R2 with auto-expiring URL (7 days). Uses `data_requests` table with `request_type = TENANT_EXPORT`. See SRS-4 §41a for background job. | Should | 1 |
| FR-CRM-27 | Mobile-optimized calendar list view: the Admin CRM calendar view must include a chronological appointment list mode displaying the next 3–4 upcoming appointments for the day — client name, service name, start time — visible in under 1 second on mobile, without requiring a calendar grid interaction. This is the primary view for providers who check their schedule between clients on a phone. Responsive design must treat this list view as the default on mobile screen widths (< 768px). On desktop, the grid calendar view (FR-CRM-2) remains default. | Must | 1 |
| FR-CRM-28 | One-tap quick actions in calendar: from the appointment list view (FR-CRM-27), each appointment displays contextual quick actions achievable in a single tap without navigating away: (a) Mark as arrived (records `checked_in_at` timestamp as a lightweight arrival indicator — distinct from the full Phase 2 check-in state machine in FR-CRM-23, which adds check-out, no-show logic, and excess-hour fees); (b) Mark as completed (triggers CONFIRMED → COMPLETED transition); (c) Quick Add Walk-In (opens a bottom sheet: select service → optionally select/create client → confirm; creates a WALK_IN booking directly as CONFIRMED, per FR-BFW-18). These three actions cover the most frequent staff interactions during a working day. | Should | 1 |
| FR-CRM-29 | Client preferences: the client profile in Admin CRM includes a "Preferences" section allowing staff to capture free-form or structured preference notes (e.g., preferred style, hair type, product allergies, custom notes). Stored as a `preferences` JSONB column on the `clients` table (SRS-2 §7). Preferences are displayed in the appointment view when a staff member opens a booking — client name, service, time, and their preferences are visible in context, without requiring navigation to the full client profile. Phase 1 scope: capture and display. Phase 2: guided template for service-specific preference capture. | Should | 1 |
| FR-CRM-30 | Provider-service assignment: the service management screen allows OWNER/ADMIN to assign specific providers (staff members with tenant_memberships) to specific services via a `service_providers` join table (SRS-2 §6a). When a service has provider assignments, the booking flow includes a provider selection step filtered to only show providers who offer that service. A solo provider with all services assigned never sees the provider selection step — data presence is configuration. Services with no assignments are offered by all providers (legacy behavior). Phase 2 (data model ships Phase 1 for forward compatibility). | Should | 2 |
| FR-CRM-31 | Migration readiness dashboard ("Switch Score"): a read-only dashboard in Admin CRM answering "what is left before I can cancel my previous platform?" Metrics: client coverage (% of imported clients who have booked through SavSpot at least once), service coverage (all services configured), calendar sync status (connected and syncing), Stripe Connect onboarding status, and booking volume trend (bookings routed through SavSpot over the last 4 weeks). All data already exists in the schema — this is an aggregation layer. Relevant for businesses running SavSpot alongside an incumbent platform (parallel-run design partner scenario). Phase 2–3. | Could | 2 |

### 4.5 Mobile App (FR-MOB-*)

| ID | Requirement | Pri | Phase |
|----|------------|-----|-------|
| FR-MOB-1 | Business booking page viewing with services | Must | 3 |
| FR-MOB-2 | Booking flow wizard (core steps: service selection, date/time, pricing summary, payment, confirmation). Full parity with web advanced steps (guest config age tiers, questionnaires, contracts, add-ons) ships alongside those web features in Phase 2. | Must | 3 |
| FR-MOB-3 | Client portal: view bookings, booking history, booking detail, payment management, messaging | Must | 3 |
| FR-MOB-4a | Basic push notifications (booking confirmation, reminders) | Must | 3 |
| FR-MOB-4b | Push notifications with per-channel config via notification system (aligns with FR-NOT-2) | Must | 3 |
| FR-MOB-5 | Biometric authentication (Face ID / Fingerprint) | Must | 3 |
| FR-MOB-6 | Secure token storage (Keychain / Keystore) | Must | 3 |
| FR-MOB-7 | Offline mode: view saved bookings and businesses | Should | 3 |
| FR-MOB-8 | Deep linking for direct navigation | Must | 3 |
| FR-MOB-9 | Deep link support for booking pages | Must | 3 |
| FR-MOB-10 | Review submission with photos | Should | 3 |

> **Mobile app deferred to Phase 3.** The native mobile app is deferred to Phase 3 for three reasons: (1) mobile-responsive web (FR-BP-5) covers all client booking scenarios during initial validation — clients can browse, book, pay, and manage bookings from any mobile browser; (2) deferral reclaims development time in earlier phases (React Native + Expo setup, biometric auth, push notification infrastructure, EAS Build pipeline, Maestro E2E tests), accelerating time-to-validation; (3) Phase 3 timing allows the mobile app to ship after the full notification system (FR-NOT-1 through FR-NOT-5), push notification per-channel config (FR-MOB-4b), check-in/check-out (FR-CRM-23), and reviews (FR-CRM-24) are already built on web, ensuring native capabilities launch with full feature parity. Code sharing via `packages/shared` (Zod schemas, types, constants, business logic) minimizes incremental effort when mobile development begins. LifePlace demonstrated production React Native shipping capability with the same developer and tooling. Admin CRM remains web-only in all phases.

### 4.6 Analytics (FR-CRM-12)

**Free Tier:** Today's bookings count/revenue, new clients this week, pending action items, monthly payment summary (total collected, total outstanding, total refunded for current and previous month).

**Pro Tier:**

| Category | Data Points |
|----------|-------------|
| Booking trends | Daily/weekly/monthly volume, year-over-year comparison |
| Revenue | Gross, net (after refunds), by service, average booking value |
| Client metrics | New vs returning, lifetime value, acquisition source breakdown |
| Conversion | Flow completion rate, step drop-off, abandonment rate |
| Source attribution | Bookings by source (DIRECT, DIRECTORY, API, WIDGET, REFERRAL) |
| Financial summaries | Monthly/quarterly revenue summary (gross, refunds, net), payment method breakdown (online vs offline), payout reconciliation, exportable as CSV for tax preparation |

> **Scope boundary:** Financial reporting provides data summaries for tax preparation. Savspot is not accounting software. Businesses requiring tax filing, chart of accounts, or regulatory reporting should connect QuickBooks/Xero (Phase 3, FR-ACCT-1/2).

### 4.7 Platform Administration (FR-PADM-*)

| ID | Requirement | Pri | Phase |
|----|------------|-----|-------|
| FR-PADM-1 | CLI script: list all tenants with status, subscription tier, payment provider connection status, booking count, and revenue summary | Must | 1 |
| FR-PADM-2 | CLI script: view and update platform configuration (commission rate, commission cap, approval deadline defaults) without direct database access | Must | 1 |
| FR-PADM-3 | CLI script: view platform revenue summary (total processing fees collected, total commissions collected, by period) | Must | 1 |
| FR-PADM-4 | CLI script: view and resolve webhook dead-letter queue entries | Must | 1 |
| FR-PADM-5 | CLI script: manage user platform roles (grant/revoke PLATFORM_ADMIN) | Must | 1 |
| FR-PADM-6 | Platform admin web dashboard: tenant list, platform revenue, health metrics, dead-letter queue, breach response | Should | 2 |
| FR-PADM-7 | Suspend tenant via CLI (`pnpm admin:suspend-tenant`): sets `tenants.status = 'suspended'`, disables booking page, cancels active booking sessions, sends notification to tenant owner. Unsuspend via `pnpm admin:unsuspend-tenant`. | Must | 1 |

> **Phase 1 note:** Platform administration uses CLI scripts (`pnpm admin:*`) rather than a web dashboard. This aligns with BRD §8 (solo operator) and avoids building a separate admin UI before product-market fit is validated. The CLI scripts wrap the same NestJS services used by the API, so they benefit from the same RLS and validation logic. Platform admin web dashboard (FR-PADM-6) is a Phase 2 "Should" priority.

---

*Technical implementation for all requirements is specified in [SRS-1-ARCHITECTURE.md](SRS-1-ARCHITECTURE.md), [SRS-2-DATA-MODEL.md](SRS-2-DATA-MODEL.md), [SRS-3-BOOKING-PAYMENTS.md](SRS-3-BOOKING-PAYMENTS.md), and [SRS-4-COMMS-SECURITY-WORKFLOWS.md](SRS-4-COMMS-SECURITY-WORKFLOWS.md).*