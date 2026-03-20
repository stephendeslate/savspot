# Creating Bookings

Bookings in SavSpot can be created in two ways: walk-in bookings that you create on behalf of clients, and self-service bookings that clients make through your public booking page.

## Walk-In Bookings (Staff-Created)

The walk-in method is the primary way to create bookings from the management interface.

### From the Bookings Page

1. Navigate to **Bookings** (`/bookings`).
2. Click the **Walk-In** button (user-plus icon) in the top right.
3. Fill in the walk-in dialog (see [Walk-In Bookings](./walk-in-bookings.md) for field details).
4. Click **Create Booking**.

### From the Calendar

1. Navigate to **Calendar** (`/calendar`).
2. Click on an empty time slot.
3. The Walk-In dialog opens with the date and time pre-filled.
4. Select a service and fill in optional details.
5. Click **Create Booking**.

The new booking appears in your bookings list and calendar immediately.

## Client Self-Service

Clients book through your public booking page at `savspot.co/book/{your-slug}`. The booking page walks them through a dynamic set of steps based on your service configuration. See [Public Booking Page](../booking-page/public-booking-page.md) for details.

To share your booking page:

1. Navigate to **Settings > Embed Widget** (`/settings/embed`).
2. Copy the booking page URL, or generate an embed code for your website.

## After Creating a Booking

The booking's initial status depends on the service's confirmation mode:

- **Auto-confirm** — Booking starts as **Confirmed**
- **Manual Review** — Booking starts as **Pending** until you confirm it

See [Confirmation Modes](./confirmation-modes.md) for details.

## Viewing Your Bookings

After creating a booking, you can find it in several places:

- **Bookings page** (`/bookings`) — Full list with filters and search
- **Calendar** (`/calendar`) — Visual schedule in day, week, month, or agenda view
- **Dashboard** (`/dashboard`) — Today's bookings count appears in the stat cards

> **Tip:** Walk-in bookings are useful for phone bookings, same-day appointments, and clients who prefer not to book online.
