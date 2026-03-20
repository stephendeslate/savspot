# Importing Clients

If you are migrating from another booking system or have an existing client list, you can bulk import clients from a CSV file. This saves you from adding each client manually.

## Preparing Your CSV File

Your CSV file must include a header row with column names. SavSpot uses the headers to map each column to the correct client field.

### Required Fields

| Column Header | Description |
|---------------|-------------|
| **name** | Client's full name. Can be a single column or split into `first_name` and `last_name`. |
| **email** | Client's email address. Must be unique across your client directory. |

### Optional Fields

| Column Header | Description |
|---------------|-------------|
| **phone** | Phone number in any format. SavSpot normalizes formatting on import. |
| **notes** | A note to attach to the client's profile. |

### Example CSV

```
name,email,phone,notes
Jane Smith,jane@example.com,555-0101,Prefers afternoon appointments
Alex Johnson,alex@example.com,555-0102,
Maria Garcia,maria@example.com,,Referred by Jane Smith
```

## Importing the File

1. Navigate to **Imports**, or go directly to `/imports`.
2. Click **Import Clients**.
3. Select your CSV file or drag it into the upload area.
4. Review the column mapping. SavSpot auto-detects columns based on header names. Adjust any incorrect mappings manually.
5. Click **Start Import**.

SavSpot processes the file and displays a summary when complete, including how many clients were created, skipped, or flagged with errors.

## Handling Duplicates

SavSpot checks for duplicate clients by email address during import. If a row in your CSV matches an existing client's email, that row is skipped. The import summary lists all skipped rows so you can review them.

| Scenario | Result |
|----------|--------|
| New email address | Client created |
| Email matches existing client | Row skipped, listed in summary |
| Missing email | Row rejected with error |
| Invalid email format | Row rejected with error |

> **Tip:** Clean your CSV before importing. Remove duplicate rows and fix formatting issues to minimize skipped records and errors.

> **Tip:** Run a small test import with 5-10 rows first to verify that your column mapping is correct before importing your full client list.
