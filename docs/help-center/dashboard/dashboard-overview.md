# Dashboard Overview

The Dashboard at `/dashboard` is the first page you see after logging in. It provides a snapshot of your business activity and serves as the starting point for common tasks.

## Stat Cards

The dashboard displays four key metric cards at the top:

| Card | Value | Description |
|------|-------|-------------|
| **Today's Bookings** | Count | Non-cancelled appointments scheduled for today |
| **Revenue (Month)** | Currency amount | Total revenue for the current month |
| **New Clients** | Count | Unique clients from bookings in the past 7 days |
| **Pending Actions** | Count | Bookings with PENDING status awaiting confirmation |

Each card shows the metric value, an icon, and a brief description. Cards use a colored left border for visual distinction.

## Recommended Next Steps

If your business setup is incomplete, a **Recommended Next Steps** section appears below the stat cards. This section is conditional -- it only shows when setup actions remain:

| Condition | Recommended Action | Link |
|-----------|--------------------|------|
| No services created | Add your first service | `/services/new` |
| No availability rules | Set your availability | `/settings/availability` |
| Stripe not connected | Connect Stripe | `/settings/payments` |
| Google Calendar not connected | Connect Google Calendar | `/settings/calendar` |

Once all setup steps are complete, this section disappears automatically.

## Quick Actions

Three quick action cards are always visible at the bottom:

| Action | Description | Destination |
|--------|-------------|-------------|
| **Add Service** | Create a new bookable service | `/services/new` |
| **Manage Availability** | Update your working hours | `/settings/availability` |
| **View Calendar** | See your upcoming schedule | `/calendar` |

## No-Tenant State

If you have not created a business yet, the dashboard shows a welcome message with a **Complete Onboarding** button that links to `/onboarding`.
