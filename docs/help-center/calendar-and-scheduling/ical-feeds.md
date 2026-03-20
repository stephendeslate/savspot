# iCal Feeds

iCal feeds let you subscribe to your SavSpot calendar from any calendar application that supports the iCalendar standard. This is useful if you use Apple Calendar, Outlook, or another calendar app that is not Google Calendar.

## What Is an iCal Feed?

An iCal feed is a read-only URL that your calendar application periodically fetches to display your SavSpot bookings. Unlike Google Calendar sync, iCal feeds are one-directional -- your SavSpot bookings appear in your calendar app, but events created in your calendar app do not block availability in SavSpot.

| Feature | iCal Feed | Google Calendar Sync |
|---------|-----------|---------------------|
| SavSpot bookings in external calendar | Yes | Yes |
| External events block SavSpot availability | No | Yes |
| Real-time updates | No (polling interval) | Yes |
| Supported apps | Any iCal-compatible app | Google Calendar only |

## Getting Your iCal Feed URL

1. Navigate to **Settings** > **Calendar**, or go directly to `/settings/calendar`.
2. Locate the **iCal Feed** section.
3. Click **Copy Feed URL** to copy the URL to your clipboard.

> **Tip:** Your iCal feed URL is unique to your account. Do not share it publicly, as anyone with the URL can view your booking schedule.

## Subscribing in Calendar Apps

### Apple Calendar

1. Open **Apple Calendar**.
2. Go to **File** > **New Calendar Subscription**.
3. Paste your iCal feed URL and click **Subscribe**.
4. Set the auto-refresh interval (every 5 minutes is recommended).

### Microsoft Outlook

1. Open **Outlook** and go to the Calendar view.
2. Click **Add Calendar** > **From Internet**.
3. Paste your iCal feed URL and click **OK**.

### Other Calendar Apps

Most calendar applications have a "Subscribe to Calendar" or "Add Calendar by URL" option. Paste your SavSpot iCal feed URL when prompted.

## Refresh Interval

iCal feeds are not real-time. Your calendar app fetches updates based on its configured polling interval. Most apps default to refreshing every 15 minutes to 1 hour. Set a shorter interval if you need near-real-time updates.

> **Tip:** If you need two-way sync with conflict blocking, use [Google Calendar Sync](./google-calendar-sync.md) instead of an iCal feed.
