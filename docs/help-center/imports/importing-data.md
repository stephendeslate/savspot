# Importing Data

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
| **Errors** | Number of errors (red if > 0) |
| **Date** | When the import was created |
| **Actions** | View errors (if any) |

Results are paginated at 20 jobs per page.

### Job Detail Panel

Click any row to expand a detail panel showing:

- Import type and source platform
- Current status
- Start time
- Progress bar (processed records / total records)
- Completion date (if finished)
- **View Errors** button (if errors exist)

### Error Reports

If an import has errors, click **View Errors** to open the error report dialog. Each error shows the row number, field name badge, and error message.

## Current Limitations

The Imports page is a **read-only monitoring view**. There is no file upload interface — import jobs are initiated through the API or other integration channels.

> **Tip:** If you need to import client data, use the API to create an import job. See [API Keys](../settings/api-keys.md) for information on API access.
