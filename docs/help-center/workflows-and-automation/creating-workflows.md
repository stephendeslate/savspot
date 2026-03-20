# Creating Workflows

Automate actions based on booking events. Manage workflows at **Settings > Workflows** (`/settings/workflows`).

> **Note:** Workflows are restricted to **Admin** and **Owner** roles.

## Creating a Workflow

1. Navigate to `/settings/workflows` and click **Create Workflow**.
2. Fill in the fields:

| Field | Description |
|-------|-------------|
| **Name** | Descriptive name (e.g., "Send confirmation email") |
| **Trigger Event** | The event that starts the workflow (select from dropdown) |
| **Active** | Toggle to enable or disable the workflow |

3. Click **Create Workflow** to save.

## Workflow Table

The workflows list shows all configured workflows:

| Column | Description |
|--------|-------------|
| **Name** | Workflow name |
| **Trigger Event** | The event that triggers this workflow |
| **Actions** | Count badge showing number of configured actions |
| **Status** | Active or Inactive badge (clickable to toggle) |
| **Last Triggered** | When the workflow last ran |
| **Actions** | Edit or Delete |

## Activating and Deactivating

Click the **Active/Inactive** badge on any workflow to toggle it on or off. Active workflows run automatically when their trigger event occurs. Inactive workflows retain their configuration but do not execute.

## Editing and Deleting

- **Edit** — Opens the workflow dialog to change the name, trigger, or active status.
- **Delete** — Shows a confirmation dialog: "Are you sure you want to delete the workflow? This action cannot be undone."

## Current Limitations

The workflow form only configures **name**, **trigger event**, and **active status**. There is no visual workflow builder, no action configuration UI, no condition builder, and no wait/delay settings. The Actions count badge reflects actions configured through the API, not through the web interface.

> **Tip:** Start with simple workflows for your most common events (e.g., Booking Created, Payment Received) and expand as your needs grow.
