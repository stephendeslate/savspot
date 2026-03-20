# Confirmation Modes

Each service in SavSpot has a confirmation mode that determines how new bookings are handled. This is a per-service setting configured when you create or edit a service.

## Auto-Confirm

When Auto-confirm is selected, new bookings are immediately set to **Confirmed** status. The appointment appears on your calendar as a confirmed slot right away.

**Best for:**
- Businesses with open availability and few scheduling conflicts
- Solo practitioners who accept all bookings
- Services where immediate confirmation improves the client experience

### How It Works

1. Client or staff creates a booking
2. Booking is saved with Confirmed status
3. The time slot is blocked on the calendar

## Manual Review

With Manual Review, new bookings start in **Pending** status. You must review and confirm each booking before it is finalized.

**Best for:**
- Businesses that need to verify availability or resources before confirming
- Services requiring staff review or preparation assessment
- High-demand time slots where you want to manage capacity manually

### How It Works

1. Client or staff creates a booking
2. Booking is saved with Pending status
3. The booking appears in your **Pending Actions** count on the Dashboard
4. You review the booking and click **Confirm** or **Cancel** (from the calendar popover or booking detail)

> **Tip:** If you use Manual Review, check your Pending Actions count on the Dashboard regularly. Clients waiting too long for confirmation may book elsewhere.

## Configuring the Confirmation Mode

The confirmation mode is set per service, not globally:

1. Navigate to **Services** (`/services`).
2. Click on a service to edit it, or create a new service at `/services/new`.
3. In the **Confirmation Mode** dropdown, select **Auto-confirm** or **Manual Review**.
4. Click **Save** or **Create Service**.

| Example | Confirmation Mode |
|---------|-------------------|
| Standard haircut — accept all bookings | Auto-confirm |
| Custom color service — requires consultation | Manual Review |
| Free intro call — low risk | Auto-confirm |
| Premium session — limited availability | Manual Review |

> **Tip:** Start with Auto-confirm if you are unsure. It provides a better client experience and reduces your administrative workload. Switch to Manual Review only for services that genuinely require review before scheduling.
