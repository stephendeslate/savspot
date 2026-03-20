# Webhook Integrations

Send real-time event data from SavSpot to external applications using webhooks. Webhooks deliver HTTP POST requests to a URL you specify whenever selected events occur.

## Setting Up a Webhook

1. Navigate to **Settings > Workflows** (`/settings/workflows`).
2. Create a new workflow or edit an existing one.
3. Add a **Send Webhook** action to your workflow.
4. Enter the destination URL where SavSpot should send the event data.
5. Optionally add custom headers (e.g., for authentication).
6. Save and activate the workflow.

## Available Events

Webhooks can be triggered by any workflow trigger event:

| Event | Description |
|-------|-------------|
| `booking.created` | A new booking has been confirmed |
| `booking.cancelled` | A booking has been cancelled |
| `booking.completed` | A booking has been marked as complete |
| `booking.rescheduled` | A booking's date or time has changed |
| `payment.received` | A payment has been successfully processed |
| `client.created` | A new client has been added |

## Payload Format

Webhook payloads are sent as JSON in the body of an HTTP POST request. Each payload includes:

| Field | Description |
|-------|-------------|
| `event` | The event type (e.g., `booking.created`) |
| `timestamp` | UTC timestamp of when the event occurred |
| `data` | Object containing the full resource details |
| `tenant_id` | Your SavSpot account identifier |

The `data` field contains the complete resource object (booking, payment, or client) at the time the event fired.

## Testing Webhooks

Before connecting a production system, test your webhook with a request inspection tool:

1. Use a service like webhook.site to generate a temporary URL.
2. Set that URL as your webhook destination.
3. Trigger a test event (e.g., create a test booking).
4. Inspect the received payload to verify the format meets your needs.

## Retry Behavior

If your endpoint returns a non-2xx status code or fails to respond within 30 seconds, SavSpot retries the delivery:

| Attempt | Delay |
|---------|-------|
| 1st retry | 1 minute |
| 2nd retry | 5 minutes |
| 3rd retry | 30 minutes |
| Final retry | 2 hours |

After all retries are exhausted, the delivery is marked as failed. Failed deliveries are visible in the workflow's execution log.

> Tip: Always return a 200 status code quickly from your webhook endpoint, then process the data asynchronously. This prevents timeouts and missed deliveries.
