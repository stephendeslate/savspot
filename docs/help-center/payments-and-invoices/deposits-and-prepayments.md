# Deposits and Prepayments

Deposits allow you to collect a partial payment from clients when they book a service, with the remaining balance due at a later time. This helps reduce no-shows and secures commitment from clients.

## Setting Up Deposits

1. Navigate to **Settings > Payments** (`/settings/payments`).
2. Enable the **Require Deposit** option.
3. Choose a deposit type and amount.
4. Save your changes.

### Deposit Types

| Type | Description | Example |
|---|---|---|
| Fixed amount | A specific dollar amount collected upfront | $25.00 deposit on a $100.00 service |
| Percentage | A percentage of the service total | 25% deposit on a $100.00 service = $25.00 |

> **Tip:** A percentage-based deposit works well when your services vary in price, since the deposit amount scales automatically with the service cost.

## When Deposits Are Charged

Deposits are charged at the time of booking confirmation. The flow works as follows:

1. The client selects a service and time slot.
2. At checkout, the deposit amount is displayed alongside the total service price.
3. The client enters their payment details and confirms the booking.
4. The deposit is charged immediately through Stripe.
5. The remaining balance is collected according to your payment settings (at the appointment or via invoice).

## Deposit Policies

Consider establishing clear deposit policies for your clients:

- **Cancellation window** -- Define how far in advance a client must cancel to receive a deposit refund.
- **No-show policy** -- Specify whether deposits are forfeited if a client does not show up.
- **Rescheduling** -- Decide if deposits transfer to a rescheduled appointment.

> **Tip:** Communicate your deposit policy clearly during the booking process. Clients are more likely to honor appointments when they understand the terms upfront.

## Viewing Deposit Transactions

All deposit transactions appear in your **Invoices** section (`/invoices`). Each invoice shows:

- The deposit amount collected
- The remaining balance
- The payment status (partial or fully paid)

You can also track deposit activity in your Stripe Dashboard for detailed transaction records and payout information.
