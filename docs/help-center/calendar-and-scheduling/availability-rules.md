# Availability Rules

Availability rules define your weekly working hours. Clients can only book appointments during the time slots you configure here.

## Accessing Availability Settings

Navigate to **Settings > Availability** (`/settings/availability`). This page requires the Admin role.

## Adding a Rule

1. Click **Add Rule** (plus icon) at the top of the page.
2. Fill in the form:

| Field | Details |
|-------|---------|
| **Day of Week** | Select from Sunday through Saturday |
| **Start Time** | When your availability begins (defaults to 9:00 AM) |
| **End Time** | When your availability ends (defaults to 5:00 PM) |

3. Click **Add** to save the rule.

Each rule creates a time block for one day of the week. To set up a full work week, add one rule per working day.

## Weekly Schedule

Your current rules are listed under **Weekly Schedule**, sorted by day of week and then by start time. Each rule displays:

| Column | Description |
|--------|-------------|
| **Day** | Day of the week |
| **Start Time** | Displayed in 12-hour format (e.g., "9:00 AM") |
| **End Time** | Displayed in 12-hour format (e.g., "5:00 PM") |
| **Status** | Toggle between Active (green) and Inactive (gray) — click to switch |
| **Actions** | Delete button (trash icon) |

## Adding Breaks

To create a lunch break or other gap, add two rules for the same day:

1. First rule: 9:00 AM to 12:00 PM
2. Second rule: 1:00 PM to 5:00 PM

The gap between the two rules is automatically treated as unavailable time.

## How Availability Affects Booking

SavSpot combines your availability rules with service duration and buffer times to calculate bookable slots. A 60-minute service with a 15-minute buffer after requires a 75-minute window. If your availability ends at 5:00 PM, the last bookable slot for that service starts at 3:45 PM.

> **Tip:** After setting your availability, preview your booking page to confirm the time slots look correct from a client's perspective. Use the **Preview Booking Page** button on the Branding settings page (`/settings/branding`).
