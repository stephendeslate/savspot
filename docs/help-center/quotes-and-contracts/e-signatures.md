# E-Signatures

SavSpot supports sending contracts to clients for signing. The signing process happens outside the admin dashboard — clients receive a link to review and sign contracts.

## How Contract Signing Works

1. **Create** a contract at `/contracts` (from scratch or using a template).
2. **Send** the contract to the client using the Send action (available for Draft contracts).
3. The client receives the contract and can review and sign it externally.
4. Once signed, the contract status changes to **Signed** and the signed date is recorded.

## Contract Statuses

| Status | Meaning |
|--------|---------|
| **Draft** | Contract created, not yet sent |
| **Sent** | Contract delivered to the client for signing |
| **Signed** | Client has signed the contract |
| **Voided** | Contract cancelled |

## Viewing Signed Contracts

From the **Contracts** page (`/contracts`):

- Filter by **Signed** status to see all completed contracts.
- Each signed contract shows the **Signed Date** column.
- Click a contract to view its details.

## Current Limitations

- There is **no in-app signing interface** — the signing experience for clients happens outside the SavSpot admin dashboard.
- There is **no signature drawing or typing UI** within the web app.
- There is **no PDF download** of signed contracts from the contracts page.

> **Tip:** Let clients know to expect a contract email so it doesn't end up in their spam folder. A quick heads-up during your conversation helps ensure a smooth signing process.
