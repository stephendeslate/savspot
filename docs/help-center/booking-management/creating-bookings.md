# Creating Bookings

Bookings are the core of your SavSpot workflow. You can create bookings from the Bookings page at `/bookings` or from the Dashboard quick actions.

## Step-by-Step Booking Creation

1. Navigate to **Bookings** in the sidebar or go to `/bookings`
2. Click **New Booking** to open the creation flow

### Select a Service

Choose from your list of active services. Each service displays its name, duration, and price. If a service has add-ons, you can select optional extras at this step.

### Select a Client

Search for an existing client by typing their name or email. If the client is new, click **Create Client** to add them inline without leaving the booking flow.

| Field | Required | Notes |
|-------|----------|-------|
| Client name | Yes | First and last name |
| Email | Yes | Used for confirmations and reminders |
| Phone | No | Used for SMS reminders if enabled |

### Choose Date and Time

Pick a date from the calendar. Available time slots appear based on:

- Your configured business hours
- Existing bookings that would conflict
- Staff availability (if multiple team members)

Only open slots are shown -- you cannot double-book a time slot.

### Add Notes

Optionally add notes to the booking. These are visible only to you and your team, not to the client. Use notes for special requests, preparation reminders, or client preferences.

### Review and Confirm

A booking summary displays all selected details. Review the service, client, date, time, duration, and price before clicking **Confirm**.

> **Tip:** If you need to change anything before confirming, use the back navigation to return to any previous step without losing your selections.

## Booking Confirmation

After confirmation, the booking is created and appears on your calendar and bookings list. Depending on your confirmation mode, the booking starts as either PENDING or CONFIRMED. See [Confirmation Modes](./confirmation-modes.md) for details.

An automated confirmation email is sent to the client if email notifications are enabled.
