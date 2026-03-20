# Consent Management

SavSpot provides a consent API for managing user consent preferences. There is currently no admin-side consent management UI — consent is managed through the user-scoped API.

## How Consent Works

SavSpot distinguishes between two categories of communication:

| Type | Description | Consent Required |
|------|-------------|-----------------|
| **Transactional** | Booking confirmations, reminders, cancellation notices, and receipts | No — necessary for service delivery |
| **Marketing** | Promotions, newsletters, special offers, and re-engagement messages | Yes — clients must explicitly opt in |

## Client Consent Controls

Clients manage their own consent through the **Client Portal**:

- **Portal > Settings** (`/portal/settings`) — Clients can view and manage their account settings and privacy preferences.
- **Data export** — Clients can request a copy of their personal data.
- **Account deletion** — Clients can permanently delete their account.

## Consent API

The consent API is available at `/api/users/me/consents` and allows programmatic management of consent preferences. This is a user-scoped endpoint — each user manages their own consent records.

## Current Limitations

- There is **no admin-side consent collection UI** (no Settings > Booking Page consent checkboxes).
- There is **no consent tab** on client profiles.
- Consent management is handled through the API and client portal, not through the admin dashboard.

> **Tip:** Transactional messages related to active bookings are always sent regardless of marketing consent status, as they are necessary for service delivery.
