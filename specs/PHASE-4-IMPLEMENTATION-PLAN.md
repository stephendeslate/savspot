# Phase 4 — Implementation Plan

**Version:** 1.0 | **Date:** March 11, 2026 | **Author:** SD Solutions, LLC
**Status:** Planning
**Base:** Phase 3 complete (commit `3c52fcd`, March 11, 2026)

---

## 1. Phase 4 Philosophy

Phase 4 is **demand-driven, not calendar-driven**. Each feature ships when its adoption trigger is met — not on a fixed timeline. This document defines the full technical implementation plan for each feature so that when a trigger fires, development can begin immediately with no additional planning.

**Execution model:** Features are ordered by expected trigger sequence. Each feature is a self-contained work stream with its own trigger gate, data model changes, API endpoints, frontend surfaces, and test plan.

---

## 2. Feature Trigger Gates

| Feature | Trigger | Measurement Method | Priority |
|---------|---------|-------------------|----------|
| **Platform Directory** | >200 businesses with `is_published = true` | `SELECT COUNT(*) FROM tenants WHERE is_published = true` | Must |
| **Custom Domain Booking Pages** | >20 businesses requesting via support/feedback | `SELECT COUNT(*) FROM feedback WHERE category = 'FEATURE_REQUEST' AND content ILIKE '%custom domain%' AND status != 'DECLINED'` | Should |
| **Multi-Location Management** | >10 businesses operating 2+ physical venues | `SELECT COUNT(*) FROM (SELECT tenant_id FROM venues GROUP BY tenant_id HAVING COUNT(*) >= 2) sub` | Should |
| **Regional Payment Providers** | >50 businesses in a region where Stripe/Adyen/PayPal have limited coverage | Manual analysis of `tenants.address` geo-distribution + `payment_provider = 'OFFLINE'` concentration | Should |
| **AI Recommendations** | Organic demand + sufficient data density | >1,000 completed bookings per category for ML model training | Could |
| **Partner Program** | >500 businesses with consistent monthly bookings | `SELECT COUNT(*) FROM tenants WHERE id IN (SELECT tenant_id FROM bookings WHERE status = 'COMPLETED' AND created_at > NOW() - INTERVAL '30 days' GROUP BY tenant_id HAVING COUNT(*) >= 5)` | Could |
| **Saved/Favorited Businesses** | Directory launch (depends on Platform Directory) | Becomes relevant only after directory exists | Could |

**Monitoring:** A daily BullMQ job (`QUEUE_PLATFORM_METRICS`) computes trigger gate metrics and stores them in a `platform_metrics` table. When a threshold is crossed, an alert is sent to the platform admin via the existing notification system.

---

## 3. Feature A: Platform Directory

**Trigger:** >200 businesses with `is_published = true`
**Spec refs:** PRD §2 Phase 4, PVD §9, BRD BR-RULE-2, GTM §6.5, SRS-2 §15, SRS-3 §2

### 3.1 Overview

A consumer-facing marketplace where clients discover businesses by category, location, and availability. Bookings originating from the directory are tagged `source = DIRECTORY` and are commission-eligible per BRD BR-RULE-2 (15-20% of first booking from a new platform-sourced client, capped at $500).

### 3.2 Data Model Changes

**Existing schema already supports:**
- `tenants.is_published` (Boolean) — gates directory visibility
- `tenants.search_vector` (tsvector) — full-text search on name + description
- `tenants.category` — B-tree index for category filtering
- `tenants.address` (JSONB with lat/lng) — GiST point index for location radius search
- `services.search_vector` (tsvector) — service-level search
- `bookings.source = DIRECTORY` — BookingSource enum value exists
- Commission calculation logic in SRS-3 §11 already handles DIRECTORY source

**New models:**

```prisma
model DirectoryListing {
  id              String   @id @default(uuid())
  tenantId        String   @unique @map("tenant_id")
  tenant          Tenant   @relation(fields: [tenantId], references: [id])
  featuredUntil   DateTime? @map("featured_until")
  sortBoost       Int      @default(0) @map("sort_boost")
  totalBookings   Int      @default(0) @map("total_bookings")
  averageRating   Decimal? @map("average_rating") @db.Decimal(3, 2)
  reviewCount     Int      @default(0) @map("review_count")
  responseRate    Decimal? @map("response_rate") @db.Decimal(5, 2)
  responseTimeMin Int?     @map("response_time_min")
  lastActiveAt    DateTime? @map("last_active_at")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  @@map("directory_listings")
}

model SavedBusiness {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  user      User     @relation(fields: [userId], references: [id])
  tenantId  String   @map("tenant_id")
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  createdAt DateTime @default(now()) @map("created_at")

  @@unique([userId, tenantId])
  @@map("saved_businesses")
}
```

**New migration: directory listing aggregate refresh**
A daily BullMQ job recomputes `DirectoryListing` fields from `bookings`, `reviews`, and `communications` tables. This denormalized table avoids expensive joins on every search query.

### 3.3 API Endpoints

All directory endpoints are **public** (no authentication required). Rate-limited at 60 requests/minute per IP.

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/directory/search` | Search businesses by query, category, location, availability | None |
| GET | `/api/directory/categories` | List all categories with business counts | None |
| GET | `/api/directory/businesses/:slug` | Business detail (services, reviews, availability preview) | None |
| GET | `/api/directory/businesses/:slug/reviews` | Paginated reviews for a business | None |
| GET | `/api/directory/businesses/:slug/availability` | Next 7 days availability preview | None |
| POST | `/api/directory/businesses/:slug/book` | Create booking session with `source = DIRECTORY` | None (guest) |
| POST | `/api/saved-businesses` | Save/unsave a business | JWT |
| GET | `/api/saved-businesses` | List saved businesses | JWT |

**Search query parameters:**
```
GET /api/directory/search?
  q=haircut                          # Full-text search (tsvector)
  &category=SALON                    # Category filter (enum)
  &lat=40.7128&lng=-74.0060          # Center point for radius search
  &radius=10                         # Radius in miles (default 25, max 100)
  &sort=rating|distance|relevance    # Sort order (default: relevance)
  &min_rating=4.0                    # Minimum average rating filter
  &available_date=2026-03-15         # Filter by businesses with availability on date
  &page=1&limit=20                   # Pagination (max 50 per page)
```

**Search implementation:**

```sql
-- Combined FTS + location + category query
SELECT t.id, t.name, t.slug, t.description, t.category, t.address,
       t.branding, dl.average_rating, dl.review_count, dl.response_time_min,
       ts_rank(t.search_vector, plainto_tsquery('english', :query)) AS relevance,
       point(t.address->>'lng', t.address->>'lat') <@> point(:lng, :lat) AS distance_miles
FROM tenants t
JOIN directory_listings dl ON dl.tenant_id = t.id
WHERE t.is_published = true
  AND t.status = 'active'
  AND (:query IS NULL OR t.search_vector @@ plainto_tsquery('english', :query))
  AND (:category IS NULL OR t.category = :category)
  AND (:lat IS NULL OR point(t.address->>'lng', t.address->>'lat') <@> point(:lng, :lat) < :radius)
  AND (:min_rating IS NULL OR dl.average_rating >= :min_rating)
ORDER BY
  CASE :sort
    WHEN 'rating' THEN dl.average_rating
    WHEN 'distance' THEN point(t.address->>'lng', t.address->>'lat') <@> point(:lng, :lat)
    ELSE ts_rank(t.search_vector, plainto_tsquery('english', :query))
  END
LIMIT :limit OFFSET :offset;
```

**Privacy floor enforcement:** Directory listing aggregates are only computed and displayed for categories with 4+ active tenants (per BRD BR-RULE-9, SRS-2 §15). Categories below this threshold are excluded from category listing and search results.

### 3.4 Frontend Surfaces

**New routes (public, no auth):**

| Route | Page | Description |
|-------|------|-------------|
| `/directory` | Directory home | Search bar, featured categories, top-rated businesses |
| `/directory/search` | Search results | Grid/list view with map, filters sidebar, pagination |
| `/directory/[category]` | Category page | Businesses in category with sub-filters |
| `/directory/[category]/[city]` | Category + city | SEO-optimized landing pages |

**Components:**
- `DirectorySearchBar` — Autocomplete with category/location suggestions
- `BusinessCard` — Compact card (name, photo, rating, category, price range, distance)
- `BusinessDetailPage` — Extends existing `/book/[slug]` with reviews, availability calendar, "Save" button
- `DirectoryMap` — Map view with business pins (Mapbox GL JS or Leaflet + OpenStreetMap)
- `CategoryGrid` — Category cards with icons and business counts
- `DirectoryFilters` — Sidebar: category, rating, distance, availability date

**SEO:**
- Server-side rendered (Next.js App Router SSR)
- Dynamic `<title>`: "Best {Category} in {City} | SavSpot"
- JSON-LD: `ItemList` of `LocalBusiness` entities
- Auto-generated `sitemap.xml` entries for all directory pages
- Canonical URLs: `/directory/{category}/{city}`
- Open Graph meta tags with business photos

### 3.5 Background Jobs

| Job | Queue | Schedule | Description |
|-----|-------|----------|-------------|
| `directory-listing-refresh` | QUEUE_PLATFORM_METRICS | Daily 3:00 AM UTC | Recompute `DirectoryListing` aggregates from bookings + reviews |
| `directory-sitemap-generate` | QUEUE_PLATFORM_METRICS | Daily 4:00 AM UTC | Regenerate `/directory/sitemap.xml` from published tenants |

### 3.6 Commission Integration

No new commission logic needed. The existing referral commission calculation (SRS-3 §11, implemented in Phase 3) already handles `source = DIRECTORY`:

```typescript
// Existing logic in BookingsService.complete()
if (['DIRECTORY', 'API', 'REFERRAL'].includes(booking.source)) {
  const isFirstPlatformBooking = await this.isFirstPlatformSourcedBooking(
    booking.clientId,
    booking.tenantId,
  );
  if (isFirstPlatformBooking) {
    commission = Math.min(bookingTotal * commissionRate, commissionCap);
  }
}
```

The directory UI passes `source=DIRECTORY` during booking session creation. The rest is handled by existing infrastructure.

### 3.7 Test Plan

| Scope | Tests | Description |
|-------|-------|-------------|
| Unit | DirectoryService.search | FTS query building, pagination, privacy floor enforcement |
| Unit | DirectoryListingRefreshJob | Aggregate computation accuracy |
| Integration | Directory search → booking session → commission | End-to-end directory-sourced booking with commission |
| E2E | Directory home → search → business detail → book | Full user journey via Playwright |
| E2E | SEO validation | Meta tags, JSON-LD, sitemap generation |
| Performance | Search query under load (NFR-PERF-4) | <200ms p95 for search queries with 1,000+ listings (exceeds NFR-PERF-4 500ms target) |
| Performance | Scale test (NFR-SCALE-4) | Sub-second search across 100K+ synthetic listings; validates Meilisearch migration trigger |

### 3.8 Dependencies

- Phase 1-3: `is_published`, `search_vector`, `BookingSource.DIRECTORY`, commission logic
- External: None (PostgreSQL FTS, no external search service at this scale)
- Migration to Meilisearch only if directory exceeds 100K listings (SRS-1 §2)

### 3.9 Estimated Scope

- **New NestJS module:** `DirectoryModule` (controller, service, search service, listing refresh job)
- **New Prisma models:** 2 (`DirectoryListing`, `SavedBusiness`)
- **New frontend routes:** 4 (`/directory`, `/directory/search`, `/directory/[category]`, `/directory/[category]/[city]`)
- **New components:** ~8
- **New endpoints:** 8
- **New BullMQ jobs:** 2
- **Migration:** 1 (new tables + indexes)

---

## 4. Feature B: Custom Domain Booking Pages

**Trigger:** >20 businesses requesting via support/feedback
**Spec refs:** PRD FR-ONB-9, FR-BP-8, BRD §1 (Premium feature)

### 4.1 Overview

Premium-tier businesses can serve their booking page at a custom domain (e.g., `book.mybusiness.com`) instead of `savspot.co/{slug}`. Same booking flow, different hostname.

### 4.2 Data Model Changes

```prisma
model CustomDomain {
  id              String            @id @default(uuid())
  tenantId        String            @unique @map("tenant_id")
  tenant          Tenant            @relation(fields: [tenantId], references: [id])
  domain          String            @unique
  status          CustomDomainStatus @default(PENDING_VERIFICATION)
  verificationToken String          @map("verification_token")
  verifiedAt      DateTime?         @map("verified_at")
  sslStatus       SslStatus         @default(PENDING) @map("ssl_status")
  sslIssuedAt     DateTime?         @map("ssl_issued_at")
  sslExpiresAt    DateTime?         @map("ssl_expires_at")
  lastCheckedAt   DateTime?         @map("last_checked_at")
  createdAt       DateTime          @default(now()) @map("created_at")
  updatedAt       DateTime          @updatedAt @map("updated_at")

  @@map("custom_domains")
}

enum CustomDomainStatus {
  PENDING_VERIFICATION
  DNS_VERIFIED
  SSL_PROVISIONING
  ACTIVE
  VERIFICATION_FAILED
  SSL_FAILED
  SUSPENDED
}

enum SslStatus {
  PENDING
  ISSUING
  ACTIVE
  RENEWAL_PENDING
  EXPIRED
  FAILED
}
```

### 4.3 DNS Verification Flow

```
1. Tenant adds domain "book.mybusiness.com" in settings
2. System generates verification token: svs_verify_{random_32_hex}
3. Tenant creates TXT record: _savspot-verify.book.mybusiness.com → svs_verify_{token}
4. Tenant creates CNAME record: book.mybusiness.com → custom.savspot.co
5. BullMQ job polls DNS every 5 minutes for up to 72 hours
6. On TXT verification success: status → DNS_VERIFIED
7. SSL provisioning begins (Let's Encrypt via platform)
8. On SSL issuance: status → ACTIVE, domain is live
```

### 4.4 Request Resolution

**Next.js middleware** (`apps/web/src/middleware.ts`):

```typescript
export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host');

  // Skip for savspot.co and known subdomains
  if (hostname === 'savspot.co' || hostname?.endsWith('.savspot.co')) {
    return NextResponse.next();
  }

  // Custom domain lookup (Redis-cached, 5-minute TTL)
  const tenantSlug = await resolveCustomDomain(hostname);

  if (tenantSlug) {
    // Rewrite to /book/[slug] internally, preserving the custom domain externally
    const url = request.nextUrl.clone();
    url.pathname = `/book/${tenantSlug}${url.pathname === '/' ? '' : url.pathname}`;
    return NextResponse.rewrite(url);
  }

  // Unknown domain — redirect to savspot.co
  return NextResponse.redirect('https://savspot.co');
}
```

**Redis cache key:** `custom_domain:{hostname}` → `{tenant_slug}` (5-minute TTL, invalidated on domain change)

### 4.5 API Endpoints

All gated behind `@RequireTier('PREMIUM')`.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/tenants/:id/custom-domain` | Add custom domain, start verification |
| GET | `/api/tenants/:id/custom-domain` | Get domain status and DNS instructions |
| DELETE | `/api/tenants/:id/custom-domain` | Remove custom domain |
| POST | `/api/tenants/:id/custom-domain/verify` | Force DNS re-check |

### 4.6 SSL Certificate Management

**Approach:** Leverage Fly.io's built-in certificate management (if API is on Fly.io) or Vercel's automatic SSL (if web is on Vercel). Both support programmatic certificate issuance for custom domains.

**Fly.io path (API serves booking pages):**
```bash
fly certs add book.mybusiness.com --app savspot-api
```

**Vercel path (Next.js serves booking pages):**
```typescript
// Vercel Domains API
await fetch('https://api.vercel.com/v10/projects/{projectId}/domains', {
  method: 'POST',
  body: JSON.stringify({ name: 'book.mybusiness.com' }),
  headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
});
```

The approach depends on deployment architecture. Both support automatic Let's Encrypt certificate issuance and renewal.

### 4.7 Background Jobs

| Job | Queue | Schedule | Description |
|-----|-------|----------|-------------|
| `custom-domain-dns-verify` | QUEUE_PLATFORM_METRICS | Every 5 min (pending domains only) | Poll DNS for TXT record verification |
| `custom-domain-ssl-renew` | QUEUE_PLATFORM_METRICS | Daily | Check SSL expiry, trigger renewal 30 days before expiry |
| `custom-domain-health-check` | QUEUE_PLATFORM_METRICS | Hourly | Verify CNAME still resolves, domain is reachable |

### 4.8 Frontend Surfaces

**New settings page:** `/(dashboard)/settings/custom-domain`
- Domain input field
- DNS instruction panel (TXT record + CNAME record values)
- Verification status indicator (pending → verified → SSL provisioning → active)
- "Verify Now" button (triggers manual DNS check)
- "Remove Domain" with confirmation dialog

### 4.9 Edge Cases

- **Misconfigured DNS:** Domain falls back to `savspot.co/{slug}`. Custom domain settings page shows a warning.
- **Expired SSL:** BullMQ job triggers renewal 30 days before expiry. If renewal fails, status → `SSL_FAILED`, domain serves a redirect to `savspot.co/{slug}`.
- **Subscription downgrade:** If tenant downgrades from Premium, custom domain enters `SUSPENDED` status. Requests to the domain redirect to `savspot.co/{slug}`. Domain is reactivated on re-upgrade without re-verification (if DNS is still valid).
- **Duplicate domain:** `domain` column has `@unique` constraint. Attempting to add an already-claimed domain returns 409.

### 4.10 Test Plan

| Scope | Tests | Description |
|-------|-------|-------------|
| Unit | CustomDomainService | CRUD, DNS verification logic, status transitions |
| Unit | Middleware domain resolution | Custom domain → slug rewriting, cache hit/miss, fallback |
| Integration | Add domain → verify DNS → SSL → serve booking page | Full lifecycle |
| E2E | Visit `book.mybusiness.com` → see booking page | End-to-end with mock DNS |

### 4.11 Estimated Scope

- **New NestJS module:** `CustomDomainModule` (controller, service, DNS verifier, SSL manager)
- **New Prisma models:** 1 (`CustomDomain`) + 2 enums
- **New frontend routes:** 1 (`/settings/custom-domain`)
- **New endpoints:** 4
- **New BullMQ jobs:** 3
- **Migration:** 1

---

## 5. Feature C: Multi-Location Management

**Trigger:** >10 businesses operating 2+ physical venues
**Spec refs:** PRD §2 Phase 4, BRD §2 (Enterprise feature), SRS-2 §4 (`venues` table)

### 5.1 Overview

Enterprise-tier businesses can manage multiple physical locations under a single tenant. Each location has its own staff, availability rules, services, and settings while sharing a unified client base and analytics.

### 5.2 Data Model Changes

**Existing schema already supports:**
- `Venue` model with `tenant_id`, `address`, `capacity`, `is_active`
- `Service.venue_id` — optional FK linking a service to a specific venue
- `AvailabilityRule.venue_id` — per-venue availability rules
- `BlockedDate.venue_id` — per-venue blocked dates
- `GalleryPhoto.venue_id` — per-venue photos

**New fields on Venue:**

```prisma
model Venue {
  // ... existing fields ...

  // Phase 4 additions
  contactEmail     String?  @map("contact_email")
  contactPhone     String?  @map("contact_phone")
  timezone         String?  // Override tenant timezone for this location
  branding         Json?    // Location-specific branding overrides
  bookingSlug      String?  @unique @map("booking_slug") // e.g., savspot.co/{tenant-slug}/{venue-slug}
  operatingHours   Json?    @map("operating_hours") // Default weekly hours for this location
}
```

**New join table:**

```prisma
model VenueStaff {
  id        String   @id @default(uuid())
  venueId   String   @map("venue_id")
  venue     Venue    @relation(fields: [venueId], references: [id])
  userId    String   @map("user_id")
  user      User     @relation(fields: [userId], references: [id])
  isPrimary Boolean  @default(false) @map("is_primary")
  createdAt DateTime @default(now()) @map("created_at")

  @@unique([venueId, userId])
  @@map("venue_staff")
}
```

### 5.3 API Endpoints

All gated behind `@RequireTier('ENTERPRISE')`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tenants/:id/venues` | List all venues (existing, enhanced) |
| POST | `/api/tenants/:id/venues` | Create venue (existing, enhanced) |
| PATCH | `/api/venues/:id` | Update venue (existing, enhanced with new fields) |
| DELETE | `/api/venues/:id` | Archive venue (soft delete) |
| GET | `/api/venues/:id/staff` | List staff assigned to venue |
| POST | `/api/venues/:id/staff` | Assign staff to venue |
| DELETE | `/api/venues/:id/staff/:userId` | Remove staff from venue |
| GET | `/api/venues/:id/analytics` | Per-venue analytics (bookings, revenue, utilization) |
| GET | `/api/tenants/:id/analytics/cross-location` | Cross-location comparison dashboard |

### 5.4 Frontend Surfaces

**Enhanced existing pages:**

- `/(dashboard)/settings/profile` — Location selector in header; each location has its own settings sub-view
- `/(dashboard)/calendar` — Location filter dropdown; "All Locations" aggregated view
- `/(dashboard)/bookings` — Location column in booking list; location filter
- `/(dashboard)/services` — Location badge on services; bulk-assign to location

**New pages:**

| Route | Description |
|-------|-------------|
| `/(dashboard)/locations` | Location list with key metrics per location |
| `/(dashboard)/locations/[id]` | Location detail (staff, services, availability, analytics) |
| `/(dashboard)/locations/[id]/settings` | Location-specific settings (contact, hours, branding) |

**Booking flow changes:**

When a tenant has 2+ active venues, the booking flow inserts a `VENUE_SELECTION` step before `SERVICE_SELECTION`. If only one venue has the selected service, venue selection is auto-resolved (existing logic in SRS-1 §8). The venue slug URL (`savspot.co/{tenant-slug}/{venue-slug}`) pre-selects the venue and skips the step.

### 5.5 Cross-Location Analytics

New analytics endpoints surface per-location comparisons:

| Metric | Description |
|--------|-------------|
| Booking volume | Bookings per location per period |
| Revenue | Revenue per location per period |
| Utilization | Booked hours / available hours per location |
| Staff productivity | Bookings per staff member per location |
| Client distribution | Unique clients per location |
| Peak hours | Heatmap of booking density per location |

Rendered as a comparison table and chart view in the dashboard.

### 5.6 Test Plan

| Scope | Tests | Description |
|-------|-------|-------------|
| Unit | VenueService (enhanced) | CRUD, staff assignment, slug generation |
| Unit | AvailabilityResolver | Multi-venue conflict detection, venue-scoped availability |
| Integration | Multi-venue booking flow | Venue selection → service → availability per venue |
| E2E | Create venue → assign staff → book at specific location | Full lifecycle |
| E2E | Cross-location analytics | Aggregate vs per-location data accuracy |

### 5.7 Estimated Scope

- **Enhanced modules:** `ServicesModule`, `AvailabilityModule`, `BookingFlowModule`, `AnalyticsModule`
- **New Prisma model:** 1 (`VenueStaff`), plus fields on `Venue`
- **New frontend routes:** 3
- **New/enhanced endpoints:** 9
- **Migration:** 1

---

## 6. Feature D: Regional Payment Providers

**Trigger:** >50 businesses in a region where Stripe/Adyen/PayPal have limited coverage
**Spec refs:** PRD §2 Phase 4, PVD §9, SRS-1 §4, SRS-3 §11

### 6.1 Overview

Phase 3 built the `PaymentProviderFactory` abstraction with Stripe (live), Adyen (stub), and PayPal (stub). Phase 4 implements additional region-specific providers when geographic demand justifies each.

### 6.2 Target Providers

| Provider | Region | Trigger Geography | Key Features |
|----------|--------|-------------------|--------------|
| **GCash** | Philippines | PH business concentration | Digital wallet, QR payments, 73% PH digital payment share |
| **Maya** | Philippines | PH business concentration | Digital wallet + bank transfers |
| **Razorpay** | India | IN business concentration | UPI, cards, wallets, 40%+ CAGR |
| **Mollie** | EU/UK | EU SMB concentration | iDEAL, Bancontact, SEPA, Klarna |
| **dLocal** | LATAM | BR/MX/AR concentration | Pix, Boleto, OXXO, local cards |

### 6.3 Implementation per Provider

Each provider implements the existing `IPaymentProvider` interface (SRS-3 §11):

```typescript
interface IPaymentProvider {
  createConnectedAccount(tenant: Tenant): Promise<ConnectedAccount>;
  createPaymentIntent(params: PaymentIntentParams): Promise<PaymentIntent>;
  confirmPayment(paymentId: string): Promise<PaymentConfirmation>;
  refundPayment(paymentId: string, amount?: number): Promise<Refund>;
  getPaymentStatus(paymentId: string): Promise<PaymentStatus>;
  verifyWebhookSignature(payload: Buffer, signature: string): boolean;
  handleWebhook(event: WebhookEvent): Promise<void>;
}
```

**Per-provider deliverables:**

| Component | Files |
|-----------|-------|
| Provider service | `apps/api/src/payments/providers/{name}.provider.ts` |
| Webhook controller | `apps/api/src/payments/webhooks/{name}-webhook.controller.ts` |
| DTOs | `apps/api/src/payments/dto/{name}-*.dto.ts` |
| Feature flag | `FEATURE_PAYMENT_{NAME}` in `.env` |
| Test suite | `apps/api/src/payments/providers/{name}.provider.spec.ts` |

**PaymentProviderFactory update:**

```typescript
@Injectable()
export class PaymentProviderFactory {
  resolve(provider: PaymentProvider): IPaymentProvider {
    switch (provider) {
      case 'STRIPE': return this.stripeProvider;
      case 'ADYEN': return this.adyenProvider;
      case 'PAYPAL': return this.paypalProvider;
      case 'GCASH': return this.gcashProvider;
      case 'MAYA': return this.mayaProvider;
      case 'RAZORPAY': return this.razorpayProvider;
      case 'MOLLIE': return this.mollieProvider;
      case 'DLOCAL': return this.dlocalProvider;
      default: throw new UnsupportedPaymentProviderError(provider);
    }
  }
}
```

### 6.4 Data Model Changes

```prisma
enum PaymentProvider {
  STRIPE
  ADYEN
  PAYPAL
  OFFLINE
  // Phase 4 additions
  GCASH
  MAYA
  RAZORPAY
  MOLLIE
  DLOCAL
}
```

No new tables needed. Each provider stores its account ID in `tenants.payment_provider_account_id` and uses the existing `payments`, `payment_webhooks`, and `invoices` tables.

### 6.5 Frontend: Provider Onboarding

The settings payment page (`/(dashboard)/settings/payments`) already renders a provider-specific onboarding flow based on `tenants.payment_provider`. For each new provider:

- OAuth redirect flow (provider-specific)
- Account status indicator (connected/pending/error)
- Payout dashboard link

**Provider selection:** When a tenant creates an account, the onboarding flow suggests the optimal provider based on the business's country (derived from address). Tenants can override.

### 6.6 Provider Priority

Providers are implemented one at a time. Priority determined by which geography triggers first:

1. **Razorpay** (India) — highest growth market, well-documented API
2. **Mollie** (EU) — largest EU SMB payment processor, broad method support
3. **GCash/Maya** (Philippines) — year 1 target market (PVD §8a)
4. **dLocal** (LATAM) — aggregated LATAM coverage

### 6.7 Test Plan

| Scope | Tests | Description |
|-------|-------|-------------|
| Unit | Each provider service | Payment intent creation, webhook handling, refund |
| Unit | PaymentProviderFactory | Correct provider resolution, unsupported provider error |
| Integration | Provider → payment → booking confirmation | Full payment lifecycle per provider |
| E2E | Onboard provider → create booking → pay → confirm | Full flow with test/sandbox credentials |

### 6.8 Estimated Scope (per provider)

- **New files:** 3-4 (provider service, webhook controller, DTOs, tests)
- **Modified files:** 2 (PaymentProviderFactory, PaymentProvider enum)
- **External setup:** Provider developer account, API keys, webhook URLs

---

## 7. Feature E: AI Recommendations

**Trigger:** Organic demand + sufficient data density (>1,000 completed bookings per category)
**Spec refs:** PRD §2 Phase 4

### 7.1 Overview

Three recommendation surfaces that leverage booking history data:

1. **Business-facing:** "Clients who booked {Service A} also booked {Service B}" (upsell insights)
2. **Client-facing:** "Based on your history, you might enjoy {Service}" (cross-sell in client portal + directory)
3. **Churn risk scoring:** Flag clients at risk of not rebooking for proactive outreach

### 7.2 Data Model Changes

```prisma
model RecommendationModel {
  id            String   @id @default(uuid())
  type          RecommendationType
  category      String?  // Business category this model covers
  modelData     Json     @map("model_data") // Serialized model parameters
  trainingSize  Int      @map("training_size")
  accuracy      Decimal? @db.Decimal(5, 4)
  trainedAt     DateTime @map("trained_at")
  createdAt     DateTime @default(now()) @map("created_at")

  @@map("recommendation_models")
}

model ClientRecommendation {
  id             String   @id @default(uuid())
  userId         String   @map("user_id")
  user           User     @relation(fields: [userId], references: [id])
  tenantId       String   @map("tenant_id")
  tenant         Tenant   @relation(fields: [tenantId], references: [id])
  serviceId      String   @map("service_id")
  service        Service  @relation(fields: [serviceId], references: [id])
  score          Decimal  @db.Decimal(5, 4) // Relevance score 0-1
  reason         String   // Human-readable: "Clients who booked X also booked Y"
  impressions    Int      @default(0)
  clicked        Boolean  @default(false)
  bookedFromRec  Boolean  @default(false) @map("booked_from_rec")
  expiresAt      DateTime @map("expires_at")
  createdAt      DateTime @default(now()) @map("created_at")

  @@map("client_recommendations")
}

model ChurnRiskScore {
  id           String   @id @default(uuid())
  clientId     String   @map("client_id")
  tenantId     String   @map("tenant_id")
  riskLevel    RiskLevel @map("risk_level")
  score        Decimal  @db.Decimal(5, 4) // 0-1, higher = more at-risk
  factors      Json     // Contributing factors
  lastBooking  DateTime @map("last_booking")
  expectedNext DateTime? @map("expected_next") // Based on rebooking interval
  computedAt   DateTime @map("computed_at")
  createdAt    DateTime @default(now()) @map("created_at")

  @@unique([clientId, tenantId])
  @@map("churn_risk_scores")
}

enum RecommendationType {
  SERVICE_AFFINITY    // "also booked" collaborative filtering
  CLIENT_PREFERENCE   // Per-client personalized
  CHURN_RISK          // Churn prediction model
}

enum RiskLevel {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}
```

### 7.3 Recommendation Algorithms

**Service Affinity (collaborative filtering):**
- Compute co-occurrence matrix: for each pair of services within a tenant category, count how many unique clients booked both services
- Normalize by total bookings per service
- Threshold: minimum 10 co-occurrences before surfacing
- Refresh: Weekly BullMQ job

**Client Preference (content-based):**
- For each client, analyze booking history: service categories, price ranges, time-of-day preferences, provider preferences
- Match against services the client has not yet booked
- Score = weighted combination of category match, price range match, and popularity
- Refresh: Weekly BullMQ job

**Churn Risk (heuristic + ML):**
- Phase 4a (heuristic): Use rebooking interval detection (FR-AI-3, Phase 2) as baseline. Client is "at risk" when `days_since_last_booking > 1.5 * median_rebooking_interval`
- Phase 4b (ML): Train gradient-boosted model on features: days since last booking, booking frequency, no-show history, cancellation rate, time since first booking, response to reminders
- Refresh: Daily BullMQ job

### 7.4 API Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/tenants/:id/recommendations/upsell` | Service affinity recommendations for business dashboard | JWT (OWNER/ADMIN) |
| GET | `/api/tenants/:id/clients/:clientId/churn-risk` | Churn risk score for specific client | JWT (OWNER/ADMIN/STAFF) |
| GET | `/api/tenants/:id/churn-risk/at-risk` | List at-risk clients (sorted by score) | JWT (OWNER/ADMIN) |
| GET | `/api/portal/recommendations` | Personalized service recommendations for client | JWT (client) |
| GET | `/api/directory/businesses/:slug/recommended` | "You might also like" in directory | None (uses cookies/session) |
| POST | `/api/recommendations/:id/click` | Track recommendation click-through | JWT |

### 7.5 Frontend Surfaces

**Admin CRM:**
- Dashboard card: "Upsell Opportunity — 40% of haircut clients also book beard trims" with action button
- Client detail page: Churn risk indicator (subtle colored dot, per FR-AI-2 design pattern — not labeled "AI")
- At-risk clients list: Filterable by risk level, sortable by days overdue

**Client Portal:**
- "Recommended for you" section on portal dashboard
- "You might also like" cards on booking confirmation page

**Directory:**
- "Similar businesses" section on business detail page
- "Clients also visited" cross-business recommendations (privacy-safe, aggregated)

### 7.6 Background Jobs

| Job | Queue | Schedule | Description |
|-----|-------|----------|-------------|
| `recommendation-service-affinity` | QUEUE_AI_OPERATIONS | Weekly (Sunday 2:00 AM UTC) | Compute service co-occurrence matrices |
| `recommendation-client-preference` | QUEUE_AI_OPERATIONS | Weekly (Sunday 3:00 AM UTC) | Compute per-client personalized recommendations |
| `churn-risk-compute` | QUEUE_AI_OPERATIONS | Daily (5:00 AM UTC) | Compute churn risk scores for all active clients |
| `recommendation-cleanup` | QUEUE_AI_OPERATIONS | Weekly | Remove expired recommendations, archive old scores |

### 7.7 Premium Gating

| Feature | Tier |
|---------|------|
| Client-facing recommendations | Free (improves booking rate for all) |
| Business-facing upsell insights | Premium |
| Churn risk scoring + at-risk client list | Premium |
| Recommendation analytics (CTR, conversion) | Premium |

### 7.8 Test Plan

| Scope | Tests | Description |
|-------|-------|-------------|
| Unit | Service affinity algorithm | Co-occurrence matrix computation, threshold enforcement |
| Unit | Churn risk heuristic | Risk level calculation from booking history |
| Unit | Client preference matching | Score computation, ranking |
| Integration | Recommendation generation → display → click tracking | Full pipeline |
| E2E | Admin views at-risk clients → sends re-engagement message | Actionable workflow |

### 7.9 Estimated Scope

- **New NestJS module:** `RecommendationsModule` (service affinity service, churn risk service, client preference service, controller)
- **New Prisma models:** 3 + 2 enums
- **New frontend components:** ~6 (recommendation cards, risk indicators, at-risk list)
- **New endpoints:** 6
- **New BullMQ jobs:** 4
- **Migration:** 1

---

## 8. Feature F: Partner Program

**Trigger:** >500 businesses with consistent monthly bookings
**Spec refs:** PRD §2 Phase 4, PVD §9

### 8.1 Overview

A structured program enabling three partner types:

1. **Referral Partners:** Earn commission for referred businesses (e.g., accountants, business consultants, web designers who serve SMBs)
2. **Integration Partners:** Third-party apps that connect to Savspot via the Public API (e.g., POS systems, marketing tools)
3. **Reseller Partners:** White-label Savspot for their own brand (future, scoped but not fully implemented in Phase 4)

### 8.2 Data Model Changes

```prisma
model Partner {
  id              String        @id @default(uuid())
  userId          String        @unique @map("user_id")
  user            User          @relation(fields: [userId], references: [id])
  type            PartnerType
  companyName     String        @map("company_name")
  companyUrl      String?       @map("company_url")
  status          PartnerStatus @default(PENDING)
  tier            PartnerTier   @default(STANDARD)
  referralCode    String        @unique @map("referral_code")
  commissionRate  Decimal       @default(0.10) @map("commission_rate") @db.Decimal(5, 4) // 10% default
  totalReferrals  Int           @default(0) @map("total_referrals")
  totalEarnings   Decimal       @default(0) @map("total_earnings") @db.Decimal(12, 2)
  payoutMethod    String?       @map("payout_method") // Stripe Connect account ID
  approvedAt      DateTime?     @map("approved_at")
  approvedBy      String?       @map("approved_by")
  createdAt       DateTime      @default(now()) @map("created_at")
  updatedAt       DateTime      @updatedAt @map("updated_at")

  referredTenants PartnerReferral[]
  payouts         PartnerPayout[]

  @@map("partners")
}

model PartnerReferral {
  id          String   @id @default(uuid())
  partnerId   String   @map("partner_id")
  partner     Partner  @relation(fields: [partnerId], references: [id])
  tenantId    String   @map("tenant_id")
  tenant      Tenant   @relation(fields: [tenantId], references: [id])
  status      PartnerReferralStatus @default(PENDING)
  activatedAt DateTime? @map("activated_at") // Tenant completed onboarding
  firstBookingAt DateTime? @map("first_booking_at")
  createdAt   DateTime @default(now()) @map("created_at")

  @@unique([partnerId, tenantId])
  @@map("partner_referrals")
}

model PartnerPayout {
  id          String   @id @default(uuid())
  partnerId   String   @map("partner_id")
  partner     Partner  @relation(fields: [partnerId], references: [id])
  amount      Decimal  @db.Decimal(12, 2)
  currency    String   @default("USD")
  status      PayoutStatus @default(PENDING)
  periodStart DateTime @map("period_start")
  periodEnd   DateTime @map("period_end")
  paidAt      DateTime? @map("paid_at")
  providerPayoutId String? @map("provider_payout_id")
  createdAt   DateTime @default(now()) @map("created_at")

  @@map("partner_payouts")
}

enum PartnerType {
  REFERRAL
  INTEGRATION
  RESELLER
}

enum PartnerStatus {
  PENDING
  APPROVED
  SUSPENDED
  TERMINATED
}

enum PartnerTier {
  STANDARD    // 10% of referred tenant's first 12 months subscription revenue
  SILVER      // 15% — after 10 referrals
  GOLD        // 20% — after 50 referrals
}

enum PartnerReferralStatus {
  PENDING       // Signup link clicked but tenant not yet onboarded
  ACTIVATED     // Tenant completed onboarding
  QUALIFIED     // Tenant processed first booking
  CHURNED       // Tenant became inactive
}

enum PayoutStatus {
  PENDING
  PROCESSING
  PAID
  FAILED
}
```

### 8.3 Partner Revenue Model

- **Referral partners** earn a percentage of the referred tenant's subscription revenue for the first 12 months
- Commission tiers: Standard (10%), Silver (15% after 10 referrals), Gold (20% after 50 referrals)
- Minimum payout threshold: $50
- Payout frequency: Monthly, via Stripe Connect transfer
- Attribution: Referral code in signup URL (`savspot.co/signup?partner={code}`)

### 8.4 API Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/partners/apply` | Apply to become a partner | JWT |
| GET | `/api/partners/me` | Get partner dashboard data | JWT (partner) |
| GET | `/api/partners/me/referrals` | List referred tenants | JWT (partner) |
| GET | `/api/partners/me/payouts` | List payout history | JWT (partner) |
| GET | `/api/partners/me/link` | Get referral link + embeddable badge | JWT (partner) |
| POST | `/api/admin/partners` | List all partners (platform admin) | JWT (PLATFORM_ADMIN) |
| PATCH | `/api/admin/partners/:id` | Approve/suspend partner | JWT (PLATFORM_ADMIN) |
| POST | `/api/admin/partners/payouts/process` | Trigger monthly payout batch | JWT (PLATFORM_ADMIN) |

### 8.5 Frontend Surfaces

**New section:** `/partners` — public partner program landing page

**New authenticated area:** `/(partner)/`
- Partner dashboard: referral count, earnings, tier progress
- Referral link management + embeddable badge code
- Payout history with downloadable statements
- Referred tenant status list

**Platform admin:**
- Partner applications queue
- Partner management (approve, suspend, adjust commission)
- Payout batch processing

### 8.6 Test Plan

| Scope | Tests | Description |
|-------|-------|-------------|
| Unit | PartnerService | Application, approval, commission calculation, tier progression |
| Unit | PartnerPayoutService | Payout computation, threshold enforcement, batch processing |
| Integration | Partner signup URL → tenant creation → commission attribution | Full referral lifecycle |
| E2E | Apply → get approved → refer tenant → earn commission → receive payout | Full partner journey |

### 8.7 Estimated Scope

- **New NestJS module:** `PartnerModule` (controller, service, payout service, referral tracker)
- **New Prisma models:** 3 + 4 enums
- **New frontend section:** Partner portal (4-5 pages)
- **New endpoints:** 8
- **New BullMQ job:** 1 (monthly payout batch)
- **Migration:** 1

---

## 9. Feature G: Real-Time Bidirectional Calendar Sync

**Trigger:** Concurrent with directory launch (critical for real-time availability in directory)
**Spec refs:** PHASE-3-SUMMARY "What's Next", SRS-4 §24

### 9.1 Overview

Upgrade from pull-based calendar sync (polling every N minutes) to push-based using Google Calendar Push Notifications and Microsoft Graph Change Notifications. External calendar changes are reflected in Savspot within seconds instead of minutes.

### 9.2 Architecture

**Current (Phase 1-3):** BullMQ cron job polls Google/Outlook calendars every 15 minutes via their respective APIs. Changes are detected by comparing `synced_at` timestamps.

**Phase 4:** Register webhook subscriptions with both providers. When a calendar event changes, the provider sends a push notification to Savspot's webhook endpoint. Savspot processes the change immediately.

### 9.3 Google Calendar Push Notifications

```typescript
// Register watch on a calendar
const watchResponse = await calendar.events.watch({
  calendarId: connection.externalCalendarId,
  requestBody: {
    id: `savspot-${connection.id}`,
    type: 'web_hook',
    address: `https://api.savspot.co/api/calendar/webhooks/google`,
    token: connection.webhookToken, // For verification
    expiration: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  },
});
```

**Webhook handler:**
```typescript
@Post('calendar/webhooks/google')
async handleGooglePush(
  @Headers('x-goog-channel-id') channelId: string,
  @Headers('x-goog-resource-state') resourceState: string,
  @Headers('x-goog-channel-token') token: string,
) {
  // Verify token matches stored webhook token
  // Fetch changed events via incremental sync (syncToken)
  // Update calendar_events table
  // Recompute affected availability slots
}
```

### 9.4 Microsoft Graph Change Notifications

```typescript
// Register subscription
const subscription = await graphClient.api('/subscriptions').post({
  changeType: 'created,updated,deleted',
  notificationUrl: 'https://api.savspot.co/api/calendar/webhooks/outlook',
  resource: `/me/calendars/${calendarId}/events`,
  expirationDateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days max
  clientState: connection.webhookToken,
});
```

### 9.5 Webhook Subscription Lifecycle

| Event | Google Calendar | Microsoft Graph |
|-------|----------------|-----------------|
| Max subscription duration | 7 days | 3 days (calendar events) |
| Renewal strategy | BullMQ job renews 24 hours before expiry | BullMQ job renews 12 hours before expiry |
| Verification | Token in header | clientState in payload |
| Payload | Notification only (no event data) | Notification + optional resource data |
| Sync approach | Incremental sync via syncToken | Delta query via deltaLink |

### 9.6 Background Jobs

| Job | Queue | Schedule | Description |
|-----|-------|----------|-------------|
| `calendar-webhook-renew-google` | QUEUE_CALENDAR | Every 6 hours | Renew Google push subscriptions expiring in <24 hours |
| `calendar-webhook-renew-outlook` | QUEUE_CALENDAR | Every 6 hours | Renew Outlook subscriptions expiring in <12 hours |
| `calendar-sync-fallback` | QUEUE_CALENDAR | Every 30 min | Fallback poll for connections where push failed |

**The existing pull-based sync remains as a fallback.** If a push subscription fails to renew or a webhook is missed, the pull-based job catches the gap within 30 minutes.

### 9.7 Data Model Changes

Add fields to `CalendarConnection`:

```prisma
model CalendarConnection {
  // ... existing fields ...

  // Phase 4 additions
  webhookChannelId    String?   @map("webhook_channel_id")
  webhookToken        String?   @map("webhook_token")
  webhookExpiresAt    DateTime? @map("webhook_expires_at")
  webhookStatus       String?   @map("webhook_status") // ACTIVE, EXPIRED, FAILED
  syncToken           String?   @map("sync_token") // Google incremental sync token
  deltaLink           String?   @map("delta_link") // Outlook delta query link
}
```

### 9.8 Test Plan

| Scope | Tests | Description |
|-------|-------|-------------|
| Unit | Google webhook handler | Token verification, incremental sync processing |
| Unit | Outlook webhook handler | clientState verification, delta query processing |
| Unit | Subscription renewal job | Expiry detection, renewal API calls |
| Integration | External change → webhook → availability update | End-to-end push sync |
| E2E | Add external event → verify Savspot availability blocked within 30s | Real-time sync validation |

### 9.9 Estimated Scope

- **Enhanced module:** `CalendarModule` (new webhook controller, subscription manager, incremental sync service)
- **New endpoints:** 2 (Google webhook, Outlook webhook)
- **New BullMQ jobs:** 3
- **Migration:** 1 (new fields on `CalendarConnection`)

---

## 10. Feature H: Multi-Language i18n (Frontend Translations)

**Trigger:** Geographic expansion beyond English-speaking markets
**Spec refs:** PHASE-3-SUMMARY "What's Next"

### 10.1 Overview

Phase 3 built the i18n infrastructure (multi-currency, locale-aware formatting). Phase 4 delivers actual frontend translations for the most-demanded languages.

### 10.2 Translation Framework

**Library:** `next-intl` (already compatible with Next.js 15 App Router)

**Locale detection priority:**
1. URL path prefix (`/es/directory`, `/fr/book/salon-name`)
2. User preference (stored in profile)
3. Browser `Accept-Language` header
4. Default: `en`

### 10.3 Directory Structure

```
apps/web/
├── messages/
│   ├── en.json          # English (source of truth)
│   ├── es.json          # Spanish
│   ├── fr.json          # French
│   ├── pt.json          # Portuguese
│   ├── de.json          # German
│   ├── tl.json          # Tagalog (Philippines)
│   └── hi.json          # Hindi (India)
├── src/
│   ├── i18n/
│   │   ├── request.ts   # next-intl server config
│   │   ├── routing.ts   # Locale routing config
│   │   └── navigation.ts # Localized link/redirect helpers
│   └── middleware.ts     # Locale detection + routing
```

### 10.4 Translation Scope

**Phase 4a — Priority translations (public-facing):**
- Booking flow (all steps, validation messages, confirmation)
- Directory search and results
- Public business detail page
- Client portal

**Phase 4b — Full translations:**
- Admin CRM (all pages)
- Settings
- Onboarding flow
- Email templates (per-locale variants)
- SMS templates (per-locale variants)

### 10.5 Translation Management

- **Source of truth:** `en.json` maintained in codebase
- **Translation workflow:** Export `en.json` → translate (professional service or community) → import as `{locale}.json`
- **Missing key fallback:** Falls back to English (never shows raw key)
- **Interpolation:** ICU message format for plurals, numbers, dates

### 10.6 Language Priority

Based on year 1-2 target markets (PVD §8a):

| Language | Market | Priority |
|----------|--------|----------|
| Spanish | US Hispanic market, LATAM | Phase 4a |
| Tagalog | Philippines (year 1 target) | Phase 4a |
| French | Canada, Western Africa | Phase 4b |
| Portuguese | Brazil | Phase 4b |
| German | DACH region | Phase 4b |
| Hindi | India | Phase 4b |

### 10.7 Estimated Scope

- **New package:** None (next-intl added to `apps/web`)
- **New files:** 6+ locale JSON files, i18n config, middleware updates
- **Modified files:** Every frontend component that renders user-facing text (significant, but mechanical — string extraction)
- **External:** Professional translation for 6 languages

---

## 11. Infrastructure: Platform Metrics Monitoring

**Purpose:** Automated tracking of Phase 4 trigger gates

### 11.1 New Module: `PlatformMetricsModule`

```typescript
@Module({
  imports: [PrismaModule, BullMqModule],
  providers: [PlatformMetricsService, PlatformMetricsProcessor],
  controllers: [PlatformMetricsController],
})
export class PlatformMetricsModule {}
```

### 11.2 Data Model

```prisma
model PlatformMetric {
  id        String   @id @default(uuid())
  key       String   // e.g., "published_businesses", "multi_venue_tenants"
  value     Int
  metadata  Json?    // Additional context
  measuredAt DateTime @map("measured_at")
  createdAt DateTime @default(now()) @map("created_at")

  @@index([key, measuredAt])
  @@map("platform_metrics")
}

model PlatformAlert {
  id          String   @id @default(uuid())
  metricKey   String   @map("metric_key")
  threshold   Int
  currentValue Int    @map("current_value")
  message     String
  acknowledged Boolean @default(false)
  acknowledgedAt DateTime? @map("acknowledged_at")
  createdAt   DateTime @default(now()) @map("created_at")

  @@map("platform_alerts")
}
```

### 11.3 Metrics Computed Daily

| Metric Key | Query | Trigger Threshold |
|------------|-------|-------------------|
| `published_businesses` | `COUNT(*) FROM tenants WHERE is_published = true AND status = 'active'` | 200 |
| `custom_domain_requests` | `COUNT(*) FROM feedback WHERE category = 'FEATURE_REQUEST' AND content ILIKE '%domain%'` | 20 |
| `multi_venue_tenants` | `COUNT(DISTINCT tenant_id) FROM venues GROUP BY tenant_id HAVING COUNT(*) >= 2` | 10 |
| `offline_payment_concentration` | Regional analysis of `tenants WHERE payment_provider = 'OFFLINE'` | 50 per region |
| `monthly_active_businesses` | `COUNT(DISTINCT tenant_id) FROM bookings WHERE status = 'COMPLETED' AND created_at > NOW() - '30d'` | 500 |

### 11.4 Alert Mechanism

When a metric crosses its threshold for the first time, a `PlatformAlert` record is created and a notification is sent to `PLATFORM_ADMIN` users via the existing notification system (in-app + email).

### 11.5 API Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/admin/platform-metrics` | Get all current metrics | PLATFORM_ADMIN |
| GET | `/api/admin/platform-metrics/:key/history` | Historical trend for a metric | PLATFORM_ADMIN |
| GET | `/api/admin/platform-alerts` | List unacknowledged alerts | PLATFORM_ADMIN |
| PATCH | `/api/admin/platform-alerts/:id` | Acknowledge an alert | PLATFORM_ADMIN |

---

## 12. Implementation Order

Features are ordered by expected trigger sequence and dependency chain:

```
┌─────────────────────────────────────────┐
│  Pre-requisite: Platform Metrics Module  │  (Build first — monitors all triggers)
└──────────────┬──────────────────────────┘
               │
               ▼
┌──────────────────────────┐
│  Feature G: Real-Time    │  (Enables accurate directory availability)
│  Calendar Sync           │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│  Feature A: Platform     │  (Highest impact, most complex)
│  Directory               │
├──────────────────────────┤
│  + Saved Businesses      │  (Included with directory)
└──────────┬───────────────┘
           │
           ├───────────────────────────┐
           ▼                           ▼
┌──────────────────────┐   ┌──────────────────────┐
│  Feature B: Custom   │   │  Feature D: Regional  │
│  Domains             │   │  Payment Providers    │
└──────────────────────┘   └──────────────────────┘
           │
           ▼
┌──────────────────────────┐
│  Feature C: Multi-       │
│  Location                │
└──────────────────────────┘
           │
           ▼
┌──────────────────────────┐
│  Feature E: AI           │  (Requires data density)
│  Recommendations         │
└──────────────────────────┘
           │
           ▼
┌──────────────────────────┐
│  Feature H: i18n         │  (Triggered by geographic expansion)
│  Translations            │
└──────────────────────────┘
           │
           ▼
┌──────────────────────────┐
│  Feature F: Partner      │  (Requires mature ecosystem)
│  Program                 │
└──────────────────────────┘
```

**Note:** Features B through D are independent and can be built in parallel if triggers fire simultaneously. The dependency chain above reflects the expected trigger sequence, not hard technical dependencies (except G → A, where real-time sync improves directory accuracy).

---

## 13. Cross-Cutting Concerns

### 13.1 Testing Strategy

All Phase 4 features follow the established test patterns:
- **Unit tests:** Vitest, direct service instantiation with mock Prisma
- **Integration tests:** API endpoint testing with test database
- **E2E tests:** Playwright for critical user journeys
- **Rate limiting awareness:** Test mode doubles (per e2e-testing.md)

### 13.2 Feature Flags

Each Phase 4 feature is gated behind a feature flag, following the Phase 3 pattern:

| Feature | Flag | Default |
|---------|------|---------|
| Platform Directory | `FEATURE_DIRECTORY` | `false` |
| Custom Domains | `FEATURE_CUSTOM_DOMAINS` | `false` |
| Multi-Location | `FEATURE_MULTI_LOCATION` | `false` |
| AI Recommendations | `FEATURE_AI_RECOMMENDATIONS` | `false` |
| Partner Program | `FEATURE_PARTNER_PROGRAM` | `false` |
| Real-Time Calendar Sync | `FEATURE_CALENDAR_PUSH` | `false` |
| Regional providers (each) | `FEATURE_PAYMENT_{NAME}` | `false` |

### 13.3 Database Migrations

Each feature produces one migration. Migrations are idempotent and backward-compatible (additive only — new tables, new columns with defaults, new enum values). No destructive migrations.

### 13.4 Performance Budgets

| Surface | Metric | Budget |
|---------|--------|--------|
| Directory search | p95 response time | <200ms |
| Directory page load | LCP | <2.5s |
| Custom domain resolution | Middleware latency | <50ms (Redis cached) |
| Calendar push processing | Webhook-to-availability | <5s |
| Recommendation generation | Per-tenant computation | <30s |

### 13.5 Monitoring & Observability

- All new endpoints instrumented with the existing audit logging interceptor
- BullMQ job metrics (duration, failure rate) via existing Bull Board dashboard
- Platform metrics module provides Phase 4 trigger monitoring
- Error alerting via existing error handling pipeline

### 13.6 MCP Server Extensions

The Phase 3 MCP server (`packages/mcp-server/`) supports: `search_businesses`, `get_business_details`, `check_availability`, `create_booking` (SRS-2 §16). Phase 4 features require additional tools:

| Tool | Feature | Description |
|------|---------|-------------|
| `search_directory` | Directory | Full directory search with category, location, rating filters (mirrors `/api/directory/search`) |
| `get_recommendations` | AI Recommendations | Get personalized service recommendations for a client |
| `get_churn_risk` | AI Recommendations | Get churn risk score for a client |
| `list_locations` | Multi-Location | List venues for a multi-location tenant |
| `book_at_location` | Multi-Location | Book a service at a specific venue |
| `check_partner_status` | Partner Program | Check partner referral stats and tier |

These tools are added incrementally as their parent features ship. Each tool delegates to the same NestJS service layer used by the REST API — no duplicate business logic.

### 13.7 Public API v1 Extensions

The Phase 3 Public API (`/api/v1/`) with API key authentication gains additional endpoints as Phase 4 features ship:

| Method | Path | Feature | Scopes Required |
|--------|------|---------|-----------------|
| GET | `/api/v1/directory/search` | Directory | `directory:read` |
| GET | `/api/v1/directory/businesses/:slug` | Directory | `directory:read` |
| GET | `/api/v1/venues` | Multi-Location | `venues:read` |
| GET | `/api/v1/venues/:id/availability` | Multi-Location | `venues:read` |
| GET | `/api/v1/recommendations/upsell` | AI Recommendations | `analytics:read` |
| GET | `/api/v1/churn-risk` | AI Recommendations | `analytics:read` |

All new Public API endpoints inherit the existing v1 rate limiting, API key authentication, response transformer pattern, and `X-API-Version: 1` header from Phase 3.

### 13.8 Mobile App Backend Surface

The Phase 3 mobile backend (device push tokens, push notification workflow action) is extended for Phase 4:

| Feature | Mobile Backend Support |
|---------|----------------------|
| Directory | Directory search + business detail endpoints are already public REST — no mobile-specific work needed. Push notification for "new businesses in your area" via existing SEND_PUSH workflow action. |
| Custom Domains | N/A — custom domains affect web only |
| Multi-Location | Venue selection step added to booking flow API — mobile clients receive `VENUE_SELECTION` in step resolution (existing dynamic step system from SRS-1 §8) |
| AI Recommendations | `GET /api/portal/recommendations` returns JSON compatible with mobile rendering. Push notifications for churn-risk re-engagement via SEND_PUSH. |
| Partner Program | N/A — partner portal is web-only (desktop workflow) |
| Calendar Sync | N/A — calendar sync is provider-facing, not client-facing |
| i18n | API responses include locale-aware formatting (Phase 3 multi-currency infrastructure). Client-facing strings in mobile app bundle, not API. |

### 13.9 Workflow Automation Triggers

Phase 3 built the workflow engine with actions: SEND_EMAIL, SEND_SMS, SEND_PUSH, WEBHOOK, WAIT, CONDITION. Phase 4 features introduce new trigger events that tenants can use in their custom workflows:

| Trigger Event | Feature | Description |
|---------------|---------|-------------|
| `DIRECTORY_BOOKING_RECEIVED` | Directory | Booking from directory source (for welcome/onboarding sequences) |
| `CHURN_RISK_HIGH` | AI Recommendations | Client's churn risk crossed HIGH threshold |
| `CHURN_RISK_CRITICAL` | AI Recommendations | Client's churn risk crossed CRITICAL threshold |
| `NEW_VENUE_CREATED` | Multi-Location | A new venue was added to the tenant |
| `CUSTOM_DOMAIN_ACTIVATED` | Custom Domains | Custom domain SSL provisioned and active |
| `CUSTOM_DOMAIN_FAILED` | Custom Domains | DNS verification or SSL provisioning failed |
| `PARTNER_REFERRAL_ACTIVATED` | Partner Program | A referred tenant completed onboarding |
| `PARTNER_TIER_UPGRADED` | Partner Program | Partner reached Silver or Gold tier |

These events are dispatched to the existing workflow engine via `WorkflowEngineService.dispatchEvent()`. Tenants configure their own automation responses in the workflow builder.

### 13.10 Communication Triggers

New system-initiated communications (not tenant-configurable — platform-level):

| Communication | Channel | Recipient | Trigger |
|---------------|---------|-----------|---------|
| Partner application received | Email | Applicant | On partner application submission |
| Partner application approved | Email | Partner | On admin approval |
| Partner tier upgrade | Email | Partner | On tier threshold crossed |
| Partner payout processed | Email | Partner | On successful monthly payout |
| Custom domain verified | Email + In-app | Tenant owner | On DNS verification success |
| Custom domain SSL active | Email + In-app | Tenant owner | On SSL provisioning complete |
| Custom domain SSL expiring | Email + In-app | Tenant owner | 14 days before SSL expiry if renewal failing |
| Churn risk alert | In-app | Tenant owner/admin | Daily digest of newly at-risk clients (opt-in) |
| Platform trigger gate crossed | Email + In-app | PLATFORM_ADMIN | When a metric crosses its threshold |

All communications use the existing `CommunicationsModule` and template system from Phase 1-3.

### 13.11 Audit Logging

Phase 4 actions that must be recorded in the existing `audit_logs` table:

| Action | Entity | Details Logged |
|--------|--------|---------------|
| `CUSTOM_DOMAIN_ADDED` | CustomDomain | domain, tenant_id |
| `CUSTOM_DOMAIN_VERIFIED` | CustomDomain | domain, verification_method |
| `CUSTOM_DOMAIN_REMOVED` | CustomDomain | domain, reason |
| `PAYMENT_PROVIDER_ACTIVATED` | Tenant | provider, tenant_id |
| `PAYMENT_PROVIDER_DEACTIVATED` | Tenant | provider, reason |
| `PARTNER_APPLICATION_SUBMITTED` | Partner | user_id, company_name, type |
| `PARTNER_APPROVED` | Partner | partner_id, approved_by |
| `PARTNER_SUSPENDED` | Partner | partner_id, reason, suspended_by |
| `PARTNER_PAYOUT_PROCESSED` | PartnerPayout | partner_id, amount, period |
| `VENUE_CREATED` | Venue | venue_id, tenant_id |
| `VENUE_ARCHIVED` | Venue | venue_id, reason |
| `DIRECTORY_LISTING_FEATURED` | DirectoryListing | tenant_id, featured_until |

All audit log entries include `actor_id`, `ip_address`, and `timestamp` per the existing audit interceptor.

### 13.12 GDPR & Data Privacy

Phase 4 features must comply with the existing GDPR framework (Phase 1 `GdprModule`, `QUEUE_GDPR`):

| Feature | Data Deletion Behavior |
|---------|----------------------|
| Directory | `SavedBusiness` records deleted on user account deletion. `DirectoryListing` aggregates are anonymous (no PII) — retained. |
| Custom Domains | `CustomDomain` record deleted with tenant deletion. SSL certificate revoked. Redis cache entry purged. |
| AI Recommendations | `ClientRecommendation` records deleted on user deletion. `ChurnRiskScore` records deleted on client deletion. `RecommendationModel.modelData` contains aggregate co-occurrence matrices (no PII) — retained. Next model retraining naturally excludes deleted data. |
| Partner Program | `Partner` record anonymized (company name, URL cleared) on user deletion. `PartnerReferral` records retain tenant_id but partner_id is nullified. `PartnerPayout` records retained for financial compliance (7-year legal hold), partner_id anonymized. |
| Calendar Sync | Webhook subscriptions are cancelled with provider on calendar connection deletion. `syncToken` and `deltaLink` cleared. |

The existing `GdprService.processDataDeletion()` method is extended with handlers for each new model.

### 13.13 Directory Business Rules

Beyond `is_published = true`, directory eligibility requires:

| Rule | Enforcement | Spec Ref |
|------|-------------|----------|
| Tenant status must be `ACTIVE` | SQL WHERE clause in search query | SRS-2 §4 |
| At least 1 active service published | JOIN check on `services WHERE is_active = true` | PRD FR-BP-1 |
| At least 1 availability rule configured | JOIN check on `availability_rules` | Ensures bookable businesses only |
| Payment method configured (not OFFLINE-only for paid services) | Soft warning, not hard requirement | Avoids broken booking flows |
| Privacy floor: categories with <4 tenants excluded from category listing | Aggregate COUNT check | BRD BR-RULE-9 |

**Delisting policy:** Businesses are automatically hidden from directory (not deleted from `DirectoryListing`) when:
- `is_published` set to `false` by tenant
- Tenant status changes to `SUSPENDED` or `INACTIVE`
- No availability rules active for >30 days (stale listing detection via `directory-listing-refresh` job)

Relisting requires the tenant to re-enable `is_published` and meet all eligibility criteria.

### 13.14 Phase 3 Stub Clarification

Phase 3 delivered Adyen and PayPal as **stubs** (feature-flagged behind `FEATURE_PAYMENT_ADYEN` and `FEATURE_PAYMENT_PAYPAL`). These stubs implement `IPaymentProvider` with method bodies that throw `NotImplementedError`. Phase 4 does **not** complete these stubs — they are completed when their respective third-party accounts are set up (per `docs/phase-3-manual-configuration.md`).

Phase 4's regional payment providers (GCash, Maya, Razorpay, Mollie, dLocal) are **new** providers added alongside the existing ones. They follow the same pattern: feature-flagged, implementing `IPaymentProvider`, activated per-tenant via `tenants.payment_provider`.

The `PaymentProviderFactory` grows from 4 providers (Phase 3) to 9 providers (Phase 4), but each is independently activated.

### 13.15 Error Handling & Fallbacks

| Scenario | Behavior | Fallback |
|----------|----------|----------|
| Directory search query fails | Return empty results with `503` status | Log error, serve cached results if available |
| Directory FTS index corruption | Detected by health check job | Alert PLATFORM_ADMIN, fall back to ILIKE search |
| Custom domain DNS verification timeout | After 72 hours, status → `VERIFICATION_FAILED` | Tenant can retry; booking page continues at `savspot.co/{slug}` |
| Custom domain SSL provisioning failure | Status → `SSL_FAILED`, 3 automatic retries | Domain redirects to `savspot.co/{slug}`; alert tenant |
| Calendar push webhook missed | Pull-based fallback catches within 30 minutes | `calendar-sync-fallback` job runs every 30 min |
| Calendar push subscription renewal fails | Retry 3 times over 6 hours | Falls back to pull-based sync |
| Recommendation algorithm insufficient data | Minimum thresholds enforced (10 co-occurrences, 1000 bookings/category) | No recommendations surfaced — UI hides section gracefully |
| Churn risk computation fails for a client | Skip client, log warning | Client appears as "Unknown risk" — not flagged incorrectly |
| Regional payment provider webhook verification fails | Reject with 401, log full payload for debugging | Payment status unchanged; client sees "payment pending" |
| Partner payout Stripe transfer fails | Status → `FAILED`, retry in next monthly batch | Alert PLATFORM_ADMIN; partner sees "Payout pending" |

---

## 14. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Directory search performance degrades at scale | Medium | High | PostgreSQL FTS is performant to ~100K rows; Meilisearch migration path documented (SRS-1 §2) |
| Custom domain SSL provisioning failures | Medium | Medium | Fallback to `savspot.co/{slug}`; health check job detects and alerts |
| Calendar push webhook delivery unreliable | Medium | Low | Pull-based sync remains as fallback (30-minute catch-up) |
| Regional payment provider API instability | Low | High | Feature flags allow instant disable; offline payment remains first-class |
| Partner program fraud (fake referrals) | Medium | Medium | Manual approval for partner applications; minimum booking threshold before commission qualification |
| i18n translation quality | Low | Medium | Professional translation services; community review for less common languages |

---

## 15. Summary

| Feature | New Models | New Endpoints | New Pages | BullMQ Jobs | Migration |
|---------|-----------|--------------|-----------|-------------|-----------|
| Platform Metrics (infra) | 2 | 4 | 0 | 1 | 1 |
| Platform Directory | 2 | 8 | 4 | 2 | 1 |
| Custom Domains | 1 + 2 enums | 4 | 1 | 3 | 1 |
| Multi-Location | 1 + fields | 9 | 3 | 0 | 1 |
| Regional Payments (per provider) | 0 (enum values) | 2 | 0 | 0 | 1 |
| AI Recommendations | 3 + 2 enums | 6 | 0 (components only) | 4 | 1 |
| Real-Time Calendar Sync | 0 (fields only) | 2 | 0 | 3 | 1 |
| i18n Translations | 0 | 0 | 0 (all modified) | 0 | 0 |
| Partner Program | 3 + 4 enums | 8 | 5 | 1 | 1 |
| **Total** | **~12 models, ~10 enums** | **~43 endpoints** | **~13 pages** | **~14 jobs** | **~8 migrations** |

---

*This plan should be read alongside: PRD §2 (Phase Matrix), PVD §9 (Demand Gates), BRD §1-3 (Revenue Model), SRS-1 through SRS-4 (Technical Architecture), PHASE-3-SUMMARY.md (Current State), docs/phase-3-manual-configuration.md (Phase 3 stub setup).*
