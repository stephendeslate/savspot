# KPIs and Metrics

The Dashboard displays four stat cards that give you a real-time snapshot of your business activity. These update automatically as bookings and payments are processed.

## Stat Cards

| Metric | What It Shows | How It Is Calculated |
|--------|---------------|----------------------|
| **Today's Bookings** | Appointments today | Count of bookings with a start time matching today's date, excluding cancelled bookings |
| **Revenue (Month)** | Income this month | Total revenue from payment stats for the current month, displayed in your business currency |
| **New Clients** | Recent clients | Count of unique client IDs from bookings in the past 7 days |
| **Pending Actions** | Items needing attention | Count of bookings with PENDING status that are awaiting your confirmation |

## Important Notes

- **No time period filters** -- The dashboard stat cards show fixed time ranges (today, this month, this week). For configurable date ranges and more detailed analytics, use the **Analytics** page at `/analytics`.
- **Revenue** uses the payment stats API, which reflects actual payment data rather than booking prices.
- **New Clients** is based on unique client IDs across recent bookings, not new account registrations.
- **Pending Actions** highlights bookings using the Manual Review confirmation mode that need your attention.

## Using the Metrics

The stat cards are designed for a quick daily check-in:

- A high **Pending Actions** count means you have bookings waiting for confirmation -- navigate to **Bookings** (`/bookings`) and filter by PENDING status to review them.
- Track **Today's Bookings** to see your daily workload at a glance.
- Monitor **Revenue (Month)** to compare against your targets.
- Watch **New Clients** to gauge marketing effectiveness.

> **Tip:** For detailed breakdowns, charts, and staff performance metrics, visit the **Analytics** page (`/analytics`).
