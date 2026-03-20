# Public Booking Page

Every SavSpot business gets a dedicated public booking page that clients can use to browse services, check availability, and book appointments — no account required.

## Your Booking URL

Your public booking page is available at:

```
savspot.co/book/{your-slug}
```

The slug is based on your business name and is set during onboarding. You can find your exact URL by clicking **Preview Booking Page** on the Branding settings page (`/settings/branding`).

## What Clients See

When a client visits your booking page, they are guided through a dynamic set of steps. The steps shown depend on how the selected service is configured — up to 11 steps can appear:

| Step | When It Appears |
|------|-----------------|
| **Service Selection** | Always — services are grouped by category if categories exist |
| **Provider Selection** | When the service has multiple assigned providers |
| **Venue Selection** | Placeholder — coming soon |
| **Date & Time** | Always — shows available slots based on your availability rules |
| **Guest Details** | When the service has guest config enabled |
| **Add-Ons** | When the service has active add-ons |
| **Intake Form** | When the service has an intake form configured |
| **Client Details** | Always — collects name, email, and phone |
| **Payment** | When the service has a price > 0 and Stripe is connected |
| **Review** | Always — booking summary before confirmation |
| **Confirmation** | Always — success page with booking details |

## Branding

The booking page reflects your branding settings:

- **Brand color** — Used for buttons and accents
- **Logo** — Displayed in the booking page header
- **Cover photo** — Banner image at the top
- **Description** — Custom message shown to clients
- **Category label** — Business type displayed on the page

Configure these at **Settings > Branding** (`/settings/branding`). See [Customizing Appearance](./customizing-appearance.md) for details.

## Sharing Your Booking Page

There are several ways to share your booking page with clients:

1. **Direct link** — Copy the URL and share via email, social media, or text messages
2. **Website embed** — Add a "Book Now" button or inline widget to your website (see [Embedding the Widget](./embedding-the-widget.md))
3. **Email signature** — Include the link in your email signature

## Preview Mode

You can preview your booking page at any time by clicking **Preview Booking Page** on the Branding settings page. This opens your live booking page in a new tab.

> **Tip:** Test your booking page from a client's perspective by opening the URL in an incognito browser window. This helps you verify that the flow, branding, and available services look correct before sharing publicly.
