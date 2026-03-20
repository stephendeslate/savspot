# Automation Triggers

Triggers are the events that start your workflows. When a trigger event occurs, SavSpot executes all actions configured in the associated workflow.

## Available Triggers

| Trigger | Fires when |
|---------|------------|
| Booking Created | A new booking is confirmed by a client or staff member |
| Booking Cancelled | An existing booking is cancelled |
| Booking Completed | A booking's scheduled time has passed and it is marked complete |
| Booking Rescheduled | A client or staff member changes the date or time of a booking |
| Payment Received | A payment is successfully processed for a booking |
| Client Created | A new client record is added to your account |

## Trigger Conditions

Add conditions to a trigger to narrow when the workflow runs. Conditions filter trigger events based on specific criteria.

| Condition | Example |
|-----------|---------|
| Service | Only trigger for a specific service (e.g., "Hair Cut") |
| Venue | Only trigger for bookings at a particular location |
| Payment Amount | Only trigger when payment exceeds a threshold |
| Client Tag | Only trigger for clients with a specific tag |
| Day of Week | Only trigger on certain days |

Multiple conditions use AND logic -- all conditions must be met for the workflow to execute.

## Chaining Actions

After a trigger fires, actions execute in sequence. You can chain multiple actions together:

1. **Send Email** -- Send a confirmation or thank-you email to the client.
2. **Wait** -- Pause for a specified duration (e.g., 24 hours).
3. **Send Email** -- Send a follow-up or review request.
4. **Send Webhook** -- Notify an external system.

> Tip: Use the Wait action between emails to avoid sending too many messages at once. A 24-hour delay between a booking confirmation and a preparation reminder feels natural to clients.

## Trigger Limits

Each trigger can be used across multiple workflows. If two workflows share the same trigger, both will execute independently when the event occurs.

> Tip: Start with one or two simple workflows and expand over time. A "booking confirmation email" and a "24-hour reminder" cover the most common use cases.
