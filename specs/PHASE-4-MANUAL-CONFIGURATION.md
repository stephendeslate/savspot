# Phase 4 — Manual Configuration Steps

All items below require manual setup in third-party dashboards, account creation, or credential generation. Code implementation proceeds with feature flags disabled and mock/stub support — these configs are needed for live/staging environments when a feature's trigger gate fires.

**Prerequisite:** Phase 3 manual configuration complete (see `docs/phase-3-manual-configuration.md`).

---

## 1. Platform Directory

### No External Setup Required

The directory uses PostgreSQL FTS (full-text search) with `pg_trgm` — no external search service needed at initial scale.

### Database: pg_trgm Extension

Ensure the `pg_trgm` extension is enabled in PostgreSQL (required for trigram similarity matching):

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

This is typically already enabled if Phase 1 migrations ran successfully. Verify:

```sql
SELECT * FROM pg_extension WHERE extname = 'pg_trgm';
```

### Meilisearch (Future — Only if Directory Exceeds 100K Listings)

Per SRS-1 §2, migrate to Meilisearch if directory scales past 100K listings:

- Self-hosted: https://docs.meilisearch.com/learn/getting_started/installation.html
- Meilisearch Cloud: https://www.meilisearch.com/cloud

```env
# Only needed if migrating from PostgreSQL FTS to Meilisearch
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Map Provider (Directory Map View)

The directory search results include an optional map view. Choose one:

**Option A: Mapbox GL JS** (recommended for custom styling)
- Sign up at https://www.mapbox.com/
- Account > Access tokens > Create token
- Free tier: 50,000 map loads/month

```env
NEXT_PUBLIC_MAPBOX_TOKEN=pk.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Option B: Leaflet + OpenStreetMap** (free, no API key)
- No configuration needed — uses open tile servers
- Set in frontend config:

```env
NEXT_PUBLIC_MAP_PROVIDER=leaflet
```

### Environment Variables

```env
FEATURE_DIRECTORY=false
NEXT_PUBLIC_MAP_PROVIDER=mapbox       # mapbox or leaflet
NEXT_PUBLIC_MAPBOX_TOKEN=             # Only if mapbox
```

---

## 2. Custom Domain Booking Pages

### Deployment Platform Configuration

Custom domains require programmatic SSL certificate provisioning. The approach depends on your deployment platform:

#### Option A: Vercel (Next.js Frontend)

If the Next.js app is deployed on Vercel:

1. Generate a Vercel API token: Settings > Tokens > Create
2. Note your Vercel **Project ID**: Project Settings > General > Project ID
3. Vercel handles SSL automatically when domains are added via API

```env
VERCEL_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VERCEL_PROJECT_ID=prj_xxxxxxxxxxxxxxxxxxxxxxxx
CUSTOM_DOMAIN_SSL_PROVIDER=vercel
```

**Vercel Pro plan or higher** is required for programmatic domain management via API.

#### Option B: Fly.io (API Backend)

If the booking pages are served by the Fly.io-hosted API:

1. Fly.io handles SSL via Let's Encrypt automatically
2. Domains are added via `fly certs add <domain>`
3. Requires Fly.io API token for programmatic management

```env
FLY_API_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
FLY_APP_NAME=savspot-api
CUSTOM_DOMAIN_SSL_PROVIDER=fly
```

#### Option C: Self-Managed (Caddy/nginx + Let's Encrypt)

If self-hosting with a reverse proxy:

1. Use Caddy (automatic HTTPS) or Certbot with nginx
2. API must call Caddy/Certbot to provision certs programmatically
3. More complex — only recommended if not using Vercel or Fly.io

### DNS Instructions for Tenants

Tenants must create two DNS records with their domain registrar. The application displays these instructions automatically, but for reference:

```
TXT record:  _savspot-verify.<domain> → svs_verify_{token}
CNAME record: <domain> → custom.savspot.co
```

### Environment Variables

```env
FEATURE_CUSTOM_DOMAINS=false
CUSTOM_DOMAIN_SSL_PROVIDER=vercel    # vercel, fly, or manual
CUSTOM_DOMAIN_VERIFY_TIMEOUT_HOURS=72
CUSTOM_DOMAIN_WILDCARD_HOST=custom.savspot.co
```

---

## 3. Regional Payment Providers

Each provider is independent. Set up only the providers needed for your geographic markets.

### 3.1 Razorpay (India)

#### Account Setup
- Sign up at https://dashboard.razorpay.com/signup
- Complete KYC verification (required for live mode)
- Dashboard > Settings > API Keys > Generate Key

#### Webhook Configuration
- Dashboard > Settings > Webhooks > Add New Webhook
- URL: `https://api.savspot.co/api/payments/webhooks/razorpay`
- Events: `payment.captured`, `payment.failed`, `refund.processed`, `order.paid`
- Note the **Webhook Secret**

#### Route Configuration (for connected accounts)
- Apply for Razorpay Route (marketplace feature): https://razorpay.com/docs/route/
- Approval may take 1-2 weeks
- Enables splitting payments between platform and merchants

#### Environment Variables
```env
FEATURE_PAYMENT_RAZORPAY=false
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
RAZORPAY_ACCOUNT_ID=acc_xxxxxxxxxxxxxxxx
```

### 3.2 Mollie (EU/UK)

#### Account Setup
- Sign up at https://www.mollie.com/signup
- Dashboard > Developers > API keys
- Note both **Test** and **Live** API keys

#### Connect (Marketplace) Setup
- Apply for Mollie Connect: https://www.mollie.com/connect
- Enables OAuth-based merchant onboarding and split payments
- Register your OAuth application:
  - Dashboard > Developers > Your apps > Create app
  - Redirect URL: `https://api.savspot.co/api/payments/callback/mollie`
  - Required scopes: `payments.read`, `payments.write`, `organizations.read`, `profiles.read`

#### Webhook Configuration
- Webhooks are configured per-payment (sent in `createPayment` API call)
- Webhook URL: `https://api.savspot.co/api/payments/webhooks/mollie`

#### Environment Variables
```env
FEATURE_PAYMENT_MOLLIE=false
MOLLIE_API_KEY=test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MOLLIE_PARTNER_ID=xxxxxxxxxxxxxxxx
MOLLIE_CLIENT_ID=app_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MOLLIE_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MOLLIE_REDIRECT_URI=https://api.savspot.co/api/payments/callback/mollie
```

### 3.3 GCash (Philippines)

#### Account Setup
- Apply as a merchant/partner: https://www.gcash.com/become-a-partner
- Business verification required (Philippine business registration)
- GCash provides API credentials after approval

#### Integration Method
- GCash uses the **GCash Mini Program** or **GCash QR** payment flow
- Merchant dashboard provides **Merchant ID** and **API Secret**

#### Environment Variables
```env
FEATURE_PAYMENT_GCASH=false
GCASH_MERCHANT_ID=xxxxxxxxxxxxxxxx
GCASH_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GCASH_ENVIRONMENT=sandbox
GCASH_WEBHOOK_URL=https://api.savspot.co/api/payments/webhooks/gcash
```

### 3.4 Maya (Philippines)

#### Account Setup
- Apply as a merchant: https://www.maya.ph/business
- Complete business verification
- Maya Developer Portal provides API keys

#### Integration Method
- Maya Checkout API for payment processing
- Maya Vault for recurring payments

#### Environment Variables
```env
FEATURE_PAYMENT_MAYA=false
MAYA_PUBLIC_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MAYA_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MAYA_ENVIRONMENT=sandbox
MAYA_WEBHOOK_URL=https://api.savspot.co/api/payments/webhooks/maya
```

### 3.5 dLocal (LATAM)

#### Account Setup
- Apply at https://dlocal.com/contact/
- dLocal requires platform-level onboarding (similar to Adyen for Platforms)
- Approval may take 2-4 weeks

#### Integration
- dLocal supports 600+ local payment methods across 40+ countries
- Key methods: Pix (Brazil), Boleto (Brazil), OXXO (Mexico), local cards

#### Webhook Configuration
- dLocal Dashboard > Settings > Notifications
- URL: `https://api.savspot.co/api/payments/webhooks/dlocal`
- Events: `payment.completed`, `payment.rejected`, `refund.completed`

#### Environment Variables
```env
FEATURE_PAYMENT_DLOCAL=false
DLOCAL_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
DLOCAL_SECRET_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
DLOCAL_ENVIRONMENT=sandbox
DLOCAL_WEBHOOK_URL=https://api.savspot.co/api/payments/webhooks/dlocal
```

---

## 4. Real-Time Calendar Sync (Push Notifications)

### 4.1 Google Calendar Push Notifications

#### Google Cloud Console Configuration

The existing Google Calendar integration (Phase 1) already has OAuth configured. Push notifications require additional setup:

1. **Verify domain ownership** for the webhook URL:
   - Google Cloud Console > APIs & Services > Domain verification
   - Add and verify `api.savspot.co`
   - Verification methods: DNS TXT record, HTML file, or Google Search Console

2. **Ensure Calendar API is enabled** (should already be from Phase 1):
   - APIs & Services > Library > Google Calendar API > Enabled

3. **Register the push notification endpoint**:
   - The webhook URL `https://api.savspot.co/api/calendar/webhooks/google` must be HTTPS
   - The domain must be verified (step 1)

No additional API keys needed — uses existing OAuth credentials from Phase 1.

#### Environment Variables
```env
FEATURE_CALENDAR_PUSH=false
GOOGLE_CALENDAR_WEBHOOK_URL=https://api.savspot.co/api/calendar/webhooks/google
```

### 4.2 Microsoft Graph Change Notifications

#### Azure AD App Registration Update

The existing Outlook integration (Phase 1) already has an Azure AD app. Update it for change notifications:

1. Azure Portal > App registrations > SavSpot app
2. **API Permissions** > Add:
   - `Calendars.Read` (already present)
   - No additional permissions needed for change notifications
3. **Expose an API** > Set Application ID URI (if not already set)

#### Webhook Endpoint Requirements
- Must respond to **validation requests**: Microsoft sends a `validationToken` query parameter on subscription creation — endpoint must echo it back
- Must be HTTPS with a valid SSL certificate
- Must respond within 3 seconds

#### Environment Variables
```env
OUTLOOK_CALENDAR_WEBHOOK_URL=https://api.savspot.co/api/calendar/webhooks/outlook
```

---

## 5. AI Recommendations

### No External Setup Required

AI recommendations use in-database computation (collaborative filtering, heuristic churn risk scoring). No external ML services needed.

The recommendation algorithms run as BullMQ background jobs using PostgreSQL queries. All computation is local to the database.

**Future (Phase 4b — ML-based churn risk):** If gradient-boosted models are added:

```env
# Only needed if using external ML service for advanced churn prediction
AI_RECOMMENDATIONS_ML_PROVIDER=local  # local (default) or external
AI_RECOMMENDATIONS_ML_ENDPOINT=       # Only if external
AI_RECOMMENDATIONS_ML_API_KEY=        # Only if external
```

---

## 6. Partner Program

### Stripe Connect (Partner Payouts)

Partner payouts use Stripe Connect transfers. The existing Stripe Connect setup from Phase 1 handles this — no additional Stripe configuration needed.

Partners are paid via Stripe Connect transfer from the platform's Stripe account. The `payoutMethod` on the `Partner` model stores the partner's Stripe connected account ID.

### Partner Signup Flow

No external setup required. Partners apply via `/partners/apply`, are manually approved by PLATFORM_ADMIN, and create their Stripe connected account through the existing onboarding flow.

### Environment Variables

```env
FEATURE_PARTNER_PROGRAM=false
PARTNER_MIN_PAYOUT_AMOUNT=50.00          # Minimum payout threshold (USD)
PARTNER_PAYOUT_DAY=1                     # Day of month for payout batch
PARTNER_STANDARD_COMMISSION=0.10         # 10%
PARTNER_SILVER_COMMISSION=0.15           # 15% (after 10 referrals)
PARTNER_GOLD_COMMISSION=0.20             # 20% (after 50 referrals)
PARTNER_SILVER_THRESHOLD=10              # Referrals to reach Silver
PARTNER_GOLD_THRESHOLD=50                # Referrals to reach Gold
```

---

## 7. Multi-Location Management

### No External Setup Required

Multi-location management uses existing database infrastructure. No external services needed.

### Environment Variables

```env
FEATURE_MULTI_LOCATION=false
```

---

## 8. Multi-Language i18n

### Translation Services

Translation files (`apps/web/messages/{locale}.json`) must be professionally translated. Options:

**Option A: Professional Translation Service**
- Gengo: https://gengo.com/ — $0.06-0.12/word, 24-hour turnaround
- One Hour Translation: https://www.onehourtranslation.com/
- Export `en.json`, send for translation, import result as `{locale}.json`

**Option B: Crowdsourced / Community Translation**
- Crowdin: https://crowdin.com/ — free for open-source, $40/mo for business
- Lokalise: https://lokalise.com/ — $120/mo, integrates with GitHub
- Phrase: https://phrase.com/

**Option C: AI-Assisted + Human Review**
- Use Claude API to generate initial translations from `en.json`
- Have native speakers review and correct
- Most cost-effective for initial launch; professional review for production

### next-intl Setup

```bash
cd apps/web && pnpm add next-intl
```

No external API keys needed — `next-intl` is a build-time library.

### Environment Variables

```env
# Comma-separated list of enabled locales
NEXT_PUBLIC_LOCALES=en
# Add locales as translations are completed:
# NEXT_PUBLIC_LOCALES=en,es,tl,fr,pt,de,hi
NEXT_PUBLIC_DEFAULT_LOCALE=en
```

---

## 9. Platform Metrics Monitoring

### No External Setup Required

Platform metrics use the existing PostgreSQL database and BullMQ infrastructure. Alert notifications are sent via the existing notification system (in-app + email).

### Optional: External Alerting

For PLATFORM_ADMIN alerting beyond email/in-app:

**Option A: ntfy.sh** (already configured for dev notifications)
```env
PLATFORM_ALERTS_NTFY_TOPIC=savspot-platform-alerts
PLATFORM_ALERTS_NTFY_URL=https://ntfy.sh
```

**Option B: PagerDuty / Opsgenie** (for production on-call)
```env
PLATFORM_ALERTS_PAGERDUTY_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 10. Feature Flags

All Phase 4 features are gated behind environment-variable-driven feature flags. Set to `true` to enable:

```env
# Phase 4 feature flags (all default to false)
FEATURE_DIRECTORY=false
FEATURE_CUSTOM_DOMAINS=false
FEATURE_MULTI_LOCATION=false
FEATURE_AI_RECOMMENDATIONS=false
FEATURE_PARTNER_PROGRAM=false
FEATURE_CALENDAR_PUSH=false

# Regional payment providers (each independent)
FEATURE_PAYMENT_RAZORPAY=false
FEATURE_PAYMENT_MOLLIE=false
FEATURE_PAYMENT_GCASH=false
FEATURE_PAYMENT_MAYA=false
FEATURE_PAYMENT_DLOCAL=false
```

### Rollout Strategy

Phase 4 features are demand-driven. Rollout for each feature:

1. **Trigger gate fires** — Platform metrics module alerts PLATFORM_ADMIN
2. **Development** — Feature implemented behind flag
3. **Internal testing** — Flag `true` in staging environment
4. **Beta** — Flag `true` in production for selected tenants (if applicable)
5. **GA** — Flag `true` for all production traffic

---

## Summary Checklist

| Service | Required For | Priority | Estimated Setup Time |
|---------|-------------|----------|---------------------|
| pg_trgm extension | Directory search | Verify only | 1 minute |
| Mapbox OR Leaflet | Directory map view | Optional | 15 minutes |
| Vercel/Fly.io token | Custom domains SSL | When feature ships | 30 minutes |
| Google domain verification | Calendar push (Google) | When feature ships | 1 hour |
| Azure AD app update | Calendar push (Outlook) | When feature ships | 30 minutes |
| Razorpay | India payments | When PH/IN demand | 1-2 weeks (approval) |
| Mollie | EU/UK payments | When EU demand | 1 week |
| GCash | Philippines payments | When PH demand | 2-4 weeks (approval) |
| Maya | Philippines payments | When PH demand | 2-4 weeks (approval) |
| dLocal | LATAM payments | When LATAM demand | 2-4 weeks (approval) |
| Translation service | i18n | When expanding | Varies |
| next-intl | i18n | When expanding | 15 minutes |

**Note:** Most Phase 4 features require no external setup — they use existing PostgreSQL, Redis, BullMQ, and Stripe infrastructure. Regional payment providers are the primary items requiring third-party account creation, and these are only needed when geographic demand triggers justify them.
