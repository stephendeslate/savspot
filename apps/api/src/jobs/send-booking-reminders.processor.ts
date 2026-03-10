import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { CommunicationsService } from '../communications/communications.service';

interface UpcomingBookingRow {
  id: string;
  tenant_id: string;
  start_time: Date;
  client_id: string;
  service_id: string;
  client_email: string;
  client_name: string;
  service_name: string;
  provider_name: string | null;
  business_name: string;
  tenant_slug: string | null;
  logo_url: string | null;
  brand_color: string | null;
}

/**
 * Sends booking reminders for upcoming confirmed appointments.
 * Supports both 24h (intervalDays=1) and 48h (intervalDays=2) reminders.
 * Scans for CONFIRMED bookings starting within the next 49 hours
 * (49h window ensures the 15-min cron cycle doesn't miss boundary bookings
 * for either the 24h or 48h reminder interval).
 * Deduplicates via the booking_reminders table unique constraint on
 * (bookingId, reminderType, intervalDays, channel).
 * Scheduled every 15 minutes via BullMQ repeatable job.
 */
@Injectable()
export class SendBookingRemindersHandler {
  private readonly logger = new Logger(SendBookingRemindersHandler.name);

  private static readonly REMINDER_INTERVALS = [1, 2] as const; // 1 day = 24h, 2 days = 48h

  constructor(
    private readonly prisma: PrismaService,
    private readonly communicationsService: CommunicationsService,
  ) {}

  async handle(_job: Job): Promise<void> {
    this.logger.log('Running send booking reminders job...');

    try {
      // Find CONFIRMED bookings starting in the next 49 hours
      // (covers both 24h and 48h reminder windows with 1h buffer for cron cycles)
      const upcomingBookings = await this.prisma.$queryRaw<UpcomingBookingRow[]>`
        SELECT
          b.id,
          b.tenant_id,
          b.start_time,
          b.client_id,
          b.service_id,
          u.email AS client_email,
          u.name AS client_name,
          s.name AS service_name,
          provider_user.name AS provider_name,
          t.name AS business_name,
          t.slug AS tenant_slug,
          t.logo_url,
          t.brand_color
        FROM bookings b
        JOIN users u ON u.id = b.client_id
        JOIN services s ON s.id = b.service_id
        JOIN tenants t ON t.id = b.tenant_id
        LEFT JOIN service_providers sp ON sp.service_id = b.service_id AND sp.tenant_id = b.tenant_id
        LEFT JOIN users provider_user ON provider_user.id = sp.user_id
        WHERE b.status = 'CONFIRMED'
          AND b.start_time > NOW()
          AND b.start_time <= NOW() + INTERVAL '49 hours'
      `;

      if (upcomingBookings.length === 0) {
        this.logger.log('No bookings requiring reminders');
        return;
      }

      let sentCount = 0;

      for (const booking of upcomingBookings) {
        for (const intervalDays of SendBookingRemindersHandler.REMINDER_INTERVALS) {
          try {
            // Only send reminder if the booking falls within the correct time
            // window for this interval. E.g. 24h reminder fires when booking is
            // 0-25h away; 48h reminder fires when booking is 24-49h away.
            // The deduplication unique constraint also prevents double-sends.
            const hoursUntilBooking =
              (new Date(booking.start_time).getTime() - Date.now()) / (1000 * 60 * 60);
            const intervalHours = intervalDays * 24;
            const previousIntervalHours = (intervalDays - 1) * 24;
            // Skip if booking is too far away for this interval
            if (hoursUntilBooking > intervalHours + 1) {
              continue;
            }
            // Skip if booking is close enough for a shorter interval
            // (e.g. don't send 48h reminder when booking is only 23h away)
            if (intervalDays > 1 && hoursUntilBooking <= previousIntervalHours + 1) {
              continue;
            }

            // Check for existing reminder and create within tenant context
            const created = await this.prisma.$transaction(async (tx) => {
              await tx.$executeRaw`SELECT set_config('app.current_tenant', ${booking.tenant_id}, TRUE)`;

              // Check for existing reminder (deduplication)
              const existingReminder = await tx.bookingReminder.findUnique({
                where: {
                  bookingId_reminderType_intervalDays_channel: {
                    bookingId: booking.id,
                    reminderType: 'BOOKING',
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
                  bookingId: booking.id,
                  tenantId: booking.tenant_id,
                  reminderType: 'BOOKING',
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

            // Enqueue deliverCommunication via CommunicationsService
            await this.communicationsService.createAndSend({
              tenantId: booking.tenant_id,
              recipientId: booking.client_id,
              recipientEmail: booking.client_email,
              recipientName: booking.client_name,
              channel: 'EMAIL',
              templateKey: 'booking-reminder',
              templateData: {
                clientName: booking.client_name,
                serviceName: booking.service_name,
                dateTime: this.formatDateTime(booking.start_time),
                providerName: booking.provider_name,
                businessName: booking.business_name,
                logoUrl: booking.logo_url,
                brandColor: booking.brand_color,
              },
              bookingId: booking.id,
            });

            sentCount++;
            this.logger.log(
              `Enqueued ${intervalDays}-day booking reminder for booking ${booking.id}`,
            );
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(
              `Failed to create booking reminder for booking ${booking.id}: ${message}`,
            );
          }
        }
      }

      this.logger.log(`Enqueued ${sentCount} booking reminder(s)`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed send booking reminders: ${message}`);
      throw error;
    }
  }

  private formatDateTime(date: Date): string {
    return new Date(date).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'UTC',
      timeZoneName: 'short',
    });
  }
}
