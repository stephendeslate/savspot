import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { CommunicationsService } from '../communications/communications.service';
import {
  QUEUE_BOOKINGS,
  JOB_ABANDONED_BOOKING_RECOVERY,
} from '../bullmq/queue.constants';

/**
 * Marks stale booking sessions as ABANDONED, releases their held reservations,
 * and sends recovery emails to clients encouraging them to complete their booking.
 * Scheduled hourly via BullMQ repeatable job.
 */
@Processor(QUEUE_BOOKINGS)
export class AbandonedRecoveryProcessor extends WorkerHost {
  private readonly logger = new Logger(AbandonedRecoveryProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly communicationsService: CommunicationsService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== JOB_ABANDONED_BOOKING_RECOVERY) {
      return;
    }

    this.logger.log('Running abandoned booking recovery job...');

    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      // Find stale in-progress sessions with client and service info
      const staleSessions = await this.prisma.bookingSession.findMany({
        where: {
          status: 'IN_PROGRESS',
          updatedAt: { lt: oneHourAgo },
        },
        select: {
          id: true,
          tenantId: true,
          clientId: true,
          serviceId: true,
          service: {
            select: { name: true },
          },
          tenant: {
            select: {
              name: true,
              slug: true,
              logoUrl: true,
              brandColor: true,
            },
          },
        },
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

      // Send recovery emails to sessions that have a clientId with a valid email
      let emailsSent = 0;
      let emailsSkipped = 0;

      const sessionsWithClients = staleSessions.filter((s) => s.clientId);

      for (const session of sessionsWithClients) {
        try {
          // Look up the client email
          const client = await this.prisma.user.findUnique({
            where: { id: session.clientId! },
            select: { id: true, email: true, name: true },
          });

          if (!client?.email) {
            this.logger.debug(
              `Session ${session.id}: client ${session.clientId} has no email — skipping recovery email`,
            );
            emailsSkipped++;
            continue;
          }

          // Build the rebooking URL using the tenant slug and service
          const rebookUrl = session.tenant.slug && session.serviceId
            ? `/${session.tenant.slug}?service=${session.serviceId}`
            : `/${session.tenant.slug ?? ''}`;

          await this.communicationsService.createAndSend({
            tenantId: session.tenantId,
            recipientId: client.id,
            recipientEmail: client.email,
            recipientName: client.name,
            channel: 'EMAIL',
            templateKey: 'abandoned-booking-recovery',
            templateData: {
              clientName: client.name,
              serviceName: session.service?.name ?? 'your selected service',
              businessName: session.tenant.name,
              logoUrl: session.tenant.logoUrl,
              brandColor: session.tenant.brandColor,
              rebookUrl,
            },
          });

          emailsSent++;

          this.logger.log(
            `Recovery email enqueued for session ${session.id} to ${client.email}`,
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          this.logger.error(
            `Failed to send recovery email for session ${session.id}: ${message}`,
          );
        }
      }

      this.logger.log(
        `Recovery emails: sent=${emailsSent} skipped=${emailsSkipped} (of ${sessionsWithClients.length} with clients)`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed abandoned booking recovery: ${message}`);
      throw error;
    }
  }
}
