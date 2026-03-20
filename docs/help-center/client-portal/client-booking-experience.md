# Client Booking Experience

This article describes the booking flow from your client's perspective when they book through your public booking page or manage appointments in the client portal.

## Booking Through the Public Page

When a client visits your booking page at `savspot.co/book/{your-slug}`, they are guided through a dynamic set of steps. The steps shown depend on the service selected:

| Step | When It Appears |
|------|-----------------|
| **Service Selection** | Always — services grouped by category |
| **Provider Selection** | When the service has multiple providers |
| **Venue Selection** | Placeholder — coming soon |
| **Date & Time** | Always — shows available slots |
| **Guest Details** | When guest config is enabled |
| **Add-Ons** | When the service has active add-ons |
| **Intake Form** | When the service has an intake form |
| **Client Details** | Always — name, email, phone |
| **Payment** | When the service has a price > 0 and Stripe is connected |
| **Review** | Always — booking summary |
| **Confirmation** | Always — success page |

A simple service might show only 5–6 steps, while a fully configured service could show all 11.

## Managing Bookings in the Portal

From **My Bookings** (`/portal/bookings`), clients can:

- **Filter** by status: All Bookings, Upcoming, Completed, or Cancelled
- **View details** by clicking on a booking
- **Reschedule** an upcoming booking (Pending or Confirmed status) by selecting a new date and time
- **Cancel** a booking with an optional reason

### Reschedule Limits

Clients can reschedule a limited number of times per booking (default: 3). The reschedule dialog shows how many reschedules remain.

### Cancellation Policy

When cancelling, the dialog displays the applicable cancellation policy:

| Policy | Display | Meaning |
|--------|---------|---------|
| **Free cancellation** | Green banner | No charge |
| **Late cancellation fee** | Yellow banner | A fee amount is shown |
| **No refund** | Red banner | Full amount retained |

## Booking Detail View

The booking detail page shows:

- **Service name** and status badge
- **Booking details**: Date, time range, duration, total amount, booked-on date
- **Business contact**: Name, email (clickable), phone (clickable)
- **Status history**: Timeline of state transitions with timestamps
- **Payment info**: Total amount with per-payment breakdown (status, amount, method)
- **Notes** (if present)

> **Tip:** The booking flow is fully responsive and works on mobile devices. Clients can book from their phone just as easily as from a desktop browser.
