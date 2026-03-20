# Booking Statuses

Every booking in SavSpot has a status that indicates where it is in its lifecycle. Statuses are displayed as color-coded badges throughout the interface.

## Status Definitions

| Status | Badge Color | Description |
|--------|-------------|-------------|
| **Pending** | Amber | Booking has been created but not yet confirmed. Requires manual review |
| **Confirmed** | Blue | Booking is confirmed and the appointment is scheduled |
| **In Progress** | Purple | The appointment is currently underway |
| **Completed** | Green | The appointment took place and is finished |
| **Cancelled** | Red | The booking was cancelled (text appears with strikethrough on the calendar) |
| **No Show** | Gray | The client did not arrive for their scheduled appointment |

## Status Transitions

Bookings follow a defined flow from creation to resolution:

```
PENDING ──> CONFIRMED ──> IN PROGRESS ──> COMPLETED
   │            │              │
   │            ├──> NO SHOW   └──> CANCELLED
   │            │
   └──> CANCELLED
```

### Allowed Transitions

| From | To | How |
|------|----|-----|
| Pending | Confirmed | Click **Confirm** on the booking or calendar popover |
| Pending | Cancelled | Click **Cancel** from the booking detail or calendar popover |
| Confirmed | In Progress | Click **Mark Arrived** on the calendar popover |
| Confirmed | Completed | Click **Mark Completed** on the calendar popover |
| Confirmed | No Show | Click **No Show** on the calendar popover |
| Confirmed | Cancelled | Click **Cancel** from the booking detail or calendar popover |
| In Progress | Completed | Click **Mark Completed** on the calendar popover |
| In Progress | Cancelled | Click **Cancel** from the calendar popover |

### Terminal Statuses

**Completed**, **Cancelled**, and **No Show** are terminal — no further actions are available on these bookings. They cannot move backward in the flow.

## Automatic Status Changes

- **Auto-confirm** — Services configured with Auto-confirm skip PENDING and are immediately set to CONFIRMED. See [Confirmation Modes](./confirmation-modes.md).
- **Walk-in bookings** — Walk-in bookings start as CONFIRMED by default.

## Where Statuses Appear

- **Bookings page** (`/bookings`) — Status badge in the table
- **Calendar** (`/calendar`) — Color-coded event blocks with a legend
- **Booking detail** — Status badge in the header with available action buttons
- **Client portal** — Clients see their booking statuses in **My Bookings**
