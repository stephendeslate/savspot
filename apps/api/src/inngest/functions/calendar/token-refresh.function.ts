import type { CalendarTokenHandler } from '@/calendar/calendar-token.processor';
import { inngest } from '../../inngest.client';

/**
 * Hourly Inngest cron: proactively refreshes OAuth access tokens for
 * all ACTIVE calendar connections whose token expires within the next
 * 30 minutes. Prevents token expiry from blocking scheduled syncs.
 *
 * Phase 4q port — replaces the JOB_CALENDAR_TOKEN_REFRESH branch in
 * `apps/api/src/calendar/calendar.dispatcher.ts` and the matching
 * CRON_HOURLY entry in `JobSchedulerService.schedules`.
 */
export const createCalendarTokenRefreshFunction = (
  handler: CalendarTokenHandler,
) =>
  inngest.createFunction(
    {
      id: 'calendar-token-refresh',
      name: 'Refresh expiring calendar OAuth tokens',
    },
    { cron: '0 * * * *' },
    async () => {
      await handler.handle();
      return { ok: true };
    },
  );
