# Setting Up Your First Service

Services are the foundation of your SavSpot booking page. Each service represents an offering that clients can book. This guide walks you through creating your first service.

## Creating a Service

1. Navigate to **Services** in the sidebar, or go directly to `/services`.
2. Click **Add Service** in the top-right corner to go to `/services/new`.
3. Fill in the form fields below.
4. Click **Create Service** to save.

## Basic Information

| Field | Required | Details |
|-------|----------|---------|
| **Service Name** | Yes | The public-facing name (minimum 2 characters). Example: "60-Minute Massage" |
| **Description** | No | A short summary shown to clients during booking |
| **Duration (minutes)** | Yes | How long the service takes (5--480 minutes). Defaults to 60 |
| **Base Price** | Yes | The cost of the service in major currency units (e.g., 50.00 for $50) |
| **Currency** | Yes | USD, EUR, GBP, CAD, AUD, or JPY. Defaults to USD |
| **Pricing Model** | Yes | How the service is priced (see below) |
| **Confirmation Mode** | Yes | Auto-confirm or Manual Review |

### Pricing Models

| Model | Description |
|-------|-------------|
| **Fixed Price** | A single flat rate for the service |
| **Hourly Rate** | Price calculated based on duration |
| **Tiered Pricing** | Multiple price tiers configured via Tier Config in Advanced Settings |
| **Free** | No charge for the service |

### Confirmation Modes

| Mode | Behavior |
|------|----------|
| **Auto-confirm** | Bookings are immediately confirmed when created |
| **Manual Review** | Bookings are created as PENDING until you manually confirm them |

## Advanced Settings

Click the **Advanced Settings** header to expand additional options:

| Field | Description |
|-------|-------------|
| **Buffer Before (minutes)** | Preparation time blocked before each booking. Prevents back-to-back scheduling |
| **Buffer After (minutes)** | Cleanup time blocked after each booking |
| **Guest Config (JSON)** | Configure guest booking options, e.g., `{"maxGuests": 5, "guestPriceCents": 2000}` |
| **Tier Config (JSON)** | Define pricing tiers for tiered pricing model, e.g., `[{"name": "VIP", "priceCents": 10000}]` |
| **Deposit Config (JSON)** | Set deposit requirements, e.g., `{"required": true, "percentageOrCents": 50, "type": "PERCENTAGE"}` |
| **Cancellation Policy (JSON)** | Define cancellation terms, e.g., `{"freeCancellationHours": 24, "penaltyPercentage": 50}` |

> **Tip:** Start with just the basic information. You can always edit the service later to add advanced settings, assign staff providers, or create add-ons.

## After Creating a Service

Once created, you can:

- **Assign providers** at `/services/[id]/providers` -- Link team members who can deliver the service
- **Add add-ons** at `/services/[id]/addons` -- Create optional extras clients can select during booking
- **Edit the service** at `/services/[id]` -- Update any field at any time
