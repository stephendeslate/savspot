import type { PartnerPayoutService } from '@/partners/partner-payout.service';
import { inngest } from '../../inngest.client';

/**
 * Monthly Inngest cron: processes pending partner payouts on the 1st of
 * every month at midnight UTC. Mirrors the BullMQ `JOB_PARTNER_PAYOUT_BATCH`
 * schedule (CRON_FIRST_OF_MONTH).
 *
 * Idempotence note: `processPayoutBatch()` deduplicates via `paidSumMap`
 * within its transaction (already-paid amounts are subtracted), so two
 * sequential runs are safe. Concurrent runs at the same cron tick can
 * race (both observe pre-write state and both write payouts). Until the
 * BullMQ-side schedule is retired, dual-fire on the 1st of the month is
 * theoretically possible. The retirement follow-up commit MUST land before
 * the next monthly tick.
 *
 * Phase 4f port — replaces the JOB_PARTNER_PAYOUT_BATCH branch in
 * `apps/api/src/partners/partners.processor.ts`.
 */
export const createPartnerPayoutBatchFunction = (
  partnerPayoutService: PartnerPayoutService,
) =>
  inngest.createFunction(
    {
      id: 'partners-payout-batch',
      name: 'Process partner payouts',
    },
    { cron: '0 0 1 * *' },
    async () => {
      const result = await partnerPayoutService.processPayoutBatch();
      return { ok: true, ...result };
    },
  );
