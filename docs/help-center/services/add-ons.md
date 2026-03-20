# Add-Ons

Add-ons let you offer optional extras that clients can include when booking a service. They are managed on a separate page per service.

## Accessing Add-Ons

1. Navigate to **Services** (`/services`).
2. Click on a service to open its detail page.
3. Click **Manage Add-ons** (package icon) in the top right, or go directly to `/services/[id]/addons`.

## Creating an Add-On

1. Click **Create Add-on** (plus icon).
2. Fill in the dialog fields:

| Field | Required | Details |
|-------|----------|---------|
| **Name** | Yes | What the add-on is called (e.g., "Deep Conditioning Treatment") |
| **Price ($)** | Yes | Additional cost in major currency units (e.g., 15.00). Minimum 0 |
| **Duration in minutes** | No | Extra time added to the appointment. Leave empty if no extra time |
| **Active** | — | Toggle switch, enabled by default |

3. Click **Create Add-on**.

## Managing Add-Ons

The add-ons page displays a table with the following columns:

| Column | Description |
|--------|-------------|
| **Name** | Add-on name |
| **Price** | Price in dollars |
| **Duration** | Extra minutes, if set |
| **Status** | Active (green badge) or Inactive (gray badge) |
| **Actions** | Menu with Edit and Deactivate options |

### Editing an Add-On

Click the actions menu (three dots) on the add-on row and select **Edit**. Update the fields in the dialog and click **Update Add-on**.

### Deactivating an Add-On

Click the actions menu and select **Deactivate**. A confirmation dialog appears. Deactivated add-ons are no longer shown to clients during booking.

## How Add-Ons Appear in Booking

When a client selects a service that has active add-ons, an **Add-Ons** step appears in the booking flow. Each add-on shows its name and price. Clients can select multiple add-ons. The total price and appointment duration update based on selections.

> **Tip:** Keep add-on names short and descriptive. Clients make quick decisions during booking, so clarity helps conversion.
