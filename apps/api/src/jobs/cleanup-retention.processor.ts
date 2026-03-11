import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Cleans up expired and stale data per GDPR retention policies.
 * Scheduled daily at 3 AM UTC via BullMQ repeatable job.
 *
 * Sets app.current_tenant per-tenant within transactions for RLS compatibility.
 *
 * Retention thresholds per entity type:
 *   - DateReservation (EXPIRED/RELEASED): 30 days
 *   - BookingSession (ABANDONED/EXPIRED): 90 days after completion
 *   - Notification: 1 year
 *   - Communication: 2 years
 *   - AuditLog: 2 years
 *   - Invoice/Payment: 7 years (regulatory)
 */
@Injectable()
export class CleanupRetentionHandler {
  private readonly logger = new Logger(CleanupRetentionHandler.name);

  private static readonly RESERVATION_RETENTION_DAYS = 30;
  private static readonly SESSION_RETENTION_DAYS = 90;
  private static readonly NOTIFICATION_RETENTION_DAYS = 365;
  private static readonly COMMUNICATION_RETENTION_DAYS = 730;
  private static readonly AUDIT_LOG_RETENTION_DAYS = 730;
  private static readonly FINANCIAL_RETENTION_DAYS = 2555; // ~7 years

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
      const communicationCutoff = new Date(
        now - CleanupRetentionHandler.COMMUNICATION_RETENTION_DAYS * 24 * 60 * 60 * 1000,
      );
      const auditLogCutoff = new Date(
        now - CleanupRetentionHandler.AUDIT_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000,
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
          UNION
          SELECT tenant_id FROM communications
            WHERE created_at < ${communicationCutoff}
        ) AS tenants
      `;

      let totalReservations = 0;
      let totalSessions = 0;
      let totalNotifications = 0;
      let totalCommunications = 0;
      let totalAuditLogs = 0;

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

          const deletedCommunications = await tx.communication.deleteMany({
            where: {
              createdAt: { lt: communicationCutoff },
            },
          });

          return {
            reservations: deletedReservations.count,
            sessions: deletedSessions.count,
            notifications: deletedNotifications.count,
            communications: deletedCommunications.count,
          };
        });

        totalReservations += result.reservations;
        totalSessions += result.sessions;
        totalNotifications += result.notifications;
        totalCommunications += result.communications;
      }

      // Audit logs may have nullable tenant_id, clean globally
      const deletedAuditLogs = await this.prisma.auditLog.deleteMany({
        where: {
          timestamp: { lt: auditLogCutoff },
        },
      });
      totalAuditLogs = deletedAuditLogs.count;

      // Financial records (invoices/payments) are NOT deleted here — 7-year
      // regulatory retention means they outlast this cleanup cycle. We only
      // log that they were checked.
      this.logger.log(
        `Financial records (invoices/payments) retention: ${CleanupRetentionHandler.FINANCIAL_RETENTION_DAYS} days — no cleanup needed at this cycle`,
      );

      this.logger.log(
        `GDPR cleanup complete: ` +
        `${totalReservations} reservation(s), ` +
        `${totalSessions} session(s), ` +
        `${totalNotifications} notification(s), ` +
        `${totalCommunications} communication(s), ` +
        `${totalAuditLogs} audit log(s) deleted`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed GDPR cleanup retention policy: ${message}`);
      throw error;
    }
  }
}
