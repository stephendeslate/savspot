import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';
import { CommunicationsModule } from '../communications/communications.module';
import { UploadModule } from '../upload/upload.module';
// Bookings handlers
import { ExpireReservationsHandler } from './expire-reservations.processor';
import { AbandonedRecoveryHandler } from './abandoned-recovery.processor';
import { ProcessCompletedBookingsHandler } from './process-completed-bookings.processor';
import { EnforceApprovalDeadlinesHandler } from './enforce-approval-deadlines.processor';
// Payments handlers
import { SendPaymentRemindersHandler } from './send-payment-reminders.processor';
import { EnforcePaymentDeadlinesHandler } from './enforce-payment-deadlines.processor';
import { RetryFailedPaymentsHandler } from './retry-failed-payments.processor';
import { ProcessWebhookRetriesHandler } from './process-webhook-retries.processor';
import { DetectOrphanPaymentsHandler } from './detect-orphan-payments.processor';
import { ReconcilePaymentsHandler } from './reconcile-payments.processor';
// Invoice service (BullMQ processor retired in Phase 4n cleanup)
import { InvoicePdfService } from './invoice-pdf.service';
// GDPR handlers
import { CleanupRetentionHandler } from './cleanup-retention.processor';
import { DataExportHandler } from './data-export.processor';
import { AccountDeletionHandler } from './account-deletion.processor';
// AI Operations handlers
import { ComputeNoShowRiskHandler } from './compute-no-show-risk.processor';
import { ComputeClientInsightsHandler } from './compute-client-insights.processor';
import { ComputeDemandAnalysisHandler } from './compute-demand-analysis.processor';
import { ComputeBenchmarksHandler } from './compute-benchmarks.processor';
import { JobSchedulerService } from './job-scheduler.service';

/**
 * Module that exposes the handler classes formerly invoked by per-queue
 * BullMQ dispatchers. Each handler is now invoked directly by an Inngest
 * function defined in `apps/api/src/inngest/functions/`.
 *
 * Phase 4l-4s cleanup retired the BullMQ dispatchers (BookingsDispatcher,
 * PaymentsDispatcher, GdprDispatcher, GenerateInvoicePdfProcessor) and the
 * per-feature-module @Processor classes. JobSchedulerService remains for
 * the one-shot Redis cleanup of stale repeatable entries; it has an empty
 * schedules array post-cleanup and will be deleted in Phase 4 cleanup B.
 */
@Module({
  imports: [
    PaymentsModule,
    CommunicationsModule,
    UploadModule,
  ],
  providers: [
    JobSchedulerService,
    // Bookings handlers
    ExpireReservationsHandler,
    AbandonedRecoveryHandler,
    ProcessCompletedBookingsHandler,
    EnforceApprovalDeadlinesHandler,
    // Payments handlers
    SendPaymentRemindersHandler,
    EnforcePaymentDeadlinesHandler,
    RetryFailedPaymentsHandler,
    ProcessWebhookRetriesHandler,
    DetectOrphanPaymentsHandler,
    ReconcilePaymentsHandler,
    // Invoice service (PDF rendering — used by Inngest function directly)
    InvoicePdfService,
    // GDPR handlers
    CleanupRetentionHandler,
    DataExportHandler,
    AccountDeletionHandler,
    // AI Operations handlers
    ComputeNoShowRiskHandler,
    ComputeClientInsightsHandler,
    ComputeDemandAnalysisHandler,
    ComputeBenchmarksHandler,
  ],
  exports: [
    // Exposed for InngestModule (Phase 4m onward) so the Inngest controller
    // can DI handler/service classes into closure factories.
    CleanupRetentionHandler,
    DataExportHandler,
    AccountDeletionHandler,
    ComputeBenchmarksHandler,
    InvoicePdfService,
    // Phase 4p — bookings handlers
    ExpireReservationsHandler,
    AbandonedRecoveryHandler,
    ProcessCompletedBookingsHandler,
    EnforceApprovalDeadlinesHandler,
    ComputeNoShowRiskHandler,
    ComputeDemandAnalysisHandler,
    // Phase 4s — payments handlers
    SendPaymentRemindersHandler,
    EnforcePaymentDeadlinesHandler,
    RetryFailedPaymentsHandler,
  ],
})
export class JobsModule {}
