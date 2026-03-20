# GDPR and CCPA Compliance

SavSpot is designed to help your business meet its obligations under the General Data Protection Regulation (GDPR) and the California Consumer Privacy Act (CCPA).

## Data Isolation

SavSpot uses **Row-Level Security (RLS)** to ensure complete tenant isolation. Each business's data is stored in the same database but is partitioned at the row level — one business's data is never accessible to another. All database queries automatically filter by tenant, enforced at the database level.

## Data Subject Rights

Clients exercise their data rights through the **Client Portal** at `/portal/settings`:

### Right to Access (Data Export)

Clients can request a copy of all their personal data:

1. Navigate to **Portal > Settings**.
2. Click **Export My Data**.
3. A JSON archive is generated containing profile information, booking history, and payment records.
4. An email with a download link is sent when the export is ready.

### Right to Deletion

Clients can permanently delete their account:

1. Navigate to **Portal > Settings**.
2. Click **Delete Account**.
3. A confirmation dialog warns that:
   - All personal data will be permanently deleted
   - Booking history will be removed
   - Payment records will be anonymized
   - The account cannot be recovered
4. Click **Yes, Delete My Account** to confirm.

The client is automatically logged out after deletion.

## Important Notes

- There are **no "Export Client Data" or "Delete Client Data" buttons** on admin-side client profiles. Data subject rights are exercised by clients themselves through the portal.
- Payment records are **anonymized** rather than deleted, retaining the business record without personally identifiable information.
- SavSpot's booking page uses only essential cookies required for the booking flow to function. No tracking cookies are set by SavSpot.

> **Tip:** Direct clients to the portal Settings page if they request access to or deletion of their personal data. The self-service tools ensure proper handling and audit trails.
