import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import {
  QUEUE_GDPR,
  JOB_CLEANUP_RETENTION,
} from '../bullmq/queue.constants';

/**
 * Cleans up expired and stale data per GDPR retention policies.
 * Scheduled daily at 3 AM UTC via BullMQ repeatable job.
 *
 * Retention rules:
 *   - DateReservation (EXPIRED/RELEASED): hard delete after 30 days
 *   - BookingSession (ABANDONED/EXPIRED): hard delete after 90 days
 *   - Notification: hard delete after 1 year
 */
@Processor(QUEUE_GDPR)
export class CleanupRetentionProcessor extends WorkerHost {
  private readonly logger = new Logger(CleanupRetentionProcessor.name);

  private static readonly RESERVATION_RETENTION_DAYS = 30;
  private static readonly SESSION_RETENTION_DAYS = 90;
  private static readonly NOTIFICATION_RETENTION_DAYS = 365;

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== JOB_CLEANUP_RETENTION) {
      return;
    }

    this.logger.log('Running GDPR cleanup retention policy job...');

    try {
      const now = Date.now();

      // 1. Clean up expired/released date reservations older than 30 days
      const reservationCutoff = new Date(
        now - CleanupRetentionProcessor.RESERVATION_RETENTION_DAYS * 24 * 60 * 60 * 1000,
      );

      const deletedReservations = await this.prisma.dateReservation.deleteMany({
        where: {
          status: { in: ['EXPIRED', 'RELEASED'] },
          createdAt: { lt: reservationCutoff },
        },
      });

      // 2. Clean up abandoned/expired booking sessions older than 90 days
      const sessionCutoff = new Date(
        now - CleanupRetentionProcessor.SESSION_RETENTION_DAYS * 24 * 60 * 60 * 1000,
      );

      const deletedSessions = await this.prisma.bookingSession.deleteMany({
        where: {
          status: { in: ['ABANDONED', 'EXPIRED'] },
          createdAt: { lt: sessionCutoff },
        },
      });

      // 3. Clean up notifications older than 1 year
      const notificationCutoff = new Date(
        now - CleanupRetentionProcessor.NOTIFICATION_RETENTION_DAYS * 24 * 60 * 60 * 1000,
      );

      const deletedNotifications = await this.prisma.notification.deleteMany({
        where: {
          createdAt: { lt: notificationCutoff },
        },
      });

      this.logger.log(
        `GDPR cleanup complete: ` +
        `${deletedReservations.count} reservation(s), ` +
        `${deletedSessions.count} session(s), ` +
        `${deletedNotifications.count} notification(s) deleted`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed GDPR cleanup retention policy: ${message}`);
      throw error;
    }
  }
}
