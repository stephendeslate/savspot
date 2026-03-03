import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import {
  QUEUE_PAYMENTS,
  JOB_ENFORCE_PAYMENT_DEADLINES,
} from '../bullmq/queue.constants';

interface OverdueInvoiceRow {
  id: string;
  tenant_id: string;
  booking_id: string;
  status: string;
  auto_cancel_on_overdue: boolean | null;
}

/**
 * Enforces payment deadlines by marking overdue invoices and
 * optionally cancelling associated bookings.
 * Scheduled daily at 6 AM UTC via BullMQ repeatable job.
 */
@Processor(QUEUE_PAYMENTS)
export class EnforcePaymentDeadlinesProcessor extends WorkerHost {
  private readonly logger = new Logger(EnforcePaymentDeadlinesProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== JOB_ENFORCE_PAYMENT_DEADLINES) {
      return;
    }

    this.logger.log('Running enforce payment deadlines job...');

    try {
      // Find overdue invoices with their service's auto_cancel_on_overdue setting
      const overdueInvoices = await this.prisma.$queryRaw<OverdueInvoiceRow[]>`
        SELECT
          i.id,
          i.tenant_id,
          i.booking_id,
          i.status,
          s.auto_cancel_on_overdue
        FROM invoices i
        JOIN bookings b ON b.id = i.booking_id
        JOIN services s ON s.id = b.service_id
        WHERE i.status NOT IN ('PAID', 'CANCELLED')
          AND i.due_date IS NOT NULL
          AND i.due_date < NOW()
      `;

      if (overdueInvoices.length === 0) {
        this.logger.log('No overdue invoices found');
        return;
      }

      let overdueCount = 0;
      let cancelledCount = 0;

      for (const invoice of overdueInvoices) {
        try {
          // Mark invoice as OVERDUE if not already
          if (invoice.status !== 'OVERDUE') {
            await this.prisma.invoice.update({
              where: { id: invoice.id },
              data: { status: 'OVERDUE' },
            });
            overdueCount++;
          }

          // Auto-cancel booking if auto_cancel_on_overdue is true or null (default true)
          const shouldAutoCancel = invoice.auto_cancel_on_overdue !== false;

          if (shouldAutoCancel) {
            // Check if booking is in a cancellable state
            const booking = await this.prisma.booking.findFirst({
              where: {
                id: invoice.booking_id,
                status: { in: ['PENDING', 'CONFIRMED'] },
              },
            });

            if (booking) {
              await this.prisma.$transaction(async (tx) => {
                await tx.$executeRaw`SELECT set_config('app.current_tenant', ${invoice.tenant_id}, TRUE)`;

                await tx.booking.update({
                  where: { id: invoice.booking_id },
                  data: {
                    status: 'CANCELLED',
                    cancellationReason: 'PAYMENT_TIMEOUT',
                    cancelledAt: new Date(),
                  },
                });

                await tx.bookingStateHistory.create({
                  data: {
                    bookingId: invoice.booking_id,
                    tenantId: invoice.tenant_id,
                    fromState: booking.status as 'PENDING' | 'CONFIRMED',
                    toState: 'CANCELLED',
                    triggeredBy: 'SYSTEM',
                    reason: 'Auto-cancelled: payment deadline exceeded',
                  },
                });
              });

              cancelledCount++;
              this.logger.log(
                `Auto-cancelled booking ${invoice.booking_id} for overdue payment (invoice ${invoice.id})`,
              );
            }
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          this.logger.error(
            `Failed to process overdue invoice ${invoice.id}: ${message}`,
          );
        }
      }

      this.logger.log(
        `Marked ${overdueCount} invoice(s) as overdue, cancelled ${cancelledCount} booking(s)`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed enforce payment deadlines: ${message}`);
      throw error;
    }
  }
}
