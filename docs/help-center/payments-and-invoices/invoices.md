# Invoices

SavSpot lets you create and send professional invoices to your clients. Use invoices to bill for services rendered, track payment status, and maintain financial records for your business.

## Creating an Invoice

1. Navigate to **Invoices** (`/invoices`).
2. Click **Create Invoice**.
3. Select the client from your client list.
4. Add line items with descriptions, quantities, and prices.
5. Apply any applicable tax rates.
6. Review the totals and save the invoice.

> **Tip:** Invoices created from completed bookings will automatically populate with the service details and pricing.

## Invoice Fields

Each invoice includes the following information:

| Field | Description |
|---|---|
| Invoice number | Auto-generated unique identifier |
| Client | The client being billed |
| Line items | Individual services or products with quantity and price |
| Subtotal | Sum of all line items before tax |
| Tax | Calculated from applied tax rates |
| Total | Final amount due including tax |
| Due date | When payment is expected |
| Notes | Optional notes or terms for the client |

## Sending Invoices

Once an invoice is ready, you can send it directly to your client:

1. Open the invoice from the **Invoices** page.
2. Click **Send Invoice**.
3. The client receives an email with the invoice details and a link to pay online.

Clients can view and pay the invoice through a secure payment page powered by Stripe.

## Invoice Statuses

Invoices progress through the following statuses:

| Status | Description |
|---|---|
| **Draft** | Invoice is being prepared and has not been sent |
| **Sent** | Invoice has been emailed to the client |
| **Paid** | Client has completed payment |
| **Overdue** | Payment due date has passed without payment |

> **Tip:** Keep an eye on overdue invoices and follow up promptly. You can re-send an invoice reminder directly from the invoice detail page.

## Managing Invoices

From the **Invoices** page you can:

- Filter invoices by status, client, or date range
- View payment history for each invoice
- Download invoices as PDF for your records
- Void an invoice that is no longer needed
