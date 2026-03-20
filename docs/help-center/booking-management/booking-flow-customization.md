# Booking Flow Customization

SavSpot allows you to customize the client-facing booking experience. The booking flow determines what steps and fields clients see when they schedule an appointment through your public booking page.

## Accessing Flow Settings

1. Navigate to **Settings** in the sidebar
2. Select **Booking Flow** or go directly to `/settings/booking-flow`

## Configurable Steps

The booking flow is composed of steps that clients move through sequentially. You can control which steps appear and what information is collected at each stage.

### Service Selection

Clients choose from your active services. You can control:

- Whether to show service descriptions
- Whether to display prices
- Whether to show estimated durations
- How services are grouped (by category or flat list)

### Client Information

Configure which fields are required, optional, or hidden:

| Field | Options | Default |
|-------|---------|---------|
| **Name** | Required (always) | Required |
| **Email** | Required / Optional | Required |
| **Phone** | Required / Optional / Hidden | Optional |
| **Notes** | Shown / Hidden | Shown |

> **Tip:** Requiring a phone number enables SMS reminders, which significantly reduce no-show rates. Consider making it required if no-shows are a concern.

### Date and Time Selection

Control how availability is presented to clients:

- Calendar view or list view for available dates
- Number of days shown in advance
- Slot display format (exact times or time ranges)

### Confirmation

Customize the final step where clients review and confirm their booking:

- Show a booking summary with all selected details
- Display cancellation policy text
- Include terms and conditions acceptance

## Preview Your Booking Flow

After making changes, use the preview function to see exactly what your clients experience. This shows the booking flow as it appears on your public booking page without creating a real booking.

> **Tip:** Keep the booking flow as short as possible. Every additional required field increases the chance that a client abandons the booking process. Only collect information you genuinely need.

## Per-Service Overrides

Some booking flow settings can be overridden on a per-service basis. For example, a consultation service might require a notes field while a standard haircut does not. Configure these overrides in the individual service settings.
