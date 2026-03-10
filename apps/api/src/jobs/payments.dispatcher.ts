import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  QUEUE_PAYMENTS,
  JOB_SEND_PAYMENT_REMINDERS,
  JOB_ENFORCE_PAYMENT_DEADLINES,
  JOB_RETRY_FAILED_PAYMENTS,
  JOB_PROCESS_WEBHOOK_RETRIES,
  JOB_DETECT_ORPHAN_PAYMENTS,
  JOB_RECONCILE_PAYMENTS,
} from '../bullmq/queue.constants';
import { SendPaymentRemindersHandler } from './send-payment-reminders.processor';
import { EnforcePaymentDeadlinesHandler } from './enforce-payment-deadlines.processor';
import { RetryFailedPaymentsHandler } from './retry-failed-payments.processor';
import { ProcessWebhookRetriesHandler } from './process-webhook-retries.processor';
import { DetectOrphanPaymentsHandler } from './detect-orphan-payments.processor';
import { ReconcilePaymentsHandler } from './reconcile-payments.processor';

@Processor(QUEUE_PAYMENTS)
export class PaymentsDispatcher extends WorkerHost {
  private readonly logger = new Logger(PaymentsDispatcher.name);

  constructor(
    private readonly sendReminders: SendPaymentRemindersHandler,
    private readonly enforceDeadlines: EnforcePaymentDeadlinesHandler,
    private readonly retryFailed: RetryFailedPaymentsHandler,
    private readonly processWebhookRetries: ProcessWebhookRetriesHandler,
    private readonly detectOrphanPayments: DetectOrphanPaymentsHandler,
    private readonly reconcilePayments: ReconcilePaymentsHandler,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case JOB_SEND_PAYMENT_REMINDERS:
        return this.sendReminders.handle(job);
      case JOB_ENFORCE_PAYMENT_DEADLINES:
        return this.enforceDeadlines.handle(job);
      case JOB_RETRY_FAILED_PAYMENTS:
        return this.retryFailed.handle(job);
      case JOB_PROCESS_WEBHOOK_RETRIES:
        return this.processWebhookRetries.handle(job);
      case JOB_DETECT_ORPHAN_PAYMENTS:
        return this.detectOrphanPayments.handle(job);
      case JOB_RECONCILE_PAYMENTS:
        return this.reconcilePayments.handle(job);
      default:
        this.logger.warn(`Unknown payments job: ${job.name}`);
    }
  }
}
