import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import {
  QUEUE_BOOKINGS,
  JOB_ABANDONED_BOOKING_RECOVERY,
} from '../bullmq/queue.constants';

/**
 * Marks stale booking sessions as ABANDONED and releases their held reservations.
 * Scheduled hourly via BullMQ repeatable job.
 *
 * In future sprints, this processor will also enqueue recovery emails
 * via the deliverCommunication job.
 */
@Processor(QUEUE_BOOKINGS)
export class AbandonedRecoveryProcessor extends WorkerHost {
  private readonly logger = new Logger(AbandonedRecoveryProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== JOB_ABANDONED_BOOKING_RECOVERY) {
      return;
    }

    this.logger.log('Running abandoned booking recovery job...');

    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      // Find stale in-progress sessions
      const staleSessions = await this.prisma.bookingSession.findMany({
        where: {
          status: 'IN_PROGRESS',
          updatedAt: { lt: oneHourAgo },
        },
        select: { id: true, tenantId: true, clientId: true },
      });

      if (staleSessions.length === 0) {
        this.logger.log('No abandoned booking sessions found');
        return;
      }

      const sessionIds = staleSessions.map((s) => s.id);

      // Mark sessions as ABANDONED
      const updatedSessions = await this.prisma.bookingSession.updateMany({
        where: {
          id: { in: sessionIds },
          status: 'IN_PROGRESS',
        },
        data: {
          status: 'ABANDONED',
        },
      });

      // Release any HELD reservations for these sessions
      const releasedReservations = await this.prisma.dateReservation.updateMany({
        where: {
          sessionId: { in: sessionIds },
          status: 'HELD',
        },
        data: {
          status: 'RELEASED',
        },
      });

      this.logger.log(
        `Abandoned ${updatedSessions.count} session(s), released ${releasedReservations.count} reservation(s)`,
      );

      // TODO: In a future sprint, enqueue recovery emails for sessions
      // that have a clientId with a valid email address.
      // staleSessions.filter(s => s.clientId).forEach(session => {
      //   queue.add(JOB_DELIVER_COMMUNICATION, { ... });
      // });
      this.logger.log(
        'Recovery email enqueueing deferred to future sprint (deliverCommunication)',
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed abandoned booking recovery: ${message}`);
      throw error;
    }
  }
}
