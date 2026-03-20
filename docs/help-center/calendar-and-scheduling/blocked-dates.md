# Blocked Dates

Blocked dates let you close your calendar for specific days when you are unavailable. Use them for holidays, vacations, team events, or any other time you do not want to accept bookings.

## How Blocked Dates Work

When a date is blocked, all time slots for that day are removed from your booking page. Clients cannot book appointments on blocked dates regardless of your regular availability rules. Blocked time appears as a gray event on the calendar.

Existing bookings on a blocked date are not automatically cancelled — you should reschedule or cancel them manually before blocking the date.

## Current Status

The BlockedDate data model exists in SavSpot's backend, but there is no dedicated web interface for managing blocked dates yet. Blocked dates created through the API will appear on your calendar as gray blocked events.

## Workaround: Using Availability Rules

Until a dedicated blocked dates interface is available, you can use availability rules as a workaround:

1. Navigate to **Settings > Availability** (`/settings/availability`).
2. Find the rule for the day you want to block.
3. Click the **Status** toggle to set the rule to **Inactive** (gray).
4. Re-enable it when you want to accept bookings on that day again.

This approach works well for blocking entire days. For partial-day blocks, adjust the start and end times of your availability rules instead.

> **Tip:** If you need to block dates programmatically or in bulk, the blocked dates API endpoint is available. See [API Keys](../settings/api-keys.md) for information on accessing the API.
