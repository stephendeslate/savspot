# API Keys

Generate API keys to integrate SavSpot with your own applications or third-party services. Manage your keys at **Settings > API Keys** (`/settings/api-keys`).

## Generating an API Key

1. Navigate to `/settings/api-keys` and click **Create API Key**.
2. Enter a descriptive name for the key (e.g., "Website Integration", "CRM Sync").
3. Select the permissions the key should have.
4. Click **Generate**.
5. Copy the key immediately -- it will only be displayed once.

> Tip: Store your API key in a secure location such as an environment variable or a secrets manager. Never expose it in client-side code.

## Key Permissions

| Permission | Access |
|------------|--------|
| Read Bookings | View booking details and availability |
| Write Bookings | Create, update, and cancel bookings |
| Read Clients | View client profiles and history |
| Write Clients | Create and update client records |
| Read Services | View service catalog and pricing |
| Manage Settings | Read and update business settings |

Assign only the permissions your integration requires. Follow the principle of least privilege.

## Rate Limits

API keys are subject to rate limiting to ensure platform stability.

| Tier | Rate Limit |
|------|-----------|
| Standard | 60 requests per minute |
| Pro | 120 requests per minute |
| Enterprise | Custom limits available |

Exceeding the rate limit returns a `429 Too Many Requests` response. Implement exponential backoff in your integration to handle rate limiting gracefully.

## Revoking a Key

To revoke an API key, find it in the list at `/settings/api-keys` and click **Revoke**. The key will stop working immediately. Any integrations using the revoked key will receive `401 Unauthorized` responses.

## Using the API

Include your API key in the `Authorization` header of each request:

```
Authorization: Bearer your_api_key_here
```

Refer to the SavSpot API documentation for available endpoints, request formats, and response schemas.

> Tip: Create separate API keys for each integration so you can revoke access to one without disrupting others.
