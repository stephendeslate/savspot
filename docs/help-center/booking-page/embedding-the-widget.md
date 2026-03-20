# Embedding the Widget

Add SavSpot's booking widget directly to your existing website so clients can book without leaving your site.

## Getting the Embed Code

1. Go to **Settings > Embed** (`/settings/embed`) in your SavSpot dashboard.
2. Choose your embed method (JavaScript or iframe).
3. Customize the widget appearance if desired.
4. Click **Copy Code** to copy the snippet to your clipboard.

## Embed Methods

SavSpot offers two ways to embed the booking widget:

| Method | Best For | Behavior |
|--------|----------|----------|
| **JavaScript embed** | Most websites | Loads dynamically, auto-resizes to fit content, supports real-time updates. |
| **iframe embed** | Restricted platforms or simple setups | Static frame with a fixed height. Works anywhere iframes are supported. |

The JavaScript embed is recommended for most use cases because it handles responsive resizing automatically.

## Platform-Specific Instructions

### WordPress

1. Open the page or post where you want the widget.
2. Add a **Custom HTML** block.
3. Paste the embed code into the block.
4. Save and preview the page.

### Squarespace

1. Edit the target page and add a **Code** block.
2. Paste the embed code into the code block.
3. Toggle off the **Display Source** option.
4. Save and publish.

### Wix

1. Open the Wix Editor and navigate to the target page.
2. Click **Add > Embed Code > Custom Element** (for JavaScript) or **Embed a Site** (for iframe).
3. Paste the embed code and adjust the element size.
4. Publish your site.

### Custom HTML

For any static site or custom-built website, paste the embed code directly into your HTML where you want the widget to appear:

```html
<div id="savspot-booking"></div>
<script src="https://app.savspot.com/embed.js" data-business="your-slug"></script>
```

## Responsive Behavior

The JavaScript widget automatically adjusts its width to match the parent container and scales its height based on the current booking step. On mobile devices, the widget renders in a single-column layout for easy touch interaction.

> **Tip:** Place the embed code inside a container with a `max-width` of 600-800px for the best visual result on desktop screens. The widget will fill the container width and remain centered.
