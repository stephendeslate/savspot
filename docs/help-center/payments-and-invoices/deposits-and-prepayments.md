# Deposits and Prepayments

Deposits allow you to collect a partial payment at booking time, with the remaining balance due later. Deposits are configured **per service**, not as a global setting.

## Configuring Deposits

1. Navigate to **Services** (`/services`) and click on a service.
2. In the service edit form, expand the **Advanced Settings** section.
3. Configure the deposit settings:

3. In the **Deposit Config (JSON)** field, enter your deposit configuration:

```json
{"required": true, "type": "PERCENTAGE", "percentageOrCents": 50}
```

| Property | Description |
|----------|-------------|
| **required** | `true` to enable deposit collection |
| **type** | `PERCENTAGE` (percentage of total) or `FIXED` (flat amount in cents) |
| **percentageOrCents** | The percentage value or amount in cents |

4. Click **Create Service** or **Save** to apply.

## How Deposits Work

When a client books a service with a deposit configured:

1. The **Payment** step in the booking flow shows the deposit amount (not the full price).
2. The client pays only the deposit at booking time.
3. The remaining balance is tracked on the invoice.

## Example

For a $100 service with a 25% deposit:

- **At booking:** Client pays $25
- **Remaining balance:** $75 (tracked on the invoice)

## Services Without Deposits

If no deposit is configured on a service, the client pays the **full amount** during the booking flow (when Stripe is connected and the price is greater than $0).

> **Tip:** Deposits work well for high-value services where you want to secure a commitment without requiring full upfront payment.
