# Phase 1 — Manual Configuration Checklist

**Date:** 2026-03-06
**Purpose:** Steps that require manual action from you (secrets, credentials, installs, env setup) to fully complete Phase 1.

---

## 1. Node.js Upgrade (Required)

The project requires Node 22 (per `.nvmrc`). Current system has v18.

```bash
# Option A: nvm
nvm install 22
nvm use 22

# Option B: system-level
sudo apt update && sudo apt install -y nodejs
# or via nodesource:
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

After upgrade, verify:
```bash
node -v   # should be v22.x
```

---

## 2. Environment File (Required)

No `.env` file exists yet. Only `.env.example`.

```bash
cp .env.example .env
```

Then fill in the following sections:

### 2a. Database + Redis (Required for any dev work)
These should already be correct from `.env.example` defaults if using Docker:
```
DATABASE_URL="postgresql://savspot:savspot_dev@localhost:5432/savspot_dev?schema=public"
REDIS_URL="redis://localhost:6379"
```

### 2b. JWT Keys (Required for auth)
Generate RS256 key pair:
```bash
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem
echo "JWT_PRIVATE_KEY_BASE64=$(cat private.pem | base64 | tr -d '\n')"
echo "JWT_PUBLIC_KEY_BASE64=$(cat public.pem | base64 | tr -d '\n')"
rm private.pem public.pem
```
Paste the output values into `.env`.

### 2c. Google OAuth (Optional — login works without it)
Create credentials at https://console.cloud.google.com/apis/credentials
```
GOOGLE_CLIENT_ID=<your-client-id>
GOOGLE_CLIENT_SECRET=<your-client-secret>
GOOGLE_CALLBACK_URL="http://localhost:3001/api/auth/google/callback"
```

### 2d. Apple Sign-In (Optional — Phase 1 feature S2)
Requires an Apple Developer account ($99/year). Configure at https://developer.apple.com:
1. Create a Services ID (this becomes `APPLE_CLIENT_ID`)
2. Create a Key with "Sign in with Apple" enabled
3. Download the `.p8` key file and note the Key ID and Team ID

```
APPLE_CLIENT_ID=<services-id>
APPLE_TEAM_ID=<team-id>
APPLE_KEY_ID=<key-id>
APPLE_PRIVATE_KEY_PATH=/absolute/path/to/AuthKey_XXXXXXXX.p8
APPLE_CALLBACK_URL="http://localhost:3001/api/auth/apple/callback"
```

**If you don't have Apple credentials:** Apple Sign-In will be non-functional but won't crash. The strategy logs a warning and the button on the frontend will fail gracefully.

### 2e. Stripe (Required for payments)
Get test keys at https://dashboard.stripe.com/test/apikeys:
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CONNECT_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### 2f. Resend (Optional — emails log to console without it)
Get API key at https://resend.com:
```
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL="onboarding@savspot.co"
```

### 2g. Cloudflare R2 (Optional — uploads fail gracefully without it)
Configure in Cloudflare dashboard > R2:
```
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME="savspot-uploads"
R2_PUBLIC_URL=
```

**Note:** The GDPR data export processor (M5) uses R2 to store export files. Without R2 configured, it logs a warning and stores a placeholder URL.

### 2h. Ollama (Optional — Phase 1 feature M8)
Ollama should already be running locally per your setup:
```
OLLAMA_URL="http://localhost:11434"
OLLAMA_MODEL="qwen3-coder-next"
```

Verify Ollama is running:
```bash
curl http://localhost:11434/api/tags
```

If the model isn't pulled yet:
```bash
ollama pull qwen3-coder-next
```

Without Ollama, support tickets are automatically escalated to manual review instead of being AI-triaged.

---

## 3. Docker Services (Required)

Start PostgreSQL and Redis:
```bash
# Stop local PostgreSQL first if running
sudo systemctl stop postgresql

pnpm docker:up
```

---

## 4. Database Setup (Required)

Generate Prisma client and run migrations:
```bash
pnpm db:generate
pnpm db:migrate:dev
pnpm db:seed   # optional, for dev data
```

**Important:** All Phase 1 Prisma models (`TaxRate`, `ConsentRecord`, `GalleryPhoto`, `OnboardingTour`, `AuditLog`, `DataRequest`, `SupportTicket`, `NotificationPreference`) already exist in `schema.prisma` and are covered by the existing migration `20260303184856_sprint2_core_domain`. No new migration is needed.

---

## 5. Install Dependencies (Required)

All Phase 1 npm packages (`passport-apple`, `qrcode`, `react-dnd`, `react-dnd-html5-backend`) are already declared in `package.json`. Just install:

```bash
pnpm install
```

---

## 6. Verify Everything Runs

```bash
pnpm db:generate       # Generate Prisma client (fixes all "Property X does not exist on PrismaService" errors)
pnpm typecheck         # Should pass (systemic Prisma errors resolve after generate)
pnpm dev               # Start API + Web in dev mode
```

---

## 7. Tailscale (For remote access from MacBook)

```bash
sudo tailscale up --ssh
```

---

## Summary Table

| Item | Required? | Phase 1 Feature | Status |
|------|-----------|-----------------|--------|
| Node.js 22 | Yes | All | Needs upgrade |
| `.env` file | Yes | All | Needs creation |
| JWT keys | Yes | Auth | Needs generation |
| Docker (PG + Redis) | Yes | All | Ready (`pnpm docker:up`) |
| Prisma generate + migrate | Yes | All | Ready (run commands) |
| `pnpm install` | Yes | All | Ready (run command) |
| Google OAuth creds | No | Google login | Optional |
| Apple Developer creds | No | S2: Apple Sign-In | Optional |
| Stripe test keys | Yes | Payments | Needs setup |
| Resend API key | No | Email | Optional |
| R2 credentials | No | Uploads/GDPR export | Optional |
| Ollama running | No | M8: AI triage | Should be running already |
| Tailscale | No | Remote SSH | Needs `sudo tailscale up` |
