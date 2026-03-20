# iCal Feeds

iCal feeds allow you to subscribe to your SavSpot calendar from any calendar application that supports the iCalendar standard, such as Apple Calendar, Microsoft Outlook, or other calendar apps.

## How iCal Feeds Work

An iCal feed is a read-only URL that your calendar application periodically fetches to display your SavSpot bookings. Unlike Google Calendar sync, iCal feeds are one-directional — your SavSpot bookings appear in your calendar app, but events created in your calendar app do not block availability in SavSpot.

| Feature | iCal Feed | Google Calendar Sync |
|---------|-----------|---------------------|
| SavSpot bookings in external calendar | Yes | Yes |
| External events block SavSpot availability | No | Yes (with two-way sync) |
| Real-time updates | No (polling interval) | Near-real-time |
| Supported apps | Any iCal-compatible app | Google Calendar only |

## Current Status

iCal feed support is available through the API but does not have a dedicated management interface in the web application yet. The feed URL can be accessed programmatically using your API key.

For two-way calendar sync with a management interface, use [Google Calendar Sync](./google-calendar-sync.md) instead.

## Subscribing in Calendar Apps

Once you have your iCal feed URL:

### Apple Calendar

1. Open **Apple Calendar**.
2. Go to **File > New Calendar Subscription**.
3. Paste your iCal feed URL and click **Subscribe**.
4. Set the auto-refresh interval (every 5 minutes is recommended).

### Microsoft Outlook

1. Open **Outlook** and go to the Calendar view.
2. Click **Add Calendar > From Internet**.
3. Paste your iCal feed URL and click **OK**.

> **Tip:** If you need two-way sync with conflict blocking, use [Google Calendar Sync](./google-calendar-sync.md) instead of an iCal feed.
