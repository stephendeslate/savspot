# Data Export

Export your business data from SavSpot for reporting, backups, or migration purposes.

## What You Can Export

SavSpot supports exporting the following data types:

| Data Type | Includes |
|-----------|----------|
| **Bookings** | Date, time, service, client name, status, payment amount, notes. |
| **Clients** | Name, email, phone, total bookings, last visit, consent status. |
| **Payments** | Amount, date, payment method, associated booking, refund status. |
| **Services** | Name, description, duration, price, category, active status. |

## Export Formats

You can export data in two formats:

- **CSV** — Compatible with spreadsheet applications like Excel, Google Sheets, and Numbers. Best for quick analysis and reporting.
- **JSON** — Structured format suitable for developers, integrations, and data migration to other platforms.

## How to Export

1. Go to **Settings > Data Export** in your dashboard.
2. Select the data type you want to export.
3. Choose a date range (for bookings and payments) or export all records.
4. Select your preferred format (CSV or JSON).
5. Click **Export** to generate and download the file.

The export is generated in the background. For large datasets, you will receive an email notification with a download link when the file is ready.

## Scheduled Exports

You can configure automatic recurring exports:

1. Go to **Settings > Data Export > Scheduled Exports**.
2. Click **Add Schedule**.
3. Select the data type, format, and frequency (daily, weekly, or monthly).
4. Enter the email address where export files should be delivered.
5. Click **Save Schedule**.

Scheduled exports run at the start of each period and include all records from the previous period.

> **Tip:** Use scheduled weekly CSV exports of bookings and payments to keep your accounting records up to date without manual effort.
