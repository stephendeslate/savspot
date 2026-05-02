import type { WeeklyDigestHandler } from '@/sms/weekly-digest.processor';
import { inngest } from '../../inngest.client';

/**
 * Monday 8am UTC Inngest cron: builds the prior-week stats per active
 * tenant (bookings completed, revenue collected, new clients,
 * no-shows) and dispatches a weekly-digest email to the OWNER. Skips
 * tenants with zero activity.
 *
 * Phase 4r port — replaces the JOB_SEND_WEEKLY_DIGEST branch in
 * `apps/api/src/communications/communications.dispatcher.ts` and the
 * matching CRON_MONDAY_8AM_UTC entry in JobSchedulerService.
 */
export const createSendWeeklyDigestFunction = (
  handler: WeeklyDigestHandler,
) =>
  inngest.createFunction(
    {
      id: 'communications-send-weekly-digest',
      name: 'Send weekly digest emails',
    },
    { cron: '0 8 * * 1' },
    async () => {
      await handler.handle();
      return { ok: true };
    },
  );
