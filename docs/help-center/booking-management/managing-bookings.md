# Managing Bookings

The Bookings page at `/bookings` is your central hub for viewing, filtering, and managing all appointments.

## Booking List

The bookings table displays all appointments with the following columns:

| Column | Description | Visibility |
|--------|-------------|------------|
| **Client** | Client name and email (or "Walk-in" / "Guest" if no client linked) | Always |
| **Service** | Service name | Always |
| **Date/Time** | Formatted as "Jan 1, 2026 2:00 PM" | Hidden below 640px |
| **Status** | Color-coded badge (see [Booking Statuses](./booking-statuses.md)) | Always |
| **Amount** | Total amount in the booking's currency | Hidden below 768px |
| **Source** | How the booking was created (Walk-In, Direct, Widget, etc.) | Hidden below 1024px |
| **Actions** | Eye icon to view booking detail | Always |

Click any row to open the booking detail at `/bookings/{id}`.

## Filtering Bookings

Use the filter controls to narrow down the list:

| Filter | Options |
|--------|---------|
| **Status** | All Statuses, Pending, Confirmed, In Progress, Completed, Cancelled, No Show |
| **Start Date** | Date picker |
| **End Date** | Date picker |
| **Search** | Client name or email (300ms debounce) |

Click **Apply** to update the results. On mobile, tap the **Filters** button to reveal the filter panel.

> **Tip:** Filter by Pending status at the start of your day to review bookings that need confirmation.

## Pagination

The bookings list shows 20 items per page. Use the **Previous** and **Next** buttons to navigate between pages. The current page and total pages are displayed between the buttons.

## Booking Detail View

Clicking a booking (or the eye icon) opens its detail view, where you can:

- View all booking information (client, service, date, time, amount, source, notes)
- See the booking's status history timeline
- Change the booking status using the available action buttons
- View payment information

## Empty State

If you have no bookings yet, the page displays an empty state with an **Add a walk-in** button to create your first booking.

> **Tip:** Pair the Bookings page with the Calendar view at `/calendar` for a visual representation of your schedule. The calendar shows the same bookings in day, week, month, or agenda format.
