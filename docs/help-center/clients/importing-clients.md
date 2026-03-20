# Importing Clients

The Imports page at `/imports` provides a read-only view of data import jobs. It shows the status and results of import operations.

## Viewing Import Jobs

Navigate to **Imports** in the sidebar, or go directly to `/imports`.

### Status Tabs

Filter import jobs by status using the tabs at the top:

| Tab | Description |
|-----|-------------|
| **All** | All import jobs |
| **Pending** | Jobs waiting to be processed |
| **Processing** | Jobs currently being processed |
| **Completed** | Successfully finished jobs |
| **Failed** | Jobs that encountered errors |

### Import Job Table

| Column | Description |
|--------|-------------|
| **Import Type** | The type of data being imported |
| **Source Platform** | Where the data came from |
| **Status** | Status badge (Pending/Processing/Completed/Failed) |
| **Records** | Processed count / Total count (e.g., "45 / 50") |
| **Errors** | Number of errors (red text if > 0) |
| **Date** | When the import was created |

Click any row to expand a detail panel showing progress information.

### Error Reports

If an import has errors, click **View Errors** to open the error report dialog. Each error shows the row number, field name, and error message.

## Supported Formats

SavSpot supports importing data in two formats:

| Format | Description |
|--------|-------------|
| **CSV** | Comma-separated values with a header row |
| **JSON** | JSON array of records |

## Current Limitations

The Imports page is currently a read-only monitoring view for tracking import job status. Import jobs are initiated through the API or other integration channels rather than through a file upload interface on this page.

> **Tip:** If you need to import client data, contact support or use the API to create an import job. See [API Keys](../settings/api-keys.md) for information on API access.
