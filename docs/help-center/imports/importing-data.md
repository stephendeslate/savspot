# Importing Data

Bring your existing client lists, services, and booking history into SavSpot using the import tool.

## Supported Data Types

You can import the following types of data:

| Data Type | What Gets Imported |
|-----------|--------------------|
| **Clients** | Name, email, phone number, and custom fields. |
| **Services** | Name, description, duration, price, and category. |
| **Bookings** | Date, time, service, client, status, and notes (requires matching clients and services). |

## Step-by-Step Import Process

1. **Navigate to imports** — Go to **Imports** (`/imports`) in your dashboard.
2. **Select data type** — Choose what you are importing (clients, services, or bookings).
3. **Upload your file** — Drag and drop or click to select a CSV or XLSX file from your computer.
4. **Map columns** — SavSpot reads your file headers and asks you to map each column to a SavSpot field. Common column names are matched automatically; adjust any that were not detected correctly.
5. **Preview** — Review the first 10 rows of mapped data. SavSpot highlights any rows with validation errors (missing required fields, invalid formats).
6. **Confirm** — Click **Start Import** to process the file. A progress bar shows the import status.

When the import finishes, you will see a summary showing the number of records created, skipped, and failed.

## Handling Errors

If rows fail validation during import:

- **Missing required fields** — The row is skipped. Add the missing data to your file and re-import only the failed rows.
- **Duplicate records** — Clients with matching email addresses are flagged as duplicates. You can choose to skip duplicates or update existing records with the new data.
- **Invalid format** — Values that do not match the expected format (such as a non-numeric price) are highlighted in the preview step so you can correct them before confirming.

After import, download the error report from the import summary to see exactly which rows failed and why.

> **Tip:** Import clients first, then services, then bookings. Booking imports rely on matching client emails and service names, so those records must exist before bookings can be linked correctly.
