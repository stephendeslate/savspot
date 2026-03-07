import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import {
  QUEUE_BOOKINGS,
  QUEUE_PAYMENTS,
  QUEUE_COMMUNICATIONS,
  QUEUE_INVOICES,
  QUEUE_GDPR,
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
// Invoice processor (single worker — no dispatcher needed)
import { GenerateInvoicePdfProcessor } from './generate-invoice-pdf.processor';
// GDPR handlers
import { CleanupRetentionHandler } from './cleanup-retention.processor';
import { DataExportHandler } from './data-export.processor';
import { AccountDeletionHandler } from './account-deletion.processor';
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
      { name: QUEUE_COMMUNICATIONS },
      { name: QUEUE_INVOICES },
      { name: QUEUE_GDPR },
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
    // Invoice (single processor, no dispatcher)
    GenerateInvoicePdfProcessor,
    // GDPR handlers
    CleanupRetentionHandler,
    DataExportHandler,
    AccountDeletionHandler,
  ],
})
export class JobsModule {}
