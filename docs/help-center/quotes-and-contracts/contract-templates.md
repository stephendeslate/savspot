# Contract Templates

When creating a contract, you can optionally select a template to pre-fill the contract content. Templates are managed through the API and are available as a dropdown when creating or editing contracts.

## Using Templates

1. Navigate to **Contracts** (`/contracts`) and click **Create Contract**.
2. In the create dialog, select a template from the **Template** dropdown (or choose "No template").
3. The contract content textarea is pre-filled with the template text.
4. Edit the content as needed for this specific client.
5. Click **Create Contract** to save.

## Creating a Contract

The contract creation dialog has the following fields:

| Field | Description |
|-------|-------------|
| **Name** | Contract name (e.g., "Service Agreement") |
| **Client Email** | Email address of the client |
| **Template** | Optional template to pre-fill content |
| **Content** | Contract text (textarea editor) |

## Contract Statuses

| Status | Badge Color | Meaning |
|--------|-------------|---------|
| **Draft** | Gray | Created but not sent |
| **Sent** | Blue | Sent to the client |
| **Signed** | Green | Client has signed the contract |
| **Voided** | Red | Contract cancelled |

## Contract Table

| Column | Description |
|--------|-------------|
| **Name** | Contract name |
| **Client** | Client name and email |
| **Template** | Template used (if any) |
| **Status** | Status badge |
| **Created** | Creation date |
| **Signed Date** | When the client signed (if signed) |
| **Actions** | Edit, Send, or Void |

## Available Actions

| Action | When Available |
|--------|---------------|
| **Edit** | Draft status |
| **Send** | Draft status |
| **Void** | Sent or Signed status |

> **Tip:** Keep a small library of focused templates for different agreement types. This saves time and ensures consistency across your client contracts.
