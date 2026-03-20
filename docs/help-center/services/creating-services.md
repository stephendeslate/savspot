# Creating Services

Services are the foundation of your SavSpot booking page. Each service represents an offering that clients can book.

## Getting Started

1. Navigate to **Services** (`/services`).
2. Click **Add Service** (plus icon) in the top right. This takes you to `/services/new`.
3. Fill in the form fields described below.
4. Click **Create Service**.

## Basic Information

| Field | Required | Details |
|-------|----------|---------|
| **Service Name** | Yes | The public-facing name (minimum 2 characters). Example: "60-Minute Massage" |
| **Description** | No | A short summary shown to clients during booking |
| **Duration (minutes)** | Yes | How long the service takes (5–480 minutes). Defaults to 60 |
| **Base Price** | Yes | The cost in major currency units (e.g., 50.00 for $50) |
| **Currency** | Yes | USD, EUR, GBP, CAD, AUD, or JPY |
| **Pricing Model** | Yes | How the service is priced (see [Pricing Models](./pricing-models.md)) |
| **Confirmation Mode** | Yes | Auto-confirm or Manual Review (see [Confirmation Modes](../booking-management/confirmation-modes.md)) |

## Advanced Settings

Click the **Advanced Settings** header to expand additional options:

| Field | Description |
|-------|-------------|
| **Buffer Before (minutes)** | Preparation time blocked before each booking |
| **Buffer After (minutes)** | Cleanup time blocked after each booking |
| **Guest Config (JSON)** | Configure guest options, e.g., `{"maxGuests": 5, "guestPriceCents": 2000}` |
| **Tier Config (JSON)** | Define tiers for tiered pricing, e.g., `[{"name": "VIP", "priceCents": 10000}]` |
| **Deposit Config (JSON)** | Set deposit requirements, e.g., `{"required": true, "percentageOrCents": 50, "type": "PERCENTAGE"}` |
| **Cancellation Policy (JSON)** | Define cancellation terms, e.g., `{"freeCancellationHours": 24, "penaltyPercentage": 50}` |

> **Tip:** Start with just the basic information. You can always edit the service later to add advanced settings.

## After Creating a Service

Once created, you can:

- **Assign providers** — Click **Manage Providers** on the service detail page to link team members who can deliver the service
- **Add add-ons** — Click **Manage Add-ons** to create optional extras clients can select during booking
- **Edit the service** — Click on the service in the list to update any field
- **Deactivate** — Click the Deactivate button to hide the service from your booking page

## Service List

The services page at `/services` shows all your services in a table with columns: Name, Duration, Price, Status, and Actions (Edit, Deactivate). Complexity badges appear under the service name to indicate features like Hourly, Tiered, Custom, Groups, Deposit, or Form.
