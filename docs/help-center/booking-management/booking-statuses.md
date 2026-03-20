# Booking Statuses

Every booking in SavSpot has a status that indicates where it is in its lifecycle. Statuses are displayed as color-coded badges throughout the interface, making it easy to identify booking states at a glance.

## Status Definitions

| Status | Color | Description |
|--------|-------|-------------|
| **PENDING** | Yellow | Booking has been created but not yet confirmed |
| **CONFIRMED** | Blue | Booking is confirmed and the appointment is scheduled |
| **COMPLETED** | Green | The appointment took place and is finished |
| **CANCELLED** | Red | The booking was cancelled before the appointment |
| **NO_SHOW** | Gray | The client did not arrive for their scheduled appointment |

## Status Transitions

Bookings follow a defined flow from creation to resolution. The diagram below shows valid transitions:

```
PENDING ──> CONFIRMED ──> COMPLETED
   │            │
   │            ├──> NO_SHOW
   │            │
   └──> CANCELLED
            │
            └──> (from CONFIRMED)
```

### Allowed Transitions

| From | To | When |
|------|----|------|
| PENDING | CONFIRMED | You or the system confirms the booking |
| PENDING | CANCELLED | You or the client cancels before confirmation |
| CONFIRMED | COMPLETED | The appointment is finished |
| CONFIRMED | CANCELLED | You or the client cancels the appointment |
| CONFIRMED | NO_SHOW | The client did not arrive at the scheduled time |

> **Tip:** Bookings cannot move backward in the flow. A COMPLETED or CANCELLED booking cannot return to CONFIRMED or PENDING.

## Automatic Status Changes

Depending on your configuration, some status changes happen automatically:

- **Auto-confirm** -- New bookings skip PENDING and are immediately set to CONFIRMED. See [Confirmation Modes](./confirmation-modes.md).
- **Reminders** -- Automated reminders are sent based on status. CONFIRMED bookings receive appointment reminders; PENDING bookings receive confirmation nudges.

## Status in Reports

Your dashboard metrics use statuses to calculate KPIs. The completion rate, for example, is based on the ratio of COMPLETED bookings to all finalized bookings (COMPLETED + CANCELLED + NO_SHOW).
