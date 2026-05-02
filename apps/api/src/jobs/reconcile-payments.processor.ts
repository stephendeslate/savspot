import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StripeProvider } from '../payments/providers/stripe.provider';

interface SucceededPaymentRow {
  id: string;
  tenant_id: string;
  provider_transaction_id: string;
  amount: string;
  currency: string;
  status: string;
}

type MismatchType = 'AMOUNT_MISMATCH' | 'STATUS_MISMATCH' | 'PROVIDER_ERROR';

/**
 * Reconciles local payment records against Stripe.
 * Scheduled daily at 2 AM UTC via BullMQ repeatable job.
 *
 * Per SRS-3 §15:
 * 1. Finds local SUCCEEDED payments from the last 24 hours
 * 2. Verifies each against Stripe PaymentIntent status
 * 3. Logs mismatches for manual investigation
 */
@Injectable()
export class ReconcilePaymentsHandler {
  private readonly logger = new Logger(ReconcilePaymentsHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeProvider: StripeProvider,
  ) {}

  async handle(): Promise<void> {
    this.logger.log('Running reconcile payments job...');

    try {
      const succeededPayments = await this.prisma.$queryRaw<SucceededPaymentRow[]>`
        SELECT
          id,
          tenant_id,
          provider_transaction_id,
          amount::text,
          currency,
          status
        FROM payments
        WHERE status = 'SUCCEEDED'
          AND provider_transaction_id IS NOT NULL
          AND created_at >= NOW() - INTERVAL '24 hours'
        ORDER BY created_at ASC
        LIMIT 1000
      `;

      if (succeededPayments.length === 0) {
        this.logger.log('No succeeded payments to reconcile in the last 24 hours');
        return;
      }

      let matchCount = 0;
      let mismatchCount = 0;
      let errorCount = 0;

      for (const payment of succeededPayments) {
        try {
          const mismatch = await this.verifyAgainstStripe(payment);

          if (mismatch) {
            mismatchCount++;
            this.logger.warn(
              `Payment reconciliation mismatch [${mismatch}]: ` +
              `payment=${payment.id}, provider=${payment.provider_transaction_id}`,
            );
          } else {
            matchCount++;
          }
        } catch (error) {
          errorCount++;
          const message = error instanceof Error ? error.message : 'Unknown error';
          this.logger.error(
            `Failed to reconcile payment ${payment.id} ` +
            `(${payment.provider_transaction_id}): ${message}`,
          );
        }
      }

      this.logger.log(
        `Reconciliation complete: ${succeededPayments.length} payments checked, ` +
        `${matchCount} matched, ${mismatchCount} mismatched, ${errorCount} errors`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed reconcile payments: ${message}`);
      throw error;
    }
  }

  /**
   * Verifies a single payment against the Stripe PaymentIntent.
   * Returns the mismatch type if there's a discrepancy, or null if matched.
   */
  private async verifyAgainstStripe(
    payment: SucceededPaymentRow,
  ): Promise<MismatchType | null> {
    try {
      const intent = await this.stripeProvider.retrievePaymentIntent(
        payment.provider_transaction_id,
      );

      // Check status mismatch: local says SUCCEEDED but Stripe disagrees
      if (intent.status !== 'succeeded') {
        this.logger.warn(
          `STATUS_MISMATCH: Payment ${payment.id} is SUCCEEDED locally ` +
          `but Stripe status is "${intent.status}"`,
        );
        return 'STATUS_MISMATCH';
      }

      // Note: retrievePaymentIntent currently only returns { id, status }.
      // Amount reconciliation will be enabled when the provider method is
      // extended to return amount_received and currency fields.

      return null;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(
        `PROVIDER_ERROR: Could not verify payment ${payment.id} ` +
        `(${payment.provider_transaction_id}): ${message}`,
      );
      return 'PROVIDER_ERROR';
    }
  }
}
