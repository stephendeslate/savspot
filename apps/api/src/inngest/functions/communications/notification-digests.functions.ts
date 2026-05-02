import type { ProcessNotificationDigestsHandler } from '@/jobs/process-notification-digests.processor';
import { inngest } from '../../inngest.client';

/**
 * Hourly Inngest cron: gathers unread notifications from the last hour
 * for users with HOURLY digest preference and sends a summary email
 * (one Communication row per user).
 *
 * Phase 4r port — replaces the JOB_PROCESS_HOURLY_DIGESTS branch in
 * `apps/api/src/communications/communications.dispatcher.ts` and the
 * matching CRON_HOURLY entry in JobSchedulerService.
 */
export const createProcessHourlyDigestsFunction = (
  handler: ProcessNotificationDigestsHandler,
) =>
  inngest.createFunction(
    {
      id: 'communications-process-hourly-digests',
      name: 'Process hourly notification digests',
    },
    { cron: '0 * * * *' },
    async () => {
      await handler.handleHourly();
      return { ok: true };
    },
  );

/**
 * Daily 8am UTC Inngest cron: gathers unread notifications from the
 * last 24 hours for users with DAILY digest preference and sends a
 * summary email.
 *
 * Phase 4r port — replaces the JOB_PROCESS_DAILY_DIGESTS branch in
 * `apps/api/src/communications/communications.dispatcher.ts` and the
 * matching CRON_DAILY_8AM_UTC entry in JobSchedulerService.
 */
export const createProcessDailyDigestsFunction = (
  handler: ProcessNotificationDigestsHandler,
) =>
  inngest.createFunction(
    {
      id: 'communications-process-daily-digests',
      name: 'Process daily notification digests',
    },
    { cron: '0 8 * * *' },
    async () => {
      await handler.handleDaily();
      return { ok: true };
    },
  );
