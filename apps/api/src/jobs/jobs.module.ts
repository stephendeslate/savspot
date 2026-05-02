import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import {
  QUEUE_BOOKINGS,
  QUEUE_PAYMENTS,
  QUEUE_CALENDAR,
  QUEUE_COMMUNICATIONS,
  QUEUE_INVOICES,
  QUEUE_GDPR,
  QUEUE_PLATFORM_METRICS,
  QUEUE_AI_OPERATIONS,
  QUEUE_DIRECTORY,
  QUEUE_CUSTOM_DOMAINS,
  QUEUE_PARTNERS,
} from '../bullmq/queue.constants';
import { PaymentsModule } from '../payments/payments.module';
import { CommunicationsModule } from '../communications/communications.module';
import { UploadModule } from '../upload/upload.module';
// Dispatchers (one @Processor per queue)
import { BookingsDispatcher } from './bookings.dispatcher';
import { PaymentsDispatcher } from './payments.dispatcher';
import { GdprDispatcher } from './gdpr.dispatcher';
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
// Invoice processor (single worker — no dispatcher needed)
import { GenerateInvoicePdfProcessor } from './generate-invoice-pdf.processor';
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
 * Module that registers all scheduled background job processors.
 *
 * Each queue has a single Dispatcher (@Processor) that routes jobs by name
 * to Injectable handler classes. This prevents BullMQ from creating competing
 * workers that silently drop jobs.
 *
 * JobSchedulerService registers all repeatable cron schedules on module init.
 */
@Module({
  imports: [
    BullModule.registerQueue(
      { name: QUEUE_BOOKINGS },
      { name: QUEUE_PAYMENTS },
      { name: QUEUE_CALENDAR },
      { name: QUEUE_COMMUNICATIONS },
      { name: QUEUE_INVOICES },
      { name: QUEUE_GDPR },
      { name: QUEUE_PLATFORM_METRICS },
      { name: QUEUE_AI_OPERATIONS },
      { name: QUEUE_DIRECTORY },
      { name: QUEUE_CUSTOM_DOMAINS },
      { name: QUEUE_PARTNERS },
    ),
    PaymentsModule,
    CommunicationsModule,
    UploadModule,
  ],
  providers: [
    JobSchedulerService,
    // Dispatchers
    BookingsDispatcher,
    PaymentsDispatcher,
    GdprDispatcher,
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
    // Invoice (single processor, no dispatcher)
    InvoicePdfService,
    GenerateInvoicePdfProcessor,
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
  ],
})
export class JobsModule {}
