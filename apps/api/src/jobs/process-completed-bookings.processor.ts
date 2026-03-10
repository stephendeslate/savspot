import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';

interface CompletedBookingRow {
  id: string;
  tenant_id: string;
  service_id: string;
  client_id: string;
  start_time: Date;
  end_time: Date;
  client_email: string;
  client_name: string;
  service_name: string;
  source: string;
}

/**
 * Auto-completes CONFIRMED bookings whose end_time has passed.
 * Scheduled every 30 minutes via BullMQ repeatable job.
 *
 * Phase A (No-Show): In Phase 1 this is minimal — no-show detection
 * requires explicit admin flagging via the bookings controller.
 *
 * Phase B (Auto-Complete): Transitions CONFIRMED bookings past their
 * end_time to COMPLETED, creates BookingStateHistory records, and
 * fires BOOKING_COMPLETED events.
 *
 * Uses raw SQL with tenant context for RLS compatibility.
 */
@Injectable()
export class ProcessCompletedBookingsHandler {
  private readonly logger = new Logger(ProcessCompletedBookingsHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsService: EventsService,
  ) {}

  async handle(_job: Job): Promise<void> {
    this.logger.log('Running process completed bookings job...');

    try {
      // Phase B: Auto-complete CONFIRMED bookings past their end_time
      // We query without tenant context first to find all eligible bookings
      // across all tenants, then process each within its own tenant context.
      const eligibleBookings = await this.prisma.$queryRaw<CompletedBookingRow[]>`
        SELECT
          b.id,
          b.tenant_id,
          b.service_id,
          b.client_id,
          b.start_time,
          b.end_time,
          u.email AS client_email,
          u.name AS client_name,
          s.name AS service_name,
          b.source
        FROM bookings b
        JOIN users u ON u.id = b.client_id
        JOIN services s ON s.id = b.service_id
        WHERE b.status = 'CONFIRMED'
          AND b.end_time < NOW()
          AND b.check_in_status != 'NO_SHOW'
      `;

      if (eligibleBookings.length === 0) {
        this.logger.log('No bookings eligible for auto-completion');
        return;
      }

      let completedCount = 0;

      for (const booking of eligibleBookings) {
        try {
          await this.prisma.$transaction(async (tx) => {
            // Set tenant context for RLS
            await tx.$executeRaw`SELECT set_config('app.current_tenant', ${booking.tenant_id}, TRUE)`;

            // Transition to COMPLETED
            await tx.$executeRaw`
              UPDATE bookings
              SET status = 'COMPLETED', updated_at = NOW()
              WHERE id = ${booking.id}
                AND status = 'CONFIRMED'
            `;

            // Create BookingStateHistory record
            await tx.bookingStateHistory.create({
              data: {
                bookingId: booking.id,
                tenantId: booking.tenant_id,
                fromState: 'CONFIRMED',
                toState: 'COMPLETED',
                triggeredBy: 'SYSTEM',
                reason: 'Auto-completed: booking end time has passed',
              },
            });
          });

          // Fire BOOKING_COMPLETED event outside the transaction
          this.eventsService.emitBookingCompleted({
            tenantId: booking.tenant_id,
            bookingId: booking.id,
            serviceId: booking.service_id,
            clientId: booking.client_id,
            clientEmail: booking.client_email,
            clientName: booking.client_name,
            serviceName: booking.service_name,
            startTime: booking.start_time,
            endTime: booking.end_time,
            source: booking.source,
          });

          completedCount++;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          this.logger.error(
            `Failed to auto-complete booking ${booking.id}: ${message}`,
          );
          // Continue processing other bookings
        }
      }

      this.logger.log(
        `Auto-completed ${completedCount}/${eligibleBookings.length} booking(s)`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed process completed bookings: ${message}`);
      throw error;
    }
  }
}
