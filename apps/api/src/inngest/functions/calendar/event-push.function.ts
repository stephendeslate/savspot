import type { CalendarPushHandler } from '@/calendar/calendar-push.processor';
import { inngest } from '../../inngest.client';

/**
 * Event-triggered Inngest function: pushes booking lifecycle events
 * (BOOKING_CONFIRMED / BOOKING_RESCHEDULED / BOOKING_CANCELLED) to the
 * tenant's connected Google Calendar. One event per active calendar
 * connection — fanout happens in `CalendarEventListener`.
 *
 * Triggered by `calendar/calendarEventPush` events from the dispatcher.
 *
 * Phase 4q port — replaces the JOB_CALENDAR_EVENT_PUSH branch in
 * `apps/api/src/calendar/calendar.dispatcher.ts`.
 */
export const createCalendarEventPushFunction = (
  handler: CalendarPushHandler,
) =>
  inngest.createFunction(
    {
      id: 'calendar-event-push',
      name: 'Push booking event to calendar',
    },
    { event: 'calendar/calendarEventPush' },
    async ({ event }) => {
      await handler.handle(event.data);
      return { ok: true, bookingId: event.data.bookingId };
    },
  );
