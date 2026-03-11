# Phase 3 Manual Configuration Guide

All items below require manual setup in third-party dashboards, account creation, or credential generation. Code implementation proceeds with mock/stub support — these configs are needed for live/staging environments.

---

## 1. Twilio (Voice Receptionist — Stream G)

### Account Setup
- Create Twilio account at https://www.twilio.com/
- Upgrade from trial to paid account (trial has limited features)
- Note your **Account SID** and **Auth Token** from Console > Account Info

### Phone Number Provisioning
- Console > Phone Numbers > Buy a Number
- Select number with **Voice** capability
- For each tenant needing voice: purchase a dedicated number (or use Twilio's subaccounts)

### Webhook Configuration
- For each purchased number, configure:
  - **Voice & Fax > A CALL COMES IN**: `POST https://api.savspot.co/api/voice/answer`
  - **Voice & Fax > CALL STATUS CHANGES**: `POST https://api.savspot.co/api/voice/status`
- Enable **Recording** in account settings (for call transcription)

### Environment Variables
```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_VOICE_WEBHOOK_URL=https://api.savspot.co/api/voice/answer
TWILIO_STATUS_CALLBACK_URL=https://api.savspot.co/api/voice/status
```

---

## 2. Adyen (Payment Provider — Stream D)

### Platform Account Setup
- Apply for Adyen for Platforms at https://www.adyen.com/platforms
- This is a marketplace/platform account (not a standard merchant account)
- Approval may take 1-2 weeks with KYC for SavSpot as the platform

### Sandbox Credentials
- Adyen Customer Area > Developers > API Credentials
- Create a new API credential with:
  - **Checkout API** role
  - **Platforms Manage** role
  - Generate API key
- Note your **Merchant Account** name

### Environment Variables
```env
ADYEN_API_KEY=AQExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
ADYEN_MERCHANT_ACCOUNT=SavSpotPlatform
ADYEN_PLATFORM_ACCOUNT=SavSpotPlatformAccount
ADYEN_ENVIRONMENT=TEST
# Change to LIVE for production
```

### Production Checklist
- [ ] Complete Adyen compliance review
- [ ] Switch `ADYEN_ENVIRONMENT` to `LIVE`
- [ ] Configure live API credentials
- [ ] Set up Adyen webhooks for `ACCOUNT_HOLDER_VERIFICATION` events
- [ ] Webhook URL: `POST https://api.savspot.co/api/payments/webhooks/adyen`

---

## 3. PayPal Commerce Platform (Payment Provider — Stream D)

### Partner Registration
- Apply at https://developer.paypal.com/docs/commerce-platform/
- Register as a **Platform Partner** (not a standard merchant)
- Approval process includes PayPal partner review

### Sandbox Setup
- https://developer.paypal.com/ > My Apps & Credentials
- Create a new **REST API App** in sandbox mode
- Note **Client ID** and **Secret**
- Enable Partner Referrals API scope

### Environment Variables
```env
PAYPAL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PAYPAL_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PAYPAL_PARTNER_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PAYPAL_ENVIRONMENT=sandbox
# Change to live for production
```

### Production Checklist
- [ ] Complete PayPal partner review
- [ ] Create live REST API App
- [ ] Switch `PAYPAL_ENVIRONMENT` to `live`
- [ ] Configure PayPal webhooks for `MERCHANT.ONBOARDING.COMPLETED`
- [ ] Webhook URL: `POST https://api.savspot.co/api/payments/webhooks/paypal`

---

## 4. QuickBooks Online (Accounting — Stream E)

### Developer Account
- Create Intuit Developer account at https://developer.intuit.com/
- Create a new app: My Apps > Create an App
- Select **QuickBooks Online and Payments** platform

### OAuth Configuration
- App Settings > Keys & OAuth
- Note **Client ID** and **Client Secret**
- Set redirect URIs:
  - Development: `http://localhost:3001/api/accounting/callback/quickbooks`
  - Production: `https://api.savspot.co/api/accounting/callback/quickbooks`
- Required scopes: `com.intuit.quickbooks.accounting`

### Sandbox
- Use Intuit's sandbox company for testing (auto-created with developer account)

### Environment Variables
```env
QUICKBOOKS_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
QUICKBOOKS_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
QUICKBOOKS_REDIRECT_URI=http://localhost:3001/api/accounting/callback/quickbooks
QUICKBOOKS_ENVIRONMENT=sandbox
# Change to production for live
```

### Production Checklist
- [ ] Submit app for Intuit review
- [ ] Update redirect URI to production URL
- [ ] Switch `QUICKBOOKS_ENVIRONMENT` to `production`

---

## 5. Xero (Accounting — Stream E)

### Developer Account
- Create Xero Developer account at https://developer.xero.com/
- My Apps > New App
- Select **Web App** type

### OAuth Configuration
- App Settings
- Note **Client ID** and **Client Secret**
- Set redirect URIs:
  - Development: `http://localhost:3001/api/accounting/callback/xero`
  - Production: `https://api.savspot.co/api/accounting/callback/xero`
- Required scopes: `accounting.transactions`, `accounting.contacts`, `accounting.settings`

### Environment Variables
```env
XERO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
XERO_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
XERO_REDIRECT_URI=http://localhost:3001/api/accounting/callback/xero
```

### Production Checklist
- [ ] Submit app for Xero App Partner certification (optional but recommended)
- [ ] Update redirect URI to production URL

---

## 6. Expo / EAS (Mobile App — Stream B)

### Account Setup
- Create Expo account at https://expo.dev/
- Install EAS CLI: `npm install -g eas-cli`
- Login: `eas login`

### Push Notifications
- Expo Dashboard > Project Settings > Push Notifications
- Generate **Expo Access Token** for server-side push delivery
- No per-tenant Firebase/APNs setup required (Expo handles transparently)

### EAS Build Configuration
- Run `eas build:configure` in `apps/mobile/` after project setup
- This generates `eas.json` with build profiles

### Environment Variables
```env
EXPO_ACCESS_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### App Store Accounts (for distribution)

#### Apple (iOS)
- Apple Developer Program membership ($99/year): https://developer.apple.com/programs/
- App Store Connect: https://appstoreconnect.apple.com/
- Create App ID for `co.savspot.mobile`
- Configure push notification capability
- Note **Apple Team ID**, **ASC App ID**

#### Google (Android)
- Google Play Console ($25 one-time): https://play.google.com/console/
- Create app listing
- Generate service account key for automated uploads
- Save `google-services.json` to `apps/mobile/`

### Universal Links / App Links

#### iOS (Apple App Site Association)
Deploy to `https://savspot.co/.well-known/apple-app-site-association`:
```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAMID.co.savspot.mobile",
        "paths": ["/business/*", "/booking/*", "/book/*", "/portal", "/messages"]
      }
    ]
  }
}
```

#### Android (Asset Links)
Deploy to `https://savspot.co/.well-known/assetlinks.json`:
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "co.savspot.mobile",
    "sha256_cert_fingerprints": ["SHA256_FINGERPRINT_HERE"]
  }
}]
```

---

## 7. Exchange Rate API (Multi-Currency — Stream I)

### Provider Options

**Option A: Open Exchange Rates** (recommended)
- Sign up at https://openexchangerates.org/
- Free tier: 1,000 requests/month (sufficient for hourly updates)
- Paid tier: $12/month for 10,000 requests/month

**Option B: exchangerate.host**
- Free, no API key required for basic usage
- Less reliable uptime than Option A

### Environment Variables
```env
EXCHANGE_RATE_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EXCHANGE_RATE_PROVIDER=openexchangerates
```

---

## 8. Voice AI Provider (Voice Receptionist — Stream G)

### Development (Local)
- Already configured: Ollama running locally with `qwen3-coder-next`
- No additional setup needed for development

### Production Options

**Option A: Claude API** (recommended)
- https://console.anthropic.com/
- Create API key
- Recommended model: `claude-sonnet-4-6` (fast, cost-effective for voice)

**Option B: OpenAI API**
- https://platform.openai.com/
- Create API key
- Recommended model: `gpt-4o-mini`

### Environment Variables
```env
VOICE_AI_PROVIDER=claude          # claude, openai, or ollama
VOICE_AI_API_KEY=sk-ant-xxxxxxxx  # Not needed for ollama
VOICE_AI_MODEL=claude-sonnet-4-6
VOICE_AI_TEMPERATURE=0.7
VOICE_AI_MAX_TOKENS=256
VOICE_AI_TIMEOUT_SECONDS=10
```

---

## 9. Encryption Keys

### Transcript Encryption Key (Voice)
Generate a 32-byte hex key for AES-256-GCM encryption of voice transcripts:

```bash
openssl rand -hex 32
```

### Environment Variable
```env
TRANSCRIPT_ENCRYPTION_KEY=<generated-64-char-hex-string>
```

---

## 10. Feature Flags

All Phase 3 features are gated behind environment-variable-driven feature flags. Set to `true` to enable:

```env
FEATURE_WORKFLOW_BUILDER=false
FEATURE_PAYMENT_ADYEN=false
FEATURE_PAYMENT_PAYPAL=false
FEATURE_ACCOUNTING=false
FEATURE_VOICE=false
FEATURE_ADVANCED_ANALYTICS=false
FEATURE_MULTI_CURRENCY=false
```

Gradual rollout strategy:
1. **Internal testing**: all flags `true` in staging
2. **Beta**: selective flags in production
3. **GA**: all flags `true` in production

---

## 11. Public API Rate Limit Configuration

Optional tuning (defaults are in code):

```env
PUBLIC_API_RATE_LIMIT_UNAUTH=30
PUBLIC_API_RATE_LIMIT_AUTH=1000
PUBLIC_API_DISCOVERY_RATE_LIMIT=30
```

---

## Summary Checklist

| Service | Required For | Priority | Estimated Setup Time |
|---------|-------------|----------|---------------------|
| Twilio | Voice Receptionist | Tier 3 | 1 hour |
| Adyen | Payment Provider | Tier 2 | 1-2 weeks (approval) |
| PayPal | Payment Provider | Tier 2 | 1-2 weeks (approval) |
| QuickBooks | Accounting | Tier 3 | 2 hours |
| Xero | Accounting | Tier 3 | 2 hours |
| Expo/EAS | Mobile App | Tier 1 | 1 hour |
| Apple Developer | iOS Distribution | Tier 1 | 1-2 days (approval) |
| Google Play | Android Distribution | Tier 1 | 1 day |
| Exchange Rate API | Multi-Currency | Tier 3 | 15 minutes |
| Voice AI API Key | Voice (production) | Tier 3 | 15 minutes |
| Encryption Key | Voice Transcripts | Tier 3 | 1 minute |

**Note:** All code implementations use mock/stub providers for development and testing. These manual configurations are only needed for staging/production deployment.
