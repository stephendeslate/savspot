# Webhook Integrations

Webhooks allow SavSpot to send real-time event data to external applications via HTTP POST requests. While the backend supports webhooks, there is currently no dedicated webhook management page in the web interface.

## Current Status

The webhook system exists in the backend API but **there is no `/settings/webhooks` page** in the web application. Webhook configuration is managed through the API.

## Supported Events

Webhooks can be triggered by the same events available for workflow triggers:

| Event | Description |
|-------|-------------|
| **Booking Created** | A new booking has been created |
| **Booking Confirmed** | A booking has been confirmed |
| **Booking Cancelled** | A booking has been cancelled |
| **Booking Completed** | A booking has been marked complete |
| **Payment Received** | A payment has been successfully processed |
| **Client Created** | A new client has been added |

## Setting Up Webhooks

Since there is no web UI for webhook management, webhooks are configured through the API:

1. Generate an API key at **Settings > API Keys** (`/settings/api-keys`).
2. Use the API to create webhook endpoints with your destination URL and selected events.
3. Monitor webhook deliveries through the API.

See [API Keys](../settings/api-keys.md) for details on generating an API key.

## Best Practices

- Always return a `200` status code quickly from your webhook endpoint, then process the data asynchronously.
- Use a request inspection tool (like webhook.site) to test your endpoint before connecting production systems.
- Implement idempotency in your webhook handler to safely handle potential duplicate deliveries.

> **Tip:** Webhooks are useful for integrating SavSpot with external tools like CRMs, accounting software, or custom dashboards. Use the API to set them up until a web management interface is available.
