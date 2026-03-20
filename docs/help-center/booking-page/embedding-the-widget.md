# Embedding the Widget

Add a SavSpot booking widget to your existing website so clients can book without leaving your site.

## Accessing Embed Settings

Navigate to **Settings > Embed Widget** (`/settings/embed`). This page requires the Admin role.

## Embed Types

SavSpot offers three embed methods:

| Type | Description |
|------|-------------|
| **Link Button** | A styled button that links directly to your booking page. Default option |
| **Popup Modal** | A button that opens your booking page in a modal overlay on your website |
| **Inline Iframe** | An iframe that renders the booking page directly within your page content |

Select your preferred type using the toggle buttons on the Customize card.

## Customization Options

For **Link Button** and **Popup Modal** types:

| Setting | Details |
|---------|---------|
| **Button Text** | The text displayed on the button. Default: "Book Now". Maximum 30 characters |
| **Button Color** | The button background color. Uses your brand color by default. Choose via color picker or enter a hex code |

The **Inline Iframe** type does not have button customization — it embeds the full booking page directly.

## Preview

A live preview card shows how the button (or iframe) will appear on your website. The preview updates as you change the customization options.

## Getting the Embed Code

1. Configure your embed type and customization options.
2. The embed code appears in the **Embed Code** card below the preview.
3. Click **Copy to Clipboard** to copy the HTML snippet.
4. Paste the code into your website's HTML where you want the widget to appear.

## URLs

The embed code uses these URLs:

- Booking page: `https://savspot.co/book/{your-slug}`
- Embedded version: `https://savspot.co/embed/book/{your-slug}`

## How to Install

1. Copy the embed code from the settings page.
2. Open your website's HTML editor.
3. Paste the code where you want the booking button or widget to appear.
4. Save and publish your website.

> **Tip:** Place the embed code inside a container with a `max-width` of 600–800px for the best visual result on desktop screens.
