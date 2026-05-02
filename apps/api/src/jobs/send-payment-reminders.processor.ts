import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JobDispatcher } from '../bullmq/job-dispatcher.service';
import {
  QUEUE_COMMUNICATIONS,
  JOB_DELIVER_COMMUNICATION,
} from '../bullmq/queue.constants';

interface DueInvoiceRow {
  id: string;
  tenant_id: string;
  booking_id: string;
  due_date: Date;
  total: string;
  currency: string;
  client_id: string;
  client_email: string;
  client_name: string;
  service_name: string;
}

/**
 * Sends payment reminders for invoices approaching their due date.
 * Checks 7, 3, and 1 day(s) before due_date.
 * Deduplicates via the booking_reminders table.
 * Scheduled every 15 minutes via BullMQ repeatable job.
 */
@Injectable()
export class SendPaymentRemindersHandler {
  private readonly logger = new Logger(SendPaymentRemindersHandler.name);

  private static readonly REMINDER_INTERVALS = [7, 3, 1] as const;

  constructor(
    private readonly prisma: PrismaService,
    private readonly dispatcher: JobDispatcher,
  ) {}

  async handle(): Promise<void> {
    this.logger.log('Running send payment reminders job...');

    try {
      // Find invoices with upcoming due dates that are not yet paid
      const unpaidInvoices = await this.prisma.$queryRaw<DueInvoiceRow[]>`
        SELECT
          i.id,
          i.tenant_id,
          i.booking_id,
          i.due_date,
          i.total::text,
          i.currency,
          b.client_id,
          u.email AS client_email,
          u.name AS client_name,
          s.name AS service_name
        FROM invoices i
        JOIN bookings b ON b.id = i.booking_id
        JOIN users u ON u.id = b.client_id
        JOIN services s ON s.id = b.service_id
        WHERE i.status IN ('DRAFT', 'SENT', 'PARTIALLY_PAID')
          AND i.due_date IS NOT NULL
          AND i.due_date > NOW()
      `;

      if (unpaidInvoices.length === 0) {
        this.logger.log('No invoices requiring payment reminders');
        return;
      }

      let sentCount = 0;

      for (const invoice of unpaidInvoices) {
        const dueDate = new Date(invoice.due_date);
        const now = new Date();
        const daysUntilDue = Math.ceil(
          (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );

        for (const intervalDays of SendPaymentRemindersHandler.REMINDER_INTERVALS) {
          if (daysUntilDue > intervalDays) {
            continue;
          }

          try {
            // Check for existing reminder and create within tenant context
            const created = await this.prisma.$transaction(async (tx) => {
              await tx.$executeRaw`SELECT set_config('app.current_tenant', ${invoice.tenant_id}, TRUE)`;

              // Check for existing reminder (deduplication)
              const existingReminder = await tx.bookingReminder.findUnique({
                where: {
                  bookingId_reminderType_intervalDays_channel: {
                    bookingId: invoice.booking_id,
                    reminderType: 'PAYMENT',
                    intervalDays,
                    channel: 'EMAIL',
                  },
                },
              });

              if (existingReminder) {
                return false;
              }

              // Create BookingReminder record
              await tx.bookingReminder.create({
                data: {
                  bookingId: invoice.booking_id,
                  tenantId: invoice.tenant_id,
                  reminderType: 'PAYMENT',
                  intervalDays,
                  channel: 'EMAIL',
                  status: 'PENDING',
                  scheduledFor: new Date(),
                },
              });

              return true;
            });

            if (!created) {
              continue;
            }

            // Dispatch deliverCommunication job (routes to BullMQ or Inngest
            // per QUEUE_COMMUNICATIONS_PROVIDER; outside transaction).
            await this.dispatcher.dispatch(QUEUE_COMMUNICATIONS, JOB_DELIVER_COMMUNICATION, {
              tenantId: invoice.tenant_id,
              template: 'payment-reminder',
              channel: 'EMAIL',
              recipientEmail: invoice.client_email,
              recipientName: invoice.client_name,
              data: {
                bookingId: invoice.booking_id,
                invoiceId: invoice.id,
                serviceName: invoice.service_name,
                amount: invoice.total,
                currency: invoice.currency,
                dueDate: invoice.due_date,
                daysUntilDue: intervalDays,
              },
            });

            sentCount++;
            this.logger.log(
              `Enqueued ${intervalDays}-day payment reminder for invoice ${invoice.id}`,
            );
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(
              `Failed to create payment reminder for invoice ${invoice.id}: ${message}`,
            );
          }
        }
      }

      this.logger.log(`Enqueued ${sentCount} payment reminder(s)`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed send payment reminders: ${message}`);
      throw error;
    }
  }
}
