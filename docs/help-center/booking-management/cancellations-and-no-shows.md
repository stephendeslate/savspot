# Cancellations and No-Shows

Cancellations and no-shows are an inevitable part of running a service business. SavSpot provides tools to handle both situations from the management interface and the client portal.

## Cancelling a Booking (Staff Side)

You can cancel a booking from the calendar or the booking detail view:

### From the Calendar

1. Navigate to **Calendar** (`/calendar`).
2. Click on the booking event.
3. In the popover, click **Cancel**.
4. The booking status changes to Cancelled.

### From the Bookings Page

1. Navigate to **Bookings** (`/bookings`).
2. Click on the booking row to open its detail view.
3. Click **Cancel Booking**.
4. Confirm the cancellation.

Bookings can be cancelled from **Pending**, **Confirmed**, or **In Progress** status. Once cancelled, the time slot becomes available for other bookings. Cancelled events appear with strikethrough text on the calendar.

## Client-Side Cancellation

Clients can cancel their own bookings through the client portal at **My Bookings** (`/portal/bookings`):

1. Open the booking detail.
2. Click **Cancel Booking** (available for Pending and Confirmed bookings only).
3. The cancellation dialog shows the applicable **cancellation policy** if one is configured:
   - **Free cancellation** (green) — No charge
   - **Late cancellation fee** (yellow) — A fee applies, shown with the amount
   - **No refund** (red) — The full amount is retained
4. Optionally enter a reason for cancellation.
5. Click **Cancel Booking** to confirm.

## Marking a No-Show

When a client does not arrive for their confirmed appointment:

1. Open the booking on the **Calendar** (`/calendar`).
2. Click the booking event to open the popover.
3. Click **No Show**.

No-shows can only be applied to **Confirmed** bookings. A booking in Pending status should be cancelled rather than marked as a no-show.

## Impact

| Area | Effect |
|------|--------|
| **Calendar** | The time slot is freed for new bookings |
| **Stat Cards** | Cancelled bookings are excluded from Today's Bookings count |
| **Client History** | The cancellation or no-show is recorded in the client's booking history |

## Reducing No-Shows

- Enable automated booking reminders (see [Reminders and Confirmations](./reminders-and-confirmations.md))
- Require deposits for high-value services (configure via `depositConfig` in the service Advanced Settings)
- Use the Manual Review confirmation mode for services with high no-show rates

> **Tip:** Check your **Pending Actions** count on the Dashboard daily. Promptly confirming pending bookings sets clear expectations with clients and reduces last-minute cancellations.
