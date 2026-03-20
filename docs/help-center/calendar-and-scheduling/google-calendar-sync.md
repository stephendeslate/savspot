# Google Calendar Sync

Connecting Google Calendar to SavSpot keeps your personal and business schedules in sync. Bookings created in SavSpot automatically appear on your Google Calendar, and events from Google can block availability in SavSpot to prevent double-booking.

## Connecting Your Google Calendar

1. Navigate to **Settings** in the sidebar.
2. Select **Calendar**, or go directly to `/settings/calendar`.
3. Click **Connect Google Calendar**.
4. Sign in with your Google account and grant SavSpot permission to read and write calendar events.
5. Select which Google Calendar to sync with (e.g., your primary calendar or a dedicated "Work" calendar).
6. Click **Save**.

## What Syncs

| Direction | What Happens |
|-----------|-------------|
| **SavSpot to Google** | New bookings appear as events on your Google Calendar with client name, service, and time. Cancelled bookings are removed from Google. |
| **Google to SavSpot** | Events on your Google Calendar block corresponding time slots in SavSpot. Clients cannot book during those times. |

## Conflict Handling

When SavSpot detects a Google Calendar event during a time slot, that slot is marked as unavailable on your booking page. This prevents double-booking across calendars.

If a conflict arises with an existing SavSpot booking (for example, you add a Google event that overlaps a confirmed booking), SavSpot flags the conflict on your calendar. You are responsible for resolving it by rescheduling one of the events.

> **Tip:** Use a dedicated Google Calendar for SavSpot sync rather than your personal calendar. This gives you finer control over which events block your booking availability.

## Disconnecting Google Calendar

To disconnect the sync:

1. Go to **Settings** > **Calendar**.
2. Click **Disconnect** next to Google Calendar.
3. Confirm the disconnection.

Disconnecting stops future syncing. Events already created on Google Calendar remain but are no longer updated by SavSpot.

> **Tip:** After connecting Google Calendar, create a test booking to verify that it appears on your Google Calendar within a few seconds.
