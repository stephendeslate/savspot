import type { AbandonedRecoveryHandler } from '@/jobs/abandoned-recovery.processor';
import type { ComputeDemandAnalysisHandler } from '@/jobs/compute-demand-analysis.processor';
import type { ComputeNoShowRiskHandler } from '@/jobs/compute-no-show-risk.processor';
import type { EnforceApprovalDeadlinesHandler } from '@/jobs/enforce-approval-deadlines.processor';
import type { ExpireReservationsHandler } from '@/jobs/expire-reservations.processor';
import type { ProcessCompletedBookingsHandler } from '@/jobs/process-completed-bookings.processor';
import { inngest } from '../../inngest.client';

/**
 * Phase 4p — bookings queue Inngest cron functions. Replaces the
 * BullMQ BookingsDispatcher's six cron-triggered branches. Each
 * handler is a parameterless service method already; the closure
 * factories just wire them up to Inngest crons matching the
 * JobSchedulerService schedules.
 */

export const createExpireReservationsFunction = (
  handler: ExpireReservationsHandler,
) =>
  inngest.createFunction(
    { id: 'bookings-expire-reservations', name: 'Expire stale reservations' },
    { cron: '*/5 * * * *' },
    async () => {
      await handler.handle();
      return { ok: true };
    },
  );

export const createAbandonedBookingRecoveryFunction = (
  handler: AbandonedRecoveryHandler,
) =>
  inngest.createFunction(
    {
      id: 'bookings-abandoned-recovery',
      name: 'Recover abandoned booking sessions',
    },
    { cron: '*/15 * * * *' },
    async () => {
      await handler.handle();
      return { ok: true };
    },
  );

export const createProcessCompletedBookingsFunction = (
  handler: ProcessCompletedBookingsHandler,
) =>
  inngest.createFunction(
    {
      id: 'bookings-process-completed',
      name: 'Process completed bookings',
    },
    { cron: '0 * * * *' },
    async () => {
      await handler.handle();
      return { ok: true };
    },
  );

export const createEnforceApprovalDeadlinesFunction = (
  handler: EnforceApprovalDeadlinesHandler,
) =>
  inngest.createFunction(
    {
      id: 'bookings-enforce-approval-deadlines',
      name: 'Enforce booking approval deadlines',
    },
    { cron: '*/15 * * * *' },
    async () => {
      await handler.handle();
      return { ok: true };
    },
  );

export const createComputeNoShowRiskFunction = (
  handler: ComputeNoShowRiskHandler,
) =>
  inngest.createFunction(
    {
      id: 'bookings-compute-no-show-risk',
      name: 'Compute no-show risk',
    },
    { cron: '0 4 * * *' },
    async () => {
      await handler.handle();
      return { ok: true };
    },
  );

export const createComputeDemandAnalysisFunction = (
  handler: ComputeDemandAnalysisHandler,
) =>
  inngest.createFunction(
    {
      id: 'bookings-compute-demand-analysis',
      name: 'Compute demand analysis',
    },
    { cron: '0 2 * * 0' },
    async () => {
      await handler.handle();
      return { ok: true };
    },
  );
