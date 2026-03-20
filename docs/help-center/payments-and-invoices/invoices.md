# Invoices

The Invoices page at `/invoices` provides a read-only view of all invoices generated through your bookings and payments.

## Viewing Invoices

Navigate to **Invoices** in the sidebar, or go directly to `/invoices`.

### Filters

| Filter | Description |
|--------|-------------|
| **Status** | Filter by invoice status (All, Draft, Sent, Paid, Overdue, Void) |
| **Search** | Search by client name or email |

### Invoice Table

| Column | Description |
|--------|-------------|
| **Invoice #** | Unique invoice number |
| **Client** | Client name |
| **Amount** | Invoice total |
| **Status** | Color-coded status badge |
| **Due Date** | Payment due date |
| **Created** | When the invoice was created |

Results are paginated at 20 invoices per page.

## Invoice Statuses

| Status | Description |
|--------|-------------|
| **Draft** | Invoice created but not yet sent |
| **Sent** | Invoice sent to the client |
| **Paid** | Payment received in full |
| **Overdue** | Past due date without full payment |
| **Void** | Invoice cancelled and no longer valid |

## Current Limitations

The Invoices page is a **read-only monitoring view**. Invoices are automatically generated when bookings with payments are created. You cannot create, send, edit, void, or download invoices from this page.

To manage invoices and issue refunds, use the **Stripe Dashboard** (accessible from Settings > Payments > **Open Stripe Dashboard**).

> **Tip:** Check the Invoices page regularly to monitor overdue payments and follow up with clients as needed.
