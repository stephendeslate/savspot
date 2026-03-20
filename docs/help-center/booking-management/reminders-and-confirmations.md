# Reminders and Confirmations

SavSpot has two levels of notification configuration: tenant-level settings that control what notifications your business sends, and per-user settings that control how individual team members receive alerts.

## Tenant Notification Settings

Navigate to **Settings > Notification Preferences** (`/settings/notification-preferences`) to configure what notifications your business sends.

### Email Notifications

| Toggle | Description |
|--------|-------------|
| **Booking Confirmation** | Send an email when a new booking is confirmed |
| **Booking Reminder** | Send upcoming booking reminders to clients |
| **Booking Cancellation** | Send an email when a booking is cancelled |
| **Payment Received** | Send an email when a payment is processed |
| **Review Received** | Send an email when a client leaves a review |

### Push Notifications

| Toggle | Description |
|--------|-------------|
| **New Booking** | Push alert for new bookings |
| **Cancellation** | Push alert for cancellations |
| **Payment** | Push alert for payments |

### SMS Notifications

| Toggle | Description |
|--------|-------------|
| **SMS Reminder** | Send SMS reminders to clients before appointments |

### Digest Settings

Instead of receiving individual notifications, you can bundle them into a periodic summary:

1. Enable the **Enable Digest** toggle.
2. Choose a **Frequency**: Daily or Weekly.
3. Set the delivery **Time** (defaults to 9:00 AM).
4. If Weekly, select the **Day of Week**.

## Per-User Notification Preferences

Navigate to **Settings > Notifications** (`/settings/notifications`) to configure how you personally receive alerts. Each team member can set their own preferences.

Four notification categories are available, each with **Email** and **Browser Push** toggles:

| Category | Description |
|----------|-------------|
| **Booking Notifications** | New bookings, cancellations, and reschedules |
| **Payment Notifications** | Payment received, refunds, and failed charges |
| **System Notifications** | Account updates, security alerts, and maintenance |
| **Calendar Notifications** | Calendar sync status and conflict alerts |

> **Tip:** Browser push notifications require your browser's permission. You will be prompted when you enable push for the first time.

## How They Work Together

Tenant-level settings control **what** notifications are sent (e.g., whether confirmation emails go out at all). Per-user settings control **how** each team member receives those notifications (email vs. browser push for each category).
