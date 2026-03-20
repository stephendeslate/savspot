# Booking Flow Analytics

Understand where clients drop off in your booking process. Navigate to **Analytics > Booking Flow** (`/analytics/booking-flow`).

> **Note:** This feature requires a **Team** subscription tier or higher. It is restricted to **Admin** and **Owner** roles.

## KPI Cards

Four metric cards are displayed at the top:

| Card | Description |
|------|-------------|
| **Total Sessions** | Number of booking sessions started |
| **Completed** | Number of sessions that reached confirmation |
| **Conversion Rate** | Percentage of sessions completed |
| **Avg. Completion Time** | Average time to complete the booking flow |

## Period Filter

Filter data by time range:

- Last 7 days
- Last 30 days
- Last 90 days

## Funnel Chart

A horizontal bar chart showing how many sessions reached each step. Bars are color-coded by drop-off severity:

- **Green** — Less than 20% drop-off
- **Amber** — 20–40% drop-off
- **Red** — More than 40% drop-off

## Booking Flow Steps

The funnel tracks up to 11 steps in the dynamic booking flow:

| Step | Display Label |
|------|--------------|
| SERVICE_SELECTION | Service |
| STAFF_SELECTION | Staff |
| VENUE_SELECTION | Venue |
| DATE_TIME_PICKER | Date & Time |
| GUEST_COUNT | Guests |
| QUESTIONNAIRE | Questions |
| ADD_ONS | Add-ons |
| PRICING_SUMMARY | Summary |
| CLIENT_INFO | Your Info |
| PAYMENT | Payment |
| CONFIRMATION | Confirmed |

Not all steps appear in every booking — which steps are shown depends on how each service is configured.

## Step-by-Step Breakdown

A table showing detailed metrics for each funnel step:

| Column | Description |
|--------|-------------|
| **Step** | Step name |
| **Sessions** | Number of sessions that reached this step |
| **Drop-off Rate** | Percentage of sessions that left at this step |
| **Drop-offs** | Number of sessions lost at this step |

> **Tip:** Focus on the step with the highest drop-off rate. A small improvement at the biggest bottleneck has the largest impact on overall conversions.
