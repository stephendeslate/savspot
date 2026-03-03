import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import {
  QUEUE_PAYMENTS,
  JOB_RETRY_FAILED_PAYMENTS,
} from '../bullmq/queue.constants';

interface FailedPaymentRow {
  id: string;
  tenant_id: string;
  booking_id: string;
  provider_transaction_id: string | null;
  retry_count: number;
  amount: string;
  currency: string;
}

/**
 * Retries failed payments with exponential backoff.
 * Scheduled every 30 minutes via BullMQ repeatable job.
 *
 * Sprint 4 placeholder: actual Stripe retry logic depends on
 * full Stripe integration. Currently increments retry counter
 * and logs the attempt.
 */
@Processor(QUEUE_PAYMENTS)
export class RetryFailedPaymentsProcessor extends WorkerHost {
  private readonly logger = new Logger(RetryFailedPaymentsProcessor.name);

  private static readonly MAX_RETRY_ATTEMPTS = 3;

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== JOB_RETRY_FAILED_PAYMENTS) {
      return;
    }

    this.logger.log('Running retry failed payments job...');

    try {
      // Find failed payments eligible for retry:
      // - status = FAILED
      // - retry_count < MAX_RETRY_ATTEMPTS
      // - enough time has passed since last attempt (exponential backoff)
      const failedPayments = await this.prisma.$queryRaw<FailedPaymentRow[]>`
        SELECT
          id,
          tenant_id,
          booking_id,
          provider_transaction_id,
          retry_count,
          amount::text,
          currency
        FROM payments
        WHERE status = 'FAILED'
          AND retry_count < ${RetryFailedPaymentsProcessor.MAX_RETRY_ATTEMPTS}
          AND (
            next_retry_at IS NULL
            OR next_retry_at < NOW()
          )
      `;

      if (failedPayments.length === 0) {
        this.logger.log('No failed payments eligible for retry');
        return;
      }

      let retryCount = 0;

      for (const payment of failedPayments) {
        try {
          if (payment.provider_transaction_id) {
            // TODO: Actual Stripe retry via stripe.paymentIntents.confirm()
            // For Sprint 4, we increment the counter and schedule next retry.
            this.logger.log(
              `Would retry Stripe payment ${payment.provider_transaction_id} ` +
              `(attempt ${payment.retry_count + 1}/${RetryFailedPaymentsProcessor.MAX_RETRY_ATTEMPTS})`,
            );
          } else {
            this.logger.log(
              `Payment ${payment.id} has no provider transaction ID, skipping retry`,
            );
          }

          // Calculate next retry time with exponential backoff
          // Attempt 1: 30 min, Attempt 2: 2 hours, Attempt 3: 8 hours
          const backoffMinutes = Math.pow(4, payment.retry_count) * 30;
          const nextRetryAt = new Date(Date.now() + backoffMinutes * 60 * 1000);

          await this.prisma.$executeRaw`
            UPDATE payments
            SET retry_count = retry_count + 1,
                next_retry_at = ${nextRetryAt}
            WHERE id = ${payment.id}
          `;

          retryCount++;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          this.logger.error(
            `Failed to process retry for payment ${payment.id}: ${message}`,
          );
        }
      }

      this.logger.log(
        `Processed ${retryCount}/${failedPayments.length} payment retry attempt(s)`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed retry failed payments: ${message}`);
      throw error;
    }
  }
}
