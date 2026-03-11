# Phase 3 Implementation Plan

**Timeline:** Months 4-6 (post Phase 2)
**Scope:** Mobile app, MCP server, Public API v1, AI Voice Receptionist, advanced analytics, accounting integrations, alternative payment providers, workflow automation builder, referral system, i18n/multi-currency

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Work Streams & Sequencing](#2-work-streams--sequencing)
3. [Stream A: Public API v1 + MCP Server](#3-stream-a-public-api-v1--mcp-server)
4. [Stream B: Mobile App (React Native + Expo)](#4-stream-b-mobile-app-react-native--expo)
5. [Stream C: Workflow Automation Builder](#5-stream-c-workflow-automation-builder)
6. [Stream D: Alternative Payment Providers](#6-stream-d-alternative-payment-providers)
7. [Stream E: Accounting Integrations](#7-stream-e-accounting-integrations)
8. [Stream F: Advanced Analytics Dashboard](#8-stream-f-advanced-analytics-dashboard)
9. [Stream G: AI Voice Receptionist](#9-stream-g-ai-voice-receptionist)
10. [Stream H: Referral System](#10-stream-h-referral-system)
11. [Stream I: i18n & Multi-Currency](#11-stream-i-i18n--multi-currency)
12. [Stream J: Cross-Tenant Benchmarking UI](#12-stream-j-cross-tenant-benchmarking-ui)
13. [Database Migrations](#13-database-migrations)
14. [Testing Strategy](#14-testing-strategy)
15. [Deployment & Rollout](#15-deployment--rollout)
16. [Risk Register](#16-risk-register)
17. [Cross-Stream Integration Specifications](#17-cross-stream-integration-specifications)
18. [Security & Compliance Specifications](#18-security--compliance-specifications)
19. [Schema Corrections & Verified Models](#19-schema-corrections--verified-models)
20. [Deferred Items & Scope Decisions](#20-deferred-items--scope-decisions)

---

## 1. Architecture Overview

### What Already Exists (Phase 1-2 Foundation)

Phase 3 builds on substantial infrastructure already in place:

| Component | Phase 1-2 Status | Phase 3 Action |
|-----------|-----------------|----------------|
| `DevicePushToken` model | Schema defined, no processors | Activate with Expo Push |
| `ReferralLink` model | Schema defined, commission logic in `payments.service.ts` | Build CRUD endpoints + admin UI |
| `WorkflowTemplate` + `WorkflowStage` models | Schema defined, basic presets exist | Build full CRUD + builder UI |
| `BookingFlowAnalytics` model | Schema defined, empty | Populate via booking session events |
| `AccountingConnection` model | Schema defined | Build OAuth flows + sync processors |
| `CategoryBenchmark` model | Phase 2 job computes data daily | Build display UI with privacy floors |
| `PaymentProviderInterface` | Stripe + Offline implementations | Add Adyen + PayPal implementations |
| `packages/mcp-server/` | Stub README only | Full MCP server implementation |
| `apps/mobile/` | Stub README only | Full React Native app |
| BullMQ with 7 queues, 45+ jobs | Production-ready infrastructure | Add ~5 new processors |
| AI Operations module | Demand, insights, risk, benchmarks | Add analytics dashboard endpoints |
| Notification preferences + channels | Full Phase 2 implementation | Wire to mobile push |

### New Infrastructure Needed

| Component | Purpose |
|-----------|---------|
| `automation_executions` table | Track workflow stage execution history |
| `webhook_endpoints` table | Store tenant-configured outgoing webhooks |
| `webhook_deliveries` table | Log webhook delivery attempts + retries |
| `api_keys` table updates | Scope-based permissions for public API |
| Expo Push service integration | Mobile push notification delivery |
| Adyen SDK integration | Alternative payment provider |
| PayPal Commerce Platform SDK | Alternative payment provider |
| QuickBooks Online API client | Accounting sync |
| Xero API client | Accounting sync |
| Twilio Voice SDK | AI Voice Receptionist call handling |

### Dependency Graph

```
Week 1-2:  [Public API v1] ──────────────────────┐
           [Schema Migration] ───┐                │
                                 ▼                ▼
Week 3-4:  [MCP Server] ◄── uses Public API   [Mobile App: Scaffold + Auth]
           [Referral CRUD]                     [Workflow Builder: Backend]
           [Payment Providers: Adyen]          [Accounting: OAuth]

Week 5-6:  [Mobile App: Booking Flow + Portal] [Accounting: Sync Jobs]
           [Workflow Builder: Frontend]         [Payment Providers: PayPal]
           [Analytics: Backend]

Week 7-8:  [Mobile App: Push + Biometric]      [Analytics: Frontend]
           [Voice Receptionist: Prototype]      [Benchmarking UI]
           [Webhooks: Outgoing]                 [i18n Infrastructure]

Week 9-10: [Mobile App: Offline + Deep Links]  [Voice Receptionist: Production]
           [Integration Testing]                [i18n: Multi-currency]

Week 11-12: [E2E Testing]  [App Store Submission]  [Documentation]  [Rollout]
```

---

## 2. Work Streams & Sequencing

### Priority Tiers

**Tier 1 — Must (Weeks 1-6, blocking):**
- Public API v1 (FR-API-*) — foundation for MCP + external integrations
- MCP Server (FR-AI-8) — AI agent ecosystem, competitive differentiator
- Mobile App core (FR-MOB-1/2/3/4a/4b/5/6/8/9) — client booking experience
- Referral System (FR-CRM-25) — enables distribution channel

**Tier 2 — Should (Weeks 3-8, high value):**
- Alternative Payment Providers (FR-PAY-15) — geographic expansion
- Workflow Automation Builder (GAP-7.1-7.5, FR-CRM-16) — power user feature
- Advanced Analytics (FR-CRM-12) — premium upsell

**Tier 3 — Could (Weeks 5-10, deferrable):**
- Accounting Integrations (FR-ACCT-1-9) — premium feature
- AI Voice Receptionist (FR-AI-7) — complex, premium
- i18n & Multi-Currency — infrastructure for Phase 4 expansion
- Cross-Tenant Benchmarking UI — display for Phase 2 data
- Payment Plans (FR-PAY-5) — low initial usage

### Parallelization Strategy

Streams are designed for maximum parallel execution:
- **Streams A+B** can begin simultaneously (no dependency)
- **Stream C** backend starts Week 3 (needs schema migration from Week 1-2)
- **Streams D+E** are independent of each other, start Week 3
- **Stream F** starts Week 5 (Phase 2 data collection must be running)
- **Stream G** starts Week 7 (needs Public API v1 for availability/booking)
- **Streams H+I+J** are small, slot into gaps

---

## 3. Stream A: Public API v1 + MCP Server

### 3.1 Public API v1

**Spec References:** SRS-2 §16, PRD FR-API-*

#### API Versioning Architecture

Create a new NestJS module at `apps/api/src/public-api/` with versioned routing:

```
apps/api/src/public-api/
├── public-api.module.ts
├── v1/
│   ├── v1.module.ts
│   ├── controllers/
│   │   ├── businesses.controller.ts      # GET /api/v1/businesses, GET /:id
│   │   ├── services.controller.ts        # GET /api/v1/services, GET /:id
│   │   ├── availability.controller.ts    # GET /api/v1/availability
│   │   ├── booking-sessions.controller.ts # POST/GET/PATCH/complete
│   │   └── bookings.controller.ts        # GET /:id, DELETE /:id
│   ├── guards/
│   │   └── api-key.guard.ts             # X-API-Key header validation
│   ├── interceptors/
│   │   └── api-version.interceptor.ts   # Sunset/Deprecation headers (RFC 8594)
│   ├── dto/
│   │   ├── list-businesses.dto.ts
│   │   ├── list-services.dto.ts
│   │   ├── availability-query.dto.ts
│   │   ├── create-booking-session.dto.ts
│   │   ├── update-booking-session.dto.ts
│   │   └── api-error.dto.ts
│   └── transformers/
│       ├── business.transformer.ts       # Internal → public shape
│       ├── service.transformer.ts
│       └── booking.transformer.ts
├── decorators/
│   └── api-key-scopes.decorator.ts      # Scope-based endpoint access
└── services/
    └── api-key.service.ts               # Key validation, scope check, rate tracking
```

#### Endpoints

**Business Discovery:**

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/businesses` | Optional API key | List published tenants. Filters: `category`, `location` (lat/lng/radius), `availability_date`. Pagination: cursor-based. |
| `GET` | `/api/v1/businesses/:id` | Optional API key | Tenant detail: name, description, category, services, availability summary, booking page URL. |

**Services:**

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/businesses/:businessId/services` | Optional API key | All active services for a business with pricing, duration, guest config, add-ons. |
| `GET` | `/api/v1/services/:id` | Optional API key | Service detail with full config: pricing models, cancellation policy, contract requirements, questionnaires. |

**Availability:**

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/availability` | API key required | Query params: `service_id` (required), `date` (required, ISO 8601), `staff_id` (optional), `guest_count` (optional, default 1). Returns available time slots with staff assignment. Uses existing `AvailabilityService.resolveSlots()`. |

**Booking Sessions:**

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/booking-sessions` | API key required | Create session. Body: `{ service_id, client_email, client_name, date, time_slot, guest_count? }`. Returns session ID + resolved steps. Sets `source = API`. |
| `GET` | `/api/v1/booking-sessions/:id` | API key required | Current state: step, field values, payment intent status. |
| `PATCH` | `/api/v1/booking-sessions/:id` | API key required | Update fields for current step. Body varies by step type. |
| `POST` | `/api/v1/booking-sessions/:id/complete` | API key required | Finalize: process payment, create booking, generate invoice, send confirmations. Returns booking ID + confirmation. |

**Bookings:**

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/bookings/:id` | API key required | Booking detail: status, service, datetime, payment, invoice, contract. |
| `DELETE` | `/api/v1/bookings/:id` | API key required | Cancel booking. Evaluates cancellation policy, processes refund if applicable. Returns refund amount + status. |

#### Authentication & Rate Limiting

**API Key Management:**
- Keys stored in `api_keys` table (already exists in schema)
- Scopes: `businesses:read`, `services:read`, `availability:read`, `bookings:read`, `bookings:write`
- Each key tied to a tenant (for write operations) or platform-level (for discovery)
- Keys displayed once on creation, hashed (SHA-256) in DB — full key never stored

**Rate Limits (per API key):**

| Scope | Limit | Window |
|-------|-------|--------|
| Unauthenticated discovery | 30 req | 1 minute |
| Authenticated read | 1000 req | 1 minute |
| Authenticated write | 100 req | 1 minute |
| Booking session create | 20 req | 1 minute |
| Failed auth attempts | 10 req then 15-min block | 1 minute |

**Discovery endpoint auth modes:**
- If `X-API-Key` header absent: unauthenticated path. Returns only tenants with `is_public = true`. Rate limit: 30 req/min per IP. No scope check.
- If `X-API-Key` header present: authenticated path. Requires `businesses:read` scope. Rate limit: 1000 req/min. Returns same `is_public = true` tenants (plus the key's own tenant regardless of `is_public` setting).

**Note on discovery rate limit:** Reduced from 100 to 30 req/min to mitigate enumeration attacks. Cursor-based pagination uses opaque encrypted cursors (not sequential IDs) to prevent scraping.

**Location-Based Filtering:**
- Uses simple Haversine distance calculation (no PostGIS dependency)
- Tenants store `latitude`/`longitude` (Decimal) from address geocoding (existing Google Maps integration)
- Query: `GET /api/v1/businesses?lat=40.7128&lng=-74.0060&radius_km=25`
- SQL: `WHERE haversine(lat, lng, tenant.lat, tenant.lng) <= radius_km`
- Index: composite index on `(latitude, longitude)` for basic filtering; full PostGIS deferred to Phase 4 if needed

**API Key Rotation:**
- `POST /api/api-keys/:id/rotate` — generates new key, old key enters 72-hour grace period (both valid)
- After grace period: old key automatically invalidated via BullMQ delayed job
- Key revocation: `DELETE /api/api-keys/:id` — immediate invalidation, no grace period
- API keys do not expire by default. Tenants can set `expiresAt` on creation.
- Compromised key: admin can immediately revoke + rotate via dashboard

**Booking Session Timeout:**
- API-created booking sessions follow the same 30-minute timeout as web sessions (SRS-3 §20)
- Existing `expireReservations` BullMQ job handles cleanup — no special treatment for API sessions
- If `POST .../complete` is called after timeout: returns 410 Gone with error code `SESSION_EXPIRED`
- Slots are released automatically when session expires

**Error Format:**
```json
{
  "error": {
    "code": "SLOT_UNAVAILABLE",
    "message": "The requested time slot is no longer available.",
    "details": { "suggested_slots": ["2026-03-15T14:00:00Z", "2026-03-15T15:00:00Z"] },
    "retry_after": null
  }
}
```

#### Implementation Steps

1. **Schema migration:** Add `scopes` JSONB column to `api_keys` table, add `is_public` boolean to `tenants` for discovery opt-in
2. **API key guard:** Validate `X-API-Key` header, resolve tenant context, check scopes
3. **Business discovery controller:** Reuse `TenantService` with public projection, add location-based filtering (PostGIS or simple lat/lng distance)
4. **Service/Availability controllers:** Thin wrappers around existing `ServiceService` and `AvailabilityService`
5. **Booking session controller:** Wraps existing `BookingSessionService`, forces `source = API`
6. **Booking controller:** Wraps existing `BookingService` for read + cancel
7. **Transformers:** Strip internal fields (tenant config, staff personal info, audit columns) from public responses
8. **Version interceptor:** Add `API-Version: v1` response header, prepare `Sunset` header infrastructure
9. **Rate limiting:** Implement `ApiKeyThrottlerGuard` extending NestJS `ThrottlerGuard`:
   - Override `getTracker()` to return API key hash (or IP for unauthenticated requests)
   - Redis key pattern: `throttle:v1:{apiKeyHash}:{scope}` with sliding window counter
   - Guard execution order: `ApiKeyGuard` (validates key, sets request context) → `ApiKeyThrottlerGuard` (checks rate limit using key context) → Handler
   - For discovery endpoints: if `X-API-Key` header present and valid, use authenticated limit (1000/min); if absent, use unauthenticated limit (30/min)
   - Failed auth tracking: `throttle:v1:failed:{clientIp}` counter (per IP, all keys); at 10 failures in 1 min, set `throttle:v1:blocked:{clientIp}` with 15-min TTL → ALL requests from that IP rejected with 429 ("IP temporarily blocked")
   - Per-key rate limit override: if `api_keys.rate_limit_override` is set, use that instead of default
   - PATCH requests (session step updates) use separate bucket with 500/min limit to support multi-step booking flows (10 steps × 50 concurrent sessions)
   - Decorator usage: `@ApiKeyThrottle({ read: 1000, write: 100, sessionCreate: 20 })`

### 3.2 MCP Server

**Spec Reference:** PRD FR-AI-8

#### Architecture

The MCP server is a standalone Node.js process in `packages/mcp-server/` that communicates with the SavSpot API via internal HTTP calls.

```
packages/mcp-server/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                    # Entry point, MCP server setup
│   ├── server.ts                   # MCP Server class
│   ├── tools/
│   │   ├── discover-businesses.ts  # Search businesses by category/location
│   │   ├── get-availability.ts     # Check real-time availability for a service
│   │   ├── create-booking.ts       # Complete booking flow (multi-step)
│   │   ├── get-booking.ts          # Retrieve booking details
│   │   ├── cancel-booking.ts       # Cancel an existing booking
│   │   └── list-services.ts        # List services for a business
│   ├── resources/
│   │   └── business-info.ts        # Business detail as MCP resource
│   ├── prompts/
│   │   └── booking-assistant.ts    # Pre-built prompt for booking conversation
│   ├── api-client.ts               # HTTP client for SavSpot Public API v1
│   └── config.ts                   # Environment config (API URL, API key)
└── tests/
    └── tools.test.ts
```

#### MCP Tools

Each tool maps to Public API v1 endpoints:

**`discover_businesses`**
- Description: "Search for service businesses by category, location, or name"
- Input schema: `{ category?: string, location?: { lat: number, lng: number, radius_km: number }, query?: string }`
- Calls: `GET /api/v1/businesses`
- Returns: List of businesses with name, category, rating, address, booking page URL

**`list_services`**
- Description: "List available services for a specific business"
- Input schema: `{ business_id: string }`
- Calls: `GET /api/v1/businesses/:id/services`
- Returns: Services with name, duration, price, description

**`check_availability`**
- Description: "Check available time slots for a service on a specific date"
- Input schema: `{ service_id: string, date: string, staff_id?: string, guest_count?: number }`
- Calls: `GET /api/v1/availability`
- Returns: Available time slots with staff names

**`create_booking`**
- Description: "Book an appointment for a client"
- Input schema: `{ service_id: string, date: string, time_slot: string, client_name: string, client_email: string, client_phone?: string, guest_count?: number, notes?: string }`
- Calls: `POST /api/v1/booking-sessions` → `PATCH` (fill fields) → `POST .../complete`
- Returns: Booking confirmation with ID, datetime, total, confirmation number

**`get_booking`**
- Description: "Get details of an existing booking"
- Input schema: `{ booking_id: string }`
- Calls: `GET /api/v1/bookings/:id`
- Returns: Full booking detail

**`cancel_booking`**
- Description: "Cancel an existing booking"
- Input schema: `{ booking_id: string, reason?: string }`
- Calls: `DELETE /api/v1/bookings/:id`
- Returns: Cancellation confirmation with refund info

#### MCP Tool Validation & Error Handling

**Input validation (applied before API call):**
- All `*_id` fields: must be valid UUID format (regex). Invalid → error `INVALID_INPUT`
- `date` fields: must be ISO 8601, must be today or future (max 90 days ahead). Past date → error `INVALID_DATE`
- `time_slot`: must match `HH:MM` format. Invalid → error `INVALID_TIME_FORMAT`
- `guest_count`: must be >= 1 and <= 50. Out of range → error `INVALID_GUEST_COUNT`
- `list_services`: returns max 100 services per call. If business has more, response includes `has_more: true`

**Tool-specific error responses (structured for LLM consumption):**

| Tool | Error Code | Scenario | LLM Hint |
|------|-----------|----------|----------|
| `create_booking` | `SLOT_UNAVAILABLE` | Slot taken | `suggested_slots` array included — offer alternatives |
| `create_booking` | `DEPOSIT_REQUIRED` | Service requires deposit | `payment_url` included — instruct user to complete payment |
| `create_booking` | `CONTRACT_REQUIRED` | Service requires contract | `contract_url` included — cannot book via MCP until signed |
| `check_availability` | `NO_SLOTS` | No availability on date | Suggest checking adjacent dates |
| `cancel_booking` | `CANCEL_FEE_APPLIES` | Within cancellation window | `fee_amount` + `refund_amount` included |
| `cancel_booking` | `NOT_CANCELLABLE` | Past booking or already cancelled | Inform user |
| Any | `RATE_LIMITED` | API key rate limit exceeded | `retry_after` seconds included |

**Rate limiting:** MCP tools inherit Public API v1 rate limits via the API key used to configure the MCP server. Tool calls that invoke the API internally count once against the rate limit (not double-counted).

#### MCP Resources

**`business://{id}`** — Business profile, services, hours, policies as a readable resource

#### MCP Prompts

**`booking_assistant`** — System prompt for an AI assistant that helps users find and book appointments:
```
You are a booking assistant for SavSpot. You help users find service businesses,
check availability, and book appointments. Always confirm details before booking.
If payment is required, inform the user of the total before proceeding.
```

#### Configuration

```env
SAVSPOT_API_URL=http://localhost:3001/api/v1  # Internal API URL
SAVSPOT_API_KEY=mcp_...                        # Platform-level API key with scoped permissions
```

#### Authentication & Security

- **API key scoping:** MCP server uses a dedicated API key with scopes: `businesses:read`, `services:read`, `availability:read`, `bookings:write`. No admin/settings scopes.
- **Network isolation:** In production, MCP server communicates with API via internal network (no public internet). API key is restricted to internal IP range via `api_keys.allowed_ips` JSONB field.
- **Rate limiting:** MCP tools are rate-limited per the Public API v1 rate limits (§3.1). Each MCP tool call maps to 1-3 API calls — the API key's rate limit applies.
- **Audit logging:** All MCP-initiated bookings are tagged `source = API` and logged in the existing audit trail with `actor_type = MCP_AGENT`. The `api_key_id` is recorded on each booking for traceability.
- **Booking confirmation:** MCP `create_booking` tool requires explicit client consent data in the request (`client_consent: true`) — the AI agent using MCP is responsible for obtaining consent before calling.

#### Deployment Model

- **Distribution:** Published as npm package (`@savspot/mcp-server`) and Docker image (`savspot/mcp-server`)
- **Hosting:** Self-hosted by consumers OR hosted by SavSpot as a managed service (SSE transport at `https://mcp.savspot.co`)
- **Updates:** Semantic versioning. Breaking changes only in major versions. Consumers pin minor version.
- **MCP protocol version:** Targets MCP 1.0 stable (released Nov 2024). SDK pinned to `@modelcontextprotocol/sdk@^1.0.0`.

#### Implementation Steps

1. Initialize package with `@modelcontextprotocol/sdk` dependency
2. Implement `api-client.ts` HTTP client with error handling, retries, and rate limit backoff
3. Implement each tool as an MCP tool handler
4. Implement business resource provider
5. Implement booking assistant prompt
6. Add stdio transport (primary) and SSE transport (production)
7. Register in `turbo.json` for build
8. Add integration tests against local API
9. Create Docker image with multi-stage build
10. Write API consumer documentation with example Claude Desktop config

---

## 4. Stream B: Mobile App (React Native + Expo)

**Spec References:** PRD FR-MOB-1 through FR-MOB-10

### 4.1 Project Setup

```
apps/mobile/
├── app.json                        # Expo config
├── eas.json                        # EAS Build config
├── package.json
├── tsconfig.json
├── babel.config.js
├── metro.config.js
├── app/
│   ├── _layout.tsx                 # Root layout (auth provider, query client)
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx               # Email + biometric login
│   │   ├── register.tsx            # Client registration
│   │   └── forgot-password.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx             # Tab navigator
│   │   ├── home.tsx                # Business discovery / saved businesses
│   │   ├── bookings.tsx            # My bookings list
│   │   ├── messages.tsx            # Messaging inbox
│   │   └── profile.tsx             # Account settings
│   ├── business/
│   │   └── [slug].tsx              # Business booking page (FR-MOB-1)
│   ├── book/
│   │   ├── [sessionId].tsx         # Booking flow wizard (FR-MOB-2)
│   │   └── confirmation.tsx        # Booking confirmation
│   ├── booking/
│   │   └── [id].tsx                # Booking detail (FR-MOB-3)
│   ├── portal/
│   │   ├── index.tsx               # Client portal dashboard
│   │   ├── payments.tsx            # Payment history
│   │   └── preferences.tsx         # Notification preferences
│   └── review/
│       └── [bookingId].tsx         # Submit review with photos (FR-MOB-10)
├── components/
│   ├── booking/
│   │   ├── ServiceSelector.tsx
│   │   ├── DateTimePicker.tsx
│   │   ├── GuestConfig.tsx
│   │   ├── QuestionnaireStep.tsx
│   │   ├── ContractSignature.tsx
│   │   ├── AddOnSelector.tsx
│   │   ├── PaymentStep.tsx
│   │   └── PricingSummary.tsx
│   ├── common/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   └── LoadingSpinner.tsx
│   └── portal/
│       ├── BookingCard.tsx
│       ├── PaymentCard.tsx
│       └── MessageThread.tsx
├── hooks/
│   ├── useAuth.ts                  # Auth state + biometric
│   ├── useBookingSession.ts        # Booking flow state
│   ├── usePushNotifications.ts     # Expo push registration
│   └── useOfflineCache.ts          # Offline data management
├── services/
│   ├── api.ts                      # API client (TanStack Query)
│   ├── auth.ts                     # Token management + secure storage
│   ├── push.ts                     # Push notification service
│   └── offline.ts                  # SQLite offline cache
├── stores/
│   └── auth.store.ts               # Zustand auth store
├── utils/
│   ├── deeplink.ts                 # Deep link handler
│   ├── secure-storage.ts           # iOS Keychain / Android Keystore wrapper
│   └── biometric.ts                # Face ID / Touch ID
└── __tests__/
```

### 4.2 Tech Stack Decisions

| Concern | Choice | Rationale |
|---------|--------|-----------|
| Framework | Expo SDK 54+ with Expo Router | File-based routing, OTA updates, EAS Build |
| State | Zustand | Spec mandates divergence from web's Context API for mobile-appropriate patterns |
| Server state | TanStack Query (React Query) | Caching, offline support, background refetch |
| Offline storage | expo-sqlite | Structured offline cache for bookings + business data |
| Secure storage | expo-secure-store | iOS Keychain / Android Keystore abstraction |
| Biometric | expo-local-authentication | Face ID, Touch ID, fingerprint |
| Push | expo-notifications + Expo Push | Token registration, notification handling |
| Navigation | Expo Router (file-based) | Consistency with Next.js patterns |
| Deep linking | Expo Router linking config | `savspot://` scheme + universal links |
| Image picker | expo-image-picker | Review photo uploads (FR-MOB-10) |
| Payment | @stripe/stripe-react-native | Stripe payment sheet for booking payments |

### 4.3 Feature Implementation Detail

#### FR-MOB-1: Business Booking Page

**Screen:** `app/business/[slug].tsx`

Displays:
- Business name, logo, category, rating, address
- Service list with pricing (cards, expandable for details)
- "Book Now" button per service → navigates to booking flow
- Business hours display
- Gallery photos (horizontal scroll)
- Reviews summary (latest 3 + "See all" link)

**Data source:** `GET /api/v1/businesses/:id` (existing public-booking endpoints, not new v1 API — mobile accesses same internal API as web with JWT auth)

**Note on API access:** The mobile app uses the same internal API as the web app, authenticated via JWT. The Public API v1 is for external consumers (AI agents, third-party integrations). Mobile uses:
- `GET /public-booking/:slug` — business page data
- `GET /public-booking/:slug/services` — service list
- `GET /availability?serviceId=...&date=...` — slot availability

#### FR-MOB-2: Booking Flow Wizard

**Screen:** `app/book/[sessionId].tsx`

Full feature parity with web booking flow:
1. Service selection (if not pre-selected)
2. Date/time selection with availability grid
3. Guest configuration (if service supports guests)
4. Questionnaire responses (if service has questionnaires)
5. Contract signature (if service requires contract — use SignatureCanvas RN library)
6. Add-on selection (if service has add-ons)
7. Pricing summary with discount code input
8. Payment (Stripe payment sheet via `@stripe/stripe-react-native`)
9. Confirmation screen

**Implementation:**
- Reuse `BookingSessionService` step resolution logic from backend
- `useBookingSession` hook manages local step state + server sync
- Each step is a component rendered by step type from `BookingFlowStepType` enum
- "Back" / "Next" navigation with validation per step
- Payment handled via Stripe PaymentSheet (native UI, no webview)

#### FR-MOB-3: Client Portal

**Screens:** `app/(tabs)/bookings.tsx`, `app/booking/[id].tsx`, `app/portal/*`

Portal features:
- **Upcoming bookings:** List with status badges, countdown timer
- **Booking detail:** Service info, datetime, staff, status, payment info, invoice download, contract view
- **History:** Past bookings with rebooking option
- **Payments:** Payment history, payment method management (Stripe Customer Portal link)
- **Messaging:** Thread view with business staff

**Data source:** Existing client portal API endpoints (`/client-portal/*`)

#### FR-MOB-4a/4b: Push Notifications

**Permission request timing:**
- NOT on first app launch (poor UX, low opt-in rate)
- Triggered after first successful booking OR when user navigates to notifications settings
- Pre-permission prompt (in-app): "Would you like booking reminders and updates?" → if yes, trigger OS permission dialog
- If denied: graceful fallback to email/SMS only. Show banner in settings: "Push notifications are disabled. Enable in device settings."

**Registration flow:**
1. User opts in → request notification permission (`expo-notifications`)
2. Get Expo push token
3. `POST /api/device-push-tokens` with `{ token, deviceType: 'IOS'|'ANDROID', deviceName }`
4. Token stored in `DevicePushToken` table (already defined — verified: has `userId`, `token` (unique), `deviceType`, `deviceName`, `isActive`, `failureCount`, `lastUsedAt`)

**Push infrastructure setup:**
- Expo Push API handles FCM (Android) and APNs (iOS) delivery transparently — SavSpot does NOT need separate Firebase/APNs credentials
- SavSpot uses a single Expo access token (`EXPO_ACCESS_TOKEN`) for all tenants. Expo Push is tenant-agnostic; tenant isolation is handled at the SavSpot application layer (which tokens to send to)
- No per-tenant Firebase/APNs setup required — this is a key advantage of Expo Push over raw FCM/APNs

**Token refresh:**
- On app update or Expo token change, `expo-notifications` emits token change event (typically on app launch after ~30 days)
- App calls `PATCH /api/device-push-tokens/:id` with new token
- If PATCH fails (network offline): retry on next app launch via queue in `expo-sqlite`
- During transition: both old and new tokens may receive pushes; this is harmless (duplicate notification at worst)

**Pre-permission prompt UX:**
- In-app modal after first successful booking: "Get booking reminders and updates?" with [Enable] and [Not Now] buttons
- Tapping [Enable]: triggers OS permission dialog via `expo-notifications`
- Tapping [Not Now]: dismiss modal, re-show in notification settings page only (not auto-prompted again)
- User can enable push later via Settings > Notifications in the app

**Multi-device:** Same user logged in on 2 devices → 2 `DevicePushToken` records. Both receive push notifications. Deduplication: not needed (each device should get the notification independently).

**Notification delivery (backend changes):**
- New processor in communications queue: `deliverExpoPush`
- Uses Expo Push API (`expo-server-sdk`) to send notifications
- Payload: `{ title, body, data: { type, entityId } }` — `data` used for deep linking on tap
- Token deactivation: `failureCount` incremented on DeviceNotRegistered error, deactivated at 5 failures
- Scheduled cleanup: deactivate tokens unused > 90 days

**Notification types (tied to existing `NotificationPreference` toggles):**
- Booking confirmation
- Booking reminder (24h, 1h before)
- Booking status change (confirmed, cancelled, rescheduled)
- Payment received / payment failed
- New message from business
- Review request (post-appointment)

**Per-channel configuration:**
- Existing `notification_preferences` table has per-channel toggles (email, sms, push, in_app)
- Mobile settings screen allows toggling push for each notification type

#### FR-MOB-5/6: Biometric Auth + Secure Storage

**Login flow:**
1. First login: email + password (or OAuth) → receive JWT access + refresh tokens
2. Store tokens in `expo-secure-store` (iOS Keychain / Android Keystore)
3. Prompt to enable biometric: "Use Face ID/Touch ID for future logins?"
4. If enabled, store biometric preference flag in secure store
5. Subsequent app launches: check biometric preference → `LocalAuthentication.authenticateAsync()` → load tokens from secure store → validate with API
6. If biometric fails or unavailable: fall back to email + password

**Token refresh:**
- TanStack Query interceptor checks 401 responses
- On 401: attempt refresh with stored refresh token
- If refresh fails: clear secure store, redirect to login

#### FR-MOB-8/9: Deep Linking

**URL scheme:** `savspot://`
**Universal links:** `https://savspot.co/`

**Route mapping:**

| Deep Link | App Route | Use Case |
|-----------|-----------|----------|
| `savspot://business/{slug}` | `app/business/[slug]` | Open business page from push notification or external link |
| `savspot://booking/{id}` | `app/booking/[id]` | Open booking detail from reminder notification |
| `savspot://book/{sessionId}` | `app/book/[sessionId]` | Resume booking flow (session retrieved via `GET /api/booking-sessions/:id`) |
| `savspot://portal` | `app/portal/index` | Open client portal |
| `savspot://messages` | `app/(tabs)/messages` | Open messaging |

**Implementation:**
- Expo Router `linking` config in `app/_layout.tsx`
- Push notification `data.type` + `data.entityId` → construct deep link → navigate
- Universal links: associate domain file at `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json`

**Security:**
- All deep link parameters validated: `entityId` must be valid UUID format (regex check before API call)
- Authentication check: if user is not logged in, deep link target is saved → redirect to login → on success, navigate to saved target
- Sensitive screens (payment history, booking detail): require active auth session (JWT not expired). If expired, biometric/password re-auth required.
- No sensitive data in deep link URL itself (only IDs, never tokens or PII)
- Rate limiting: deep link navigation triggers same API rate limits as normal navigation

**Booking session resume flow (deep link `savspot://book/{sessionId}`):**
1. App receives deep link → extracts `sessionId`
2. Calls `GET /api/booking-sessions/:sessionId` (existing endpoint, returns session state including current step, accumulated data, reservation expiry)
3. If 200: navigate to `app/book/[sessionId]` with pre-loaded state → user resumes from last completed step
4. If 404 or 410 (expired): show toast "This booking session has expired" → navigate to business page to start fresh
5. If 403 (wrong tenant/user): show toast "Unable to access this booking" → navigate to home
6. Session IDs are sent in abandoned booking recovery emails (FR-BFW-14) and push notifications

#### FR-MOB-7: Offline Mode (Should Priority)

**Scope:** Read-only offline access to previously viewed data. No offline booking creation.

**Cached tables (via expo-sqlite):**

| Table | What's Cached | Max Entries |
|-------|--------------|-------------|
| `cached_businesses` | Business name, logo URL, category, address, hours | 50 most recently viewed |
| `cached_bookings` | User's upcoming + last 20 past bookings (id, service, datetime, status, staff) | 30 |
| `cached_services` | Services for businesses user has booked with (name, duration, price) | 100 |

**Sync strategy:**
- On app launch + every 15 minutes (if online): incremental sync via TanStack Query background refetch
- Backend support: relevant list endpoints (`/api/bookings`, `/api/client-portal/bookings`) accept `?updated_since=ISO_DATE` query param, returning only records modified after that timestamp. This avoids full data re-fetch on each sync.
- Stale indicator: show "Last updated X minutes ago" banner when offline
- Conflict resolution: not needed — offline is strictly read-only. No offline booking creation. Server state always wins on sync. If a cached booking's status differs from server (e.g., cached `CONFIRMED` → server `CANCELLED`), the cache is updated silently; booking card shows brief "Updated" badge for 5 seconds.
- If user is viewing a booking detail screen when sync updates that booking, the screen refreshes in-place (React Query `onSuccess` callback updates cache → component re-renders).

**Cache security:**
- SQLite database encrypted using SQLCipher via `expo-sqlite` with encryption key stored in `expo-secure-store`
- Encryption key derived from: `PBKDF2(userId + tenantId, salt)` — unique per user+tenant combination
- Cache key structure: `{tenantId}:{entityType}:{entityId}` — ensures tenant isolation on shared devices
- On tenant switch: only cache entries matching new `tenantId` are queryable
- On logout: `DELETE FROM cache WHERE tenant_id = ?` (current tenant only, preserving other tenant caches if user has multiple accounts)
- On "Logout all": clear entire SQLite database

**Cache eviction:**
- Data older than 30 days auto-purged
- Manual refresh button clears and re-fetches
- On logout: current tenant's cached data cleared from SQLite (see above)

#### FR-MOB-10: Review Submission with Photos (Should Priority)

**Screen:** `app/review/[bookingId].tsx`

- Star rating (1-5)
- Text review
- Photo picker (up to 5 photos via `expo-image-picker`)
- Photos uploaded to R2 via existing `UploadService` presigned URL flow
- Submits to existing `POST /reviews` endpoint with photo URLs

### 4.4 Backend Changes for Mobile

**New endpoints:**

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/api/device-push-tokens` | `JwtAuthGuard` | Register push token. Body: `{ token, deviceType, deviceName }`. `userId` set from `req.user.id` (cannot register for other users). Rate limit: 20 req/min per user. |
| `DELETE` | `/api/device-push-tokens/:id` | `JwtAuthGuard` | Deregister token. Ownership enforced: `token.userId == req.user.id`. |
| `PATCH` | `/api/device-push-tokens/:id` | `JwtAuthGuard` | Update token after Expo refresh. Ownership enforced: `token.userId == req.user.id`. |

**New BullMQ processor:**
- `deliverExpoPush` in communications queue — sends via Expo Push API

**New dependencies (API):**
- `expo-server-sdk` — server-side Expo Push API client

**Modified services:**
- `CommunicationsService.deliver()` — add `PUSH` channel alongside EMAIL, SMS, BROWSER_PUSH
- `NotificationService` — route to Expo Push when preference channel = PUSH and device tokens exist

### 4.5 Build & Deployment

**EAS Build Configuration (`eas.json`):**
```json
{
  "cli": { "version": ">= 15.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": { "simulator": true }
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {
      "ios": { "appleId": "...", "ascAppId": "...", "appleTeamId": "..." },
      "android": { "serviceAccountKeyPath": "./google-services.json" }
    }
  }
}
```

**OTA Updates:** `expo-updates` for JS bundle updates without App Store review
**E2E Testing:** Maestro flows for critical paths (login, booking, payment)

---

## 5. Stream C: Workflow Automation Builder

**Spec References:** PRD FR-CRM-16, GAP-7.1 through GAP-7.5

### 5.1 Current State

Phase 1-2 has:
- `WorkflowAutomation` — simple trigger → action records (preset only, no CRUD)
- `WorkflowTemplate` — multi-stage template schema (defined, not implemented)
- `WorkflowStage` — stages with action types and progression conditions (defined, not implemented)
- `BookingWorkflowOverride` — per-booking overrides (defined, not implemented)
- Event-driven workflow engine (`WorkflowsService` listening to domain events)
- 20+ `WorkflowTriggerEvent` enum values already defined

### 5.2 Backend Implementation

#### New/Updated Files

```
apps/api/src/workflows/
├── workflows.module.ts              # Update: register new services/controllers
├── workflows.service.ts             # Update: expand execution engine
├── workflows.controller.ts          # Update: add template CRUD endpoints
├── services/
│   ├── template.service.ts          # NEW: CRUD for workflow templates
│   ├── stage.service.ts             # NEW: CRUD for workflow stages
│   ├── execution.service.ts         # NEW: Stage execution tracking
│   └── webhook-dispatch.service.ts  # NEW: Outgoing webhook delivery
├── processors/
│   ├── workflow-stage.processor.ts  # NEW: BullMQ processor for delayed stages
│   └── webhook-dispatch.processor.ts # NEW: BullMQ processor for webhook delivery
└── dto/
    ├── create-template.dto.ts
    ├── update-template.dto.ts
    ├── create-stage.dto.ts
    ├── update-stage.dto.ts
    └── booking-override.dto.ts
```

#### Template CRUD API

**Authorization:** All workflow endpoints require `JwtAuthGuard` + `TenantGuard` + `@RequireRole(OWNER, ADMIN)`. STAFF role has read-only access to templates and execution logs but cannot create, edit, or delete.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/tenants/:tenantId/workflow-templates` | List templates (with stage count, active status) |
| `POST` | `/api/tenants/:tenantId/workflow-templates` | Create template with trigger event + stages |
| `GET` | `/api/workflow-templates/:id` | Template detail with all stages |
| `PATCH` | `/api/workflow-templates/:id` | Update template metadata |
| `DELETE` | `/api/workflow-templates/:id` | Soft delete template |
| `POST` | `/api/workflow-templates/:id/duplicate` | Clone template |

#### Stage CRUD API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/workflow-templates/:templateId/stages` | List stages in order |
| `POST` | `/api/workflow-templates/:templateId/stages` | Add stage (auto-assigns order) |
| `PATCH` | `/api/workflow-stages/:id` | Update stage config |
| `DELETE` | `/api/workflow-stages/:id` | Remove stage (reorder remaining) |
| `POST` | `/api/workflow-templates/:templateId/stages/reorder` | Bulk reorder stages |

#### Execution API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/workflow-templates/:id/executions` | List executions for template (paginated, filterable by status/date) |
| `GET` | `/api/automation-executions/:id` | Execution detail with stage-by-stage results |
| `POST` | `/api/automation-executions/:id/retry` | Retry failed execution from failed stage |
| `POST` | `/api/tenants/:tenantId/automation-executions/retry-failed` | Bulk retry all failed executions in date range |

#### Stage Execution Engine

When a workflow trigger event fires:

```
1. Domain event fires (e.g., BOOKING_CONFIRMED)
2. WorkflowsService.handleEvent() finds matching active templates for tenant
3. For each matching template:
   a. Check if booking has override (BookingWorkflowOverride) that skips this template
   b. Create AutomationExecution record (status: PENDING)
   c. Execute Stage 1 immediately (or schedule if TIME_DELAY)
   d. On stage completion, evaluate next stage's progression condition:
      - TIME_DELAY: Schedule BullMQ delayed job with `delay` from stage config
      - ON_TRIGGER: Create `pending_trigger` record in `automation_executions.stage_results` JSONB.
        When any domain event fires, `WorkflowsService.handleEvent()` also checks for pending triggers
        matching the event type + entity ID. Race condition mitigation: if trigger event fires before
        listener is registered (within same transaction), the event handler runs after commit via
        `afterCommit` hook, ensuring the pending trigger record exists. TTL: 30 days — if trigger
        never fires, execution marked FAILED with reason "trigger_timeout".
      - MANUAL_APPROVAL: Create approval notification via `NotificationService` to stage's
        `approverRole` (OWNER, ADMIN, or specific staff ID). Approval endpoint:
        `POST /api/automation-executions/:id/stages/:stageId/approve` (body: `{ decision: 'APPROVED' | 'REJECTED' }`)
        Timeout: configurable per stage (default 72h) — if not approved, execution pauses with status
        `AWAITING_APPROVAL`. No auto-reject on timeout — remains pending until acted upon or manually cancelled.
      - CONDITIONAL_CHECK: Evaluate simple field comparisons against booking/payment data.
        Expression format (Phase 3): `{ field: "booking.totalAmount", operator: ">=", value: 100 }`
        Supported operators: `==`, `!=`, `>`, `<`, `>=`, `<=`. Fields: any top-level booking or payment field.
        Complex boolean expressions (AND/OR) deferred to Phase 4. If condition is false, stage is skipped
        (not failed), execution proceeds to next stage.
   e. Continue until all stages complete or a stage fails
4. Update AutomationExecution status (SUCCEEDED or FAILED)
```

#### Schema Migration: `automation_executions`

```prisma
model AutomationExecution {
  id                String   @id @default(uuid()) @db.Uuid
  tenantId          String   @db.Uuid
  templateId        String   @db.Uuid
  bookingId         String?  @db.Uuid
  currentStageId    String?  @db.Uuid
  triggerEvent      WorkflowTriggerEvent       // Which event triggered this execution
  triggerEventData  Json?                       // Snapshot of event payload for audit/replay
  status            AutomationExecutionStatus @default(PENDING)
  startedAt         DateTime @default(now())
  completedAt       DateTime?
  error             String?
  stageResults      Json?    // Array of { stageId, status, executedAt, duration_ms, error?, retryCount }

  tenant            Tenant           @relation(fields: [tenantId], references: [id])
  template          WorkflowTemplate @relation(fields: [templateId], references: [id])
  booking           Booking?         @relation(fields: [bookingId], references: [id])
  currentStage      WorkflowStage?   @relation(fields: [currentStageId], references: [id])

  @@index([tenantId])
  @@index([bookingId])
  @@index([status])
  @@map("automation_executions")
}

enum AutomationExecutionStatus {
  PENDING
  IN_PROGRESS
  AWAITING_APPROVAL
  SUCCEEDED
  FAILED
  CANCELLED
}
```

#### Error Handling & Notification Strategy

**Stage failure behavior:**
- On stage failure: retry the specific stage up to 3 times with 1-minute backoff
- After 3 retries: mark stage as FAILED in `stageResults`, skip to next stage (workflow continues)
- Exception: if stage has `isOptional = false` and fails, halt entire workflow → status = FAILED
- All non-optional stages must succeed for workflow to reach SUCCEEDED status

**Admin notification on failure:**
- Single stage failure (optional): no immediate notification, visible in execution log
- Non-optional stage failure (workflow halted): in-app notification + email to tenant admin
- 5+ workflow failures in 1 hour for same template: in-app banner "Workflow [name] is experiencing errors — review execution log"

**Dead-letter handling:**
- Failed executions retained for 90 days (queryable via API)
- `POST /api/automation-executions/:id/retry` — re-run from failed stage with original trigger data
- Bulk retry: `POST /api/tenants/:tenantId/automation-executions/retry-failed` — retry all failed in date range
```

#### Stage Action Implementations

| Action Type | Implementation |
|-------------|---------------|
| `SEND_EMAIL` | Queue email via `CommunicationsService.deliver()` using template from `automationConfig.templateId` |
| `SEND_SMS` | Queue SMS via `CommunicationsService.deliver()` |
| `SEND_PUSH` | Queue push via new Expo Push processor |
| `SEND_NOTIFICATION` | Create in-app notification record |
| `CREATE_FOLLOWUP` | Create a follow-up booking suggestion (links to rebooking flow) |
| `ADD_NOTE` | Create internal note on booking via `NotesService` |
| `UPDATE_STATUS` | Update booking status (within valid state transitions) |

#### Per-Booking Overrides (GAP-7.4)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/bookings/:bookingId/workflow-overrides` | List overrides for booking |
| `POST` | `/api/bookings/:bookingId/workflow-overrides` | Add override (skip template, skip stage, custom timing) |
| `DELETE` | `/api/booking-workflow-overrides/:id` | Remove override |

Override types:
- `SKIP_TEMPLATE` — Entire template skipped for this booking. Fields: `templateId` (required)
- `SKIP_STAGE` — Specific stage skipped. Fields: `stageId` (required)
- `CUSTOM_DELAY` — Override time delay for a stage. Fields: `stageId` (required), `delayMinutes` (required)
- `ADD_STAGE` — Temporary additional stage for this booking only. Fields: `afterStageId`, `automationType`, `automationConfig`. Inserted in execution order after specified stage. Limited to simple action types in Phase 3: `SEND_EMAIL`, `SEND_SMS`, `SEND_PUSH`, `ADD_NOTE`, `UPDATE_STATUS`. If `afterStageId` is skipped via `SKIP_STAGE`, the added stage runs after the last non-skipped stage before it.

**Override precedence:** Booking-level overrides take priority over template defaults. If a stage is both skipped by override AND has a custom delay override, skip wins.

**UI location:** Booking detail page in Admin CRM → "Automations" tab → toggle/configure per-stage overrides. Also accessible during booking creation in admin CRM (advanced section).

**Webhook interaction:** Overrides do NOT affect outgoing webhook firing — webhooks fire based on the trigger event, not the workflow template. A skipped template still fires webhooks for the trigger event.

### 5.3 Outgoing Webhooks (GAP-7.5)

#### Schema Migration: `webhook_endpoints` + `webhook_deliveries`

```prisma
model WebhookEndpoint {
  id              String   @id @default(uuid()) @db.Uuid
  tenantId        String   @db.Uuid
  url             String   // Must be HTTPS
  secret          String   // HMAC-SHA256 signing secret (generated, encrypted at rest via AES-256-GCM)
  previousSecret  String?  // Previous secret during rotation grace period
  secretRotatedAt DateTime? // When secret was last rotated (previous valid for 72h after)
  events          String[] // Array of WorkflowTriggerEvent values to subscribe to
  isActive        Boolean  @default(true)
  maxAttempts     Int      @default(5) // Per-endpoint retry limit (1-10)
  timeoutSeconds  Int      @default(10) // Per-endpoint timeout (5-30)
  description     String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  tenant          Tenant             @relation(fields: [tenantId], references: [id])
  deliveries      WebhookDelivery[]

  @@index([tenantId])
  @@map("webhook_endpoints")
}

model WebhookDelivery {
  id              String   @id @default(uuid()) @db.Uuid
  endpointId      String   @db.Uuid
  event           String   // WorkflowTriggerEvent value
  idempotencyKey  String   @unique // Format: "{event}:{entityId}:{deliveryUUID}" — unique per delivery, deduplication via endpoint+event+entityId composite check
  payload         Json     // Full event payload sent
  requestHeaders  Json?    // Headers sent (for audit, excludes secret)
  responseStatus  Int?     // HTTP status code from target
  responseBody    String?  // First 1KB of response
  status          WebhookDeliveryStatus @default(PENDING)
  attemptCount    Int      @default(0)
  nextRetryAt     DateTime?
  createdAt       DateTime @default(now())
  completedAt     DateTime?

  endpoint        WebhookEndpoint @relation(fields: [endpointId], references: [id])

  @@index([endpointId])
  @@index([status, nextRetryAt])
  @@map("webhook_deliveries")
}

enum WebhookDeliveryStatus {
  PENDING
  SUCCEEDED
  FAILED
  RETRYING
}
```

#### Webhook Dispatch Logic

1. When a workflow trigger event fires, check for active webhook endpoints subscribed to that event
2. Generate idempotency key: `{event}:{entityId}:{deliveryUUID}` where `deliveryUUID` is the WebhookDelivery record ID. Deduplication: before creating delivery, check if a delivery with same `(endpointId, event, entityId)` already exists within the last 60 seconds — if so, skip (prevents duplicate domain events from creating multiple deliveries). Retries reuse the same delivery record and idempotency key. Keys retained for 30 days for audit, then garbage-collected by weekly BullMQ cleanup job.
3. Create `WebhookDelivery` record (status: PENDING)
4. Queue BullMQ job: `dispatchWebhook`
5. Processor:
   a. Build payload: `{ event, timestamp, delivery_id, data: { booking, payment, client, ... } }`
   b. Include `timestamp` (ISO 8601) in payload — receivers should reject payloads older than 5 minutes (documented in webhook consumer guide)
   c. Sign payload: `HMAC-SHA256(secret, JSON.stringify(payload))` → `X-SavSpot-Signature` header
   d. Also include `X-SavSpot-Delivery-Id` (for deduplication) and `X-SavSpot-Timestamp` headers
   e. POST to endpoint URL with per-endpoint timeout (default 10s)
   f. On 2xx: mark SUCCEEDED
   g. On non-2xx or timeout: increment `attemptCount`, recompute signature with same payload (signature is always fresh per attempt), schedule retry with exponential backoff
   h. Retry schedule: 1m, 5m, 30m, 2h, 12h (up to `endpoint.maxAttempts`, default 5)
   i. After max failures: mark FAILED, send notification to tenant admin via email
   j. Circuit breaker: if endpoint has 10 consecutive FAILED deliveries across different events, auto-disable endpoint (`isActive = false`) and notify admin

**Secret Rotation:**
- `POST /api/webhooks/:id/rotate-secret` — generates new secret, moves current to `previousSecret`, sets `secretRotatedAt`
- During 72-hour grace period: deliveries are signed with new secret, but consumer can verify against either secret
- After 72h: `previousSecret` cleared by BullMQ cleanup job
- Rotation audit: logged in tenant audit trail

**Webhook Payload Versioning:**
- All payloads include `"version": "1"` field
- Non-breaking additions (new fields) added to v1 without version bump
- Breaking changes (renamed/removed fields) require v2 — consumer subscribes to specific version via `events` array format: `"BOOKING_CREATED:v1"`
- Minimum 6-month support for previous version after new version release

#### Webhook Management API

**Authorization:** All webhook endpoints require `JwtAuthGuard` + `TenantGuard` + `@RequireRole(OWNER, ADMIN)`. STAFF role cannot manage webhooks (per SRS-2 permission matrix). Secret rotation endpoint (`POST /api/webhooks/:id/rotate-secret`) also requires OWNER or ADMIN.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/tenants/:tenantId/webhooks` | List webhook endpoints |
| `POST` | `/api/tenants/:tenantId/webhooks` | Create endpoint (returns signing secret once) |
| `PATCH` | `/api/webhooks/:id` | Update URL, events, active status |
| `DELETE` | `/api/webhooks/:id` | Delete endpoint + pending deliveries |
| `POST` | `/api/webhooks/:id/test` | Send test payload to verify endpoint |
| `POST` | `/api/webhooks/:id/rotate-secret` | Rotate signing secret (72h grace period) |
| `GET` | `/api/webhooks/:id/deliveries` | List delivery log with status, pagination |

### 5.4 Frontend: Workflow Builder UI

**Route:** `/settings/workflows`

**Pages:**

| Route | Component | Purpose |
|-------|-----------|---------|
| `/settings/workflows` | `WorkflowListPage` | List templates with active toggle, duplicate, delete |
| `/settings/workflows/new` | `WorkflowBuilderPage` | Visual builder: select trigger, add stages, configure actions |
| `/settings/workflows/[id]` | `WorkflowBuilderPage` | Edit existing template |
| `/settings/workflows/[id]/executions` | `ExecutionLogPage` | View execution history with stage-by-stage status |

**Workflow Builder UI Components:**

```
components/workflows/
├── TriggerSelector.tsx          # Dropdown of 20+ trigger events with descriptions
├── StageList.tsx                # Sortable list of stages (drag-to-reorder)
├── StageCard.tsx                # Individual stage: action type, condition, config
├── StageConfigPanel.tsx         # Right panel: configure selected stage
├── ActionTypeSelector.tsx       # 7 action types with icons
├── ConditionConfigurator.tsx    # TIME_DELAY, ON_TRIGGER, MANUAL_APPROVAL, CONDITIONAL_CHECK
├── EmailTemplateSelector.tsx    # Pick from existing email templates
├── ConditionalBuilder.tsx       # Simple condition builder (field, operator, value)
└── ExecutionTimeline.tsx        # Visual timeline of execution stages
```

**Webhook Management UI:**

| Route | Component | Purpose |
|-------|-----------|---------|
| `/settings/webhooks` | `WebhookListPage` | List endpoints with active toggle, test button |
| `/settings/webhooks/new` | `WebhookFormPage` | Create: URL, event selection, description |
| `/settings/webhooks/[id]` | `WebhookFormPage` | Edit endpoint |
| `/settings/webhooks/[id]/deliveries` | `DeliveryLogPage` | Delivery attempts with status, response, retry info |

---

## 6. Stream D: Alternative Payment Providers

**Spec Reference:** PRD FR-PAY-15

### 6.1 Architecture

The existing `PaymentProviderInterface` in `apps/api/src/payments/payment-provider.interface.ts` already defines the abstraction. Phase 3 adds two new implementations.

#### Provider Selection

```
tenants.paymentProvider: 'STRIPE' | 'ADYEN' | 'PAYPAL' | 'OFFLINE'
```

At runtime, the `PaymentsService` resolves the provider implementation via NestJS factory provider:

```typescript
// payments.module.ts — updated provider factory
{
  provide: PAYMENT_PROVIDER,
  useFactory: (stripe, adyen, paypal, offline, tenantContext) => {
    const provider = tenantContext.get('paymentProvider');
    switch (provider) {
      case 'STRIPE': return stripe;
      case 'ADYEN': return adyen;
      case 'PAYPAL': return paypal;
      default: return offline;
    }
  },
  inject: [StripeProvider, AdyenProvider, PayPalProvider, OfflineProvider, TenantContextService],
}
```

### 6.2 Adyen Implementation

```
apps/api/src/payments/providers/
├── stripe.provider.ts       # Existing
├── offline.provider.ts      # Existing
├── adyen.provider.ts        # NEW
└── paypal.provider.ts       # NEW
```

**Adyen Provider Methods:**

| Method | Adyen API | Notes |
|--------|-----------|-------|
| `createConnectedAccount` | Adyen for Platforms — create sub-merchant account | Business onboarding with KYC |
| `getOnboardingLink` | Hosted onboarding page URL | Similar to Stripe Connect onboarding |
| `getDashboardLink` | Adyen Customer Area deep link | Sub-merchant dashboard |
| `getAccountStatus` | Account Holder details API | KYC status, payout schedule |
| `createPaymentIntent` | Checkout API — create session | Split payment with `splits` array for platform fee |
| `cancelPaymentIntent` | Checkout API — cancel | Void pending payment |
| `createRefund` | Refund API | Full or partial refund |

**Platform fee mechanism:** Adyen Split Payment API — `splits: [{ amount, type: 'MarketPlace', account: platformAccount }]`

**Tenant onboarding flow:**
1. Tenant selects "Adyen" as payment provider in Settings > Payments
2. SavSpot calls Adyen Platforms API → `POST /createAccountHolder` with tenant legal name, country, email
3. Adyen returns `accountHolderCode` → stored in `payment_provider_account_id` on tenant record
4. SavSpot generates onboarding link via `getOnboardingLink()` → tenant redirected to Adyen-hosted KYC page
5. Adyen sends `ACCOUNT_HOLDER_VERIFICATION` webhook → SavSpot updates onboarding status
6. Required fields: legal business name, country, bank account (IBAN or routing+account), tax ID (optional per country)
7. SavSpot is the **marketplace/platform** (not merchant of record). Each tenant is a sub-merchant. Adyen fees charged to SavSpot's platform account, passed through to tenant as part of platform fee.

**FX handling:** Adyen's split payments require same currency for both sides. If booking is in EUR and platform fee is in USD, Adyen auto-converts at their rate. No SavSpot-side conversion needed for Adyen payments.

**Dependencies:** `@adyen/api-library` npm package

### 6.3 PayPal Commerce Platform Implementation

**PayPal Provider Methods:**

| Method | PayPal API | Notes |
|--------|-----------|-------|
| `createConnectedAccount` | Partner Referrals API — create referral | Onboard merchant via PayPal Commerce Platform |
| `getOnboardingLink` | Partner referral action URL | PayPal-hosted onboarding |
| `getDashboardLink` | PayPal Business dashboard URL | Redirect to merchant's PayPal |
| `getAccountStatus` | Show Merchant Status | Onboarding status + capabilities |
| `createPaymentIntent` | Orders API — create order | `partner_fee` in `payment_instruction` for platform fee |
| `cancelPaymentIntent` | Orders API — void | Cancel unfulfilled order |
| `createRefund` | Payments API — refund captured payment | Full or partial |

**Platform fee mechanism:** `payment_instruction.platform_fees: [{ amount, payee: { merchant_id: platformAccount } }]`

**Tenant onboarding flow:**
1. Tenant selects "PayPal" as payment provider in Settings > Payments
2. SavSpot calls PayPal Partner Referrals API → creates partner referral with required scopes (`PPCP`, `PAYMENT`, `REFUND`)
3. PayPal returns `action_url` → tenant redirected to PayPal-hosted onboarding
4. Tenant logs in to PayPal (or creates account) and grants permissions
5. PayPal sends `MERCHANT.ONBOARDING.COMPLETED` webhook → SavSpot stores `merchant_id` in `payment_provider_account_id`
6. No additional KYC required by SavSpot — PayPal handles all compliance on their platform
7. SavSpot is the **platform partner**. Fees collected via `platform_fees` on each order.

**FX handling:** PayPal `partner_fee` must match order currency. If booking is in GBP, platform fee is expressed in GBP. SavSpot converts to USD in its own accounting using `CurrencyService` rate at settlement time.

**Multi-currency limitation:** PayPal Commerce Platform supports ~25 currencies (vs Stripe's 135+). If tenant's booking currency is unsupported by PayPal, booking flow shows: "PayPal doesn't support [currency]. Please use a different payment method."

**Dependencies:** `@paypal/paypal-server-sdk` npm package

### 6.4 Provider Feature Parity Matrix

| Feature | Stripe | Adyen | PayPal | Offline |
|---------|--------|-------|--------|---------|
| Single payment | Yes | Yes | Yes | Yes (manual) |
| Deposits | Yes | Yes | Yes | Yes (manual) |
| Installments | Yes | Yes (Klarna via Adyen) | Yes (Pay Later) | No |
| Multi-currency | 135+ currencies | 150+ currencies | 25 currencies | N/A |
| Refunds (full) | Yes | Yes | Yes | Manual |
| Refunds (partial) | Yes | Yes | Yes | Manual |
| Recurring (subscriptions) | Yes | Yes | Yes | No |
| Mobile SDK | Yes (RN) | Yes (RN) | Yes (RN) | N/A |
| Platform fee split | `application_fee_amount` | `splits` array | `partner_fee` | N/A |

**Fallback strategy:** If a feature is not supported by the selected provider (e.g., installments on Offline), the booking flow hides that option. The `PaymentProviderInterface` includes `getCapabilities(): ProviderCapabilities` method returning supported features — frontend uses this to conditionally render payment options.

### 6.5 Payment Provider Webhook Verification

Each provider has a different inbound webhook signature format:

| Provider | Verification Method | Header |
|----------|-------------------|--------|
| Stripe | `stripe.webhooks.constructEvent(body, sig, secret)` | `Stripe-Signature` |
| Adyen | HMAC-SHA256 with Base64 encoding, verify `X-Adyen-HmacSignature` header | `X-Adyen-HmacSignature` |
| PayPal | Verify webhook ID + transmission details via `POST /v1/notifications/verify-webhook-signature` | Multiple headers |

Each provider implementation includes a `verifyWebhookSignature(request): boolean` method. Failed verification returns 401 and increments a rate-limit counter — 10 failed verifications in 1 minute triggers a 15-minute block for that IP.

### 6.6 Onboarding Status Lifecycle

```
PENDING → VERIFICATION_REQUIRED → VERIFIED → ACTIVE
                                           → SUSPENDED (compliance issue)
```

- **Status polling:** Each provider has a `getAccountStatus()` method called:
  - On admin dashboard load (real-time check)
  - Daily BullMQ job (`checkProviderOnboardingStatus`) for all PENDING/VERIFICATION_REQUIRED tenants
  - Adyen: webhook-based status updates preferred (Platform notifications)
  - PayPal: webhook via `MERCHANT.ONBOARDING.COMPLETED`
- **During pending state:** Tenant can accept bookings with `PaymentTerm.PAY_LATER` only (no card payments). Dashboard shows banner: "Payment provider verification in progress."
- **Verification failure:** Tenant notified via email. Falls back to OFFLINE provider. No automatic switch to Stripe.

### 6.7 Multi-Currency Integration

- **Currency at payment time:** `CurrencyService.convert(amount, fromCurrency, toCurrency)` called before `createPaymentIntent`
- **Provider currency support:** Validated against `ProviderCapabilities.supportedCurrencies` — if provider doesn't support booking currency, show error: "This payment method doesn't support [currency]. Please choose another."
- **Adyen split payment currency:** Both platform fee and merchant amount must be in same currency. Multi-currency splits use Adyen's auto-conversion.
- **PayPal `partner_fee` currency:** Must match order currency. Enforced in `PayPalProvider.createPaymentIntent()`.
- **Refund currency:** Always in original payment currency. No cross-currency refunds.

### 6.8 Frontend Changes

**Settings > Payments page updates:**
- Provider selection dropdown (Stripe / Adyen / PayPal / Offline)
- Provider-specific onboarding flow trigger
- Provider status display (connected, pending verification, etc.)
- Warning: "Switching payment providers will not migrate existing payment methods. Active subscriptions must be re-established."

**Booking flow payment step:**
- Stripe: Continue using Stripe Elements / PaymentSheet
- Adyen: Adyen Drop-in component (web) / Adyen React Native SDK (mobile)
- PayPal: PayPal JS SDK buttons (web) / PayPal React Native SDK (mobile)

### 6.9 Payment Plans / Installments (FR-PAY-5, Could Priority)

**Schema:** Uses existing `PaymentType.INSTALLMENT` enum value.

**Implementation:**
- Service config gains `installment_config` JSONB field: `{ enabled, max_installments, min_amount, schedule_type: 'EQUAL' | 'CUSTOM' }`
- When booking with installment plan: create N `Payment` records with `type: INSTALLMENT`, `dueDate`, `amount` (total / N)
- Each installment triggers existing payment reminder automation
- Invoice `status` transitions: `PENDING` → `PARTIALLY_PAID` (after first installment) → `PAID` (after last)
- Late installment: existing `enforcePaymentDeadlines` job handles, triggers notification

**Edge cases:**
- **Failed installment:** Pause subsequent scheduled installments. Send overdue notification. After 7 days overdue, send escalation email. After 30 days, booking marked as payment-defaulted (new status). No automatic cancellation — business decides.
- **Booking cancellation mid-plan:** Refund all paid installments per cancellation policy. Cancel remaining scheduled installments. Pro-rata refund option configurable by business.
- **Currency:** All installments in same currency as original booking. No mid-plan currency changes.
- **Provider support:** Stripe (manual scheduling via SavSpot), Adyen (native installments via Klarna/Afterpay), PayPal (Pay Later). Offline provider: manual tracking only.
- **UI:** Booking flow shows installment option if service config enables it. Breakdown preview: "4 payments of $25.00, due [dates]".

---

## 7. Stream E: Accounting Integrations

**Spec References:** PRD FR-ACCT-1 through FR-ACCT-9

### 7.1 Architecture

```
apps/api/src/accounting/
├── accounting.module.ts
├── accounting.controller.ts          # OAuth + management endpoints
├── services/
│   ├── accounting.service.ts         # Orchestration: connect, disconnect, sync
│   ├── quickbooks.client.ts          # QuickBooks Online API client
│   ├── xero.client.ts               # Xero API client
│   └── mapping.service.ts           # SavSpot → accounting entity mapping
├── processors/
│   ├── accounting-sync.processor.ts  # BullMQ: invoice/payment sync
│   └── token-refresh.processor.ts    # BullMQ: OAuth token refresh (daily)
├── dto/
│   ├── connect.dto.ts
│   ├── mapping.dto.ts
│   └── sync.dto.ts
└── interfaces/
    └── accounting-provider.interface.ts  # Common interface for QB/Xero
```

### 7.2 OAuth Flow

**QuickBooks Online:**
1. `GET /api/accounting/connect/quickbooks` → Redirect to Intuit OAuth 2.0 authorization URL
2. User authorizes access in QuickBooks
3. `GET /api/accounting/callback/quickbooks?code=...&realmId=...` → Exchange code for tokens
4. Store in `AccountingConnection`: `providerType: QUICKBOOKS`, `accountId: realmId`, encrypted `refreshToken` (AES-256-GCM, same pattern as `CalendarConnection`)
5. `syncConfig` JSONB: `{ autoSyncInvoices: true, autoSyncPayments: true, autoSyncRefunds: true, chartOfAccountsMappings: {} }`

**Xero:**
1. `GET /api/accounting/connect/xero` → Redirect to Xero OAuth 2.0 authorization URL
2. User authorizes access
3. `GET /api/accounting/callback/xero?code=...` → Exchange code for tokens
4. Store in `AccountingConnection`: `providerType: XERO`, `accountId: tenantId` (Xero's tenant ID), encrypted `refreshToken`

**Token refresh:**
- QuickBooks tokens expire every 1 hour, refresh tokens every 100 days
- Xero tokens expire every 30 minutes, refresh tokens every 60 days
- Daily BullMQ job (`accountingTokenRefresh`) refreshes tokens proactively for all active connections
- On refresh failure: set `AccountingConnection.status = ERROR`, notify tenant admin

### 7.3 Sync Processors

**Invoice Sync (`accounting-sync.processor.ts`):**

Triggered by: Invoice creation event (existing `InvoiceService.create()` emits domain event)

```
1. Load AccountingConnection for tenant
2. If no connection or inactive → skip
3. Map SavSpot Invoice → accounting entity:
   - QB: Invoice object (Customer, LineItems, TaxCode, DueDate)
   - Xero: Invoice object (Contact, LineItems, TaxType, DueDate)
4. Use chart of accounts mapping from syncConfig to set correct accounts
5. POST to accounting API
6. Store external ID in invoice metadata (for future updates/deletes)
7. On failure: retry 3x with exponential backoff, then mark connection status = ERROR
```

**Payment Sync:**
Triggered by: Payment received event

```
1. Load AccountingConnection
2. Map SavSpot Payment → accounting payment:
   - QB: Payment object linked to Invoice via external ID
   - Xero: Payment object linked to Invoice
3. POST to accounting API
4. Store external payment ID in payment metadata
```

**Refund Sync (FR-ACCT-5):**
Triggered by: Refund issued event

```
1. Load AccountingConnection
2. Map SavSpot Refund → accounting credit note:
   - QB: CreditMemo or RefundReceipt
   - Xero: CreditNote linked to original Invoice
3. POST to accounting API
```

### 7.3.1 Sync Idempotency & Error Recovery

**Idempotency:** Every sync operation uses `savspot:{entityType}:{entityId}` as the external reference in QB/Xero:
- QB: `DocNumber` field on Invoice, `PaymentRefNum` on Payment
- Xero: `Reference` field on Invoice, Payment
- Re-sync of same entity: if external reference exists, UPDATE existing record. Never creates duplicates.

**Partial sync recovery:**
- If invoice syncs but payment sync fails: invoice exists in QB/Xero without payment. On next payment sync attempt, it links to existing invoice via external ID.
- If payment syncs but invoice sync was skipped: orphaned payment in accounting. Daily reconciliation job detects mismatches and queues re-sync.
- Manual recovery: `POST /api/accounting/connections/:id/reconcile` — compares SavSpot records with QB/Xero records, queues missing syncs.

**Sync error log table:**

```prisma
model AccountingSyncLog {
  id              String   @id @default(uuid()) @db.Uuid
  connectionId    String   @db.Uuid
  entityType      String   // INVOICE, PAYMENT, REFUND
  entityId        String   @db.Uuid
  direction       String   @default("OUTBOUND") // OUTBOUND (SavSpot → QB/Xero)
  status          String   // SUCCEEDED, FAILED, SKIPPED
  externalId      String?  // QB/Xero entity ID (on success)
  errorMessage    String?
  errorCode       String?  // Provider-specific error code
  attemptCount    Int      @default(1)
  syncedAt        DateTime @default(now())

  connection      AccountingConnection @relation(fields: [connectionId], references: [id])

  @@index([connectionId])
  @@index([entityType, entityId])
  @@map("accounting_sync_logs")
}
```

### 7.3.2 Tax Handling in Sync

- **Tax source:** SavSpot invoice stores `taxAmount` and `taxRateId` (from `tax_rates` table). This is the authoritative tax amount.
- **QB sync:** Maps `taxRateId` to QB TaxCode via chart of accounts mapping. If no mapping exists, creates line item with tax amount as separate line.
- **Xero sync:** Maps to Xero TaxType. Xero supports line-level tax, so each line item carries its tax code.
- **Multi-region:** Tenant's tax rates table can have rates for multiple regions. Invoice uses the rate applicable to the booking location.
- **Platform fee accounting:** Platform commission (1%) synced as a separate expense line item to `platform_fee_account` mapping. Not included in revenue.
- **VAT/GST:** If tenant is VAT-registered, invoice includes VAT breakdown. Synced as tax-inclusive or tax-exclusive based on tenant's accounting preference (`syncConfig.taxInclusive: boolean`).

### 7.3.3 Multi-Currency Accounting Sync

- **Invoice currency:** Synced in the original booking currency. QB/Xero both support multi-currency invoices if the accounting company is configured for multi-currency.
- **Single-currency QB/Xero account:** If accounting account only supports one currency and booking is in different currency, sync converts to accounting currency using SavSpot's rate at booking time. Conversion recorded in `AccountingSyncLog`.
- **FX gain/loss:** Not tracked in Phase 3. QB/Xero handle their own FX adjustments when payments are applied. Phase 4 may add explicit FX line items.

### 7.3.4 Subscription Payment Sync

- Subscription payments (tenant paying SavSpot) are NOT synced to tenant's QB/Xero — those are SavSpot's receivables, not the tenant's.
- Only booking-related invoices/payments/refunds are synced to the tenant's accounting software.

### 7.4 Chart of Accounts Mapping (FR-ACCT-6)

**Endpoint:** `PATCH /api/accounting/connections/:id/mappings`

**Mapping structure:**
```json
{
  "income_account": "400-Sales Revenue",
  "payment_account": "100-Checking Account",
  "tax_liability_account": "210-Sales Tax Payable",
  "refund_account": "400-Sales Revenue",
  "platform_fee_account": "610-Platform Fees"
}
```

**Flow:**
1. On connection, fetch chart of accounts from QB/Xero
2. Auto-suggest mappings based on account name matching (fuzzy match: "Sales Revenue" → `income_account`, "Checking" → `payment_account`)
3. Present to user in mapping UI with auto-suggestions pre-selected (user can override)
4. Validation rules:
   - Reject mapping to archived/inactive accounts (API returns 400)
   - Warn (non-blocking) if account type mismatch (e.g., `income_account` mapped to Liability type)
   - Prevent (blocking) mapping `payment_account` to a Revenue account
   - If mapped account is later deleted/archived in QB/Xero: sync fails with `MAPPING_INVALID` error → tenant notified to update mapping
   - Tax code mapping: present QB/Xero tax codes as dropdown for `tax_liability_account`. If tenant has no QB/Xero tax codes configured, skip tax mapping and sync tax as a separate line item amount
5. Store in `syncConfig.chartOfAccountsMappings`
6. Refresh chart of accounts: `POST /api/accounting/connections/:id/refresh-accounts` — re-fetches from QB/Xero (accounts may be added/renamed)

### 7.5 Management API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/accounting/connect/:provider` | Initiate OAuth flow (redirects to provider) |
| `GET` | `/api/accounting/callback/:provider` | OAuth callback (exchanges code, stores tokens) |
| `GET` | `/api/tenants/:tenantId/accounting/connections` | List connections with status |
| `DELETE` | `/api/accounting/connections/:id` | Disconnect (revoke tokens, deactivate) |
| `PATCH` | `/api/accounting/connections/:id/mappings` | Update chart of accounts mapping |
| `POST` | `/api/accounting/connections/:id/sync` | Manual re-sync (all unsynced invoices/payments) |
| `POST` | `/api/accounting/connections/:id/sync/:invoiceId` | Re-sync single invoice |
| `GET` | `/api/accounting/connections/:id/status` | Sync dashboard: last sync time, error count, pending count |

### 7.6 Frontend

**Route:** `/settings/accounting`

**Components:**
```
components/accounting/
├── ConnectionCard.tsx        # Provider logo, status badge, last sync time, connect/disconnect button
├── MappingEditor.tsx         # Dropdown selectors for chart of accounts mapping
├── SyncStatusDashboard.tsx   # Last sync, error count, pending items, manual sync button
├── SyncHistoryTable.tsx      # Paginated list of sync events (invoice/payment/refund)
└── ErrorDetail.tsx           # Expandable error details with retry button
```

### 7.7 Premium Gate

All accounting endpoints require `subscription.tier >= ENTERPRISE` (FR-PAY-18, $79/mo).
Use existing `SubscriptionGuard` from Phase 2 with `@RequireTier('ENTERPRISE')` decorator.

---

## 8. Stream F: Advanced Analytics Dashboard

**Spec Reference:** PRD FR-CRM-12

### 8.1 Backend

Phase 2 already computes and stores analytics data via background jobs:
- `computeDemandAnalysis` → demand trends, slot utilization
- `computeClientInsights` → client metrics, rebooking intervals
- `computeNoShowRisk` → no-show risk scores
- `computeBenchmarks` → category benchmarks

Phase 3 adds:
1. **Booking flow analytics population** — Track step-level metrics in `BookingFlowAnalytics`
2. **Analytics query endpoints** — Aggregate and return computed data to frontend

#### New Endpoints

```
apps/api/src/analytics/
├── analytics.module.ts
├── analytics.controller.ts
├── services/
│   ├── analytics-query.service.ts       # Query aggregated data
│   ├── booking-flow-tracker.service.ts  # Populate BookingFlowAnalytics on session events
│   └── export.service.ts               # CSV/JSON export
└── dto/
    ├── analytics-query.dto.ts           # Date range, filters, grouping
    └── export.dto.ts
```

**Authorization:** All analytics endpoints require `JwtAuthGuard` + `TenantGuard`. Tier gating: `/overview` available to all tiers; `/revenue` and `/bookings` require `@RequireTier('PREMIUM')` or higher; all other endpoints require `@RequireTier('ENTERPRISE')` (see §8.3).

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/analytics/overview` | Summary cards: total bookings, revenue, no-show rate, avg booking value (date range) |
| `GET` | `/api/analytics/revenue` | Revenue trends by day/week/month, grouped by service/staff/payment method |
| `GET` | `/api/analytics/bookings` | Booking volume trends, status breakdown, source distribution |
| `GET` | `/api/analytics/no-shows` | No-show rate trends by service, staff, day of week, time of day |
| `GET` | `/api/analytics/clients` | New vs returning clients, rebooking rate, lifetime value distribution |
| `GET` | `/api/analytics/funnel` | Booking flow funnel: step completion rates, drop-off points, avg time per step |
| `GET` | `/api/analytics/utilization` | Slot utilization heat map (hour × day of week), peak/off-peak analysis |
| `GET` | `/api/analytics/staff-performance` | Per-staff: bookings, revenue, no-shows, avg rating |
| `GET` | `/api/analytics/export` | Export analytics data as CSV/JSON (date range, metrics selection) |

All endpoints accept: `?from=ISO_DATE&to=ISO_DATE&service_id=...&staff_id=...&group_by=day|week|month`

#### Booking Flow Analytics Population

Add event listener in `BookingFlowTrackerService`:
```
On BOOKING_SESSION_STEP_ENTERED:
  - Record step entry timestamp in session metadata

On BOOKING_SESSION_STEP_COMPLETED:
  - Calculate time spent on step
  - Increment step completion count

On BOOKING_SESSION_COMPLETED:
  - Aggregate step metrics → upsert BookingFlowAnalytics for (tenantId, flowId, date)
  - Update completionRate, avgTimeSpent, stepMetrics

On BOOKING_SESSION_ABANDONED:
  - Record drop-off step
  - Update dropOffRate in BookingFlowAnalytics
```

### 8.2 Frontend

**Route:** `/analytics` (premium-gated page)

**Components:**
```
components/analytics/
├── OverviewCards.tsx           # KPI cards: revenue, bookings, no-show rate, new clients
├── RevenueChart.tsx           # Line/bar chart (recharts): revenue over time
├── BookingVolumeChart.tsx     # Stacked bar: bookings by status over time
├── NoShowTrends.tsx           # Line chart + heatmap by day/time
├── ClientMetrics.tsx          # Pie: new vs returning; bar: rebooking intervals
├── FunnelChart.tsx            # Horizontal funnel: step completion rates
├── UtilizationHeatmap.tsx     # Color-coded grid: hour × day of week
├── StaffLeaderboard.tsx       # Table: staff ranked by bookings/revenue/rating
├── DateRangePicker.tsx        # Preset ranges + custom date picker
├── FilterBar.tsx              # Service, staff, booking source filters
└── ExportButton.tsx           # CSV/JSON download
```

**Chart library:** recharts (already compatible with Next.js, SSR-safe)

### 8.3 Premium Gate

**Free tier:** Overview cards only (total bookings, revenue this month, no-show rate). Displayed on main dashboard.
**Premium tier ($29/mo):** Overview + revenue trends + booking volume charts.
**Enterprise tier ($79/mo):** Full analytics dashboard (all endpoints in §8.1). No separate "analytics add-on" SKU in Phase 3 — analytics is bundled with Enterprise.

**Downgrade behavior:** If tenant downgrades from Enterprise, historical data is retained but inaccessible. Re-upgrading restores access immediately. Data is never deleted due to tier change.

### 8.4 Data Retention

- `BookingFlowAnalytics` daily records: retained for 2 years, then aggregated to monthly summaries
- Monthly summaries: retained indefinitely
- GDPR: `BookingFlowAnalytics` contains no PII (aggregated counts/rates). Individual booking session data (which feeds analytics) follows existing 7-year booking retention policy.
- Data export (FR-CRM-26): analytics data included in tenant data export as CSV. Columns: date, metric_name, metric_value, service_id, source. Date format: ISO 8601 in tenant's timezone.
- Export privacy rules: `staff_id` excluded from bulk analytics export (staff performance is not bulk-exportable — view-only in dashboard). Step-level metrics use generic labels ("step_1", "step_2") instead of form field names. No PII in analytics export.

### 8.5 Booking Source Filter

All analytics endpoints accept `?source=DIRECT|API|WIDGET|REFERRAL|WALK_IN|IMPORT` filter parameter. This enables tenants to:
- Compare web vs. API vs. mobile booking conversion rates
- Track referral link ROI in revenue charts
- Measure voice booking adoption (voice bookings use `source = API` with `metadata.channel = VOICE`)

---

## 9. Stream G: AI Voice Receptionist

**Spec Reference:** PRD FR-AI-7

### 9.1 Architecture

```
apps/api/src/voice/
├── voice.module.ts
├── voice.controller.ts              # Webhook endpoints for phone provider
├── services/
│   ├── voice.service.ts             # Call handling orchestration
│   ├── voice-ai.service.ts          # LLM integration for conversation
│   └── voice-telephony.service.ts   # Twilio Voice SDK wrapper
├── dto/
│   └── voice-webhook.dto.ts
└── processors/
    └── voice-call.processor.ts      # BullMQ: async call processing
```

### 9.2 Call Flow

```
1. Inbound call → Twilio webhook → POST /api/voice/answer
2. Voice controller:
   a. Identify tenant from called phone number (lookup tenants.voice_phone_number)
   b. If tenant not found OR tenant.status != 'active' → play "This number is not in service" → hang up
   c. Check business hours using `isWithinBusinessHours(tenantId, now())` (computed server-side using tenant.timezone):
      - If `voice_config.mode = 'AFTER_HOURS_ONLY'` AND business is OPEN → attempt transfer to `voice_config.transferNumber` (Twilio `<Dial>` with `voice_config.transferTimeoutSeconds` timeout). If transfer fails (busy/no-answer) → AI takes over (same flow as step d)
      - If `voice_config.mode = 'AFTER_HOURS_ONLY'` AND business is CLOSED → AI handles
      - If `voice_config.mode = 'ALWAYS'` → AI always handles (no transfer attempt)
   d. AI Voice Receptionist handles call:
3. Compliance disclosure (TTS): "This call may be recorded for quality purposes."
   (Two-party consent compliance — see §18.3 for jurisdiction details)
4. AI greeting (TTS): "Hi, you've reached [Business Name]. I'm an automated assistant. How can I help you today?"
   (Complies with BR-RULE-10: identify as automated system at call start)
5. Caller speaks → Twilio <Gather> speech recognition (STT) → text
6. Caller identity resolution:
   a. Lookup caller phone number in clients table for this tenant
   b. If found → "Welcome back, [Name]!" + can answer "When is my next appointment?"
   c. If not found → treat as new client, collect details during booking
7. Voice AI Service processes intent:
   a. AVAILABILITY_CHECK: Query AvailabilityService → respond with available slots
      - On AvailabilityService failure/timeout: "I'm having trouble checking availability right now. Would you like me to transfer you, or can I take a message?"
   b. BOOK_APPOINTMENT: Collect service, date, time, name, contact → create booking via BookingSessionService
      - Respects cancellation policy (explains to caller if asked)
      - Respects deposit config: if deposit required, informs caller "A deposit of $X is required. I'll send you a payment link by text."
      - Does NOT handle contract signing (requires manual step) — informs caller: "This service requires a contract. I'll book a tentative appointment and email you the contract to sign."
      - Confirmation: "I'll book you for [Service] on [Date] at [Time]. Is that correct?" — waits for "yes" before proceeding
   c. CANCEL_BOOKING: Lookup by phone + name → cancel via BookingService
   d. GENERAL_QUESTION: Answer from business profile data (hours, location, services, policies)
   e. TRANSFER_REQUEST: Connect to business number (see Transfer Flow below)
   f. REFUND_REQUEST: Per BR-RULE-10, AI cannot approve refunds → "I'll need to connect you with the business for refund requests." → transfer
   g. DISPUTE/COMPLAINT: Per BR-RULE-10 → escalate to human, never handle autonomously
8. All booking actions follow BR-RULE-6 (same booking rules as human users)
9. Slot locking: BookingSessionService pessimistic lock (SELECT FOR UPDATE) applies identically to voice bookings — lock acquired at step 7b after slot confirmation
10. Call ends → POST /api/voice/status → log call in audit trail + store transcript
11. Post-call: if booking created, standard confirmation email/SMS sent to client (existing automations fire — voice bookings emit same domain events as web bookings)
```

**Transfer Flow:**
1. Transfer number configured in `voice_config.transferNumber` (tenant admin sets in settings)
2. `<Dial>` to transfer number with 30-second timeout
3. If busy/no-answer → "I wasn't able to reach anyone. Would you like to leave a message, or should I book an appointment for you?"
4. If voicemail → Twilio `<Record>` + transcribe → create support ticket with voicemail attachment
5. Context preservation: AI conversation summary is NOT passed to the human on transfer (no mechanism in basic Twilio). Transcript is stored in `VoiceCallLog` for staff to review later.

**Error Handling:**
- AvailabilityService timeout (5s): fallback to "Let me check... I'm having trouble accessing the schedule. Would you like me to transfer you?"
- LLM timeout (10s): play hold music, retry once, then offer transfer
- Twilio STT confidence < 0.5: "I didn't quite catch that. Could you repeat?" (max 2 retries, then offer transfer)
- Concurrent call limit: 10 concurrent AI-handled calls per tenant (BullMQ concurrency). Excess calls get: "All our automated lines are busy. Please hold for a moment or try again shortly."

**Multi-Language:** Phase 3 supports English only. Twilio STT `language` param set to `en-US`. Non-English callers hear: "I'm sorry, I can only assist in English at this time." → offer transfer. Multi-language voice AI deferred to Phase 4 with i18n translations.

### 9.3 LLM Integration

**Development:** Ollama (local) with conversation model (e.g., llama3)
**Production:** Claude API or OpenAI API (configurable per deployment)

**Voice AI Service:**
```typescript
class VoiceAiService {
  async processUtterance(
    tenantId: string,
    callId: string,
    utterance: string,
    conversationHistory: Message[]
  ): Promise<VoiceResponse> {
    // 1. Build system prompt with tenant context (business name, services, hours, policies)
    // 2. Include available tools: check_availability, create_booking, cancel_booking, get_business_info
    // 3. Call LLM with tool use
    // 4. Execute any tool calls against internal services
    // 5. Return response text for TTS
  }
}
```

**Tool definitions (LLM function calling):**
- `check_availability(service_name, date)` → calls `AvailabilityService`
- `create_booking(service_name, date, time, client_name, client_phone)` → calls `BookingSessionService`
- `cancel_booking(client_name, client_phone)` → calls `BookingService`
- `get_business_info(topic)` → returns business hours, address, services, policies
- `transfer_to_human()` → generates Twilio `<Dial>` TwiML

### 9.4 Phone Provider Integration (Twilio)

**Setup per tenant:**
1. Tenant purchases/ports phone number via Twilio (managed through SavSpot admin settings)
2. Number stored in `tenants.voice_phone_number`
3. Twilio webhook configured: `POST https://api.savspot.co/api/voice/answer`
4. Status callback: `POST https://api.savspot.co/api/voice/status`

**Twilio interaction:**
- Use Twilio `<Gather>` verb for speech input (STT)
- Use Twilio `<Say>` verb with neural voice for TTS output
- Use `<Dial>` for call transfer
- Conversation state maintained in Redis (keyed by `callSid`, 30-minute TTL)

### 9.5 Data Model Changes

```prisma
// Add to Tenant model
voice_phone_number  String?   // Twilio phone number (E.164 format)
voice_enabled       Boolean   @default(false)
voice_config        Json?     // { mode: 'AFTER_HOURS_ONLY' | 'ALWAYS', greeting?, afterHoursGreeting?, transferNumber?, transferTimeoutSeconds?: 30 }
```

```prisma
model VoiceCallLog {
  id                  String   @id @default(uuid()) @db.Uuid
  tenantId            String   @db.Uuid
  callSid             String   @unique  // Twilio call SID
  callerNumber        String            // E.164
  callerClientId      String?  @db.Uuid // Resolved client (if repeat caller)
  direction           VoiceCallDirection @default(INBOUND)
  duration            Int?              // seconds
  status              VoiceCallStatus
  aiHandled           Boolean  @default(false)
  transcript          Json?             // Array of { role, text, timestamp } — encrypted at rest (AES-256-GCM)
  toolCalls           Json?             // Array of { tool, input, output, timestamp } for audit
  aiConfidenceScores  Json?             // Array of { utterance_index, intent, confidence }
  transferredAt       DateTime?         // When call was transferred to human
  transferredTo       String?           // Phone number transferred to
  recordingUrl        String?           // Twilio recording URL (encrypted, 90-day retention)
  bookingId           String?  @db.Uuid // If booking was created
  createdAt           DateTime @default(now())

  tenant              Tenant   @relation(fields: [tenantId], references: [id])
  booking             Booking? @relation(fields: [bookingId], references: [id])
  callerClient        Client?  @relation(fields: [callerClientId], references: [id])

  @@index([tenantId])
  @@index([createdAt])
  @@index([callerClientId])
  @@map("voice_call_logs")
}
```

### 9.6 Premium Gate

Voice Receptionist requires `subscription.tier >= ENTERPRISE` ($79/mo).
Additional per-minute charges may apply (Twilio costs passed through).

### 9.7 Frontend

**Route:** `/settings/voice`

**Components:**
- `VoiceSetupWizard.tsx` — Phone number provisioning, webhook configuration
- `VoiceConfig.tsx` — Toggle after-hours only, custom greeting, transfer number
- `CallLogTable.tsx` — Call history with duration, AI-handled flag, transcript viewer
- `TranscriptViewer.tsx` — Expandable call transcript with tool call annotations

---

## 10. Stream H: Referral System

**Spec Reference:** PRD FR-CRM-25, BRD BR-RULE-2

### 10.1 Backend

**Current schema (verified):** `ReferralLink` model exists with `code`, `name`, `createdBy`, `usageCount`, `isActive`, `expiresAt`. However, the schema is **missing** `commissionPercent` — commission percentage is currently global in tenant config (`referral_commission_percent`). The existing `PaymentsService.calculateReferralCommission()` uses tenant-level defaults.

**Schema migration required:** Add `commission_percent` (Decimal, nullable — null = use tenant default) to `referral_links` table. Add `referral_link_id` FK (nullable) to `bookings` table for attribution tracking.

Phase 3 adds CRUD endpoints, per-link commission overrides, fraud detection, and admin UI.

```
apps/api/src/referrals/
├── referrals.module.ts
├── referrals.controller.ts
├── referrals.service.ts
└── dto/
    ├── create-referral-link.dto.ts
    ├── update-referral-link.dto.ts
    └── referral-analytics.dto.ts
```

#### API Endpoints

**Authorization:** All referral link endpoints require `JwtAuthGuard` + `TenantGuard` + `@RequireRole(OWNER, ADMIN)`.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/tenants/:tenantId/referral-links` | List links with usage stats (booking count, revenue attributed) |
| `POST` | `/api/tenants/:tenantId/referral-links` | Create link: `{ name, code?, commissionPercent?, expiresAt? }`. Auto-generates code if not provided. |
| `PATCH` | `/api/referral-links/:id` | Update name, active status, expiry |
| `DELETE` | `/api/referral-links/:id` | Soft delete |
| `GET` | `/api/referral-links/:id/analytics` | Detailed: bookings via link, total commission, conversion rate, ROAS |

#### Booking Attribution

**Web:** When a client visits `savspot.co/{slug}?ref={code}`:
1. Public booking page reads `ref` query param
2. Stores in booking session: `referralCode = code`
3. On booking completion: look up `ReferralLink` by code → set `booking.source = REFERRAL`, store `booking.referralLinkId`

**Mobile:** Deep link `savspot://business/{slug}?ref={code}` is handled by Expo Router. The `ref` param is extracted in `app/business/[slug].tsx` and passed to booking session creation — same attribution flow as web.

**Commission calculation per BR-RULE-2:**
- Only first booking from this client via this tenant incurs commission
- `commission = min(booking.total * (link.commissionPercent ?? tenant.referralCommissionPercent), tenant.referralCommissionCap)`
- Subsequent bookings from same client: commission-free
- **Installment bookings:** Commission calculated on full booking total, deducted from first installment payment
- **Deposit bookings:** Commission calculated on full booking total (not just deposit), deducted at final payment
- **Currency:** Commission always calculated in booking currency, converted to platform currency (USD) for platform accounting
- **Expired/invalid links:**
- Referral code validated at booking session creation time (not at completion). If code is invalid, expired, or inactive → silently proceed as `DIRECT` source. No error shown to user — improves UX by not exposing invalid links.
- `referralLinkId` stored on booking session (not just code) at creation time — no re-validation needed at completion.
- Edge case: if link expires DURING an active booking session, the attribution stands (validated at creation).

#### Fraud Detection

- **Self-referral prevention:** `referralLink.createdBy` cannot match `booking.clientId` — API rejects with 400
- **Rate limiting:** Max 10 referral link creations per tenant per day
- **Anomaly flag:** If single referral link generates >50 bookings in 24h, flag for manual review (no auto-block)
- **Duplicate client detection:** If client email matches existing client for tenant, referral is first-booking-only (no gaming with new emails — match by normalized email)

### 10.2 Frontend

**Route:** `/settings/referrals`

**Components:**
```
components/referrals/
├── ReferralLinkList.tsx        # Table with code, name, status, clicks, bookings, commission
├── CreateLinkDialog.tsx        # Name, custom code (optional), commission %, expiry
├── ReferralAnalytics.tsx       # Per-link: conversion funnel, revenue, commission cost
└── CopyLinkButton.tsx          # Copy full URL to clipboard
```

---

## 11. Stream I: i18n & Multi-Currency

**Spec Reference:** PRD Phase 3 overview, SRS-1 §14.3

### 11.1 Multi-Currency

**Schema changes:**
```prisma
// Add to Tenant model
supportedCurrencies  String[]  @default(["USD"])  // ISO 4217 codes
```

**Implementation:**
- Tenant settings page: multi-select for supported currencies (from predefined list of 40 major currencies)
- Service pricing: optionally specify prices in multiple currencies, or auto-convert from base currency
- Currency conversion: external rate API integration (Open Exchange Rates or `exchangerate.host`)
  - Cache rates in Redis with 1-hour TTL
  - Refresh: BullMQ job every hour fetches latest rates
  - Fallback chain: (1) Redis cached rate → (2) Last successful rate from DB (stored on each fetch) → (3) Hardcoded seed rates for 10 major currencies (USD, EUR, GBP, CAD, AUD, JPY, CHF, CNY, INR, BRL)
  - Stale rate indicator: if rate is >24h old, API response includes `"rate_stale": true` and frontend shows "approximate" badge
  - Cold start: seed rates loaded at deployment for the 10 major currencies
- Booking flow: client sees prices in their preferred currency (based on browser locale or explicit dropdown selection)
- Payment: charge in the currency displayed (validated against provider capabilities per §6.7)
- Invoices: generated in booking currency, stored with `currency` field (already exists in schema)
- Reports/analytics: normalize to tenant's base currency for aggregation using rate at time of booking (stored in booking metadata)

**Currency formatting rules:**
- Use `Intl.NumberFormat` with currency code: `new Intl.NumberFormat(locale, { style: 'currency', currency: 'JPY' })`
- This automatically handles: symbol ($, €, ¥), decimal places (2 for USD, 0 for JPY, 3 for BHD), thousands separators
- Supported locales for formatting: all browser-supported locales (ICU)
- Referral commission: calculated in booking currency, displayed in booking currency, converted to platform USD for platform accounting using rate at booking time

**New service:**
```
apps/api/src/currency/
├── currency.module.ts
├── currency.service.ts        # Rate fetching, caching, conversion
└── currency.controller.ts     # GET /api/currencies (supported list), GET /api/currencies/rates
```

### 11.2 i18n Infrastructure

**Phase 3 scope:** Infrastructure only, English remains the only language. Actual translations are Phase 4.

**Web (Next.js):**
- Install `next-intl`
- Wrap app with `NextIntlProvider`
- Create `messages/en.json` for all user-facing strings
- Replace hardcoded strings with `useTranslations()` hook calls
- Locale detection: browser `Accept-Language` header → URL prefix (`/en/dashboard`)
- Number/date formatting: `Intl.NumberFormat`, `Intl.DateTimeFormat` with locale param

**Mobile (React Native):**
- Install `react-i18next` + `i18next`
- Create `locales/en.json`
- Locale detection: device locale via `expo-localization` (`getLocales()[0].languageTag`)
- Fallback chain: device locale → app setting → `en`
- Date/time formatting: use `Intl.DateTimeFormat` with device locale (React Native Hermes supports ICU)
- **RTL layout:** Deferred to Phase 4. Phase 3 infrastructure uses `I18nManager.isRTL` detection but does not implement RTL-specific layouts (Arabic, Hebrew). All Phase 3 UI is LTR only.
- **Minimum platform versions:** iOS 16+, Android API 26+ (Android 8.0). Tablet layout: same as phone (responsive but not optimized for iPad/tablet — tablet-specific layouts deferred to Phase 4).

**API:**
- Email templates: add `locale` parameter, load template variant by locale
- Error messages: return error codes (not localized strings), frontend maps to localized text

**Phase 3 deliverable:** All strings extracted to locale files. Only `en` locale populated. Adding new locales requires only adding translation files.

---

## 12. Stream J: Cross-Tenant Benchmarking UI

**Spec Reference:** PRD FR-AI-5

### 12.1 Backend

Phase 2 already computes `CategoryBenchmark` data daily at 5 AM UTC. Phase 3 adds display endpoints with privacy controls.

**New endpoints in existing `AiOperationsController`:**

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/analytics/benchmarks` | Tenant's benchmarks vs category average. Returns data only if category has 50+ tenants. |
| `GET` | `/api/analytics/benchmarks/trends` | 30/60/90 day benchmark trends |

**Privacy controls:**
- 50-tenant minimum per category for any benchmark display
- Privacy floor: filter combinations with < 4 tenants return null
- Tenant opt-out: `tenants.benchmarkOptOut` (already in schema) → exclude data + hide UI

### 12.2 Frontend

**Location:** Dashboard home page — new insight card

**Component:** `BenchmarkInsightCard.tsx`
- "Your no-show rate is 12% — 3% below the [Hair Salon] category average of 15%"
- "Your slot utilization is 78% — 8% above average"
- Trend indicators (↑↓) with 30-day direction
- Link to full benchmarks page (premium)

**Full benchmarks page (premium):** `/analytics/benchmarks`
- Side-by-side comparison charts
- Percentile ranking within category
- Trend lines over time

### 12.3 Data Freshness & Staleness

- Benchmark computation runs daily at 5 AM UTC (Phase 2 job)
- API response includes `computed_at` timestamp
- Frontend shows "Updated X hours ago" indicator
- If `computed_at` > 48h old (job failure): show warning badge "Data may be outdated"
- No real-time recomputation — daily batch is sufficient for benchmarking use case

### 12.4 GDPR & Data Export

- Benchmark data is anonymized and aggregated — no PII
- Tenant data export (FR-CRM-26) includes tenant's own benchmark scores (not category aggregates)
- Tenant opt-out (`benchmarkOptOut = true`): tenant's data excluded from category computation AND tenant sees no benchmark UI
- Opt-out is reversible: setting `benchmarkOptOut = false` re-includes data in next daily computation
- No individual tenant data is ever exposed to other tenants — only category-level aggregates

---

## 13. Database Migrations

### Migration 1: Public API & MCP (Week 1)

```sql
-- Add scopes and security to API keys
ALTER TABLE api_keys ADD COLUMN scopes JSONB DEFAULT '[]';
ALTER TABLE api_keys ADD COLUMN rate_limit_override INT;
ALTER TABLE api_keys ADD COLUMN allowed_ips TEXT[];  -- CIDR notation, null = all IPs allowed
ALTER TABLE api_keys ADD COLUMN last_rotated_at TIMESTAMPTZ;
ALTER TABLE api_keys ADD COLUMN expires_at TIMESTAMPTZ;

-- Add public discovery opt-in
ALTER TABLE tenants ADD COLUMN is_public BOOLEAN DEFAULT false;
```

### Migration 2: Workflow Builder (Week 1)

```sql
-- Automation execution tracking
CREATE TABLE automation_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  template_id UUID NOT NULL REFERENCES workflow_templates(id),
  booking_id UUID REFERENCES bookings(id),
  current_stage_id UUID REFERENCES workflow_stages(id),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error TEXT,
  stage_results JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_automation_executions_tenant ON automation_executions(tenant_id);
CREATE INDEX idx_automation_executions_booking ON automation_executions(booking_id);
CREATE INDEX idx_automation_executions_status ON automation_executions(status);

-- Outgoing webhook endpoints
CREATE TABLE webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  previous_secret TEXT,                          -- For secret rotation (72h grace period)
  secret_rotated_at TIMESTAMPTZ,                 -- When secret was last rotated
  events TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  failure_count INT NOT NULL DEFAULT 0,          -- Consecutive failures (circuit breaker at 5)
  last_failure_at TIMESTAMPTZ,
  disabled_reason TEXT,                          -- Why endpoint was auto-disabled
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhook_endpoints_tenant ON webhook_endpoints(tenant_id);

-- Webhook delivery log
CREATE TABLE webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id UUID NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
  event VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,
  response_status INT,
  response_body TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  attempt_count INT NOT NULL DEFAULT 0,
  next_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_webhook_deliveries_endpoint ON webhook_deliveries(endpoint_id);
CREATE INDEX idx_webhook_deliveries_status_retry ON webhook_deliveries(status, next_retry_at);
```

### Migration 3: Referral System (Week 3)

```sql
-- Add per-link commission override to referral_links
ALTER TABLE referral_links ADD COLUMN commission_percent DECIMAL(5,2);  -- null = use tenant default

-- Add referral attribution to bookings
ALTER TABLE bookings ADD COLUMN referral_link_id UUID REFERENCES referral_links(id);
CREATE INDEX idx_bookings_referral_link ON bookings(referral_link_id);
```

### Migration 4: Accounting Sync (Week 4)

```sql
-- Accounting sync log for idempotency and audit
CREATE TABLE accounting_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  connection_id UUID NOT NULL REFERENCES accounting_connections(id),
  entity_type VARCHAR(20) NOT NULL,           -- 'INVOICE', 'PAYMENT', 'REFUND', 'CREDIT_NOTE'
  entity_id UUID NOT NULL,                    -- booking_id or payment_id
  external_id VARCHAR(100),                   -- QB/Xero entity ID
  idempotency_key VARCHAR(200) UNIQUE NOT NULL, -- 'savspot:{entityType}:{entityId}'
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, SYNCED, FAILED, SKIPPED
  sync_direction VARCHAR(10) NOT NULL DEFAULT 'OUTBOUND', -- OUTBOUND (SavSpot→QB/Xero)
  request_payload JSONB,                      -- What was sent
  response_payload JSONB,                     -- What came back
  error_message TEXT,
  retry_count INT NOT NULL DEFAULT 0,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_accounting_sync_logs_tenant ON accounting_sync_logs(tenant_id);
CREATE INDEX idx_accounting_sync_logs_connection ON accounting_sync_logs(connection_id);
CREATE INDEX idx_accounting_sync_logs_entity ON accounting_sync_logs(entity_type, entity_id);
CREATE INDEX idx_accounting_sync_logs_status ON accounting_sync_logs(status);

ALTER TABLE accounting_sync_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON accounting_sync_logs
  USING (tenant_id::text = current_setting('app.current_tenant', TRUE));
```

### Migration 5: Voice Receptionist (Week 7)

```sql
-- Voice config on tenants
ALTER TABLE tenants ADD COLUMN voice_phone_number VARCHAR(20);
ALTER TABLE tenants ADD COLUMN voice_enabled BOOLEAN DEFAULT false;
ALTER TABLE tenants ADD COLUMN voice_config JSONB;

-- Voice call log
CREATE TABLE voice_call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  call_sid VARCHAR(50) UNIQUE NOT NULL,
  caller_number VARCHAR(20) NOT NULL,
  direction VARCHAR(10) NOT NULL DEFAULT 'INBOUND',
  duration INT,
  status VARCHAR(20) NOT NULL,
  ai_handled BOOLEAN NOT NULL DEFAULT false,
  transcript JSONB,
  booking_id UUID REFERENCES bookings(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_voice_call_logs_tenant ON voice_call_logs(tenant_id);
CREATE INDEX idx_voice_call_logs_created ON voice_call_logs(created_at);
```

### Migration 6: Multi-Currency (Week 8)

```sql
ALTER TABLE tenants ADD COLUMN supported_currencies TEXT[] DEFAULT ARRAY['USD'];
```

### RLS Policies

All new tables follow existing RLS pattern:
```sql
ALTER TABLE automation_executions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON automation_executions
  USING (tenant_id::text = current_setting('app.current_tenant', TRUE));

-- Repeat for webhook_endpoints, webhook_deliveries, voice_call_logs, accounting_sync_logs
```

---

## 14. Testing Strategy

### Unit Tests (Vitest)

| Stream | Test Files | Coverage Target |
|--------|-----------|-----------------|
| Public API v1 | `public-api/v1/**/*.spec.ts` | Controllers: 90%, Transformers: 95% |
| MCP Server | `packages/mcp-server/tests/*.test.ts` | Tools: 90% |
| Workflow Builder | `workflows/**/*.spec.ts` | Services: 85%, Processors: 80% |
| Payment Providers | `payments/providers/*.spec.ts` | Each provider: 85% |
| Accounting | `accounting/**/*.spec.ts` | OAuth: 80%, Sync: 85% |
| Analytics | `analytics/**/*.spec.ts` | Query service: 90% |
| Voice | `voice/**/*.spec.ts` | Call flow: 75% (external dependency heavy) |
| Referrals | `referrals/**/*.spec.ts` | CRUD: 90%, Commission: 95% |

### Integration Tests

| Scenario | Dependencies | Approach |
|----------|-------------|----------|
| Public API booking flow | Database + Redis | Full session lifecycle: create → update → complete → verify booking |
| MCP Server tool calls | Running API server | End-to-end: discover → check availability → book → confirm |
| Webhook delivery + retry | Database + Redis + mock HTTP | Fire event → verify delivery → simulate failure → verify retry |
| Accounting sync | Database + mock QB/Xero API | Create invoice → verify sync job → verify API call payload |
| Payment provider switch | Database + mock Adyen/PayPal | Create payment with each provider → verify correct API calls |
| Voice call flow | Database + Redis + mock Twilio | Simulate inbound call → AI response → booking creation |

### E2E Tests

**Web (Playwright — existing setup):**
- Workflow builder: create template → add stages → activate → trigger → verify execution
- Accounting: connect QB → create invoice → verify sync status
- Analytics: navigate dashboard → verify charts render → export CSV
- Referral: create link → copy → visit → book → verify attribution

**Mobile (Maestro — new):**
```
flows/
├── login-biometric.yaml          # Login → enable biometric → relaunch → biometric login
├── booking-flow.yaml             # Open business → select service → book → pay → confirm
├── client-portal.yaml            # View bookings → booking detail → cancel → verify
├── push-notification.yaml        # Receive notification → tap → verify navigation
└── deep-link.yaml                # Open deep link → verify correct screen
```

### Stream-Specific Test Scenarios

**Voice Intent Testing:**
- Test each `VoiceIntent` with 5+ utterance variants (e.g., "book an appointment", "I'd like to schedule", "can I make a reservation")
- Test ambiguous utterances that could match multiple intents
- Test confidence threshold boundary: utterances at 0.49 vs 0.51 confidence
- Test multi-turn conversations: availability check → booking in single call

**Webhook Retry Timing:**
- Verify exponential backoff intervals: 1min, 5min, 15min, 30min, 1h (±10% jitter)
- Verify circuit breaker: 5 consecutive failures → auto-disable endpoint
- Verify secret rotation: both old and new secrets accepted during 72h grace period
- Verify idempotency: duplicate event delivery with same `delivery_id` is deduplicated by receiver

**Multi-Currency Conversion:**
- Verify zero-decimal currencies (JPY, KRW) use integer amounts
- Verify three-decimal currencies (BHD, KWD) use correct precision
- Verify stale rate badge appears when rate > 24h old
- Verify fallback chain: remove Redis → falls back to DB → remove DB → falls back to seed rates

**Accounting Token Refresh:**
- Verify OAuth token refresh before expiry (QuickBooks: 1h tokens, Xero: 30min tokens)
- Verify graceful handling when refresh token is revoked (user disconnected in QB/Xero)
- Verify sync resumes automatically after token refresh
- Verify idempotency: re-sync of already-synced invoice updates rather than creates duplicate

**Voice Concurrency:**
- Verify BullMQ concurrency limit of 10 per tenant
- Verify 11th concurrent call gets "lines are busy" message
- Verify call state cleanup after abnormal disconnection (Redis TTL expiry)

**Push Notification Multi-Device:**
- Verify notification delivered to all active devices for a user
- Verify failed delivery increments `failureCount` on `DevicePushToken`
- Verify token with `failureCount >= 3` is marked inactive and skipped
- Verify deep link in notification payload opens correct screen

**Benchmarking Privacy:**
- Verify categories with < 50 tenants return no benchmark data
- Verify filter combinations with < 4 tenants return null values
- Verify opted-out tenants are excluded from computation AND see no UI
- Verify no individual tenant data leaks through aggregate endpoints

### Load Tests

| Endpoint | Target | Tool |
|----------|--------|------|
| `GET /api/v1/availability` | 500 req/s, p99 < 200ms | k6 |
| `POST /api/v1/booking-sessions` | 100 req/s, p99 < 500ms | k6 |
| Webhook dispatch | 1000 events/min | k6 + mock receiver |

---

## 15. Deployment & Rollout

### Phase 3 Rollout Stages

**Stage 1: Internal (Week 10)**
- Deploy all backend changes to staging
- Mobile app: TestFlight (iOS) + internal track (Android)
- Run full integration + E2E test suites
- Internal team dogfooding

**Stage 2: Beta (Week 11)**
- Public API v1: invite 3-5 partner integrators
- Mobile app: public TestFlight + open beta
- MCP Server: register in MCP directory
- Monitor error rates, performance metrics

**Stage 3: General Availability (Week 12)**
- Public API v1: public launch with documentation
- Mobile app: App Store + Play Store submission
- Feature flags: gradual rollout for premium features (accounting, voice, analytics)
- Marketing: announce mobile app, AI capabilities, API availability

### Feature Flag Strategy

| Feature | Flag Name | Default | Rollout |
|---------|-----------|---------|---------|
| Public API v1 | `public_api_v1` | ON | All tenants |
| MCP Server | `mcp_server` | ON | Platform-level |
| Mobile Push | `mobile_push` | ON | All tenants |
| Workflow Builder | `workflow_builder` | OFF → ON | 10% → 50% → 100% over 2 weeks |
| Adyen | `payment_adyen` | OFF | Per-tenant opt-in |
| PayPal | `payment_paypal` | OFF | Per-tenant opt-in |
| Accounting | `accounting_integrations` | OFF | Enterprise tier |
| Voice Receptionist | `voice_receptionist` | OFF | Enterprise tier, per-tenant |
| Advanced Analytics | `advanced_analytics` | OFF | Enterprise tier |
| Multi-Currency | `multi_currency` | OFF | 10% → 100% over 4 weeks |

### Infrastructure Requirements

| Service | Phase 2 | Phase 3 Addition |
|---------|---------|-----------------|
| API servers | 2 instances | +1 instance (API v1 traffic) |
| BullMQ workers | 2 instances | +1 instance (accounting sync, webhooks) |
| Redis | 1 instance (Upstash) | Same (monitor memory for voice state) |
| PostgreSQL | 1 instance | Same (monitor for new table growth) |
| Twilio | Not used | New account: voice phone numbers |
| Expo Push | Not used | New: push notification service |
| Adyen | Not used | New: sandbox → production account |
| PayPal | Not used | New: sandbox → production account |
| QuickBooks | Not used | New: developer account + app registration |
| Xero | Not used | New: developer account + app registration |

---

## 16. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| App Store review rejection | Medium | High | Submit early (Week 9), allow 2-week buffer. Follow Apple/Google guidelines strictly. |
| Twilio Voice latency (AI response time) | Medium | Medium | Optimize LLM inference. Use streaming TTS. Cache common responses. Implement silence filler ("Let me check that for you..."). |
| Adyen/PayPal onboarding complexity | Medium | Medium | Start sandbox integration Week 3. Document provider-specific quirks. Keep Stripe as default. |
| QuickBooks/Xero API rate limits | Low | Medium | Batch sync operations. Respect Retry-After headers. Queue with backpressure. |
| MCP protocol changes (pre-1.0) | Low | Medium | Pin SDK version. Monitor MCP spec repo. Abstract behind internal interface. |
| Mobile app performance (complex booking flow) | Medium | Medium | Profile with Flipper. Lazy load steps. Optimize re-renders with `React.memo`. |
| Webhook endpoint abuse (tenant misconfiguration) | Low | Low | HTTPS-only requirement. 10s timeout. Rate limit per endpoint. Circuit breaker at 5 consecutive failures. |
| Multi-currency rate API downtime | Low | Low | Cache last known rates (24h TTL fallback). Show "approximate" badge when using stale rates. |
| Voice Receptionist misunderstanding caller | Medium | Medium | Confidence threshold for actions. Confirm before booking ("I'll book you for Tuesday at 3 PM. Is that correct?"). Easy transfer to human. |
| Scope creep from "natural language Q&A" feature | Medium | Low | Explicitly defer to Phase 4 unless time allows. Not in must-priority tier. |
| Twilio full service outage | Low | High | Fallback: miss call → send SMS via existing provider ("We missed your call, book online at..."). No alternative voice provider in Phase 3. |
| Voice call recording compliance violation | Medium | High | Two-party consent disclosure before AI interaction begins. Recordings stored encrypted in R2 with 90-day retention. GDPR deletion on request. See §18.3. |
| Accounting sync idempotency failure (duplicate invoices) | Medium | Medium | Use idempotency keys: `savspot:{invoiceId}` as external reference on QB/Xero. Re-sync updates existing, never creates duplicates. See §17.5. |
| MCP SDK stability (pre-1.0 risk) | Low | Medium | MCP protocol reached 1.0 stable (Nov 2024). Pin `@modelcontextprotocol/sdk@^1.0.0`. Abstract tools behind internal interface for easy upgrade. |
| Multi-currency rate API cold start | Low | Low | Seed hardcoded USD-to-major-currency rates at deployment. Stale rates flagged with "approximate" badge after 24h. See §17.4. |
| Mobile biometric auth device theft | Low | High | Refresh tokens have 30-day expiry. "Logout all devices" endpoint invalidates all refresh tokens. Failed biometric 5x → require password. See §18.5. |

---

## 17. Cross-Stream Integration Specifications

### 17.1 Booking Events Fire for All Sources

Every booking mutation (create, update, cancel, complete, no-show) emits the same domain events regardless of source. This ensures all downstream systems (workflows, webhooks, accounting, analytics, notifications) activate uniformly.

| Booking Source | Entry Point | Events Emitted |
|---------------|-------------|----------------|
| Web (direct) | `BookingSessionService` | `BOOKING_CREATED`, `BOOKING_CONFIRMED`, etc. |
| Public API v1 | `PublicBookingController` → `BookingSessionService` | Same events |
| MCP Server | MCP tool → internal API call → `BookingSessionService` | Same events |
| Voice | `VoiceAiService` → `BookingSessionService` | Same events |
| Mobile App | Same API endpoints as web | Same events |
| Widget | Same API endpoints as web (with `source=WIDGET`) | Same events |
| Walk-in | Staff UI → `BookingService.createWalkIn()` (NOT `BookingSessionService`) | Same events |

**Source tracking:** `booking.source` is set at creation time: `DIRECT` (web), `API` (public API + MCP + voice with `metadata.channel` distinguishing), `WIDGET`, `REFERRAL`, `WALK_IN`, `IMPORT`. `DIRECTORY` is reserved for Phase 4. Voice bookings use `source = API` with `metadata.channel = 'VOICE'` to enable analytics filtering (§8.5).

**No special handling needed** — all sources converge to the same service layer. The `source` field on the booking is metadata only; it does not affect event emission or downstream processing.

### 17.2 Mobile + Referral Attribution

When a mobile deep link includes a referral code (`savspot://business/{slug}?ref={code}`):
1. Expo Router extracts `ref` param in `app/business/[slug].tsx`
2. Referral code stored in `zustand` booking store (persists across navigation)
3. Passed to `POST /api/booking-sessions` as `referralCode` in body
4. Backend attribution logic identical to web (§10.1)
5. If app was installed via deferred deep link (App Store redirect): `expo-linking` re-reads the original URL on first launch; referral code is captured if present

**Edge case:** If referral link is expired by the time the mobile user completes booking, the booking proceeds normally with `source = DIRECT` (not `REFERRAL`). No error shown to user.

### 17.3 Accounting Sync for API/Voice Bookings

Accounting sync triggers on `PAYMENT_COMPLETED` event (not on booking creation). This means:
- **API bookings** that collect payment → invoice synced to QB/Xero
- **Voice bookings** with deposit → deposit payment synced; balance synced on completion
- **Voice bookings** without payment (pay-at-appointment) → invoice synced when staff marks payment complete

Sync uses the same `AccountingSyncProcessor` regardless of booking source. The processor:
1. Receives `PAYMENT_COMPLETED` event via BullMQ
2. Loads accounting connection for tenant
3. Maps SavSpot line items to QB/Xero chart of accounts (per tenant mapping config)
4. Uses idempotency key `savspot:invoice:{bookingId}` to prevent duplicates
5. Stores sync result in `accounting_sync_logs`

**Tax handling:** SavSpot does not compute tax. If tenant has tax rates configured in QB/Xero, the sync maps to the tenant's default tax rate. Custom tax mapping per service is Phase 4.

### 17.4 Push Notifications for Workflow Automations

When a workflow automation stage fires a notification action:
1. `WorkflowExecutionService` processes `SEND_NOTIFICATION` action type
2. Calls existing `NotificationService.send()` with channel resolution:
   - Email → existing email provider
   - SMS → existing SMS provider
   - **Push** → `PushNotificationService` (new in Phase 3)
3. `PushNotificationService` loads all active `DevicePushToken` records for the target user
4. Sends via Expo Push API to each device
5. Handles failures: increment `failureCount`, deactivate token after 3 consecutive failures

**Workflow builder UI:** The "Send Notification" action type shows channel checkboxes: ☑ Email ☑ SMS ☑ Push. Push checkbox is always visible but disabled (greyed out with tooltip "No mobile app users with push enabled") if tenant has zero active `DevicePushToken` records. At execution time, push is re-checked — if no active tokens exist, push delivery is silently skipped (no error, counts as success).

### 17.5 Accounting Sync Idempotency

Every sync operation uses a deterministic idempotency key:
- Invoice create: `savspot:invoice:{bookingId}`
- Payment record: `savspot:payment:{paymentId}`
- Refund: `savspot:refund:{refundId}`
- Credit note: `savspot:credit:{creditNoteId}`

**Behavior:**
- First sync → create entity in QB/Xero, store `external_id` in `accounting_sync_logs`
- Re-sync (same idempotency key) → update existing entity using stored `external_id`
- If `external_id` lookup fails (deleted in QB/Xero) → create new entity, update `external_id`

### 17.6 MCP vs Voice Overlap

Both MCP Server and Voice Receptionist can create bookings, but they serve different use cases:

| | MCP Server | Voice Receptionist |
|---|---|---|
| **User** | AI agents (ChatGPT, Claude, etc.) | Phone callers (humans) |
| **Auth** | API key (tenant-scoped) | Twilio webhook (tenant identified by phone number) |
| **Interface** | Structured tool calls (JSON) | Natural language (STT → LLM → TTS) |
| **Payment** | Returns payment URL for human to complete | Sends SMS with payment link |
| **Rate limit** | API key rate limits (§3.2) | 10 concurrent calls per tenant |

Both converge to `BookingSessionService` internally. No code duplication — MCP tools call the same service methods as voice tools.

### 17.7 Mobile App Workflow Visibility

Mobile app displays workflow execution status for the client's bookings:
- Client portal booking detail screen shows: "Reminder email sent ✓", "Follow-up SMS scheduled for [date]"
- This data comes from `automation_executions` joined through `booking_id`
- Read-only — clients cannot modify or cancel workflow automations
- Only automations of type `SEND_NOTIFICATION` or `SEND_FORM` are visible to clients. Internal actions (e.g., `UPDATE_BOOKING_STATUS`) are hidden.

---

## 18. Security & Compliance Specifications

### 18.1 API Key Security

**Key format:** `sk_live_` prefix + 32-byte random hex (64 chars). Test keys use `sk_test_` prefix.

**Storage:** API keys are hashed (SHA-256) before storage — only the hash is persisted. The full key (including prefix) is shown once at creation and never again. Prefix (`sk_live_` or `sk_test_`) is NOT stored separately; on validation, the incoming key's prefix is checked against deployment mode (live/test), then the full key is hashed and compared against stored hash. If key is lost, the tenant must rotate (create new key + delete old).

**IP allowlisting:** Optional `allowed_ips` column (CIDR notation array). If set, requests from non-listed IPs are rejected with `403 Forbidden`. Null = all IPs allowed.

**Key rotation:**
1. Tenant creates new key via `POST /api/tenants/:tenantId/api-keys`
2. Both old and new keys work simultaneously
3. Tenant deletes old key via `DELETE /api/api-keys/:id` when migration is complete
4. No automatic expiry — keys are valid until deleted (but `expires_at` can be set optionally)

**Compromise mitigation:** If a key is suspected compromised:
1. Tenant deletes key immediately (API call or admin UI)
2. All in-flight requests with deleted key are rejected
3. Webhook signatures made with compromised key are invalid immediately
4. Audit log entry created for key deletion

### 18.2 Webhook Security

**Signature:** Every webhook delivery includes `X-SavSpot-Signature` header:
```
X-SavSpot-Signature: t=1234567890,v1=sha256_hmac_hex
```
Where `sha256_hmac_hex = HMAC-SHA256(secret, timestamp + "." + JSON.stringify(body))`.

**Replay prevention:** Recipients should reject deliveries where `t` (timestamp) is older than 5 minutes. SavSpot includes `t` in the signature to prevent replay attacks.

**Secret rotation:**
1. Tenant rotates secret via `POST /api/webhook-endpoints/:id/rotate-secret`
2. Old secret stored in `previous_secret`, new secret in `secret`, `secret_rotated_at` recorded
3. For 72 hours, SavSpot sends two signatures: one with new secret, one with old (`v1=new,v1_old=old`)
4. After 72 hours, `previous_secret` is nulled, only new secret is used
5. Recipients should validate against `v1` first, fall back to `v1_old` during rotation window

**Payload versioning:** All webhook payloads include `"api_version": "2026-03-01"`. When payload schema changes, a new API version is introduced. Tenants can pin their endpoint to a specific version. Default: latest version.

### 18.3 Voice Call Recording Consent

**Two-party consent:** SavSpot operates globally and must comply with the strictest consent requirements:
- All calls begin with: "This call may be recorded for quality purposes."
- This disclosure plays BEFORE AI interaction begins (Twilio `<Say>` before `<Gather>`)
- If caller hangs up during disclosure, call is not recorded

**Recording storage:**
- Twilio recording URLs are stored in `VoiceCallLog.recordingUrl`
- Recordings are encrypted at rest (Twilio's encryption + SavSpot never downloads raw audio)
- Retention: 90 days, then auto-deleted via Twilio API (BullMQ daily cleanup job)
- GDPR deletion: if client requests data deletion, recording is deleted immediately via Twilio API and `recordingUrl` is nulled

**Transcript storage:**
- `VoiceCallLog.transcript` field stores conversation as `Array<{ role: 'caller' | 'ai', text: string, timestamp: string }>`
- Encrypted at rest via PostgreSQL column-level encryption (AES-256-GCM, key from env `TRANSCRIPT_ENCRYPTION_KEY`)
- PII in transcripts: caller name, phone number, and any personal details shared during conversation
- GDPR deletion: transcript field set to null on data deletion request
- Transcript is NOT sent to any external service beyond the LLM provider (which processes it ephemerally)

### 18.4 LLM Context Isolation

**Tenant isolation for voice AI:**
- Each LLM call includes only the current tenant's data in the system prompt
- No cross-tenant data is ever included in LLM context
- Conversation history is scoped to the current call only (no cross-call memory)
- LLM provider must be configured with data processing agreement (DPA)
- Development (Ollama): runs locally, no data leaves the server
- Production (Claude/OpenAI): API calls only, no training on customer data (per provider DPA terms)

**System prompt construction:**
```
System: You are an AI receptionist for {business_name}, a {category} business.
Business hours: {hours}
Services offered: {service_list_with_prices}
Cancellation policy: {policy}
Location: {address}

Rules:
- You MUST NOT reveal other clients' information
- You MUST NOT make up availability — only report what the system returns
- You MUST transfer to a human for: refunds, complaints, medical/legal topics
- You MUST confirm before creating any booking
```

No tenant-specific fine-tuning or model customization. All customization is via system prompt only.

**PII minimization in system prompt:**
- Include: service name, duration, base price. Exclude: service descriptions, internal notes, custom fields
- Include: business hours, address, phone, email. Exclude: staff personal details, client lists
- Cancellation policy: include only the summary text (e.g., "24-hour cancellation policy, $25 fee"). Exclude: internal override rules, staff exemptions
- Tool call logging: store function name + sanitized inputs (no client names/phones in tool call audit log). Full conversation transcript (with PII) stored separately in encrypted `VoiceCallLog.transcript`

### 18.5 Mobile Biometric Auth Threat Model

**Biometric storage:** SavSpot does NOT store biometric data. `expo-local-authentication` uses the device's secure enclave (Face ID, fingerprint). SavSpot only stores a flag: `user.biometricEnabled = true`.

**Auth flow:**
1. User enables biometric in app settings → `POST /api/auth/enable-biometric` sets flag
2. On app launch: if `biometricEnabled`, prompt biometric → on success, use stored refresh token from `expo-secure-store`
3. Refresh token → new access token → normal API access

**Threat mitigations:**
| Threat | Mitigation |
|--------|------------|
| Device theft (unlocked) | Refresh tokens expire after 30 days. Biometric re-prompt on sensitive actions (payment, cancellation). |
| Device theft (locked) | Biometric required. 5 failed attempts → require password login. |
| Stolen refresh token (rooted device) | `expo-secure-store` uses hardware-backed keystore. Jailbreak detection via `expo-device` — warn user, do not block. |
| Multiple device compromise | "Logout all devices" endpoint (`POST /api/auth/logout-all`) invalidates ALL refresh tokens for user. |
| Biometric spoofing | Relies on device-level security (Apple/Google). SavSpot does not add additional biometric verification. |

### 18.6 Deep Link Security

**URL scheme:** `savspot://` (custom scheme) + Universal Links / App Links (HTTPS)

**Validation:**
- All deep link parameters are validated server-side (IDs must be valid UUIDs, tenant slugs must exist)
- `ref` codes are validated against `referral_links` table — invalid codes are silently ignored (no error to user)
- Deep links to booking details require authentication — unauthenticated users are redirected to login, then forwarded to original deep link target
- No sensitive data in deep link URLs (no tokens, no email addresses)

---

## 19. Schema Corrections & Verified Models

This section documents discrepancies between the existing schema and Phase 3 requirements, with required migrations.

### 19.1 ReferralLink Model

**Current schema (verified):**
```prisma
model ReferralLink {
  id          String    @id @default(uuid()) @db.Uuid
  tenantId    String    @db.Uuid
  code        String    @unique
  name        String
  createdBy   String?   @db.Uuid
  usageCount  Int       @default(0)
  isActive    Boolean   @default(true)
  expiresAt   DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  // ... relations
}
```

**Missing for Phase 3:**
- `commissionPercent Decimal? @db.Decimal(5,2)` — per-link commission override (null = use tenant default)
- Migration: §13, Migration 3

**Booking model addition:**
- `referralLinkId String? @db.Uuid` — FK to `ReferralLink` for attribution tracking
- Migration: §13, Migration 3

### 19.2 API Keys Model

**Current schema has:** `id`, `tenantId`, `key` (hashed), `name`, `isActive`, `lastUsedAt`, `createdAt`

**Additions for Phase 3:**
- `scopes Json? @default("[]")` — array of permission scopes (e.g., `["bookings:read", "bookings:write", "services:read"]`)
- `rateLimitOverride Int?` — per-key rate limit override
- `allowedIps String[]?` — CIDR notation IP allowlist
- `lastRotatedAt DateTime?`
- `expiresAt DateTime?`
- Migration: §13, Migration 1

### 19.3 VoiceCallLog Model (New)

Full model defined in §9.5. Key fields verified against Twilio API response structure:
- `callSid` maps to Twilio's `CallSid` (unique per call)
- `callerNumber` in E.164 format (Twilio provides as `From`)
- `direction` defaults to `INBOUND` (Phase 3 does not support outbound voice)
- `transcript` encrypted at rest (§18.3)

### 19.4 Enums to Add

**Prisma schema (`prisma/schema.prisma`):**
```prisma
enum VoiceCallDirection {
  INBOUND
  OUTBOUND
}

enum VoiceCallStatus {
  RINGING
  IN_PROGRESS
  COMPLETED
  BUSY
  NO_ANSWER
  FAILED
}
```

**Shared package (`packages/shared/src/enums/voice.enums.ts`):**
```typescript
import { z } from 'zod';

export const VoiceCallDirection = z.enum(['INBOUND', 'OUTBOUND']);
export type VoiceCallDirection = z.infer<typeof VoiceCallDirection>;

export const VoiceCallStatus = z.enum(['RINGING', 'IN_PROGRESS', 'COMPLETED', 'BUSY', 'NO_ANSWER', 'FAILED']);
export type VoiceCallStatus = z.infer<typeof VoiceCallStatus>;

export const VoiceIntent = z.enum([
  'AVAILABILITY_CHECK',
  'BOOK_APPOINTMENT',
  'CANCEL_BOOKING',
  'GENERAL_QUESTION',
  'TRANSFER_REQUEST',
  'REFUND_REQUEST',
  'COMPLAINT',
]);
export type VoiceIntent = z.infer<typeof VoiceIntent>;
```

**Shared package (`packages/shared/src/enums/automation.enums.ts`):**
```typescript
import { z } from 'zod';

export const AutomationExecutionStatus = z.enum([
  'PENDING',
  'IN_PROGRESS',
  'AWAITING_APPROVAL',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED',
]);
export type AutomationExecutionStatus = z.infer<typeof AutomationExecutionStatus>;

export const WebhookDeliveryStatus = z.enum(['PENDING', 'SUCCEEDED', 'FAILED', 'RETRYING']);
export type WebhookDeliveryStatus = z.infer<typeof WebhookDeliveryStatus>;
```

### 19.5 AccountingSyncLog Model (New)

Full schema in §13, Migration 4. This table does not exist in Phase 1-2. The existing `AccountingConnection` model tracks the OAuth connection; `AccountingSyncLog` tracks individual sync operations for idempotency and audit.

---

## 20. Deferred Items & Scope Decisions

Items explicitly evaluated for Phase 3 and deferred, with rationale.

### 20.1 Deferred to Phase 4

| Item | Reason | Phase 4 Prerequisite |
|------|--------|---------------------|
| **Natural Language Q&A** (FR-AI-6) | Requires RAG pipeline + embedding infrastructure not in scope | Phase 3 analytics data provides training foundation |
| **RTL Layout** (Arabic, Hebrew) | i18n infrastructure in Phase 3 is LTR-only; RTL requires significant layout rework | Phase 3 `I18nManager.isRTL` detection is in place |
| **Multi-language Voice AI** | Phase 3 voice is English-only; multi-language requires per-language STT models + translated prompts | Phase 3 i18n string extraction enables prompt translation |
| **Regional Accounting Software** | Phase 3 covers QuickBooks (US/global) + Xero (UK/AU/NZ); regional (FreshBooks, Sage, MYOB) is Phase 4 | `AccountingProviderInterface` makes adding providers straightforward |
| **Tablet-optimized Layout** | Mobile app uses responsive phone layout; dedicated tablet UI is Phase 4 | Phase 3 app works on tablets (just phone-sized) |
| **Outbound Voice Calls** | Phase 3 voice is inbound-only; outbound (reminder calls, no-show follow-up) is Phase 4 | Voice infrastructure + `VoiceCallDirection.OUTBOUND` enum ready |
| **Custom Analytics Reports** | Phase 3 provides fixed dashboard views; custom report builder is Phase 4 | Analytics query infrastructure supports custom filters |
| **Webhook event filtering by entity** | Phase 3 webhooks filter by event type only; filtering by service_id or staff_id is Phase 4 | Schema supports arbitrary filter JSONB column |
| **MCP Resource subscriptions** | MCP 1.0 supports resources but subscription is complex; Phase 3 implements tools only | MCP server architecture supports adding resources |
| **API v1 GraphQL** | Phase 3 API is REST-only per project convention; GraphQL explored in Phase 4 | REST endpoints provide complete data coverage |

### 20.2 Explicitly Out of Scope (No Phase Planned)

| Item | Reason |
|------|--------|
| **White-label mobile app** | Business complexity (app store submissions per tenant) outweighs value |
| **Video calling** | Outside core booking platform scope |
| **AI appointment rescheduling** (automatic) | Risk of unwanted changes; rebooking requires explicit client consent |
| **Marketplace/directory** (tenant discovery beyond API) | Consumer-facing marketplace is a different product |

### 20.3 API Versioning Lifecycle

- **v1** is the initial and only version in Phase 3
- **Versioning strategy:** Date-based (`2026-03-01`), passed via `X-API-Version` header or `?api_version=` query param
- **Breaking changes:** Introduce new date version; old version supported for 12 months minimum
- **Deprecation notice:** 6 months before sunset, `Sunset` HTTP header added to responses + email to API key owners
- **Non-breaking changes** (additive fields, new endpoints) are added to current version without versioning

---

## Appendix A: New Dependencies

| Package | Stream | Purpose |
|---------|--------|---------|
| `@modelcontextprotocol/sdk` | A | MCP server SDK |
| `expo` (SDK 54+) | B | Mobile framework |
| `expo-secure-store` | B | Secure token storage |
| `expo-local-authentication` | B | Biometric auth |
| `expo-notifications` | B | Push notifications |
| `expo-image-picker` | B | Photo uploads |
| `expo-sqlite` | B | Offline cache |
| `@stripe/stripe-react-native` | B | Mobile payments |
| `zustand` | B | Mobile state management |
| `@tanstack/react-query` | B | Mobile server state |
| `expo-server-sdk` | B (API) | Expo Push API server-side |
| `@adyen/api-library` | D | Adyen payment integration |
| `@paypal/paypal-server-sdk` | D | PayPal payment integration |
| `node-quickbooks` or `intuit-oauth` | E | QuickBooks API client |
| `xero-node` | E | Xero API client |
| `twilio` | G | Twilio Voice SDK |
| `recharts` | F | Analytics charts |
| `next-intl` | I | Next.js i18n |
| `react-i18next` | I (mobile) | React Native i18n |

## Appendix B: Enum Additions (packages/shared)

```typescript
// payment.enums.ts — add values
PaymentProviderType: 'STRIPE' | 'ADYEN' | 'PAYPAL' | 'OFFLINE'

// New enums
AutomationExecutionStatus: 'PENDING' | 'IN_PROGRESS' | 'AWAITING_APPROVAL' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED'
WebhookDeliveryStatus: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'RETRYING'

// voice.enums.ts (new file)
VoiceCallDirection: 'INBOUND' | 'OUTBOUND'
VoiceCallStatus: 'RINGING' | 'IN_PROGRESS' | 'COMPLETED' | 'BUSY' | 'NO_ANSWER' | 'FAILED'
VoiceIntent: 'AVAILABILITY_CHECK' | 'BOOK_APPOINTMENT' | 'CANCEL_BOOKING' | 'GENERAL_QUESTION' | 'TRANSFER_REQUEST' | 'REFUND_REQUEST' | 'COMPLAINT'
```

## Appendix C: Environment Variables (New)

```env
# Public API
PUBLIC_API_RATE_LIMIT_UNAUTH=30
PUBLIC_API_RATE_LIMIT_AUTH=1000
PUBLIC_API_DISCOVERY_RATE_LIMIT=30  # Unauthenticated discovery (reduced from 100 for enumeration prevention)

# Adyen
ADYEN_API_KEY=
ADYEN_MERCHANT_ACCOUNT=
ADYEN_PLATFORM_ACCOUNT=
ADYEN_ENVIRONMENT=TEST  # TEST or LIVE

# PayPal
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_PARTNER_ID=
PAYPAL_ENVIRONMENT=sandbox  # sandbox or live

# QuickBooks
QUICKBOOKS_CLIENT_ID=
QUICKBOOKS_CLIENT_SECRET=
QUICKBOOKS_REDIRECT_URI=
QUICKBOOKS_ENVIRONMENT=sandbox  # sandbox or production

# Xero
XERO_CLIENT_ID=
XERO_CLIENT_SECRET=
XERO_REDIRECT_URI=

# Twilio Voice
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_VOICE_WEBHOOK_URL=https://api.savspot.co/api/voice/answer
TWILIO_STATUS_CALLBACK_URL=https://api.savspot.co/api/voice/status

# Expo Push
EXPO_ACCESS_TOKEN=

# Currency
EXCHANGE_RATE_API_KEY=
EXCHANGE_RATE_PROVIDER=openexchangerates  # or exchangerate.host

# Voice AI (production)
VOICE_AI_PROVIDER=claude  # claude, openai, or ollama
VOICE_AI_API_KEY=
VOICE_AI_MODEL=claude-sonnet-4-6
VOICE_AI_TEMPERATURE=0.7
VOICE_AI_MAX_TOKENS=256
VOICE_AI_TIMEOUT_SECONDS=10

# Voice Transcript Encryption
TRANSCRIPT_ENCRYPTION_KEY=  # 32-byte hex key for AES-256-GCM

# Feature Flags (env-driven in Phase 3; database-driven in Phase 4)
FEATURE_WORKFLOW_BUILDER=false
FEATURE_PAYMENT_ADYEN=false
FEATURE_PAYMENT_PAYPAL=false
FEATURE_ACCOUNTING=false
FEATURE_VOICE=false
FEATURE_ADVANCED_ANALYTICS=false
FEATURE_MULTI_CURRENCY=false
```
