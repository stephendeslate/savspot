# Walk-In Bookings

Walk-in bookings let you record appointments for clients who arrive without a prior reservation or who contact you directly by phone or message.

## Creating a Walk-In Booking

### From the Bookings Page

1. Navigate to **Bookings** (`/bookings`).
2. Click the **Walk-In** button (user-plus icon) in the top right.
3. Fill in the dialog fields (see below).
4. Click **Create Booking**.

### From the Calendar

1. Navigate to **Calendar** (`/calendar`).
2. Click on an empty time slot.
3. The Walk-In dialog opens with the selected date and time pre-filled.
4. Fill in the remaining fields.
5. Click **Create Booking**.

> **Tip:** Walk-in bookings are not available as a quick action from the Dashboard. Use the Bookings page or Calendar instead.

## Walk-In Dialog Fields

| Field | Required | Details |
|-------|----------|---------|
| **Service** | Yes | Select from your active services. Shows name and duration (e.g., "60-Minute Massage (60min)") |
| **Date** | Yes | Defaults to today |
| **Start Time** | Yes | Defaults to the current time |
| **End Time** | Yes | Auto-calculated from the service duration. Can be adjusted manually |
| **Client Name** | No | Optional — leave blank for anonymous walk-ins |
| **Client Email** | No | Optional — provide if the client wants confirmation or reminders |
| **Notes** | No | Any additional notes about the booking |

## Conflict Detection

If the selected time slot conflicts with an existing booking, a message appears: "This time slot conflicts with an existing booking. Please choose a different time." You must select a different time to proceed.

## How Walk-Ins Differ from Standard Bookings

| Aspect | Client Self-Service | Walk-In |
|--------|-------------------|---------|
| **Created by** | Client via booking page | Staff via Bookings page or Calendar |
| **Source badge** | Direct, Widget, etc. | Walk-In |
| **Client info** | Required (name, email) | Optional |
| **Date/time** | Client selects from available slots | Staff sets manually |

Walk-in bookings follow the same status flow as all other bookings. Their initial status depends on the service's confirmation mode (Auto-confirm or Manual Review). See [Confirmation Modes](./confirmation-modes.md).
