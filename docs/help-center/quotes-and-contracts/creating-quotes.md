# Creating Quotes

Quotes let you provide clients with a detailed breakdown of services and pricing before they commit. Manage quotes at `/quotes`.

## Creating a New Quote

1. Navigate to **Quotes** (`/quotes`) and click **Create Quote**.
2. Fill in the quote details:

| Field | Description |
|-------|-------------|
| **Client Email** | Email address of the client receiving the quote |
| **Valid Until** | Expiration date for the quote |
| **Line Items** | One or more items with Description, Quantity, and Unit Price |

3. Click **Add Line Item** to add additional items. Each line item shows a calculated total (Qty × Unit Price).
4. A running total is displayed at the bottom.
5. Click **Create Quote** to save.

## Quote Statuses

| Status | Badge Color | Meaning |
|--------|-------------|---------|
| **Draft** | Gray | Created but not yet sent |
| **Sent** | Blue | Delivered to the client |
| **Accepted** | Green | Client approved the quote |
| **Rejected** | Red | Client declined the quote |
| **Expired** | Gray (muted) | Validity period passed without response |
| **Voided** | — | Quote cancelled by you |

## Quote Table

The quotes list shows all quotes with these columns:

| Column | Description |
|--------|-------------|
| **Quote #** | Unique quote number |
| **Client** | Client name and email |
| **Total** | Quote total amount |
| **Status** | Status badge |
| **Valid Until** | Expiration date |
| **Created** | Creation date |
| **Actions** | Edit, Send, or Void |

## Available Actions

| Action | When Available |
|--------|---------------|
| **Edit** | Any status |
| **Send** | Draft status only |
| **Void** | Any status |

## Current Limitations

There is **no convert-to-booking** feature. Accepted quotes cannot be automatically converted into bookings.

> **Tip:** Set a reasonable validity period (14–30 days) to create urgency without pressuring the client.
