# Savspot -- Business Requirements Document

**Version:** 1.3 | **Date:** March 1, 2026 | **Author:** SD Solutions, LLC
**Document:** BRD

---

## 1. Revenue Model

### Primary Revenue Streams

| Stream | Model | Rate | When |
|--------|-------|------|------|
| **Payment Processing** | Platform fee on all Savspot Pay transactions (in addition to the payment provider's standard processing fee borne by the connected account) | 1.0% | Every payment |
| **Platform Referral Commission** | One-time fee on bookings from platform-sourced clients (AI agents, directory, referrals) | 15-20% of first booking (capped at $500 default) | Only first booking from a new platform-sourced client |
| **Premium Features** | Optional add-ons | $9-$49/mo per feature | Monthly subscription |

### Premium Features
- Advanced embeddable booking widget (inline/popup modes with branding customization; redirect mode is free)
- Custom domain booking page (book.mybusiness.com)
- Advanced analytics & reporting dashboards
- Advanced multi-stage workflow automation (workflow templates with progression conditions; simple trigger-action automations are free)
- Multi-location management
- Team/staff management beyond basic
- API access for custom integrations (headless booking engine)
- QuickBooks / Xero accounting integration

### Why This Model Works
- Zero barrier to entry (free core software)
- Revenue from day one via payment processing
- Aligned incentives (Savspot earns when businesses earn)
- AI-agent compatible (no per-seat conflict)
- Scales with value delivered

> **Revenue sensitivity:** At 1% processing on $2M GMV, payment processing yields ~$20K/year. Platform referral commissions (Phase 3+) and premium subscriptions (Phase 2+) are incremental. The model achieves positive unit economics at modest scale (~$3K/month revenue against bootstrap infrastructure costs) rather than requiring aggressive premium conversion. Year 1 base case revenue target: $40K (see PVD §7). The $100K stretch target requires premium conversion rates above industry norms (>10%) or GMV exceeding $2M.

---

## 2. Subscription Tiers

| Tier | Price | Features |
|------|-------|----------|
| **Free** | $0 | Booking page, CRM, client portal, one-way calendar sync, basic metrics, basic embed widget (redirect mode) |
| **Premium** | $9-$49/mo per feature | Embeddable widget, custom domain, advanced analytics, advanced multi-stage workflow automation, accounting integrations, headless API access |
| **Enterprise** | Custom | Multi-location, dedicated support, custom integrations |

> **Phase 1 note:** Subscription tier management is manually administered via database for Phase 1. The `tenants.subscription_tier` field and a `subscription_provider_id` placeholder exist in the schema, but subscription billing integration (automated upgrades, downgrades, billing cycles, feature entitlement checks) is deferred to Phase 2. Premium features that ship in Phase 2+ will require subscription infrastructure at that time.
>
> **Phase 2 subscription infrastructure:** FR-PAY-17 through FR-PAY-20 (PRD §3.4) implement subscription billing via Stripe Billing (leveraging the existing Stripe ecosystem from Connect). Feature entitlement is enforced via NestJS middleware checking `tenants.subscription_tier` and active feature subscriptions against a feature-tier mapping. Subscription revenue is separate from booking payment processing — Savspot is the merchant of record for subscriptions (direct Stripe account), while businesses are merchants of record for booking payments (Stripe Connect Express accounts).

---

## 3. Core Business Rules

### BR-RULE-1: Tenant Data Isolation
No business (tenant) may access, view, or modify another tenant's data under any circumstance. This includes client data, booking data, financial data, and configuration data. Enforced by PostgreSQL RLS + application middleware. See [SRS-1-ARCHITECTURE.md](SRS-1-ARCHITECTURE.md) Section 7.

### BR-RULE-2: Platform Referral Commission
- Commission charged only on the **first booking** from a new client acquired through a Savspot-sourced channel (AI agent API, platform directory, referral link)
- Subsequent bookings from the same client are commission-free
- Commission percentage configurable by Savspot (default: 20%), may vary by region or promotion
- Commission capped at a configurable maximum per booking (default: $500). Effective commission = min(booking_total × rate, commission_cap). Cap is Savspot-configurable alongside the rate.
- Bookings from a business's own direct link (booking page URL, embedded widget) are commission-free
- Walk-in bookings (WALK_IN source) are always commission-free — the client is physically present and was not sourced by the platform
- Booking source tracked via `source` field: `DIRECT`, `DIRECTORY`, `API`, `WIDGET`, `REFERRAL`, `WALK_IN`

### BR-RULE-3: Payment Processing
- All online payments must go through the platform's PaymentProvider abstraction interface (Stripe Connect Express in Phase 1; Adyen, PayPal Commerce Platform available from Phase 3)
- The active payment provider charges its standard processing fee (e.g., Stripe ~2.9% + $0.30 in the US) to the connected account
- Savspot platform fee (1.0% of each payment amount) is collected via the provider's native platform fee mechanism (e.g., Stripe `application_fee_amount`, Adyen split payment, PayPal `partner_fee`) on top of the provider's fee. Across all payments for a booking, the total platform fee sums to 1.0% of booking total.
- Offline payment is a first-class path: booking confirms, invoice generates with 'Pay Later' status, business marks paid manually. This supports businesses in countries where the active payment provider is unavailable.
- Total effective merchant cost: ~3.9% + $0.30 per transaction
- For platform-sourced clients, referral commission is additionally included in the platform fee passed to `IPaymentProvider.createPaymentIntent()`
- Overpayment prevention: payment amount must not exceed invoice remaining balance (validated server-side)

### BR-RULE-4: Client Account Portability
- Single client account works across multiple businesses
- Client personal data belongs to the client, not the business
- Businesses see client booking history only for their own business

### BR-RULE-5: Booking Integrity
- A confirmed booking is a binding reservation
- Double-booking the same resource/time slot must be technically impossible (enforced via pessimistic locking)
- Cancellation policies set by the business and enforced by the platform

### BR-RULE-6: AI Agent Parity
- AI agents follow same business rules, availability checks, and payment requirements as human users
- Businesses cannot distinguish AI-booked from human-booked in standard workflow

### BR-RULE-7: Data Privacy
- Comply with GDPR (EU), CCPA (California), and applicable local privacy laws
- Users can export data, request deletion, and manage consent preferences
- Business owners can export all tenant data (services, bookings, clients, invoices, payments, communications) as a JSON/CSV archive via Admin CRM (FR-CRM-26)
- Data retention policies configurable per region
- Breach notification within 72 hours (GDPR requirement)

### BR-RULE-8: Progressive Complexity
- The platform must serve individuals (freelancers, solo practitioners) through SMBs with a single codebase and data model
- **Zero-config principle:** A business that provides only a name, one service name, and a duration receives a functional, professional booking page with sensible defaults (Mon-Fri 9-5 availability, auto-confirm, free cancellation 24h, email confirmation)
- **Data presence is configuration:** Advanced features (guest tracking, tiered pricing, contracts, workflow automation) are activated by configuring their data, not by flipping feature flags. The absence of data means the feature is inactive and invisible.
- **Per-service granularity:** Complexity varies at the service level, not the tenant level. A single business can have both simple services (e.g., "Venue Tour" -- flat price, no guests) and complex services (e.g., "Wedding Reception" -- tiered pricing, guest count with age ranges, contract required)
- **Per-service complexity coherence:** While complexity varies per service, the platform provides UX patterns to keep the experience coherent:
  - **Admin CRM:** Service list view shows visual complexity indicators per service (see FR-CRM-5), enabling owners to understand their configuration landscape at a glance.
  - **Booking page:** Services grouped by `service_categories` when categories exist (see FR-BP-2), making flow-length differences feel intentional.
  - **Service creation:** "Copy from existing service" option reduces configuration burden when creating services with similar complexity profiles (see FR-CRM-5).
  - These patterns ensure that per-service granularity — the correct architectural choice — is supported by a coherent user experience rather than creating confusion for business owners or their clients.
- **Business-type presets:** During onboarding, category selection (VENUE, SALON, STUDIO, FITNESS, PROFESSIONAL, OTHER) applies a one-time preset function that writes sensible defaults (availability rules, default automations, pricing model). Presets are not stored as persistent configuration -- they write concrete data that the business can freely modify afterward.
- **Onboarding friction target:** Initial setup (Phase A) to a working booking page must require no more than 4 required fields (business name, service name, duration, price) and 1 decision (business type category). Additional configuration (payments, policies, advanced features) is staged into Phase B, not front-loaded.
- **Progressive disclosure in UI:** Basic settings are always visible. Advanced options are collapsed by default and revealed on demand. When a feature is inactive (no data configured), its UI section is hidden entirely -- no grayed-out or "upgrade to unlock" placeholders for core features.

---

## 4. Multi-Tenancy Business Requirements

**Strategy:** Shared Database with Row-Level Security (RLS). Every tenant-scoped table includes `tenant_id`. Technical implementation in [SRS-1-ARCHITECTURE.md](SRS-1-ARCHITECTURE.md) Section 7.

### Acceptance Criteria (BR-1)
- Each business has isolated data (no cross-tenant leakage)
- Businesses can customize booking page (logo, colors, domain)
- Single codebase, no per-tenant deployment
- Adding a tenant requires no developer intervention
- Performance not degraded by other tenants' load

---

## 5. Business Onboarding Requirements

### Setup Wizard Flow
```
Sign Up -> Email Verification -> Business Type Selection -> Phase A -> Phase B

  Business Type Selection:
    "What best describes your business?"
    -> PROFESSIONAL (photographer, consultant, tutor, trainer)
    -> SALON (hair, nails, spa, beauty)
    -> STUDIO (recording, art, dance, yoga)
    -> FITNESS (gym, personal training, classes)
    -> VENUE (wedding venue, conference center, banquet hall)
    -> OTHER (custom)

  Phase A -- Required (<5 min, produces a live booking page):
    Step 1: Business Profile (name, description, logo -- category already selected)
    Step 2: First Service (name, duration, price -- zero-config defaults applied from preset)
    -> Booking page is now LIVE with preset defaults (availability, confirmation email)
    -> Dashboard with share-your-booking-link CTA

  Phase B -- Optional (prompted post-setup, not blocking):
    Step 3: Customize Availability (preset applied sensible hours; modify if needed)
    Step 4: Connect Payments (payment provider onboarding via PaymentProvider abstraction -- Stripe Express in Phase 1 -- booking page works without this, payment collected offline)
    Step 5: Advanced Configuration (guest tracking, contracts, custom booking flow -- only shown if relevant to business type)
```

The business-type preset runs a one-time function that writes concrete data based on category:

| Category | Preset Defaults Applied |
|----------|------------------------|
| PROFESSIONAL | Mon-Fri 9-5, FIXED pricing, no guests, no contracts, auto-confirm, confirmation + 24h reminder + 24h follow-up |
| SALON | Mon-Sat 9-6, FIXED pricing, no guests, no contracts, auto-confirm, confirmation + 24h reminder + 24h follow-up |
| STUDIO | Mon-Sat 10-8, FIXED pricing, no guests, no contracts, auto-confirm, confirmation + 24h reminder + 24h follow-up |
| FITNESS | Mon-Sun 6a-9p, FIXED pricing, no guests, no contracts, auto-confirm, confirmation + 24h reminder + 24h follow-up |
| VENUE | 7 days 8a-10p, FIXED pricing, guest tracking enabled, manual confirm, confirmation + 48h reminder + follow-up. Contract template creation deferred to Phase 2 (FR-BFW-9) — preset does NOT set `contract_template_id` in Phase 1; contract step activates when business configures a template in Phase 2+. |
| OTHER | Mon-Fri 9-5, FIXED pricing, no guests, no contracts, auto-confirm, confirmation + 24h reminder + 24h follow-up |

After preset application, all values are concrete data the business can freely modify. The preset is not stored as a persistent configuration layer.

### Preset Expansion Strategy
- During onboarding, "OTHER" selection prompts an optional free-text field: "Describe your business in a few words" (stored on `tenants.category_description`; see FR-ONB-12).
- Category selection distribution is tracked via PostHog analytics (FR-ONB-12).
- When "OTHER" exceeds 30% of signups or a sub-category within "OTHER" exceeds 50 businesses, a new preset is evaluated for addition.
- Candidate categories identified from usage data: HEALTH (therapists, chiropractors), EDUCATION (tutors, music teachers), RENTAL (equipment, spaces, vehicles), FOOD (catering, food trucks, bakeries).
- Adding a preset requires only: a new enum value, a one-time data-writing function, and a UI option. No schema changes, no migrations, no feature flags.

### Acceptance Criteria (BR-2)
- Sign-up to working booking page in under 5 minutes (4 required fields + category selection)
- Full configuration (payments, advanced features) completable within 30 minutes
- No technical knowledge required
- Onboarding can be paused and resumed; booking page is live after Step 2
- Unique booking URL issued immediately upon completing Step 2
- Advanced features are discoverable but never blocking initial setup

Functional requirements: FR-ONB-1 through FR-ONB-12 in [PRD.md](PRD.md).

---

## 6. International Support (BR-10)

- All datetimes stored in UTC with timezone-aware display
- Business timezone configuration affects availability display and booking times
- Multi-currency payment processing (minimum: USD, EUR, GBP, AUD, CAD, PHP)
- i18n framework for UI translations (English first, infrastructure for more)
- Date/time formatting respects locale (MM/DD vs DD/MM, 12h vs 24h)
- GDPR compliance for EU users (consent management, data export, right to deletion)
- Tax handling infrastructure (VAT, GST, sales tax) with configurable rates per region

---

## 7. Stakeholder Success Criteria

| Stakeholder | Needs | Success Criteria |
|-------------|-------|-----------------|
| **Business Owners** | Easy onboarding, automated booking, shareable link, payment collection | 80% manual work reduction, booking page live in <5 min, full config in <30 min |
| **Clients/Bookers** | Seamless booking, transparent pricing, booking management | Complete booking in <3 minutes |
| **AI Agents** | Structured APIs, semantic descriptions, programmatic flow | End-to-end booking via API/MCP without human help |
| **SD Solutions** | Sustainable revenue, maintainable architecture | Positive unit economics by month 12 |

---

## 8. Constraints

### Technical
- **Solo developer with AI assistance:** Architecture must be maintainable by one developer operating a two-tier AI pipeline: Claude Code for complex architecture and design, Qwen3 (128GB local) for high-volume code generation, and Open Claw for 24/7 monitoring and support triage. The compressed 6-month timeline for Phases 1-3 is validated by LifePlace (~543K LOC, 805 commits, 122 models, 20 domains, 6 months, Claude Code only).
- **Phase 1 is web-only:** The native mobile app (React Native + Expo) is deferred to Phase 2 to tighten Phase 1 scope and accelerate time-to-validation. Mobile-responsive web covers all client booking scenarios in Phase 1. See PRD §4.5 for mobile Phase 2 rationale.
- **TypeScript monorepo:** All code must be TypeScript
- **Payment provider dependency:** Payment processing depends on the availability and country coverage of the active provider. Mitigated by PaymentProvider abstraction interface (Phase 1), enabling provider switching per-tenant; offline payment fallback for unsupported regions; Adyen + PayPal added in Phase 3; regional providers in Phase 4

### Business
- **Bootstrap funding:** Revenue must sustain operations; minimize infrastructure costs
- **Free tier economics:** Revenue from payment processing + premium features; early unit economics negative
- **Single operator:** Product must be self-service enough to minimize support burden; AI-powered support triage (Open Claw + Qwen3/Claude Code) provides automated L1 resolution to sustain quality without a dedicated support team
- **Signal-first acquisition:** Rather than scaling user acquisition during active development, Phase 1 is followed by a deliberate soft launch: personally onboard up to 10 businesses (structured cohort across 2–4 verticals) to gather real signal on retention, booking completion, and organic sharing before investing in broader distribution. Phase 2–3 development priorities are informed by this early signal. Distribution is the founder's least developed professional dimension (technical execution is thoroughly proven — LifePlace, published patent US20250140075A1, UCSD CS degree); the GTM strategy is designed to force structured repetition through each design partner installation (discovery, demo, objection handling, activation monitoring, referral ask). See PVD §8a and savspot-gtm-distribution-strategy.md.
- **Design partner engagement:** Slot 1 in the soft launch cohort is a confirmed barber design partner (Marcus) who will run SavSpot alongside Booksy for 90 days. This parallel-run engagement produces structured competitive signal — feature gap analysis, walk-in workflow viability, INBOUND calendar blocking reliability, and a migration decision at week 8–12 — that is qualitatively different from standard beta testing. Each design partner installation also functions as a compressed sales cycle (discovery, demo, objection handling, activation monitoring, referral ask, closing) — the engagement is simultaneously product validation and founder distribution skill development (see savspot-gtm-distribution-strategy.md §5 and §14). Architectural features that enable this engagement (walk-in booking FR-BFW-18, two-way calendar sync FR-CAL-10 through FR-CAL-15, data import pipeline FR-IMP-1 through FR-IMP-5, provider SMS FR-COM-2a) are classified as Must/Should Phase 1 requirements, not Phase 2+, specifically because the design partner engagement begins at Phase 1 launch.

### Regulatory
- **PCI DSS:** Never store/process/transmit raw card data; use provider-side tokenization (Stripe Elements in Phase 1)
- **GDPR:** Consent management, data portability, right to erasure, Data Processing Agreement (DPA) between Savspot and each tenant (Article 28 — see SRS-4 §30a), Terms of Service acceptance tracking, Privacy Policy
- **CAN-SPAM / TCPA:** Email/SMS must include opt-out mechanisms
- **ADA / WCAG 2.1:** Level AA accessibility on all public-facing pages

### 8a. Customer Support Strategy

Savspot operates with a solo developer and no dedicated support team. The product must be self-service enough to minimize support burden (see §8 Constraints). To sustain support quality at scale without hiring, Savspot employs an AI-powered support triage pipeline that provides automated L1 resolution, validated by the existing support system already built and deployed in LifePlace.

#### Support Channels

1. **In-app feedback widget:** A "Help & Feedback" link in both Admin CRM sidebar and Client Portal footer that opens a structured form submitting to the `support_tickets` table (SRS-2 §12a). Tickets are categorized by type (BUG, FEATURE_REQUEST, QUESTION, ACCOUNT_ISSUE, PAYMENT_ISSUE, OTHER) and include contextual metadata (user ID, tenant ID, current page, browser/device info) for AI triage.
2. **Help center / FAQ:** Static pages hosted on the Next.js marketing site covering: onboarding, payment setup, booking management, cancellations, account management. Target: 10-15 articles at launch.
3. **Email support:** Emails to support@savspot.co are ingested into the `support_tickets` table via a Resend inbound webhook. Solo operator handles tickets that exceed AI resolution capacity. No phone support.

#### AI-Powered Support Triage Pipeline

Open Claw monitors the `support_tickets` table in real-time (polling every 60 seconds for `status = NEW`). When a new ticket arrives, the following pipeline executes:

| Step | Actor | Action |
|------|-------|--------|
| 1. Classification | Open Claw | Reads ticket content + contextual metadata. Classifies severity (LOW, MEDIUM, HIGH, CRITICAL) and category. Checks against known issue patterns and help center articles. |
| 2. AI Investigation | Qwen3 (local) / Claude Code (escalation) | Open Claw routes the ticket to Qwen3 for investigation. Qwen3 analyzes the issue against the codebase, error logs (Sentry), and recent deployments. For complex issues (payment failures, data integrity, security), Open Claw escalates to Claude Code. |
| 3. Resolution Attempt | Qwen3 / Claude Code | If the issue has a known resolution (FAQ match, configuration guidance, documented workaround), an auto-response is drafted and the ticket is set to `AI_RESOLVED`. If the issue requires a code fix within AI capacity (non-breaking bug fix, configuration correction), a fix is prepared for developer review. |
| 4. Escalation | Open Claw | Tickets that cannot be resolved by AI (ambiguous issues, policy decisions, refund approvals, account disputes, complex bugs requiring architectural changes) are set to `NEEDS_MANUAL_REVIEW` and the developer is notified via Slack/email. |

#### Ticket Lifecycle

```
NEW -> AI_INVESTIGATING -> AI_RESOLVED | NEEDS_MANUAL_REVIEW -> RESOLVED | CLOSED
```

- `NEW`: Ticket submitted, awaiting Open Claw pickup (< 60 seconds)
- `AI_INVESTIGATING`: Open Claw has dispatched to Qwen3/Claude Code for analysis
- `AI_RESOLVED`: AI generated a response and/or fix; user notified. Auto-transitions to `CLOSED` after 7 days if user does not reopen.
- `NEEDS_MANUAL_REVIEW`: AI cannot resolve; developer notified. Target response time: 24 hours on business days.
- `RESOLVED`: Developer manually resolved the ticket.
- `CLOSED`: Terminal state. Reopening creates a new linked ticket.

#### Escalation Rules

- **CRITICAL severity** (platform-wide outages, payment processing failures, data breaches): Bypasses AI resolution entirely; developer notified immediately via Slack + SMS.
- **PAYMENT_ISSUE category**: AI may investigate and explain, but refund approvals always require manual review.
- **Repeat tickets** (same user, same category, within 7 days): Auto-escalated to `NEEDS_MANUAL_REVIEW` regardless of AI confidence.

#### Capacity Planning

- **Phase 1 target:** AI resolves >60% of tickets without developer intervention (FAQ matches, configuration guidance, known issue patterns).
- **Phase 2+ evaluation:** When AI-unresolvable ticket volume exceeds 20/week, evaluate Crisp or Intercom (free tier) for supplementary live chat.
- **Quality tracking:** All `AI_RESOLVED` tickets include a user satisfaction prompt ("Was this helpful? Yes/No"). Tickets rated unhelpful are flagged for developer review and used to improve AI resolution patterns.

> **Prior art:** LifePlace includes a production support ticket system with categorization, status tracking, and assignment. The Savspot implementation extends this with the AI triage pipeline, leveraging the same Open Claw + Qwen3 infrastructure used for development monitoring.

Functional requirements: FR-SUP-1 through FR-SUP-4 in [PRD.md](PRD.md).

---

## 9. Assumptions

1. Online booking market continues growing at >10% CAGR through 2030
2. AI agent scheduling reaches meaningful volume (>5% of bookings) within 18 months
3. SMBs will adopt free tool with commission pricing if quality matches paid alternatives
4. PaymentProvider abstraction enables multi-provider strategy: Stripe Connect (Phase 1), Adyen + PayPal (Phase 3), regional providers (Phase 4); offline payment covers gaps
5. Solo developer + AI can build and maintain this complexity
6. Free software drives organic supply-side adoption; booking links + AI drive demand
7. Google Calendar is a viable parallel-run bridge between Booksy (closed ecosystem, no real-time outbound API) and SavSpot during the design partner engagement; INBOUND blocking latency of 20–45 minutes is acceptable for advance bookings in the parallel-run context
8. The barber design partner engagement (90-day structured parallel run) will produce generalizable signal about migration friction, walk-in workflow viability, and competitive feature gaps applicable beyond the barber vertical to any appointment-heavy service business on a closed-ecosystem incumbent

---

## 10. Dependencies

| Dependency | Type | Risk | Mitigation |
|-----------|------|------|-----------|
| Stripe Connect | External | Low | Phase 1 provider behind PaymentProvider abstraction; Adyen + PayPal in Phase 3; offline fallback; no vendor lock-in |
| Resend | External | Low | Commodity provider; easy to switch |
| Twilio | External | Low | SMS provider for FR-COM-2a (provider SMS, Phase 1) and FR-COM-2b (client SMS, Phase 2). Commodity provider; abstracted behind the communications layer |
| Expo / React Native | Framework | Low | Well-funded backing (Expo + Meta); deferred to Phase 2 |
| Fly.io / Vercel | Hosting | Low | Portable architecture; Fly.io proven with LifePlace |
| Anthropic MCP | Protocol | Medium | Linux Foundation backed; REST API serves same purpose |
| Google Calendar API | External | Low | Required for FR-CAL-10 through FR-CAL-15 (two-way sync, Phase 1) and the design partner parallel-run bridge. Well-established API with high reliability. Revoked OAuth token risk mitigated by `calendar_connections.status` tracking and re-auth prompts |
| Booksy (CSV export) | External (indirect) | Low | Design partner import relies on Booksy's CSV export format. Not a real-time API dependency — only used at onboarding time. CSV schema changes mitigated by `column_mapping` JSONB in `import_jobs` table |

---

## 11. Glossary

| Term | Definition |
|------|-----------|
| **Tenant** | A business registered on Savspot with its own data, configuration, and booking experience |
| **Booking Flow** | Multi-step wizard guiding a client through making a reservation |
| **Booking Page** | Business's branded landing page (savspot.co/{slug}) with "Book Now" CTA |
| **Embeddable Widget** | Premium JS snippet adding booking flow to business's own website |
| **Platform Directory** | Future feature for cross-business browsing and discovery |
| **Referral Commission** | Fee on bookings from platform-sourced clients (AI agents, directory, referral links) |
| **MCP** | Model Context Protocol -- Anthropic's open standard for AI agent tool integration |
| **GMV** | Gross Merchandise Value -- total value of bookings processed |
| **Spot** | A bookable time slot, venue, or service on the platform |
| **Design Partner** | A real business owner who runs SavSpot alongside their existing booking tool for a structured engagement period (90 days), providing competitive signal, feature gap analysis, and a migration decision. Distinct from a beta tester: a design partner has an existing incumbent tool and a defined signal collection protocol. See savspot-gtm-distribution-strategy.md. |
| **Walk-In Booking** | A booking created by a staff member from the Admin CRM for a client who is physically present. Bypasses the PENDING/reservation-token state and enters CONFIRMED directly. Source = WALK_IN; always commission-free. See FR-BFW-18, SRS-3 Walk-In Booking Entry Point. |
| **Parallel Run** | The design partner phase during which the business operates SavSpot and their incumbent tool simultaneously. Google Calendar serves as the bridge, with Booksy bookings creating INBOUND calendar events that block SavSpot availability. Ends when the design partner decides to migrate fully or to exit. |
| **INBOUND Calendar Event** | A calendar event synced from an external calendar (e.g., Booksy → Google Calendar → SavSpot) with `direction = INBOUND` and `booking_id = null`. Treated as a hard availability block identical to a confirmed SavSpot booking in the availability resolver. Critical for parallel-run double-booking prevention. |
| **Two-App Tax** | The friction cost of managing bookings across two tools simultaneously during the parallel-run phase. Target: <5 minutes/day of management overhead attributable to dual-tool operation. Measured in the design partner signal collection framework (savspot-gtm-distribution-strategy.md §8). |