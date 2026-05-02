import type { ComputeBenchmarksHandler } from '@/jobs/compute-benchmarks.processor';
import { inngest } from '../../inngest.client';

/**
 * Daily Inngest cron: rebuilds platform-wide category benchmarks
 * (p25/p50/p75 metrics per business_category) for the directory and
 * insights surfaces. Mirrors the BullMQ JOB_COMPUTE_BENCHMARKS schedule
 * (registered under the GDPR queue, CRON_DAILY_5AM_UTC).
 *
 * Phase 4m port — replaces the JOB_COMPUTE_BENCHMARKS branch in
 * `apps/api/src/jobs/gdpr.dispatcher.ts`.
 */
export const createComputeBenchmarksFunction = (
  handler: ComputeBenchmarksHandler,
) =>
  inngest.createFunction(
    {
      id: 'gdpr-compute-benchmarks',
      name: 'Compute category benchmarks',
    },
    { cron: '0 5 * * *' },
    async () => {
      await handler.handle();
      return { ok: true };
    },
  );
