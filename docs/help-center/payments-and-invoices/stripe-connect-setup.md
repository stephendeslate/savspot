# Stripe Connect Setup

SavSpot uses Stripe Connect Express to process payments on behalf of your business. This guide walks you through connecting your Stripe account so you can start accepting payments from clients.

## Prerequisites

Before you begin, make sure you have:

- An active SavSpot account with the **Owner** or **Admin** role
- Your business details (legal name, address, tax ID)
- A bank account for receiving payouts

## Connecting Your Stripe Account

1. Navigate to **Settings > Payments** (`/settings/payments`).
2. Click **Connect with Stripe**.
3. You will be redirected to the Stripe Connect Express onboarding flow.
4. Fill in your business information, including legal entity type, address, and tax identification number.
5. Provide your bank account details for payouts.
6. Review and accept the Stripe terms of service.
7. Once complete, you will be redirected back to SavSpot.

> **Tip:** Have your business documents ready before starting. The onboarding flow cannot be saved as a draft, though you can resume an incomplete onboarding later.

## Verification Requirements

Stripe may require additional verification depending on your business type and location. Common requirements include:

| Document | When Required |
|---|---|
| Government-issued ID | All accounts |
| Proof of address | Some regions |
| Business registration | Registered businesses |
| Tax ID (EIN/SSN) | US-based accounts |

Stripe will notify you via email if additional documents are needed. You can upload them directly through the Stripe dashboard.

## Managing Your Connection

After connecting, the Payments settings page will display:

- **Connection status** -- whether your account is active and verified
- **Stripe Dashboard link** -- direct access to your Stripe Express dashboard for viewing payouts, balance, and transaction history
- **Disconnect option** -- remove the Stripe connection (requires Owner role)

> **Tip:** Visit your Stripe Dashboard regularly to review payout schedules and ensure your bank account details are current.

## Troubleshooting

If your connection fails or verification is pending:

1. Check your email for messages from Stripe requesting additional information.
2. Return to `/settings/payments` and click **Resume Setup** to complete any missing steps.
3. Contact SavSpot support if the issue persists after providing all requested documents.
