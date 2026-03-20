# Accepting Payments

SavSpot handles payment processing through Stripe Connect, allowing you to collect payments from clients seamlessly during the booking process or after a service is completed.

## How Payments Work

When a client makes a payment through SavSpot, the transaction flows through Stripe Connect Express using destination charges. The payment is collected from the client, SavSpot's platform fee is deducted automatically, and the remaining amount is deposited into your connected Stripe account.

All prices in SavSpot are stored and displayed in major currency units (dollars, euros, etc.). Conversion to the smallest currency unit (cents) happens only at the Stripe processing boundary, ensuring consistent and accurate pricing throughout the platform.

## Payment Collection Options

You can configure when payments are collected for your services:

| Option | Description |
|---|---|
| Pay at booking | Client pays the full amount when confirming their booking |
| Pay after service | Payment is collected after the service is delivered |
| Deposit at booking | A partial payment is collected upfront, with the balance due later |

Configure your default payment collection method in **Settings > Payments** (`/settings/payments`).

## Supported Payment Methods

SavSpot supports the payment methods available through your Stripe account, which typically include:

- Credit and debit cards (Visa, Mastercard, American Express, Discover)
- Digital wallets (Apple Pay, Google Pay) where available
- Bank transfers (availability varies by region)

> **Tip:** The available payment methods depend on your Stripe account configuration and your client's location. Visit your Stripe Dashboard to enable or disable specific payment methods.

## Payment Confirmation

When a payment is successfully processed:

1. The client receives an email confirmation with a receipt.
2. The booking status is updated to reflect the payment.
3. The transaction appears in your **Invoices** section (`/invoices`).
4. Funds are deposited to your bank account according to your Stripe payout schedule.

> **Tip:** If a payment fails, the client is prompted to retry with a different payment method. You will be notified of any failed payment attempts.
