# Booking Flow Customization

The Booking Flow page shows which steps clients encounter when booking through your public booking page. This page is read-only — the steps are determined automatically based on your service configuration.

## Accessing the Booking Flow

Navigate to **Settings > Booking Flow** (`/settings/booking-flow`) to see the current step configuration.

## How Steps Are Determined

The booking flow is dynamic. SavSpot resolves which steps to show for each booking session based on the service the client selects. Up to 11 steps can appear:

| Step | When It Appears |
|------|-----------------|
| **Service Selection** | Always |
| **Provider Selection** | When the service has multiple assigned providers |
| **Venue Selection** | Placeholder — coming soon |
| **Date & Time** | Always |
| **Guest Details** | When the service has guest config enabled |
| **Add-Ons** | When the service has active add-ons |
| **Intake Form** | When the service has an intake form configured |
| **Client Details** | Always (name, email, phone) |
| **Payment** | When the service has a price greater than zero and Stripe is connected |
| **Review** | Always |
| **Confirmation** | Always |

## What You See on This Page

The Booking Flow page displays which steps are currently active and links to the relevant configuration pages where you can change the underlying settings. For example:

- To add providers to a service, go to **Services > [Service] > Providers** (`/services/[id]/providers`)
- To configure add-ons, go to **Services > [Service] > Add-Ons** (`/services/[id]/addons`)
- To set up payments, go to **Settings > Payments** (`/settings/payments`)

> **Tip:** The fewer steps in your booking flow, the higher your conversion rate. Only enable features (add-ons, intake forms, guest config) when they add genuine value to the booking experience.

## Per-Service Differences

Because steps are resolved per service, different services can have different booking flows. A simple service with fixed pricing and no add-ons might show only 5 steps, while a complex service with providers, add-ons, and an intake form could show all 11.

You can review how each service's booking flow looks by visiting your public booking page and selecting different services.
