# Availability Rules

Availability rules define when clients can book appointments with your business. By setting your regular working hours, you ensure that only valid time slots appear on your booking page.

## Setting Up Availability

1. Navigate to **Settings** in the sidebar.
2. Select **Availability**, or go directly to `/settings/availability`.
3. Configure your hours for each day of the week.
4. Click **Save**.

## Weekly Schedule

The availability editor shows all seven days of the week. For each day, you can:

- **Enable or disable** the day. Disabled days show no available slots.
- **Set start and end times** for your working hours.
- **Add multiple time blocks** per day to create gaps (e.g., a lunch break).

| Day Configuration | Result |
|-------------------|--------|
| Enabled, 9:00 AM - 5:00 PM | Full-day availability |
| Enabled, 9:00 AM - 12:00 PM and 1:00 PM - 5:00 PM | Available with a lunch break |
| Disabled | No bookings accepted |

## Adding Breaks

To add a break during the day:

1. Click **Add Time Block** on the relevant day.
2. Set the first block to end when your break starts (e.g., 9:00 AM - 12:00 PM).
3. Set the second block to start when your break ends (e.g., 1:00 PM - 5:00 PM).

The gap between blocks is automatically treated as unavailable time.

> **Tip:** If you take the same lunch break every day, set it up once and apply it across all working days to save time.

## Per-Staff Availability

If your business has multiple team members, each staff member can set their own availability rules. This allows different schedules for different roles. Staff availability is configured from the same `/settings/availability` page by selecting the team member from the staff dropdown.

## How Availability Affects Booking

SavSpot combines your availability rules with service duration and buffer time to calculate bookable slots. A 60-minute service with a 15-minute buffer requires a 75-minute window. If your availability ends at 5:00 PM, the last bookable slot for that service starts at 3:45 PM.

> **Tip:** After setting your availability, preview your booking page to confirm the time slots look correct from a client's perspective.
