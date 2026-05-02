import type { ComputeClientInsightsHandler } from '@/jobs/compute-client-insights.processor';
import { inngest } from '../../inngest.client';

/**
 * Daily 3am UTC Inngest cron: computes per-client behavioral insights
 * (optimal reminder lead-time bucket, median rebooking interval) from
 * historical bookings + reminders. Writes results to `client_profiles`.
 *
 * Phase 4r port — replaces the JOB_COMPUTE_CLIENT_INSIGHTS branch in
 * `apps/api/src/communications/communications.dispatcher.ts` and the
 * matching CRON_DAILY_3AM_UTC entry in JobSchedulerService.
 */
export const createComputeClientInsightsFunction = (
  handler: ComputeClientInsightsHandler,
) =>
  inngest.createFunction(
    {
      id: 'communications-compute-client-insights',
      name: 'Compute per-client insights',
    },
    { cron: '0 3 * * *' },
    async () => {
      await handler.handle();
      return { ok: true };
    },
  );
