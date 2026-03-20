# Supported Formats

Prepare your data files correctly to ensure a smooth import into SavSpot.

## Accepted File Formats

| Format | Extension | Notes |
|--------|-----------|-------|
| **CSV** | `.csv` | Comma-separated values. Must use UTF-8 encoding. |
| **Excel** | `.xlsx` | Microsoft Excel format. Only the first sheet is read. |

## File Requirements

- **Encoding** — Files must be saved with UTF-8 encoding. Non-UTF-8 files may produce garbled characters for names with accents or special characters.
- **Size limit** — Maximum file size is 10MB per upload. For larger datasets, split your file into multiple parts and import them sequentially.
- **Header row** — The first row of your file must contain column headers. SavSpot uses these headers to suggest field mappings during the import process.

## Column Requirements by Data Type

### Clients

| Column | Required | Format | Example |
|--------|----------|--------|---------|
| `email` | Yes | Valid email address | `jane@example.com` |
| `first_name` | Yes | Text | `Jane` |
| `last_name` | Yes | Text | `Smith` |
| `phone` | No | E.164 or local format | `+15551234567` |
| `notes` | No | Text | `Prefers afternoon appointments` |

### Services

| Column | Required | Format | Example |
|--------|----------|--------|---------|
| `name` | Yes | Text | `Haircut` |
| `duration` | Yes | Minutes (integer) | `30` |
| `price` | Yes | Decimal (major units) | `45.00` |
| `description` | No | Text | `Standard haircut and styling` |
| `category` | No | Text | `Hair` |

### Bookings

| Column | Required | Format | Example |
|--------|----------|--------|---------|
| `client_email` | Yes | Valid email (must match existing client) | `jane@example.com` |
| `service_name` | Yes | Text (must match existing service) | `Haircut` |
| `date` | Yes | `YYYY-MM-DD` | `2026-03-15` |
| `time` | Yes | `HH:MM` (24-hour) | `14:30` |
| `status` | No | `confirmed`, `completed`, `cancelled` | `completed` |
| `notes` | No | Text | `Arrived 5 minutes early` |

## Template Downloads

SavSpot provides pre-formatted template files for each data type. Download them from the **Imports** page by clicking **Download Template** next to the data type you want to import. Templates include the correct headers and a sample row to guide formatting.

> **Tip:** Open your CSV in a plain text editor before importing to verify the encoding is UTF-8. Spreadsheet applications sometimes save CSV files in a different encoding by default.
