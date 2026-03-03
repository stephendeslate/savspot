import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import {
  QUEUE_BOOKINGS,
  QUEUE_PAYMENTS,
  QUEUE_INVOICES,
  QUEUE_GDPR,
} from '../bullmq/queue.constants';
import { ExpireReservationsProcessor } from './expire-reservations.processor';
import { AbandonedRecoveryProcessor } from './abandoned-recovery.processor';
import { ProcessCompletedBookingsProcessor } from './process-completed-bookings.processor';
import { EnforceApprovalDeadlinesProcessor } from './enforce-approval-deadlines.processor';
import { SendPaymentRemindersProcessor } from './send-payment-reminders.processor';
import { EnforcePaymentDeadlinesProcessor } from './enforce-payment-deadlines.processor';
import { RetryFailedPaymentsProcessor } from './retry-failed-payments.processor';
import { GenerateInvoicePdfProcessor } from './generate-invoice-pdf.processor';
import { CleanupRetentionProcessor } from './cleanup-retention.processor';

/**
 * Module that registers all scheduled background job processors.
 * Each processor handles one or more recurring or event-driven BullMQ jobs.
 *
 * Queue registration is handled by the global BullMqModule;
 * this module only wires up the processor classes.
 */
@Module({
  imports: [
    BullModule.registerQueue(
      { name: QUEUE_BOOKINGS },
      { name: QUEUE_PAYMENTS },
      { name: QUEUE_INVOICES },
      { name: QUEUE_GDPR },
    ),
  ],
  providers: [
    ExpireReservationsProcessor,
    AbandonedRecoveryProcessor,
    ProcessCompletedBookingsProcessor,
    EnforceApprovalDeadlinesProcessor,
    SendPaymentRemindersProcessor,
    EnforcePaymentDeadlinesProcessor,
    RetryFailedPaymentsProcessor,
    GenerateInvoicePdfProcessor,
    CleanupRetentionProcessor,
  ],
})
export class JobsModule {}
