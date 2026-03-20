# Client Booking Experience

This article describes the booking flow from your client's perspective when they book through the portal at `/portal/bookings`.

## Step-by-Step Booking Flow

1. **Select a venue** -- If your business has multiple locations, the client chooses their preferred venue first. This step is skipped for single-venue businesses.
2. **Choose a service** -- The client browses your service catalog and selects the service they want. Service descriptions, durations, and prices are displayed.
3. **Pick a date** -- A calendar view shows available dates. Days with no availability are grayed out.
4. **Select a time slot** -- Available time slots for the chosen date are displayed. Slots are based on your business hours, service duration, and existing bookings.
5. **Enter details** -- The client provides their name, email, phone number, and any additional information your service requires.
6. **Apply a discount** -- If the client has a discount code, they can enter it here to see the adjusted price.
7. **Confirm and pay** -- The client reviews their booking summary and completes payment if required. For free services or pay-later configurations, this step confirms without payment.

## What Clients See During Booking

| Element | Description |
|---------|-------------|
| Service card | Name, description, duration, and price |
| Availability calendar | Monthly view with available dates highlighted |
| Time slot list | Available start times for the selected date |
| Booking summary | Service, date, time, duration, and total price |
| Payment form | Secure card input powered by Stripe |

## After Booking

Once a booking is confirmed, the client receives:

- An on-screen confirmation with the booking details.
- A confirmation email with the date, time, venue, and a link to manage the booking.
- Automated reminders based on your workflow configuration.

> Tip: The booking flow is fully responsive and works on mobile devices. Clients can book from their phone just as easily as from a desktop browser.

## Managing Bookings

From `/portal/bookings`, clients can view their upcoming and past appointments. For upcoming bookings, they can reschedule or cancel according to your cancellation policy. Cancelled bookings display the cancellation reason and any refund information.
