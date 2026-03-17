# ADR-0007: Stripe Connect with Destination Charges

## Status

Accepted

## Context

SavSpot is a marketplace-style platform where customers pay businesses for services. The platform collects a fee on each transaction. Stripe Connect offers several charge models:

1. **Direct charges** — created on the connected account, platform has limited visibility
2. **Destination charges** — created on the platform account, funds transferred to connected account
3. **Separate charges and transfers** — most flexible but most complex

Key requirements:
- Platform must collect an application fee on each booking payment
- Businesses should see payments in their Stripe dashboard
- Refunds should be handled from the platform level
- The platform needs full visibility into payment disputes

## Decision

Use **Stripe Connect Express** accounts with **destination charges** and `application_fee_amount`:

- The platform creates the PaymentIntent on its own account with `transfer_data.destination` set to the business's connected account
- `application_fee_amount` specifies the platform's take (based on the business's subscription tier)
- The business receives the payment minus the application fee in their connected account
- Refunds and disputes are managed from the platform account

## Consequences

**Positive:**
- Platform has full control over the payment lifecycle — can issue refunds, handle disputes, and adjust fees
- Businesses see incoming transfers in their Stripe Express dashboard without needing to understand the charge model
- Application fee is deducted atomically — no separate transfer step needed
- Express accounts have a streamlined onboarding flow managed by Stripe

**Negative:**
- The platform is the merchant of record — it is responsible for disputes and compliance
- Destination charges have a single-destination limitation — can't split a payment across multiple businesses in one charge
- Application fee changes require updating the charge creation logic, not just a Stripe dashboard setting
- Express accounts offer limited customization compared to Custom accounts — businesses can't fully brand their Stripe experience
