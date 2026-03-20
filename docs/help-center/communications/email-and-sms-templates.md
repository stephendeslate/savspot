# Email and SMS Templates

Customize the automated messages SavSpot sends to your clients. Manage templates at **Settings > Communications** (`/settings/communications`) under the **Templates** tab.

> **Note:** This page is restricted to **Admin** and **Owner** roles.

## Template List

The Templates tab shows all message templates in a table:

| Column | Description |
|--------|-------------|
| **Name** | Template name |
| **Channel** | Delivery channel badge (Email, SMS, or Push) |
| **Subject** | Email subject line |
| **Status** | Active or Inactive badge |
| **Created** | When the template was created |

## Template Variables

Use template variables to personalize messages with dynamic content. Variables use **double curly braces with dot notation**: `{{variable.name}}`.

Variables are organized into groups. Common variables include:

| Variable | Description |
|----------|-------------|
| `{{client.name}}` | Client's full name |
| `{{client.firstName}}` | Client's first name |
| `{{client.email}}` | Client's email address |
| `{{booking.service}}` | Name of the booked service |
| `{{booking.date}}` | Appointment date |
| `{{booking.time}}` | Appointment time |
| `{{booking.duration}}` | Service duration |
| `{{business.name}}` | Your business name |
| `{{business.phone}}` | Business phone number |
| `{{business.email}}` | Business email |
| `{{staff.name}}` | Assigned staff member |
| `{{payment.amount}}` | Payment amount |
| `{{payment.method}}` | Payment method |

## Composing Messages

The **Compose** tab lets you send ad-hoc messages to individual clients:

| Field | Description |
|-------|-------------|
| **Channel** | Email, SMS, or Push |
| **Recipient** | Client ID or email address |
| **Template** | Optionally pre-fill from a template |
| **Subject** | Email subject (shown for Email channel only) |
| **Message Body** | Message content |

Click **Send Message** to deliver.

## Delivery Log

The **Delivery Log** tab shows sent message history (auto-refreshes every 30 seconds):

| Column | Description |
|--------|-------------|
| **Channel** | Email, SMS, or Push |
| **Recipient** | Delivery address |
| **Subject** | Message subject |
| **Status** | Sent (blue), Delivered (green), Failed (red), or Bounced (yellow) |
| **Sent At** | Delivery timestamp |

> **Tip:** Keep SMS templates concise. SMS messages have character limits, and longer messages may be split into multiple texts.
