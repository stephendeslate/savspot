# API Keys

Generate API keys to integrate SavSpot with your own applications or third-party services. Manage your keys at **Settings > API Keys** (`/settings/api-keys`).

## Creating an API Key

1. Navigate to `/settings/api-keys` and click **Create API Key**.
2. Enter a descriptive name for the key (e.g., "Website Integration", "CRM Sync").
3. Select the scopes (permissions) the key should have.
4. Optionally set an **Expiration** date for the key.
5. Click **Create Key**.
6. **Copy the key immediately** — it is only displayed once and cannot be retrieved later.

> **Tip:** Store your API key in a secure location such as an environment variable or a secrets manager. Never expose it in client-side code.

## Key Scopes

| Scope | Access |
|-------|--------|
| **bookings:read** | View booking details and availability |
| **bookings:write** | Create, update, and cancel bookings |
| **clients:read** | View client profiles and history |
| **clients:write** | Create and update client records |
| **services:read** | View service catalog and pricing |
| **services:write** | Create and update services |
| **payments:read** | View payment and invoice data |
| **reports:read** | Access analytics and reporting data |

Assign only the scopes your integration requires. Follow the principle of least privilege.

## Key Rotation

To rotate an API key without downtime:

1. Find the key in the list and click **Rotate**.
2. Confirm the rotation in the dialog.
3. The current key is **invalidated immediately** and a new key is generated.
4. Copy the new key right away — update your integrations promptly as the old key stops working immediately.

## Revoking a Key

To revoke an API key immediately, find it in the list at `/settings/api-keys` and click **Revoke**. The key stops working immediately. Any integrations using the revoked key will receive `401 Unauthorized` responses.

## Using the API

Include your API key in the `Authorization` header of each request:

```
Authorization: Bearer your_api_key_here
```

> **Tip:** Create separate API keys for each integration so you can revoke access to one without disrupting others.
