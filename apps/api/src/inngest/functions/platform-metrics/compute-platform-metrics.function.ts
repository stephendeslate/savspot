import type { PlatformMetricsService } from '@/platform-metrics/platform-metrics.service';
import { inngest } from '../../inngest.client';

/**
 * Daily Inngest cron: computes platform-wide metrics (per-tenant rollups
 * + global aggregates) at 3am UTC. Mirrors the BullMQ
 * JOB_COMPUTE_PLATFORM_METRICS schedule (CRON_DAILY_3AM_UTC).
 *
 * Phase 4i port — replaces the JOB_COMPUTE_PLATFORM_METRICS branch in
 * `apps/api/src/platform-metrics/platform-metrics.processor.ts`.
 */
export const createComputePlatformMetricsFunction = (
  metricsService: PlatformMetricsService,
) =>
  inngest.createFunction(
    {
      id: 'platform-metrics-compute',
      name: 'Compute platform metrics',
    },
    { cron: '0 3 * * *' },
    async () => {
      await metricsService.computeAllMetrics();
      return { ok: true };
    },
  );
