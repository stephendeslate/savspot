# Google Calendar Sync

Connecting Google Calendar to SavSpot keeps your personal and business schedules in sync. Bookings created in SavSpot appear on your Google Calendar, and events from Google can block availability in SavSpot to prevent double-booking.

## Connecting Your Google Calendar

1. Navigate to **Settings > Calendar** (`/settings/calendar`). Requires the Admin role.
2. Click **Connect Google Calendar**.
3. You are redirected to Google to authorize access. SavSpot requests permission to read and write calendar events.
4. After authorization, you are returned to the Calendar Settings page.
5. Select which calendars to sync using the checkboxes (your primary calendar is marked with a "Primary" badge).

## Sync Settings

Once connected, configure how syncing works:

### Sync Direction

| Option | Behavior |
|--------|----------|
| **One-way (outbound only)** | SavSpot bookings appear on Google Calendar. Google events do not affect SavSpot availability |
| **Two-way (outbound + inbound blocking)** | SavSpot bookings sync to Google, and Google events block availability in SavSpot |

### Sync Frequency

Choose how often SavSpot checks for changes:

- Every 5 minutes
- Every 10 minutes
- Every 15 minutes
- Every 30 minutes

## Connection Status

The Calendar Settings page shows your current connection state:

| State | What You See |
|-------|-------------|
| **Not connected** | A card with benefits list and a **Connect Google Calendar** button |
| **Connected** | "Connected" badge (green), account email, last sync time |
| **Error** | "Error" badge (red), error message, and a **Reconnect Google Calendar** button |

## Manual Sync

Click **Sync Now** to trigger an immediate sync instead of waiting for the next scheduled interval.

## Disconnecting

1. Click **Disconnect** (trash icon) on the Calendar Settings page.
2. A confirmation dialog appears: "Are you sure you want to disconnect your Google Calendar?"
3. Click **Disconnect** to confirm.

Disconnecting stops future syncing. Events already created on Google Calendar remain but are no longer updated by SavSpot. Existing bookings in SavSpot are not affected.

> **Tip:** Use a dedicated Google Calendar for SavSpot sync rather than your personal calendar. This gives you finer control over which events block your booking availability.
