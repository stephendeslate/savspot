import type { CalendarSyncFallbackHandler } from '@/calendar/handlers/calendar-sync-fallback.handler';
import { inngest } from '../../inngest.client';

/**
 * Every-30-min Inngest cron: scans ACTIVE calendar connections whose
 * `lastSyncedAt` is null or older than 30 minutes and triggers a
 * per-connection `syncConnection()` for each. Catches connections
 * whose push-notification channel has lapsed or never registered.
 *
 * Phase 4q port — replaces the JOB_CALENDAR_SYNC_FALLBACK branch in
 * `apps/api/src/calendar/calendar.dispatcher.ts` and the matching
 * CRON_EVERY_30_MIN entry in `JobSchedulerService.schedules`.
 */
export const createCalendarSyncFallbackFunction = (
  handler: CalendarSyncFallbackHandler,
) =>
  inngest.createFunction(
    {
      id: 'calendar-sync-fallback',
      name: 'Calendar sync fallback sweep',
    },
    { cron: '*/30 * * * *' },
    async () => {
      await handler.handle();
      return { ok: true };
    },
  );
