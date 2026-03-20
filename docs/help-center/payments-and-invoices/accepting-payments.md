# Accepting Payments

SavSpot uses **Stripe Connect** to process payments for your bookings. Once connected, clients can pay by card during the booking flow.

## How Payments Work

SavSpot uses Stripe's **destination charges** model:

1. The client pays during the booking flow (if the service has a price > $0).
2. Stripe processes the payment and deposits funds into your connected Stripe account.
3. SavSpot applies a **1% processing fee** on each transaction (in addition to Stripe's standard fees).

## Setting Up Payments

To accept payments, you need to connect a Stripe account:

1. Navigate to **Settings > Payments** (`/settings/payments`).
2. Click **Connect with Stripe**.
3. Complete the Stripe onboarding flow (identity verification, bank account, etc.).

See [Stripe Connect Setup](./stripe-connect-setup.md) for the full connection walkthrough.

## When Clients Pay

Clients are prompted to pay during the booking flow when:

- The selected service has a **price greater than $0**
- Your Stripe account is **connected and active**

If either condition is not met, the payment step is skipped and the booking is created without payment.

## Deposit Payments

You can require a deposit instead of full payment at booking time. Deposits are configured **per service** in the service's Advanced Settings section, not as a global payment setting.

See [Deposits and Prepayments](./deposits-and-prepayments.md) for details.

## Viewing Payment Activity

- **Invoices** (`/invoices`) — View all invoices and their statuses
- **Client Profiles** (`/clients/{id}`) — See a client's payment history
- **Stripe Dashboard** — Access your full Stripe account from Settings > Payments by clicking **Open Stripe Dashboard**

> **Tip:** Encourage clients to pay during the booking flow to reduce no-shows and simplify your accounting.
