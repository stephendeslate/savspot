# Stripe Connect Setup

SavSpot uses **Stripe Connect Express** to process payments. This guide walks you through connecting your Stripe account.

## Connection States

Your Stripe integration can be in one of three states:

| State | What You See |
|-------|-------------|
| **Not Connected** | A "Connect with Stripe" button and description of the payment feature |
| **Incomplete** | A "Complete Setup" button — you started onboarding but haven't finished |
| **Connected** | A green "Connected" badge, account status indicators, and management options |

## Connecting Your Account

1. Navigate to **Settings > Payments** (`/settings/payments`).
2. Click **Connect with Stripe**.
3. You'll be redirected to Stripe's onboarding flow to:
   - Verify your identity
   - Provide your business details
   - Add a bank account for payouts
4. After completing the Stripe flow, you're redirected back to SavSpot.

If you leave the onboarding flow before finishing, click **Complete Setup** to resume where you left off.

## Once Connected

When your Stripe account is active, the Payments settings page shows:

- **Connected** badge (green)
- **Account Status** indicators: Details Submitted, Charges Enabled, Payouts Enabled
- **Open Stripe Dashboard** button — access your full Stripe account for payout management, refunds, and dispute handling

## Processing Fees

SavSpot charges a **1% processing fee** on each transaction in addition to Stripe's standard processing fees. This fee is automatically deducted from each payment.

## Disconnecting

To disconnect your Stripe account, contact SavSpot support. Disconnecting is not available as a self-service action to prevent accidental disruption of active payment processing.

> **Tip:** Complete the Stripe onboarding in one session if possible. If you need to pause, you can always return and click "Complete Setup" to finish.
