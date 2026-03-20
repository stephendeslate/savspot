# Automation Triggers

Triggers are the events that start your workflows. When a trigger event occurs, SavSpot executes the associated workflow.

## Available Triggers

Six trigger events are available:

| Trigger | Fires When |
|---------|------------|
| **Booking Created** | A new booking is created |
| **Booking Confirmed** | A booking is confirmed |
| **Booking Cancelled** | A booking is cancelled |
| **Booking Completed** | A booking is marked as complete |
| **Payment Received** | A payment is successfully processed |
| **Client Created** | A new client record is added |

## Selecting a Trigger

When creating or editing a workflow at `/settings/workflows`, select the trigger event from the dropdown. Each workflow has exactly one trigger.

## Multiple Workflows Per Trigger

The same trigger can be used across multiple workflows. If two workflows share the same trigger, both execute independently when the event occurs.

## Current Limitations

- There are **no trigger conditions** — workflows cannot be filtered by service, venue, amount, client tag, or day of week. The workflow runs for every occurrence of the trigger event.
- There is **no action chaining** — the web UI does not support configuring actions, wait delays, or sequential action steps.
- There is **no "Booking Rescheduled"** trigger — rescheduling does not have a dedicated trigger event.

> **Tip:** Use the Booking Created and Payment Received triggers for the most common automation needs like confirmation messages and receipt notifications.
