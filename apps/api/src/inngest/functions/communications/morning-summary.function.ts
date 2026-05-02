import type { MorningSummaryHandler } from '@/sms/morning-summary.processor';
import { inngest } from '../../inngest.client';

/**
 * Daily 6am UTC Inngest cron: sends a morning SMS summary to each
 * active tenant's OWNER. Redis-deduplicated by tenant + date so a
 * second invocation in the same UTC day is a no-op.
 *
 * Phase 4r port — replaces the JOB_SEND_MORNING_SUMMARY branch in
 * `apps/api/src/communications/communications.dispatcher.ts` and the
 * matching CRON_DAILY_6AM_UTC entry in JobSchedulerService.
 */
export const createSendMorningSummaryFunction = (
  handler: MorningSummaryHandler,
) =>
  inngest.createFunction(
    {
      id: 'communications-send-morning-summary',
      name: 'Send morning summary SMS',
    },
    { cron: '0 6 * * *' },
    async () => {
      await handler.handle();
      return { ok: true };
    },
  );
