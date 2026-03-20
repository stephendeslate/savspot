# Supported Formats

SavSpot supports importing data in two formats.

## Accepted File Formats

| Format | Description |
|--------|-------------|
| **CSV** | Comma-separated values with a header row. Must use UTF-8 encoding. |
| **JSON** | JSON array of records. Each record is an object with field names as keys. |

> **Note:** XLSX (Excel) format is **not supported**. Convert Excel files to CSV before importing.

## Format Details

### CSV

- First row must contain column headers.
- Use UTF-8 encoding to avoid issues with special characters.
- Fields containing commas should be enclosed in double quotes.

### JSON

- File must contain a JSON array of objects.
- Each object represents one record.
- Field names should match the expected import fields.

Example:
```json
[
  { "email": "jane@example.com", "first_name": "Jane", "last_name": "Smith" },
  { "email": "john@example.com", "first_name": "John", "last_name": "Doe" }
]
```

## Current Limitations

There is no file upload interface in the web app. Import jobs are initiated through the API, and the Imports page (`/imports`) provides a read-only view of job status and results.

> **Tip:** If you're migrating from another platform, export your data as CSV and use the API to create an import job. See [API Keys](../settings/api-keys.md) for API access details.
