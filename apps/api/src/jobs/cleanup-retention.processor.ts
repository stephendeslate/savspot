import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Cleans up expired and stale data per GDPR retention policies.
 * Scheduled daily at 3 AM UTC via BullMQ repeatable job.
 *
 * Sets app.current_tenant per-tenant within transactions for RLS compatibility.
 *
 * Retention rules:
 *   - DateReservation (EXPIRED/RELEASED): hard delete after 30 days
 *   - BookingSession (ABANDONED/EXPIRED): hard delete after 90 days
 *   - Notification: hard delete after 1 year
 */
@Injectable()
export class CleanupRetentionHandler {
  private readonly logger = new Logger(CleanupRetentionHandler.name);

  private static readonly RESERVATION_RETENTION_DAYS = 30;
  private static readonly SESSION_RETENTION_DAYS = 90;
  private static readonly NOTIFICATION_RETENTION_DAYS = 365;

  constructor(private readonly prisma: PrismaService) {}

  async handle(_job: Job): Promise<void> {
    this.logger.log('Running GDPR cleanup retention policy job...');

    try {
      const now = Date.now();

      const reservationCutoff = new Date(
        now - CleanupRetentionHandler.RESERVATION_RETENTION_DAYS * 24 * 60 * 60 * 1000,
      );
      const sessionCutoff = new Date(
        now - CleanupRetentionHandler.SESSION_RETENTION_DAYS * 24 * 60 * 60 * 1000,
      );
      const notificationCutoff = new Date(
        now - CleanupRetentionHandler.NOTIFICATION_RETENTION_DAYS * 24 * 60 * 60 * 1000,
      );

      // Query distinct tenant IDs that have data eligible for cleanup
      const tenantRows = await this.prisma.$queryRaw<Array<{ tenant_id: string }>>`
        SELECT DISTINCT tenant_id FROM (
          SELECT tenant_id FROM date_reservations
            WHERE status IN ('EXPIRED', 'RELEASED') AND created_at < ${reservationCutoff}
          UNION
          SELECT tenant_id FROM booking_sessions
            WHERE status IN ('ABANDONED', 'EXPIRED') AND created_at < ${sessionCutoff}
          UNION
          SELECT tenant_id FROM notifications
            WHERE created_at < ${notificationCutoff}
        ) AS tenants
      `;

      let totalReservations = 0;
      let totalSessions = 0;
      let totalNotifications = 0;

      for (const { tenant_id: tenantId } of tenantRows) {
        const result = await this.prisma.$transaction(async (tx) => {
          await tx.$executeRaw`SELECT set_config('app.current_tenant', ${tenantId}, TRUE)`;

          const deletedReservations = await tx.dateReservation.deleteMany({
            where: {
              status: { in: ['EXPIRED', 'RELEASED'] },
              createdAt: { lt: reservationCutoff },
            },
          });

          const deletedSessions = await tx.bookingSession.deleteMany({
            where: {
              status: { in: ['ABANDONED', 'EXPIRED'] },
              createdAt: { lt: sessionCutoff },
            },
          });

          const deletedNotifications = await tx.notification.deleteMany({
            where: {
              createdAt: { lt: notificationCutoff },
            },
          });

          return {
            reservations: deletedReservations.count,
            sessions: deletedSessions.count,
            notifications: deletedNotifications.count,
          };
        });

        totalReservations += result.reservations;
        totalSessions += result.sessions;
        totalNotifications += result.notifications;
      }

      this.logger.log(
        `GDPR cleanup complete: ` +
        `${totalReservations} reservation(s), ` +
        `${totalSessions} session(s), ` +
        `${totalNotifications} notification(s) deleted`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed GDPR cleanup retention policy: ${message}`);
      throw error;
    }
  }
}
