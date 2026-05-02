import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface StalePaymentRow {
  id: string;
  tenant_id: string;
  booking_id: string;
  status: string;
  amount: string;
  currency: string;
  created_at: Date;
}

/**
 * Detects orphan and stale payments per SRS-3 §15.
 * Scheduled hourly via BullMQ repeatable job.
 *
 * Flags and cleans up:
 * 1. PENDING payments older than 1 hour → mark FAILED
 * 2. PROCESSING payments older than 30 minutes → mark FAILED
 * 3. SUCCEEDED payments with no associated booking → log warning
 */
@Injectable()
export class DetectOrphanPaymentsHandler {
  private readonly logger = new Logger(DetectOrphanPaymentsHandler.name);

  constructor(private readonly prisma: PrismaService) {}

  async handle(): Promise<void> {
    this.logger.log('Running detect orphan payments job...');

    try {
      await this.handleStalePending();
      await this.handleStaleProcessing();
      await this.handleSucceededWithoutBooking();

      this.logger.log('Detect orphan payments job complete');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed detect orphan payments: ${message}`);
      throw error;
    }
  }

  /**
   * Finds PENDING payments older than 1 hour and marks them as FAILED.
   */
  private async handleStalePending(): Promise<void> {
    const stalePayments = await this.prisma.$queryRaw<StalePaymentRow[]>`
      SELECT id, tenant_id, booking_id, status, amount::text, currency, created_at
      FROM payments
      WHERE status = 'PENDING'
        AND created_at < NOW() - INTERVAL '1 hour'
      LIMIT 500
    `;

    if (stalePayments.length === 0) {
      return;
    }

    this.logger.warn(
      `Found ${stalePayments.length} stale PENDING payment(s) older than 1 hour`,
    );

    for (const payment of stalePayments) {
      try {
        await this.markPaymentFailed(payment, 'Stale PENDING payment — exceeded 1 hour threshold');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(
          `Failed to mark stale PENDING payment ${payment.id} as FAILED: ${message}`,
        );
      }
    }
  }

  /**
   * Finds PROCESSING payments older than 30 minutes and marks them as FAILED.
   */
  private async handleStaleProcessing(): Promise<void> {
    const stalePayments = await this.prisma.$queryRaw<StalePaymentRow[]>`
      SELECT id, tenant_id, booking_id, status, amount::text, currency, created_at
      FROM payments
      WHERE status = 'PROCESSING'
        AND created_at < NOW() - INTERVAL '30 minutes'
      LIMIT 500
    `;

    if (stalePayments.length === 0) {
      return;
    }

    this.logger.warn(
      `Found ${stalePayments.length} stale PROCESSING payment(s) older than 30 minutes`,
    );

    for (const payment of stalePayments) {
      try {
        await this.markPaymentFailed(payment, 'Stale PROCESSING payment — exceeded 30 minute threshold');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(
          `Failed to mark stale PROCESSING payment ${payment.id} as FAILED: ${message}`,
        );
      }
    }
  }

  /**
   * Finds SUCCEEDED payments with no associated booking and logs warnings.
   * These require manual investigation — we do not modify them automatically.
   */
  private async handleSucceededWithoutBooking(): Promise<void> {
    // Payments where the booking no longer exists (orphaned)
    const orphanPayments = await this.prisma.$queryRaw<StalePaymentRow[]>`
      SELECT p.id, p.tenant_id, p.booking_id, p.status, p.amount::text, p.currency, p.created_at
      FROM payments p
      LEFT JOIN bookings b ON b.id = p.booking_id
      WHERE p.status = 'SUCCEEDED'
        AND b.id IS NULL
      LIMIT 100
    `;

    if (orphanPayments.length === 0) {
      return;
    }

    this.logger.warn(
      `Found ${orphanPayments.length} SUCCEEDED payment(s) with no associated booking — manual review required`,
    );

    for (const payment of orphanPayments) {
      this.logger.warn(
        `Orphan SUCCEEDED payment ${payment.id}: tenant=${payment.tenant_id}, ` +
        `booking_id=${payment.booking_id}, amount=${payment.amount} ${payment.currency}`,
      );
    }
  }

  /**
   * Marks a payment as FAILED and records a state history entry.
   */
  private async markPaymentFailed(
    payment: StalePaymentRow,
    reason: string,
  ): Promise<void> {
    // Use explicit enum values matching what the existing handlers use
    const fromState = payment.status === 'PENDING' ? 'PENDING' as const : 'PROCESSING' as const;

    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant', ${payment.tenant_id}, TRUE)`;

      await tx.$executeRaw`
        UPDATE payments
        SET status = 'FAILED'
        WHERE id = ${payment.id}
      `;

      await tx.paymentStateHistory.create({
        data: {
          paymentId: payment.id,
          tenantId: payment.tenant_id,
          fromState,
          toState: 'FAILED',
          triggeredBy: 'SYSTEM',
          reason,
        },
      });
    });

    this.logger.log(
      `Payment ${payment.id} marked FAILED: ${reason}`,
    );
  }
}
