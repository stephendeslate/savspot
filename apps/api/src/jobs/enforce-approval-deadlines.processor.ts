import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import {
  QUEUE_BOOKINGS,
  QUEUE_PAYMENTS,
  JOB_ENFORCE_APPROVAL_DEADLINES,
} from '../bullmq/queue.constants';

interface PendingApprovalRow {
  id: string;
  tenant_id: string;
  service_id: string;
  created_at: Date;
  approval_deadline_hours: number | null;
}

interface BookingPaymentRow {
  id: string;
  status: string;
}

/**
 * Auto-cancels PENDING bookings that have exceeded the service's
 * approval deadline (default 48 hours for MANUAL_APPROVAL services).
 * Scheduled hourly via BullMQ repeatable job.
 */
@Processor(QUEUE_BOOKINGS)
export class EnforceApprovalDeadlinesProcessor extends WorkerHost {
  private readonly logger = new Logger(EnforceApprovalDeadlinesProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_PAYMENTS) private readonly paymentsQueue: Queue,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== JOB_ENFORCE_APPROVAL_DEADLINES) {
      return;
    }

    this.logger.log('Running enforce approval deadlines job...');

    try {
      // Find PENDING bookings for MANUAL_APPROVAL services
      // where created_at + approval_deadline_hours < NOW()
      const expiredPendingBookings = await this.prisma.$queryRaw<PendingApprovalRow[]>`
        SELECT
          b.id,
          b.tenant_id,
          b.service_id,
          b.created_at,
          s.approval_deadline_hours
        FROM bookings b
        JOIN services s ON s.id = b.service_id
        WHERE b.status = 'PENDING'
          AND s.confirmation_mode = 'MANUAL_APPROVAL'
          AND b.created_at + MAKE_INTERVAL(hours => COALESCE(s.approval_deadline_hours, 48)) < NOW()
      `;

      if (expiredPendingBookings.length === 0) {
        this.logger.log('No approval deadline violations found');
        return;
      }

      let cancelledCount = 0;

      for (const booking of expiredPendingBookings) {
        try {
          await this.prisma.$transaction(async (tx) => {
            await tx.$executeRaw`SELECT set_config('app.current_tenant', ${booking.tenant_id}, TRUE)`;

            // Cancel the booking with APPROVAL_TIMEOUT reason
            await tx.booking.update({
              where: { id: booking.id },
              data: {
                status: 'CANCELLED',
                cancellationReason: 'APPROVAL_TIMEOUT',
                cancelledAt: new Date(),
              },
            });

            // Create state history
            await tx.bookingStateHistory.create({
              data: {
                bookingId: booking.id,
                tenantId: booking.tenant_id,
                fromState: 'PENDING',
                toState: 'CANCELLED',
                triggeredBy: 'SYSTEM',
                reason: `Auto-cancelled: approval deadline exceeded (${booking.approval_deadline_hours ?? 48}h)`,
              },
            });
          });

          // Check if payment exists and enqueue refund
          const payments = await this.prisma.$queryRaw<BookingPaymentRow[]>`
            SELECT id, status FROM payments
            WHERE booking_id = ${booking.id}
              AND status = 'SUCCEEDED'
            LIMIT 1
          `;

          if (payments.length > 0) {
            await this.paymentsQueue.add('processRefund', {
              tenantId: booking.tenant_id,
              paymentId: payments[0]!.id,
              reason: 'APPROVAL_TIMEOUT',
            });

            this.logger.log(
              `Enqueued refund for payment ${payments[0]!.id} on booking ${booking.id}`,
            );
          }

          cancelledCount++;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          this.logger.error(
            `Failed to cancel booking ${booking.id} for approval timeout: ${message}`,
          );
        }
      }

      this.logger.log(
        `Cancelled ${cancelledCount}/${expiredPendingBookings.length} booking(s) for approval timeout`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed enforce approval deadlines: ${message}`);
      throw error;
    }
  }
}
