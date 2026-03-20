# Portal Overview

The client portal is a self-service area where your clients can manage their bookings, view payment history, and update their personal information. The portal is accessible at `/portal`.

## How Clients Access the Portal

Clients can access the portal in several ways:

1. **Direct link** — Share your portal URL with clients directly.
2. **Booking confirmation email** — Each confirmation email includes a link to the portal.
3. **Your website** — Add a "My Bookings" link to your site that points to the portal.

## Portal Dashboard

When clients log in, they see a welcome page with:

- **Stat cards**: Total Bookings (all time) and Upcoming Bookings (next 7 days)
- **Upcoming Bookings**: A list of appointments in the next 7 days with a "View all" link
- **Recent Activity**: The last 5 payments with a "View all" link

## Portal Pages

| Page | Path | Description |
|------|------|-------------|
| **Dashboard** | `/portal` | Welcome page with stats and upcoming appointments |
| **My Bookings** | `/portal/bookings` | View, filter, reschedule, and cancel appointments |
| **Payments** | `/portal/payments` | View invoices and payment history |
| **Profile** | `/portal/profile` | Update first name, last name, email, and phone number |
| **Settings** | `/portal/settings` | Export personal data or delete account |

## What Clients Can Do

From the portal, clients can independently:

- **View** upcoming and past bookings, filtered by status
- **Reschedule** upcoming bookings to a different date and time (with reschedule limits)
- **Cancel** bookings with the applicable cancellation policy displayed
- **View** invoices and payment details
- **Update** their personal information (name, email, phone)
- **Export** a copy of all their personal data (GDPR compliance)
- **Delete** their account permanently

See [Client Booking Experience](./client-booking-experience.md) for the full booking flow and [Payment History](./payment-history.md) for the payment view.

> **Tip:** Encourage clients to use the portal for rescheduling and cancellations to reduce back-and-forth messages and free up your time.
