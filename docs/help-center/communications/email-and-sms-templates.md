# Email and SMS Templates

Customize the automated messages SavSpot sends to your clients. Templates let you maintain a consistent brand voice across booking confirmations, reminders, follow-ups, and other communications.

## Managing Templates

Navigate to **Settings > Communications** (`/settings/communications`) to view and edit your message templates. Each template can be customized for both email and SMS channels.

## Template Types

SavSpot provides templates for common communication scenarios:

| Template Type | When Sent | Default Behavior |
|---|---|---|
| Booking confirmation | When a client completes a booking | Automatically sent |
| Booking reminder | Before a scheduled appointment | Sent based on reminder settings |
| Cancellation notice | When a booking is cancelled | Automatically sent |
| Follow-up | After a service is completed | Optional, must be enabled |
| Invoice sent | When an invoice is emailed to a client | Automatically sent |
| Payment receipt | When a payment is processed | Automatically sent |

## Template Variables

Use template variables to personalize messages with dynamic content. Insert variables using curly brace syntax in your template text.

| Variable | Description | Example Output |
|---|---|---|
| `{client_name}` | Client's full name | Jane Smith |
| `{client_first_name}` | Client's first name | Jane |
| `{service_name}` | Name of the booked service | Deep Tissue Massage |
| `{date}` | Appointment date | March 15, 2026 |
| `{time}` | Appointment time | 2:00 PM |
| `{business_name}` | Your business name | Wellness Studio |
| `{staff_name}` | Assigned staff member | Alex Johnson |
| `{total}` | Total amount due or paid | $85.00 |

> **Tip:** Preview your template after editing to verify that variables render correctly. A missing or misspelled variable will appear as raw text in the sent message.

## Editing a Template

1. Go to **Settings > Communications** (`/settings/communications`).
2. Select the template you want to customize.
3. Edit the subject line (email only) and message body.
4. Insert variables where you want dynamic content.
5. Preview the template to check formatting.
6. Save your changes.

> **Tip:** Keep SMS templates concise. SMS messages have character limits, and longer messages may be split into multiple texts, which can increase costs.
