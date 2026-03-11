# Phase 2 — Manual Configuration Guide

> All Phase 2 features are designed to degrade gracefully when optional credentials are missing.
> In local development, only `DATABASE_URL` and `REDIS_URL` are strictly required.

---

## 1. Environment Variables

### 1.1 Core Infrastructure (Required)

| Variable | Default | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | `postgresql://savspot:savspot_dev@localhost:5432/savspot_dev` | PostgreSQL connection |
| `REDIS_URL` | `redis://localhost:6379` | Redis for caching and BullMQ job queues |
| `PORT` | `3001` | API server port |
| `NODE_ENV` | `development` | `development` / `production` / `test` |
| `WEB_URL` | `http://localhost:3000` | Frontend URL (CORS origin, email links) |

### 1.2 JWT Authentication

| Variable | Default | Notes |
|----------|---------|-------|
| `JWT_PRIVATE_KEY_BASE64` | Auto-generated in dev | RS256 private key, base64-encoded |
| `JWT_PUBLIC_KEY_BASE64` | Auto-generated in dev | RS256 public key, base64-encoded |
| `JWT_ACCESS_EXPIRY` | `15m` | Access token lifetime |
| `JWT_REFRESH_EXPIRY` | `7d` | Refresh token lifetime |

**Generate production keys:**
```bash
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem
cat private.pem | base64 | tr -d '\n'   # → JWT_PRIVATE_KEY_BASE64
cat public.pem  | base64 | tr -d '\n'   # → JWT_PUBLIC_KEY_BASE64
```

### 1.3 Encryption Keys

| Variable | Default | Notes |
|----------|---------|-------|
| `ENCRYPTION_KEY` | — | AES-256 hex key (reserved for future use) |
| `MFA_ENCRYPTION_KEY` | Ephemeral in dev | AES-256 hex key for TOTP secret encryption |

**Generate:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 1.4 Stripe (Payments & Subscriptions)

| Variable | Default | Notes |
|----------|---------|-------|
| `STRIPE_SECRET_KEY` | — | `sk_test_...` or `sk_live_...` |
| `STRIPE_PUBLISHABLE_KEY` | — | `pk_test_...` or `pk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | — | Standard webhook signing secret (`whsec_...`) |
| `STRIPE_CONNECT_WEBHOOK_SECRET` | — | Connect webhook signing secret (`whsec_...`) |
| `STRIPE_PLATFORM_FEE_PERCENT` | `1` | Platform fee (0–100) |

**Setup:** <https://dashboard.stripe.com/test/apikeys>

### 1.5 Resend (Transactional Email)

| Variable | Default | Notes |
|----------|---------|-------|
| `RESEND_API_KEY` | — | Emails logged to console when missing |
| `RESEND_FROM_EMAIL` | `onboarding@savspot.co` | Sender address |
| `RESEND_WEBHOOK_SECRET` | — | Svix signature verification secret |

**Setup:** <https://resend.com> → API Keys

### 1.6 SMS — Twilio (Default)

| Variable | Default | Notes |
|----------|---------|-------|
| `TWILIO_ACCOUNT_SID` | — | Account SID |
| `TWILIO_AUTH_TOKEN` | — | Auth token |
| `TWILIO_PHONE_NUMBER` | — | Sender number (`+1XXX...`) |

**Setup:** <https://console.twilio.com>

### 1.7 SMS — Plivo (Alternative)

| Variable | Default | Notes |
|----------|---------|-------|
| `SMS_PROVIDER` | `twilio` | Set to `plivo` to switch |
| `PLIVO_AUTH_ID` | — | Authentication ID |
| `PLIVO_AUTH_TOKEN` | — | Authentication token |
| `PLIVO_FROM_NUMBER` | — | Sender number |

**Setup:** <https://console.plivo.com>

### 1.8 Google OAuth (User Authentication)

| Variable | Default | Notes |
|----------|---------|-------|
| `GOOGLE_CLIENT_ID` | — | OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | — | OAuth client secret |
| `GOOGLE_CALLBACK_URL` | `http://localhost:3001/api/auth/google/callback` | Must match Console config |

**Setup:** <https://console.cloud.google.com/apis/credentials>
**Scopes:** `openid`, `email`, `profile`

### 1.9 Apple Sign-In

| Variable | Default | Notes |
|----------|---------|-------|
| `APPLE_CLIENT_ID` | — | App identifier |
| `APPLE_TEAM_ID` | — | Developer team ID |
| `APPLE_KEY_ID` | — | Key identifier |
| `APPLE_PRIVATE_KEY_PATH` | — | File path to P8 private key |
| `APPLE_CALLBACK_URL` | `http://localhost:3001/api/auth/apple/callback` | Must match Apple config |

**Setup:** <https://developer.apple.com/account/resources/>

### 1.10 Google Calendar Integration

| Variable | Default | Notes |
|----------|---------|-------|
| `GOOGLE_CALENDAR_CLIENT_ID` | — | Separate OAuth app from user auth |
| `GOOGLE_CALENDAR_CLIENT_SECRET` | — | Calendar OAuth secret |
| `GOOGLE_CALENDAR_REDIRECT_URI` | `http://localhost:3001/api/auth/google-calendar/callback` | Redirect URI |
| `GOOGLE_CALENDAR_WEBHOOK_URL` | — | Public URL for push notifications |

**Setup:** <https://console.cloud.google.com/apis/credentials> (create a separate OAuth app)
**Scopes:** `https://www.googleapis.com/auth/calendar.events`, `https://www.googleapis.com/auth/calendar.readonly`

### 1.11 Microsoft / Outlook Calendar

| Variable | Default | Notes |
|----------|---------|-------|
| `MICROSOFT_CLIENT_ID` | — | Azure app registration ID |
| `MICROSOFT_CLIENT_SECRET` | — | Azure app secret |
| `MICROSOFT_REDIRECT_URI` | `http://localhost:3001/api/auth/outlook-calendar/callback` | Redirect URI |

**Setup:** <https://portal.azure.com> → App registrations → New registration
**Scopes:** `Calendars.ReadWrite`, `offline_access`

### 1.12 Cloudflare R2 (File Uploads)

| Variable | Default | Notes |
|----------|---------|-------|
| `R2_ACCOUNT_ID` | — | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | — | R2 API token access key |
| `R2_SECRET_ACCESS_KEY` | — | R2 API token secret |
| `R2_BUCKET_NAME` | `savspot-uploads` | Bucket name |
| `R2_PUBLIC_URL` | — | Custom domain or `*.r2.dev` URL |

**Setup:** Cloudflare Dashboard → R2 → Create bucket + API token

### 1.13 Web Push Notifications

| Variable | Default | Notes |
|----------|---------|-------|
| `VAPID_PUBLIC_KEY` | — | VAPID public key |
| `VAPID_PRIVATE_KEY` | — | VAPID private key |
| `VAPID_SUBJECT` | `mailto:support@savspot.co` | Contact for push service |

**Generate:**
```bash
npx web-push generate-vapid-keys
```

### 1.14 Ollama (AI Support Triage)

| Variable | Default | Notes |
|----------|---------|-------|
| `OLLAMA_URL` | `http://localhost:11434` | Ollama API endpoint |
| `OLLAMA_MODEL` | `qwen3-coder-next` | Model for ticket triage |
| `AI_CONFIDENCE_THRESHOLD` | `0.85` | Auto-resolve threshold (0–1) |

### 1.15 Sentry (Error Tracking)

| Variable | Default | Notes |
|----------|---------|-------|
| `SENTRY_DSN` | — | Project DSN |

**Setup:** <https://sentry.io> → Create project → copy DSN

### 1.16 Frontend (Next.js)

| Variable | Default | Notes |
|----------|---------|-------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001/api` | Backend API URL |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Frontend app URL |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | — | Same as backend publishable key |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | — | Same as backend VAPID public key |

---

## 2. OAuth App Registrations

Each external OAuth provider requires a registered application with the correct redirect URI.

| Provider | Platform | Redirect URI (dev) | Env Vars Produced |
|----------|----------|-------------------|-------------------|
| Google (auth) | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) | `http://localhost:3001/api/auth/google/callback` | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| Google (calendar) | Same console, separate app | `http://localhost:3001/api/auth/google-calendar/callback` | `GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET` |
| Apple | [Apple Developer](https://developer.apple.com/account/resources/) | `http://localhost:3001/api/auth/apple/callback` | `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, P8 key file |
| Microsoft | [Azure Portal](https://portal.azure.com) → App registrations | `http://localhost:3001/api/auth/outlook-calendar/callback` | `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` |

> **Production:** Replace `localhost:3001` with the actual API domain in all redirect URIs.

---

## 3. Webhook Endpoints

These URLs must be configured on each external platform to receive events.

### 3.1 Stripe

**URL:** `POST https://<api-domain>/api/webhooks/stripe`
**Dashboard:** <https://dashboard.stripe.com/test/webhooks>
**Events to subscribe:**
- `charge.*`
- `payment_intent.*`
- `customer.subscription.*`
- `account.updated` (Connect)
- `invoice.*` (subscriptions)

Two signing secrets are needed: one for standard events (`STRIPE_WEBHOOK_SECRET`) and one for Connect events (`STRIPE_CONNECT_WEBHOOK_SECRET`).

### 3.2 Resend (Email)

**URL:** `POST https://<api-domain>/api/webhooks/resend`
**Dashboard:** <https://resend.com/webhooks>
**Events:** `email.sent`, `email.delivered`, `email.bounced`, `email.complained`
**Secret:** `RESEND_WEBHOOK_SECRET`

### 3.3 Google Calendar Push Notifications

**URL:** Value of `GOOGLE_CALENDAR_WEBHOOK_URL`
**Setup:** Automatic — the app registers watch channels via the Google Calendar API.
**Requirement:** URL must be publicly accessible and HTTPS.

---

## 4. Database Setup

### 4.1 PostgreSQL

```bash
# Start Docker services (PostgreSQL 16 + Redis 7)
pnpm docker:up

# Run all migrations
pnpm db:migrate:dev

# Generate Prisma client
pnpm db:generate

# Seed test data (optional)
pnpm db:seed
```

### 4.2 Required Extensions

Applied automatically by migrations:
```sql
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- Full-text trigram search
```

### 4.3 Row-Level Security

RLS policies are created by migration `20260303041239_rls_and_search`. They enforce tenant isolation at the database level as a defense-in-depth measure. The application layer sets tenant context per-request via:
```sql
SELECT set_config('app.current_tenant', :tenantId, TRUE)
```

No manual RLS configuration is needed — migrations handle everything.

---

## 5. Redis & BullMQ

Redis is used for caching and BullMQ job queues. A single `REDIS_URL` configures both.

**Queues (auto-created):**
- `bookings` — booking lifecycle jobs
- `payments` — payment reconciliation
- `calendar` — calendar sync, token refresh, watch renewal
- `communications` — email/SMS delivery, browser push
- `invoices` — invoice generation
- `gdpr` — data export/deletion processing

**Job defaults:** 3 retries, exponential backoff (5s initial delay), 100 completed / 500 failed jobs retained.

No manual queue setup is required — BullMQ creates queues on first use.

---

## 6. CORS & Embed Widget

**CORS** is configured automatically from `WEB_URL`. In development, LAN IP ranges (`192.168.*`, `10.*`, `172.16-31.*`) are also allowed.

**Embed widget** endpoints (`/api/embed/:slug/*`) are public and allow any origin. No additional CORS configuration is needed. Rate limit: 100 req/min (higher than authenticated endpoints).

---

## 7. Background Processors

All BullMQ processors start automatically with the API server. No cron jobs or external schedulers are needed.

| Processor | Queue | Trigger |
|-----------|-------|---------|
| `SupportTriageHandler` | `communications` | On support ticket creation |
| `CommunicationsProcessor` | `communications` | Email delivery with delays |
| `SmsProcessor` | `communications` | SMS delivery |
| `BrowserPushProcessor` | `communications` | Web push notifications |
| `MorningSummaryProcessor` | `communications` | Scheduled daily SMS digest |
| `WeeklyDigestProcessor` | `communications` | Scheduled weekly digest |
| `CalendarSyncProcessor` | `calendar` | Calendar two-way sync |
| `CalendarTokenProcessor` | `calendar` | OAuth token refresh |
| `CalendarWatchRenewalProcessor` | `calendar` | Google watch channel renewal |
| `ReconcilePaymentsProcessor` | `payments` | Payment state reconciliation |

---

## 8. Feature-by-Feature Checklist

Quick reference for which variables each Phase 2 feature needs.

| Feature | Required Variables | External Account |
|---------|-------------------|-----------------|
| Subscription billing | `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe |
| Email communications | `RESEND_API_KEY` | Resend |
| SMS notifications | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` (or Plivo equivalents + `SMS_PROVIDER=plivo`) | Twilio or Plivo |
| Google Calendar sync | `GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET` | Google Cloud Console |
| Outlook Calendar sync | `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` | Microsoft Azure |
| File uploads | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | Cloudflare |
| Web push | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | None (self-generated) |
| MFA (TOTP) | `MFA_ENCRYPTION_KEY` (optional in dev) | None |
| AI support triage | Ollama running at `OLLAMA_URL` | None (local model) |
| Error tracking | `SENTRY_DSN` | Sentry |
| Google sign-in | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google Cloud Console |
| Apple sign-in | `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY_PATH` | Apple Developer |
| Embed widget | None | None |
| Client portal | None | None |
| Contracts & quotes | None | None |
| Admin dashboard | None | None |
| AI operations | None | None |
| Reviews management | None | None |
| Data imports | None | None |

---

## 9. Minimal Local Development Setup

To run all Phase 2 features locally with graceful degradation:

```bash
# 1. Start infrastructure
pnpm docker:up

# 2. Create .env from template
cp .env.example .env

# 3. Set minimum required values in .env
DATABASE_URL=postgresql://savspot:savspot_dev@localhost:5432/savspot_dev
REDIS_URL=redis://localhost:6379

# 4. Run migrations and generate client
pnpm db:migrate:dev && pnpm db:generate

# 5. Seed test data
pnpm db:seed

# 6. Start dev server
pnpm dev
```

All features that depend on external services (Stripe, Resend, Twilio, etc.) will log warnings and fall back to console output or no-op behavior when credentials are missing.
