import type { CalendarSyncHandler } from '@/calendar/calendar-sync.processor';
import { inngest } from '../../inngest.client';

/**
 * Event-triggered Inngest function: per-connection two-way calendar
 * sync. Performs incremental inbound sync from the upstream provider
 * (Google or Outlook), records the result, and detects conflicts with
 * existing bookings.
 *
 * Triggered by `calendar/calendarTwoWaySync` events dispatched from:
 *   - `GoogleCalendarService.manualSync()` — user-initiated refresh
 *   - `CalendarWebhookController` — Google push notification
 *   - `OutlookWebhookController` — Microsoft Graph change notification
 *   - `CalendarSyncFallbackHandler` — every-30-min sweep over stale
 *     connections (this also runs as an Inngest cron post-cutover).
 *
 * Phase 4q port — replaces the JOB_CALENDAR_TWO_WAY_SYNC branch in
 * `apps/api/src/calendar/calendar.dispatcher.ts`.
 */
export const createCalendarTwoWaySyncFunction = (
  handler: CalendarSyncHandler,
) =>
  inngest.createFunction(
    {
      id: 'calendar-two-way-sync',
      name: 'Two-way calendar sync',
    },
    { event: 'calendar/calendarTwoWaySync' },
    async ({ event }) => {
      await handler.handle(event.data);
      return { ok: true, connectionId: event.data.connectionId };
    },
  );
