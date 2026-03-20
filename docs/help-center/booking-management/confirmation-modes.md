# Confirmation Modes

SavSpot supports two confirmation modes that determine how new bookings are handled: auto-confirm and manual confirmation. You can set a default mode for your business and override it per service.

## Auto-Confirm Mode

When auto-confirm is enabled, new bookings are immediately set to **CONFIRMED** status. The client receives a confirmation email right away, and the appointment appears on your calendar as a confirmed slot.

**Best for:**
- Businesses with open availability and few scheduling conflicts
- Solo practitioners who accept all bookings
- Services where immediate confirmation improves the client experience

### How It Works

1. Client or staff creates a booking
2. Booking is saved with CONFIRMED status
3. Confirmation email is sent to the client immediately
4. The time slot is blocked on the calendar

## Manual Confirmation Mode

With manual confirmation, new bookings start in **PENDING** status. You must review and confirm each booking before it is finalized. The client is notified that their request has been received and is awaiting confirmation.

**Best for:**
- Businesses that need to verify availability before confirming
- Services requiring staff review or preparation assessment
- High-demand time slots where you want to manage capacity manually

### How It Works

1. Client or staff creates a booking
2. Booking is saved with PENDING status
3. A "booking received" email is sent to the client
4. You review the booking and click **Confirm** or **Cancel**
5. A confirmation or cancellation email is sent to the client

> **Tip:** If you use manual confirmation, check your pending bookings regularly. Clients waiting too long for confirmation may book elsewhere.

## Configuring Your Default Mode

1. Navigate to **Settings** in the sidebar
2. Go to the booking configuration section
3. Select **Auto-confirm** or **Manual confirmation** as your default
4. Save your changes

## Per-Service Overrides

You can set a different confirmation mode for individual services, overriding your business default. This is useful when most services can be auto-confirmed but specific ones need manual review.

| Example | Default Mode | Override |
|---------|-------------|----------|
| Salon with standard cuts and custom color services | Auto-confirm | Manual for custom color (requires consultation) |
| Consultant with free intro calls and paid sessions | Manual | Auto-confirm for free intro calls |

> **Tip:** Start with auto-confirm if you are unsure. It provides a better client experience and reduces your administrative workload. Switch to manual confirmation only for services that genuinely require review before scheduling.
