import type {
  CalendarWebhookRenewGoogleHandler,
  CalendarWebhookRenewOutlookHandler,
} from '@/calendar/handlers/calendar-webhook-renew.handler';
import { inngest } from '../../inngest.client';

/**
 * Daily 3am UTC Inngest cron: renews Google Calendar push notification
 * channels (`calendar.events.watch`) for all ACTIVE Google connections
 * before their TTL elapses, keeping inbound webhook delivery alive.
 *
 * Phase 4q port — replaces the JOB_CALENDAR_WEBHOOK_RENEW_GOOGLE branch
 * in `apps/api/src/calendar/calendar.dispatcher.ts` and the matching
 * CRON_DAILY_3AM_UTC entry in `JobSchedulerService.schedules`.
 */
export const createCalendarWebhookRenewGoogleFunction = (
  handler: CalendarWebhookRenewGoogleHandler,
) =>
  inngest.createFunction(
    {
      id: 'calendar-webhook-renew-google',
      name: 'Renew Google calendar webhook subscriptions',
    },
    { cron: '0 3 * * *' },
    async () => {
      await handler.handle();
      return { ok: true };
    },
  );

/**
 * Daily 3am UTC Inngest cron: renews Microsoft Graph subscription
 * resources (Outlook calendars) for all ACTIVE MICROSOFT connections.
 * Mirrors the Google variant; same schedule, different upstream API.
 *
 * Phase 4q port — replaces the JOB_CALENDAR_WEBHOOK_RENEW_OUTLOOK
 * branch in `apps/api/src/calendar/calendar.dispatcher.ts`.
 */
export const createCalendarWebhookRenewOutlookFunction = (
  handler: CalendarWebhookRenewOutlookHandler,
) =>
  inngest.createFunction(
    {
      id: 'calendar-webhook-renew-outlook',
      name: 'Renew Outlook calendar webhook subscriptions',
    },
    { cron: '0 3 * * *' },
    async () => {
      await handler.handle();
      return { ok: true };
    },
  );
