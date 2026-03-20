# Notification Preferences

SavSpot has two separate notification settings pages: **tenant-level** (business-wide) and **per-user** (individual).

## Tenant-Level Notifications

**Route:** `/settings/notification-preferences`

Controls which automated notifications your business sends to clients and staff. See [Automated Reminders](./automated-reminders.md) for details on the Email, Push, SMS, and Digest settings available here.

## Per-User Notifications

**Route:** `/settings/notifications`

> **Note:** This page is restricted to **Admin** and **Owner** roles.

Controls how **you** receive notifications. Four notification categories are available, each with an **Email** toggle and a **Browser Push** toggle:

| Category | Description |
|----------|-------------|
| **Booking Notifications** | New bookings, cancellations, and reschedules |
| **Payment Notifications** | Payment received, refunds, and failed charges |
| **System Notifications** | Account updates, security alerts, and maintenance |
| **Calendar Notifications** | Calendar sync status and conflict alerts |

An info banner notes that browser push notifications require your browser's permission to be granted.

Click **Save Preferences** to apply changes.

## How the Two Pages Relate

- **Tenant-level** (`/settings/notification-preferences`) — Determines what notifications your business sends (e.g., whether booking confirmation emails are sent at all).
- **Per-user** (`/settings/notifications`) — Determines which of those notifications you personally receive and through which channel.

> **Tip:** At minimum, keep email notifications enabled for payment and booking events to stay informed about your business activity.
