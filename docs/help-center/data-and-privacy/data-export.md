# Data Export

Clients can export a copy of their personal data through the **Client Portal**. There is no admin-side data export page in the dashboard.

## Client Data Export

Clients can request a data export from **Portal > Settings** (`/portal/settings`):

1. Navigate to the **Settings** page in the client portal.
2. Under the **Data & Privacy** section, click **Export My Data**.
3. A confirmation message appears: "Data export requested successfully. You will receive an email with a download link once your data is ready."

The export generates a JSON archive containing all personal data associated with the client, including:

- Profile information
- Booking history
- Payment records

## Admin Data Access

As a business owner or admin, you can view client data through:

- **Client Profiles** (`/clients/{id}`) — View booking history, payment history, and contact details for individual clients.
- **Analytics** (`/analytics`) — View aggregated business metrics.
- **Stripe Dashboard** — Access detailed payment and transaction data via Settings > Payments > **Open Stripe Dashboard**.

## Current Limitations

- There is **no Settings > Data Export** page in the admin dashboard.
- There are **no scheduled exports** or bulk data export features.
- Data export is a client-facing feature accessed through the portal, not an admin tool.

> **Tip:** If you need to provide client data for regulatory purposes, the client can initiate an export themselves through the portal, or you can use the API to access the data programmatically.
