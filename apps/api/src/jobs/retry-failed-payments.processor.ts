import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { StripeProvider } from '../payments/providers/stripe.provider';
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
 * For each eligible payment:
 * 1. Retrieves the PaymentIntent from Stripe to check current status
 * 2. If already succeeded, marks the local payment as SUCCEEDED
 * 3. If still requires_payment_method or requires_confirmation, attempts confirm()
 * 4. On success, updates local payment status to SUCCEEDED
 * 5. On failure, increments retry_count and schedules next retry with exponential backoff
 */
@Processor(QUEUE_PAYMENTS)
export class RetryFailedPaymentsProcessor extends WorkerHost {
  private readonly logger = new Logger(RetryFailedPaymentsProcessor.name);

  private static readonly MAX_RETRY_ATTEMPTS = 3;

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeProvider: StripeProvider,
  ) {
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
          if (!payment.provider_transaction_id) {
            this.logger.log(
              `Payment ${payment.id} has no provider transaction ID, skipping retry`,
            );
            // Still increment retry_count to avoid retrying indefinitely
            await this.incrementRetryCount(payment);
            continue;
          }

          await this.retryStripePayment(payment);
          retryCount++;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          this.logger.error(
            `Failed to process retry for payment ${payment.id}: ${message}`,
          );
          // Increment retry count even on unexpected errors to prevent infinite loops
          await this.incrementRetryCount(payment);
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

  /**
   * Attempts to retry a Stripe payment by retrieving its current status
   * and confirming if still in a retryable state.
   */
  private async retryStripePayment(payment: FailedPaymentRow): Promise<void> {
    const intentId = payment.provider_transaction_id!;
    const attemptNumber = payment.retry_count + 1;

    this.logger.log(
      `Retrying Stripe payment ${intentId} ` +
      `(attempt ${attemptNumber}/${RetryFailedPaymentsProcessor.MAX_RETRY_ATTEMPTS})`,
    );

    // Step 1: Retrieve current PaymentIntent status from Stripe
    const currentIntent = await this.stripeProvider.retrievePaymentIntent(intentId);

    // Step 2: Handle based on current Stripe status
    if (currentIntent.status === 'succeeded') {
      // Payment already succeeded on Stripe side — sync our local state
      this.logger.log(
        `Payment ${payment.id} (${intentId}) already succeeded on Stripe — syncing local status`,
      );
      await this.markPaymentSucceeded(payment);
      return;
    }

    if (currentIntent.status === 'canceled') {
      // Payment was canceled — no point retrying
      this.logger.log(
        `Payment ${payment.id} (${intentId}) is canceled on Stripe — exhausting retries`,
      );
      await this.exhaustRetries(payment, 'PaymentIntent canceled on Stripe');
      return;
    }

    // Only retry if the intent is in a confirmable state
    const retryableStatuses = ['requires_confirmation', 'requires_payment_method'];
    if (!retryableStatuses.includes(currentIntent.status)) {
      this.logger.log(
        `Payment ${payment.id} (${intentId}) has status "${currentIntent.status}" — not retryable, incrementing counter`,
      );
      await this.incrementRetryCount(payment);
      return;
    }

    // Step 3: Attempt to confirm the PaymentIntent
    try {
      const confirmResult = await this.stripeProvider.confirmPaymentIntent(intentId);

      if (confirmResult.status === 'succeeded') {
        this.logger.log(
          `Payment ${payment.id} (${intentId}) retry succeeded on attempt ${attemptNumber}`,
        );
        await this.markPaymentSucceeded(payment);
      } else {
        this.logger.log(
          `Payment ${payment.id} (${intentId}) confirm returned status "${confirmResult.status}" — scheduling next retry`,
        );
        await this.incrementRetryCount(payment);
      }
    } catch (stripeError) {
      const errorMsg = stripeError instanceof Error ? stripeError.message : 'Unknown Stripe error';
      this.logger.warn(
        `Stripe confirm failed for payment ${payment.id} (${intentId}): ${errorMsg}`,
      );
      await this.incrementRetryCount(payment);
    }
  }

  /**
   * Marks a payment as SUCCEEDED and records a state history entry.
   */
  private async markPaymentSucceeded(payment: FailedPaymentRow): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE payments
      SET status = 'SUCCEEDED',
          retry_count = retry_count + 1,
          next_retry_at = NULL
      WHERE id = ${payment.id}
    `;

    await this.prisma.paymentStateHistory.create({
      data: {
        paymentId: payment.id,
        tenantId: payment.tenant_id,
        fromState: 'FAILED',
        toState: 'SUCCEEDED',
        triggeredBy: 'SYSTEM',
        reason: `Payment retry succeeded (attempt ${payment.retry_count + 1})`,
      },
    });
  }

  /**
   * Increments the retry counter and calculates the next retry time
   * using exponential backoff.
   */
  private async incrementRetryCount(payment: FailedPaymentRow): Promise<void> {
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
  }

  /**
   * Exhausts all retry attempts for a payment that cannot be retried.
   */
  private async exhaustRetries(
    payment: FailedPaymentRow,
    reason: string,
  ): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE payments
      SET retry_count = ${RetryFailedPaymentsProcessor.MAX_RETRY_ATTEMPTS},
          next_retry_at = NULL
      WHERE id = ${payment.id}
    `;

    await this.prisma.paymentStateHistory.create({
      data: {
        paymentId: payment.id,
        tenantId: payment.tenant_id,
        fromState: 'FAILED',
        toState: 'FAILED',
        triggeredBy: 'SYSTEM',
        reason: `Retry exhausted: ${reason}`,
      },
    });
  }
}
