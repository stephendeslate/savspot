# Refunds and Disputes

Sometimes you need to return funds to a client or respond to a payment dispute. SavSpot provides tools to handle both situations through your Stripe Connect integration.

## Issuing Refunds

You can issue full or partial refunds for any completed payment.

### Full Refund

1. Navigate to **Invoices** (`/invoices`).
2. Find the transaction you want to refund.
3. Click **Refund** and select **Full Refund**.
4. Confirm the refund amount and submit.

### Partial Refund

1. Navigate to **Invoices** (`/invoices`).
2. Find the transaction you want to refund.
3. Click **Refund** and select **Partial Refund**.
4. Enter the amount to refund.
5. Confirm and submit.

> **Tip:** Add a note when issuing a refund so your team has context on why the refund was processed.

## Refund Processing Time

| Payment Method | Refund Timeline |
|---|---|
| Credit card | 5--10 business days |
| Debit card | 5--10 business days |
| Bank transfer | 5--10 business days |
| Digital wallet | 5--10 business days (may vary) |

Refund timing depends on the client's bank or card issuer. The refund is initiated immediately on SavSpot's side, but the client may not see the funds returned right away.

## Handling Stripe Disputes

A dispute (also called a chargeback) occurs when a client contacts their bank to reverse a charge. When this happens:

1. You will receive a notification from SavSpot and Stripe.
2. The disputed amount is temporarily deducted from your Stripe balance.
3. You have a limited window (typically 7--21 days) to respond with evidence.

## Submitting Dispute Evidence

To respond to a dispute:

1. Open the dispute notification in SavSpot or go to your Stripe Dashboard.
2. Review the dispute reason and amount.
3. Gather supporting evidence, such as:
   - Booking confirmation details
   - Service delivery records
   - Client communication history
   - Signed agreements or policies
4. Submit your evidence through the Stripe Dashboard before the deadline.

> **Tip:** The best way to prevent disputes is to maintain clear communication with clients, set transparent cancellation and refund policies, and provide receipts for all transactions. Respond to disputes promptly -- late responses result in automatic losses.
