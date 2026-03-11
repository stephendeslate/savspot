import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  QUEUE_BOOKINGS,
  JOB_EXPIRE_RESERVATIONS,
  JOB_ABANDONED_BOOKING_RECOVERY,
  JOB_PROCESS_COMPLETED_BOOKINGS,
  JOB_ENFORCE_APPROVAL_DEADLINES,
  JOB_COMPUTE_NO_SHOW_RISK,
  JOB_COMPUTE_DEMAND_ANALYSIS,
} from '../bullmq/queue.constants';
import { ExpireReservationsHandler } from './expire-reservations.processor';
import { AbandonedRecoveryHandler } from './abandoned-recovery.processor';
import { ProcessCompletedBookingsHandler } from './process-completed-bookings.processor';
import { EnforceApprovalDeadlinesHandler } from './enforce-approval-deadlines.processor';
import { ComputeNoShowRiskHandler } from './compute-no-show-risk.processor';
import { ComputeDemandAnalysisHandler } from './compute-demand-analysis.processor';

@Processor(QUEUE_BOOKINGS)
export class BookingsDispatcher extends WorkerHost {
  private readonly logger = new Logger(BookingsDispatcher.name);

  constructor(
    private readonly expireReservations: ExpireReservationsHandler,
    private readonly abandonedRecovery: AbandonedRecoveryHandler,
    private readonly processCompleted: ProcessCompletedBookingsHandler,
    private readonly enforceApprovals: EnforceApprovalDeadlinesHandler,
    private readonly computeNoShowRisk: ComputeNoShowRiskHandler,
    private readonly computeDemandAnalysis: ComputeDemandAnalysisHandler,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case JOB_EXPIRE_RESERVATIONS:
        return this.expireReservations.handle(job);
      case JOB_ABANDONED_BOOKING_RECOVERY:
        return this.abandonedRecovery.handle(job);
      case JOB_PROCESS_COMPLETED_BOOKINGS:
        return this.processCompleted.handle(job);
      case JOB_ENFORCE_APPROVAL_DEADLINES:
        return this.enforceApprovals.handle(job);
      case JOB_COMPUTE_NO_SHOW_RISK:
        return this.computeNoShowRisk.handle(job);
      case JOB_COMPUTE_DEMAND_ANALYSIS:
        return this.computeDemandAnalysis.handle(job);
      default:
        this.logger.warn(`Unknown bookings job: ${job.name}`);
    }
  }
}
