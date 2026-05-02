import type { CleanupRetentionHandler } from '@/jobs/cleanup-retention.processor';
import { inngest } from '../../inngest.client';

/**
 * Daily Inngest cron: enforces GDPR retention policies — deletes
 * stale reservations (30d), abandoned booking sessions (90d),
 * notifications (1y), and communications (2y) per-tenant with
 * RLS context. Mirrors the BullMQ JOB_CLEANUP_RETENTION schedule
 * (CRON_DAILY_3AM_UTC).
 *
 * Phase 4m port — replaces the JOB_CLEANUP_RETENTION branch in
 * `apps/api/src/jobs/gdpr.dispatcher.ts`.
 */
export const createCleanupRetentionFunction = (
  handler: CleanupRetentionHandler,
) =>
  inngest.createFunction(
    {
      id: 'gdpr-cleanup-retention',
      name: 'Run GDPR retention cleanup',
    },
    { cron: '0 3 * * *' },
    async () => {
      await handler.handle();
      return { ok: true };
    },
  );
