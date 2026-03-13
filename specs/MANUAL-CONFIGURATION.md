# SavSpot — Manual Configuration Guide

> **Purpose:** This document consolidates every external service, secret, and manual setup step required to take SavSpot from a fresh clone to a fully operational deployment. Follow sections in order; each builds on the previous.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Local Development Setup](#2-local-development-setup)
3. [JWT Key Pair (RS256)](#3-jwt-key-pair-rs256)
4. [Database & Redis](#4-database--redis)
5. [Google OAuth (Sign-In)](#5-google-oauth-sign-in)
6. [Apple Sign-In](#6-apple-sign-in)
7. [Stripe (Payments & Subscriptions)](#7-stripe-payments--subscriptions)
8. [Resend (Transactional Email)](#8-resend-transactional-email)
9. [SMS — Twilio](#9-sms--twilio)
10. [SMS — Plivo (Alternative)](#10-sms--plivo-alternative)
11. [Cloudflare R2 (File Uploads)](#11-cloudflare-r2-file-uploads)
12. [Google Calendar OAuth](#12-google-calendar-oauth)
13. [Microsoft / Outlook Calendar OAuth](#13-microsoft--outlook-calendar-oauth)
14. [Sentry (Error Tracking)](#14-sentry-error-tracking)
15. [PostHog (Product Analytics)](#15-posthog-product-analytics)
16. [VAPID Keys (Browser Push Notifications)](#16-vapid-keys-browser-push-notifications)
17. [Encryption Keys](#17-encryption-keys)
18. [DNS & Domain Configuration](#18-dns--domain-configuration)
19. [Fly.io Deployment (API)](#19-flyio-deployment-api)
20. [Vercel / Frontend Deployment](#20-vercel--frontend-deployment)
21. [GitHub Actions (CI/CD)](#21-github-actions-cicd)
22. [Mobile App (Expo / EAS)](#22-mobile-app-expo--eas)
23. [Complete Environment Variable Reference](#23-complete-environment-variable-reference)

---

## 1. Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 22.x (see `.nvmrc`) | Runtime |
| pnpm | 10.x | Package manager |
| Docker & Docker Compose | Latest | Local PostgreSQL + Redis |
| Git | Latest | Version control |
| Fly CLI (`flyctl`) | Latest | API deployment |
| Vercel CLI (optional) | Latest | Frontend deployment |
| EAS CLI (optional) | Latest | Mobile app builds |

```bash
# Install Node 22 via nvm
nvm install 22 && nvm use 22

# Install pnpm
corepack enable && corepack prepare pnpm@latest --activate

# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Clone and install
git clone git@github.com:stephendeslate/savspot.git
cd savspot
pnpm install
```

---

## 2. Local Development Setup

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Start PostgreSQL + Redis
pnpm docker:up

# 3. Generate Prisma client
pnpm db:generate

# 4. Run migrations
pnpm db:migrate:dev

# 5. Seed database
pnpm db:seed

# 6. Start all apps
pnpm dev
```

The API runs at `http://localhost:3001`, the web app at `http://localhost:3000`.

> **Note (Linux):** If you have a system PostgreSQL running on port 5432, stop it first: `sudo systemctl stop postgresql`

---

## 3. JWT Key Pair (RS256)

SavSpot uses RS256 asymmetric key pairs for JWT signing. In development, a key pair is auto-generated if missing. **For production, you must generate and set your own.**

```bash
# Generate key pair
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem

# Base64-encode (single line, no wrapping)
JWT_PRIVATE_KEY_BASE64=$(cat private.pem | base64 | tr -d '\n')
JWT_PUBLIC_KEY_BASE64=$(cat public.pem | base64 | tr -d '\n')

# Add to .env
echo "JWT_PRIVATE_KEY_BASE64=$JWT_PRIVATE_KEY_BASE64" >> .env
echo "JWT_PUBLIC_KEY_BASE64=$JWT_PUBLIC_KEY_BASE64" >> .env

# Clean up PEM files
rm private.pem public.pem
```

**Production (Fly.io):**
```bash
fly secrets set JWT_PRIVATE_KEY_BASE64="..." JWT_PUBLIC_KEY_BASE64="..." --app savspot-api
```

| Variable | Required | Default |
|----------|----------|---------|
| `JWT_PRIVATE_KEY_BASE64` | Production | Auto-generated in dev |
| `JWT_PUBLIC_KEY_BASE64` | Production | Auto-generated in dev |
| `JWT_ACCESS_EXPIRY` | No | `15m` |
| `JWT_REFRESH_EXPIRY` | No | `7d` |

---

## 4. Database & Redis

### Local (Docker Compose)
No configuration needed — `pnpm docker:up` starts both services with defaults.

### Production

**PostgreSQL 16** (Fly Postgres, Supabase, Neon, or any managed provider):
- Enable the `pgcrypto` extension (used for UUID generation)
- RLS policies are applied automatically by Prisma migrations

**Redis 7** (Upstash recommended for Fly.io):
- Used for caching, BullMQ job queues, and rate limiting
- Requires a persistent Redis instance (not ephemeral)

| Variable | Required | Default |
|----------|----------|---------|
| `DATABASE_URL` | Yes | `postgresql://savspot:savspot_dev@localhost:5432/savspot_dev` |
| `REDIS_URL` | Yes | `redis://localhost:6379` |

**Production (Fly.io):**
```bash
# Create Fly Postgres
fly postgres create --name savspot-db

# Attach to app (sets DATABASE_URL automatically)
fly postgres attach savspot-db --app savspot-api

# Set Redis URL (from Upstash dashboard)
fly secrets set REDIS_URL="rediss://default:xxx@xxx.upstash.io:6379" --app savspot-api
```

---

## 5. Google OAuth (Sign-In)

1. Go to [Google Cloud Console > Credentials](https://console.cloud.google.com/apis/credentials)
2. Create a new **OAuth 2.0 Client ID** (Web application)
3. Add authorized redirect URIs:
   - Local: `http://localhost:3001/api/auth/google/callback`
   - Production: `https://api.savspot.co/api/auth/google/callback`
4. Enable the **Google+ API** (or People API) in the API Library

| Variable | Required | Default |
|----------|----------|---------|
| `GOOGLE_CLIENT_ID` | Optional | — (Google login disabled if unset) |
| `GOOGLE_CLIENT_SECRET` | Optional | — |
| `GOOGLE_CALLBACK_URL` | No | `http://localhost:3001/api/auth/google/callback` |

---

## 6. Apple Sign-In

1. Go to [Apple Developer > Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources)
2. Register a **Services ID** (this is your `APPLE_CLIENT_ID`)
3. Configure it for "Sign In with Apple" and add redirect URLs:
   - Local: `http://localhost:3001/api/auth/apple/callback`
   - Production: `https://api.savspot.co/api/auth/apple/callback`
4. Create a **Key** with "Sign In with Apple" capability — download the `.p8` file
5. Note your **Team ID** and **Key ID**

| Variable | Required | Default |
|----------|----------|---------|
| `APPLE_CLIENT_ID` | Optional | — (Apple login disabled if unset) |
| `APPLE_TEAM_ID` | Optional | — |
| `APPLE_KEY_ID` | Optional | — |
| `APPLE_PRIVATE_KEY_PATH` | Optional | Path to `.p8` key file |
| `APPLE_CALLBACK_URL` | Optional | — |

---

## 7. Stripe (Payments & Subscriptions)

### Initial Setup
1. Create a [Stripe account](https://dashboard.stripe.com/register)
2. Get your API keys from [Dashboard > Developers > API Keys](https://dashboard.stripe.com/test/apikeys)

### Stripe Connect (Vendor Payouts)
1. Go to [Dashboard > Connect > Settings](https://dashboard.stripe.com/test/connect/settings)
2. Enable **Express** account type
3. Configure branding (icon, color, business name)
4. Set platform fees in Stripe Connect settings

### Webhooks
1. Go to [Dashboard > Developers > Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Create **two** webhook endpoints:

**Endpoint 1 — Account webhooks:**
- URL: `https://api.savspot.co/api/payments/webhook`
- Events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`, `charge.dispute.created`, `charge.dispute.closed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`

**Endpoint 2 — Connect webhooks:**
- URL: `https://api.savspot.co/api/payments/connect-webhook`
- Listen to: Connected accounts
- Events: `account.updated`, `payout.paid`, `payout.failed`

3. Copy the **Signing Secret** from each endpoint

### Stripe Billing (Subscriptions)
1. Create Products in [Dashboard > Products](https://dashboard.stripe.com/test/products):
   - **SavSpot Pro** — $10/month (annual: $8/month, billed at $96/year)
2. Note the Price IDs for use in the subscriptions module

| Variable | Required | Default |
|----------|----------|---------|
| `STRIPE_SECRET_KEY` | Yes (for payments) | — |
| `STRIPE_PUBLISHABLE_KEY` | Yes (for payments) | — |
| `STRIPE_WEBHOOK_SECRET` | Yes (production) | — |
| `STRIPE_CONNECT_WEBHOOK_SECRET` | Yes (production) | — |
| `STRIPE_PLATFORM_FEE_PERCENT` | No | `1` |

**Frontend:**

| Variable | Required |
|----------|----------|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Yes (for payment form) |

---

## 8. Resend (Transactional Email)

1. Create a [Resend account](https://resend.com)
2. Add and verify your sending domain (`savspot.co`) — requires DNS records:
   - SPF: `TXT` record
   - DKIM: `CNAME` records (3 records provided by Resend)
   - DMARC: `TXT` record (recommended)
3. Get your API key from [Dashboard > API Keys](https://resend.com/api-keys)
4. (Optional) Set up a webhook for delivery tracking:
   - URL: `https://api.savspot.co/api/communications/resend-webhook`
   - Events: `email.sent`, `email.delivered`, `email.bounced`, `email.complained`
   - Copy the webhook signing secret

| Variable | Required | Default |
|----------|----------|---------|
| `RESEND_API_KEY` | Optional | — (emails logged to console if unset) |
| `RESEND_FROM_EMAIL` | No | `onboarding@savspot.co` |

---

## 9. SMS — Twilio

1. Create a [Twilio account](https://www.twilio.com/try-twilio)
2. Get a phone number from the [Console](https://console.twilio.com/us1/develop/phone-numbers/manage/incoming)
3. Note your Account SID and Auth Token from the [Dashboard](https://console.twilio.com)

| Variable | Required | Default |
|----------|----------|---------|
| `SMS_PROVIDER` | No | `twilio` |
| `TWILIO_ACCOUNT_SID` | Optional | — (SMS disabled if unset) |
| `TWILIO_AUTH_TOKEN` | Optional | — |
| `TWILIO_PHONE_NUMBER` | Optional | — (E.164 format: `+1234567890`) |

---

## 10. SMS — Plivo (Alternative)

If you prefer Plivo over Twilio, set `SMS_PROVIDER=plivo`.

1. Create a [Plivo account](https://www.plivo.com)
2. Get a phone number from the [Console](https://console.plivo.com/phone-numbers/search/)
3. Note your Auth ID and Auth Token from the [Dashboard](https://console.plivo.com/dashboard/)

| Variable | Required | Default |
|----------|----------|---------|
| `SMS_PROVIDER` | No | `twilio` (set to `plivo` to use Plivo) |
| `PLIVO_AUTH_ID` | Optional | — |
| `PLIVO_AUTH_TOKEN` | Optional | — |
| `PLIVO_FROM_NUMBER` | Optional | — (E.164 format) |

---

## 11. Cloudflare R2 (File Uploads)

1. Go to [Cloudflare Dashboard > R2](https://dash.cloudflare.com/?to=/:account/r2)
2. Create a bucket named `savspot-uploads`
3. Create an **R2 API Token** with read/write permissions for the bucket
4. (Optional) Set up a custom domain or use the R2.dev public URL for serving files
5. Configure CORS on the bucket to allow uploads from your web domain

| Variable | Required | Default |
|----------|----------|---------|
| `R2_ACCOUNT_ID` | Optional | — (uploads disabled if unset) |
| `R2_ACCESS_KEY_ID` | Optional | — |
| `R2_SECRET_ACCESS_KEY` | Optional | — |
| `R2_BUCKET_NAME` | No | `savspot-uploads` |
| `R2_PUBLIC_URL` | Optional | — (e.g., `https://uploads.savspot.co`) |

---

## 12. Google Calendar OAuth

This is a **separate** OAuth client from Google Sign-In (Section 5). It uses different scopes and redirect URIs.

1. Go to [Google Cloud Console > Credentials](https://console.cloud.google.com/apis/credentials)
2. Create a new **OAuth 2.0 Client ID** (Web application)
3. Add authorized redirect URIs:
   - Local: `http://localhost:3001/api/auth/google-calendar/callback`
   - Production: `https://api.savspot.co/api/auth/google-calendar/callback`
4. Enable the **Google Calendar API** in the [API Library](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com)
5. For real-time sync, configure a **push notification channel** (requires a publicly accessible HTTPS URL)

| Variable | Required | Default |
|----------|----------|---------|
| `GOOGLE_CALENDAR_CLIENT_ID` | Optional | — (calendar sync disabled if unset) |
| `GOOGLE_CALENDAR_CLIENT_SECRET` | Optional | — |
| `GOOGLE_CALENDAR_REDIRECT_URI` | No | `http://localhost:3001/api/auth/google-calendar/callback` |
| `GOOGLE_CALENDAR_WEBHOOK_URL` | Optional | — (e.g., `https://api.savspot.co/api/calendar/webhook`) |

---

## 13. Microsoft / Outlook Calendar OAuth

1. Go to [Azure Portal > App Registrations](https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade)
2. Register a new application
3. Under **Authentication**, add a **Web** redirect URI:
   - Local: `http://localhost:3001/api/auth/outlook-calendar/callback`
   - Production: `https://api.savspot.co/api/auth/outlook-calendar/callback`
4. Under **Certificates & Secrets**, create a new client secret
5. Under **API Permissions**, add `Calendars.ReadWrite` (Microsoft Graph)

| Variable | Required | Default |
|----------|----------|---------|
| `MICROSOFT_CLIENT_ID` | Optional | — (Outlook sync disabled if unset) |
| `MICROSOFT_CLIENT_SECRET` | Optional | — |
| `MICROSOFT_REDIRECT_URI` | No | `http://localhost:3001/api/auth/outlook-calendar/callback` |

---

## 14. Sentry (Error Tracking)

### Backend (API)
1. Create a [Sentry project](https://sentry.io) (Platform: Node.js / NestJS)
2. Copy the DSN from **Settings > Projects > [project] > Client Keys**

### Frontend (Web)
1. Create a Sentry project (Platform: Next.js)
2. Copy the DSN
3. For source map uploads in CI, create an **Auth Token** at [Settings > Auth Tokens](https://sentry.io/settings/auth-tokens/)
4. Note your **Organization slug** and **Project slug**

| Variable | Where | Required | Default |
|----------|-------|----------|---------|
| `SENTRY_DSN` | API `.env` | Optional | — (error tracking disabled if unset) |
| `NEXT_PUBLIC_SENTRY_DSN` | Web `.env` | Optional | — |
| `SENTRY_ORG` | Web `.env` / CI | Optional | — (for source map uploads) |
| `SENTRY_PROJECT` | Web `.env` / CI | Optional | — |
| `SENTRY_AUTH_TOKEN` | CI secrets only | Optional | — (for source map uploads) |

---

## 15. PostHog (Product Analytics)

### Backend (API)
1. Create a [PostHog account](https://posthog.com) (US or EU cloud)
2. Get your **Project API Key** from [Settings > Project > API Key](https://us.posthog.com/settings/project#variables)

### Frontend (Web)
1. Use the same project — PostHog provides a single key for both client and server

| Variable | Where | Required | Default |
|----------|-------|----------|---------|
| `POSTHOG_API_KEY` | API `.env` | Optional | — (analytics disabled if unset) |
| `POSTHOG_HOST` | API `.env` | No | `https://us.i.posthog.com` |
| `NEXT_PUBLIC_POSTHOG_KEY` | Web `.env` | Optional | — |
| `NEXT_PUBLIC_POSTHOG_HOST` | Web `.env` | No | `https://us.i.posthog.com` |

---

## 16. VAPID Keys (Browser Push Notifications)

Generate a VAPID key pair for Web Push notifications:

```bash
npx web-push generate-vapid-keys
```

This outputs a public key and private key. The public key is also needed on the frontend.

| Variable | Where | Required | Default |
|----------|-------|----------|---------|
| `VAPID_PUBLIC_KEY` | API `.env` | Optional | — (push disabled if unset) |
| `VAPID_PRIVATE_KEY` | API `.env` | Optional | — |
| `VAPID_SUBJECT` | API `.env` | No | `mailto:support@savspot.co` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web `.env` | Optional | — |

---

## 17. Encryption Keys

Two separate keys are used for encrypting sensitive data at rest:

```bash
# Generate a 256-bit encryption key
ENCRYPTION_KEY=$(openssl rand -hex 32)
MFA_ENCRYPTION_KEY=$(openssl rand -hex 32)
```

| Variable | Required | Default |
|----------|----------|---------|
| `ENCRYPTION_KEY` | Production | — (used for encrypting OAuth tokens, API keys) |
| `MFA_ENCRYPTION_KEY` | Production | — (used for encrypting TOTP secrets) |

> **Warning:** Losing these keys means losing access to all encrypted data. Back them up securely.

---

## 18. DNS & Domain Configuration

### Primary Domains
| Domain | Purpose | Record Type | Value |
|--------|---------|-------------|-------|
| `savspot.co` | Marketing site / web app | `A` / `CNAME` | Vercel |
| `api.savspot.co` | API server | `CNAME` | `savspot-api.fly.dev` |
| `uploads.savspot.co` | R2 file serving (optional) | `CNAME` | R2 custom domain |

### Email DNS (for Resend)
| Record | Type | Name | Value |
|--------|------|------|-------|
| SPF | `TXT` | `@` | `v=spf1 include:amazonses.com ~all` |
| DKIM | `CNAME` | (3 records from Resend) | (values from Resend) |
| DMARC | `TXT` | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:dmarc@savspot.co` |
| Return-Path | `CNAME` | (from Resend) | (value from Resend) |

### Custom Booking Domains (Phase 4)
Tenants can map `book.mybusiness.com` to their SavSpot booking page. This requires:
- Tenant adds a `CNAME` record pointing to `savspot.co`
- SavSpot verifies domain ownership via DNS TXT challenge
- TLS certificate provisioned automatically

---

## 19. Fly.io Deployment (API)

### First-Time Setup
```bash
# Authenticate
fly auth login

# Launch app (creates app + Postgres)
cd apps/api
fly launch --name savspot-api --region iad --no-deploy

# Create Postgres
fly postgres create --name savspot-db --region iad
fly postgres attach savspot-db --app savspot-api

# Set all secrets
fly secrets set \
  REDIS_URL="rediss://..." \
  WEB_URL="https://savspot.co" \
  JWT_PRIVATE_KEY_BASE64="..." \
  JWT_PUBLIC_KEY_BASE64="..." \
  GOOGLE_CLIENT_ID="..." \
  GOOGLE_CLIENT_SECRET="..." \
  GOOGLE_CALLBACK_URL="https://api.savspot.co/api/auth/google/callback" \
  RESEND_API_KEY="..." \
  R2_ACCOUNT_ID="..." \
  R2_ACCESS_KEY_ID="..." \
  R2_SECRET_ACCESS_KEY="..." \
  R2_PUBLIC_URL="https://uploads.savspot.co" \
  STRIPE_SECRET_KEY="..." \
  STRIPE_PUBLISHABLE_KEY="..." \
  STRIPE_WEBHOOK_SECRET="..." \
  STRIPE_CONNECT_WEBHOOK_SECRET="..." \
  TWILIO_ACCOUNT_SID="..." \
  TWILIO_AUTH_TOKEN="..." \
  TWILIO_PHONE_NUMBER="..." \
  VAPID_PUBLIC_KEY="..." \
  VAPID_PRIVATE_KEY="..." \
  ENCRYPTION_KEY="..." \
  MFA_ENCRYPTION_KEY="..." \
  SENTRY_DSN="..." \
  POSTHOG_API_KEY="..." \
  --app savspot-api

# Deploy
fly deploy --config apps/api/fly.toml --dockerfile apps/api/Dockerfile --remote-only
```

### Worker App
```bash
fly launch --name savspot-worker --region iad --no-deploy
# Attach the SAME Postgres and set the SAME secrets
fly postgres attach savspot-db --app savspot-worker
fly secrets set ... --app savspot-worker  # same secrets as API
fly deploy --config apps/api/fly.worker.toml --dockerfile apps/api/Dockerfile.worker --remote-only
```

### Scaling
```bash
# Scale API
fly scale vm shared-cpu-2x --memory 1024 --app savspot-api

# Scale worker
fly scale vm shared-cpu-1x --memory 512 --app savspot-worker
```

---

## 20. Vercel / Frontend Deployment

### Setup
1. Import the repo in [Vercel Dashboard](https://vercel.com/new)
2. Set **Root Directory** to `apps/web`
3. Set **Framework Preset** to Next.js
4. Set **Build Command** to `cd ../.. && pnpm build --filter=@savspot/web`
5. Set **Install Command** to `cd ../.. && pnpm install`

### Environment Variables (Vercel Dashboard)
| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | `https://api.savspot.co` |
| `NEXT_PUBLIC_URL` | `https://savspot.co` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` |
| `NEXT_PUBLIC_SENTRY_DSN` | `https://...@sentry.io/...` |
| `NEXT_PUBLIC_POSTHOG_KEY` | `phc_...` |
| `NEXT_PUBLIC_POSTHOG_HOST` | `https://us.i.posthog.com` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | `B...` (VAPID public key) |
| `SENTRY_ORG` | Your Sentry org slug |
| `SENTRY_PROJECT` | Your Sentry project slug |
| `SENTRY_AUTH_TOKEN` | Auth token for source map uploads |

### Domain
Add `savspot.co` and `www.savspot.co` in Vercel's domain settings. Configure DNS `A`/`CNAME` records per Vercel's instructions.

---

## 21. GitHub Actions (CI/CD)

### Required Repository Secrets
Set these in **Settings > Secrets and variables > Actions**:

| Secret | Purpose |
|--------|---------|
| `FLY_API_TOKEN` | Fly.io deployment (get from `fly tokens create deploy`) |

### Workflows
- **`.github/workflows/ci.yml`** — Runs on all pushes: lint, typecheck, test, build, E2E (on PRs)
- **`.github/workflows/deploy-api.yml`** — Deploys API + Worker to Fly.io on push to `main` (when API/shared/prisma paths change)

---

## 22. Mobile App (Expo / EAS)

### First-Time Setup
```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Configure (already done — eas.json exists)
cd apps/mobile
```

### Environment
The mobile app reads its API URL from `src/config/api.ts`. Update for production:
- Development: `http://localhost:3001`
- Production: `https://api.savspot.co`

### Building
```bash
# Development build (internal distribution)
eas build --platform all --profile development

# Production build
eas build --platform all --profile production
```

### App Store Submission
```bash
eas submit --platform ios
eas submit --platform android
```

### Required Accounts
- **Apple Developer Program** ($99/year) — for iOS builds and App Store submission
- **Google Play Developer** ($25 one-time) — for Android builds and Play Store submission

### Push Notifications (Mobile)
- **iOS:** Requires an APNs key (`.p8` file) uploaded to Expo dashboard
- **Android:** Requires a Firebase Cloud Messaging (FCM) server key

---

## 23. Complete Environment Variable Reference

### API (`apps/api/.env`)

| Variable | Required | Default | Section |
|----------|----------|---------|---------|
| `DATABASE_URL` | Yes | `postgresql://...localhost:5432/savspot_dev` | [4](#4-database--redis) |
| `REDIS_URL` | Yes | `redis://localhost:6379` | [4](#4-database--redis) |
| `PORT` | No | `3001` | — |
| `NODE_ENV` | No | `development` | — |
| `WEB_URL` | No | `http://localhost:3000` | — |
| `JWT_PRIVATE_KEY_BASE64` | Production | Auto-generated | [3](#3-jwt-key-pair-rs256) |
| `JWT_PUBLIC_KEY_BASE64` | Production | Auto-generated | [3](#3-jwt-key-pair-rs256) |
| `JWT_ACCESS_EXPIRY` | No | `15m` | [3](#3-jwt-key-pair-rs256) |
| `JWT_REFRESH_EXPIRY` | No | `7d` | [3](#3-jwt-key-pair-rs256) |
| `GOOGLE_CLIENT_ID` | Optional | — | [5](#5-google-oauth-sign-in) |
| `GOOGLE_CLIENT_SECRET` | Optional | — | [5](#5-google-oauth-sign-in) |
| `GOOGLE_CALLBACK_URL` | No | `http://localhost:3001/api/auth/google/callback` | [5](#5-google-oauth-sign-in) |
| `APPLE_CLIENT_ID` | Optional | — | [6](#6-apple-sign-in) |
| `APPLE_TEAM_ID` | Optional | — | [6](#6-apple-sign-in) |
| `APPLE_KEY_ID` | Optional | — | [6](#6-apple-sign-in) |
| `APPLE_PRIVATE_KEY_PATH` | Optional | — | [6](#6-apple-sign-in) |
| `APPLE_CALLBACK_URL` | Optional | — | [6](#6-apple-sign-in) |
| `STRIPE_SECRET_KEY` | Yes (payments) | — | [7](#7-stripe-payments--subscriptions) |
| `STRIPE_PUBLISHABLE_KEY` | Yes (payments) | — | [7](#7-stripe-payments--subscriptions) |
| `STRIPE_WEBHOOK_SECRET` | Production | — | [7](#7-stripe-payments--subscriptions) |
| `STRIPE_CONNECT_WEBHOOK_SECRET` | Production | — | [7](#7-stripe-payments--subscriptions) |
| `STRIPE_PLATFORM_FEE_PERCENT` | No | `1` | [7](#7-stripe-payments--subscriptions) |
| `RESEND_API_KEY` | Optional | — | [8](#8-resend-transactional-email) |
| `RESEND_FROM_EMAIL` | No | `onboarding@savspot.co` | [8](#8-resend-transactional-email) |
| `SMS_PROVIDER` | No | `twilio` | [9](#9-sms--twilio) |
| `TWILIO_ACCOUNT_SID` | Optional | — | [9](#9-sms--twilio) |
| `TWILIO_AUTH_TOKEN` | Optional | — | [9](#9-sms--twilio) |
| `TWILIO_PHONE_NUMBER` | Optional | — | [9](#9-sms--twilio) |
| `PLIVO_AUTH_ID` | Optional | — | [10](#10-sms--plivo-alternative) |
| `PLIVO_AUTH_TOKEN` | Optional | — | [10](#10-sms--plivo-alternative) |
| `PLIVO_FROM_NUMBER` | Optional | — | [10](#10-sms--plivo-alternative) |
| `R2_ACCOUNT_ID` | Optional | — | [11](#11-cloudflare-r2-file-uploads) |
| `R2_ACCESS_KEY_ID` | Optional | — | [11](#11-cloudflare-r2-file-uploads) |
| `R2_SECRET_ACCESS_KEY` | Optional | — | [11](#11-cloudflare-r2-file-uploads) |
| `R2_BUCKET_NAME` | No | `savspot-uploads` | [11](#11-cloudflare-r2-file-uploads) |
| `R2_PUBLIC_URL` | Optional | — | [11](#11-cloudflare-r2-file-uploads) |
| `GOOGLE_CALENDAR_CLIENT_ID` | Optional | — | [12](#12-google-calendar-oauth) |
| `GOOGLE_CALENDAR_CLIENT_SECRET` | Optional | — | [12](#12-google-calendar-oauth) |
| `GOOGLE_CALENDAR_REDIRECT_URI` | No | `http://localhost:3001/api/auth/google-calendar/callback` | [12](#12-google-calendar-oauth) |
| `GOOGLE_CALENDAR_WEBHOOK_URL` | Optional | — | [12](#12-google-calendar-oauth) |
| `MICROSOFT_CLIENT_ID` | Optional | — | [13](#13-microsoft--outlook-calendar-oauth) |
| `MICROSOFT_CLIENT_SECRET` | Optional | — | [13](#13-microsoft--outlook-calendar-oauth) |
| `MICROSOFT_REDIRECT_URI` | No | `http://localhost:3001/api/auth/outlook-calendar/callback` | [13](#13-microsoft--outlook-calendar-oauth) |
| `SENTRY_DSN` | Optional | — | [14](#14-sentry-error-tracking) |
| `POSTHOG_API_KEY` | Optional | — | [15](#15-posthog-product-analytics) |
| `POSTHOG_HOST` | No | `https://us.i.posthog.com` | [15](#15-posthog-product-analytics) |
| `VAPID_PUBLIC_KEY` | Optional | — | [16](#16-vapid-keys-browser-push-notifications) |
| `VAPID_PRIVATE_KEY` | Optional | — | [16](#16-vapid-keys-browser-push-notifications) |
| `VAPID_SUBJECT` | No | `mailto:support@savspot.co` | [16](#16-vapid-keys-browser-push-notifications) |
| `ENCRYPTION_KEY` | Production | — | [17](#17-encryption-keys) |
| `MFA_ENCRYPTION_KEY` | Production | — | [17](#17-encryption-keys) |
| `OLLAMA_URL` | No | `http://localhost:11434` | — |
| `OLLAMA_MODEL` | No | `qwen3-coder-next` | — |
| `AI_CONFIDENCE_THRESHOLD` | No | `0.85` | — |

### Web (`apps/web/.env.local`)

| Variable | Required | Default |
|----------|----------|---------|
| `NEXT_PUBLIC_API_URL` | No | `http://localhost:3001` |
| `NEXT_PUBLIC_URL` | No | `https://savspot.com` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Yes (payments) | — |
| `NEXT_PUBLIC_SENTRY_DSN` | Optional | — |
| `NEXT_PUBLIC_POSTHOG_KEY` | Optional | — |
| `NEXT_PUBLIC_POSTHOG_HOST` | No | `https://us.i.posthog.com` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Optional | — |
| `SENTRY_ORG` | Optional | — (build-time, for source maps) |
| `SENTRY_PROJECT` | Optional | — |
| `SENTRY_AUTH_TOKEN` | Optional | — |

### GitHub Actions Secrets

| Secret | Purpose |
|--------|---------|
| `FLY_API_TOKEN` | Fly.io deployment |

### External Accounts Needed

| Service | Purpose | Cost |
|---------|---------|------|
| Stripe | Payments & subscriptions | 2.9% + $0.30 per transaction |
| Google Cloud | OAuth sign-in + Calendar sync | Free |
| Apple Developer | Sign-In with Apple + iOS builds | $99/year |
| Resend | Transactional email | Free up to 3,000/month |
| Twilio OR Plivo | SMS notifications | Pay per message |
| Cloudflare | R2 storage + DNS | Free tier generous |
| Sentry | Error tracking | Free up to 5K events/month |
| PostHog | Product analytics | Free up to 1M events/month |
| Fly.io | API + Worker hosting | ~$5-20/month |
| Vercel | Frontend hosting | Free for hobby |
| Upstash | Managed Redis | Free up to 10K commands/day |
| Azure (optional) | Outlook Calendar OAuth | Free |
| Google Play (optional) | Android app distribution | $25 one-time |
