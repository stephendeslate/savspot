import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { CommunicationsService } from '../../communications/communications.service';
import { NotificationsService } from '../../notifications/notifications.service';
import {
  QUEUE_VOICE_CALLS,
  JOB_PROCESS_TRANSCRIPT,
  JOB_POST_CALL_ACTIONS,
} from '../../bullmq/queue.constants';

interface ProcessTranscriptPayload {
  callLogId: string;
  tenantId: string;
  transcript: Array<{ role: string; text: string }>;
}

interface PostCallActionsPayload {
  callLogId: string;
  tenantId: string;
  bookingId?: string;
}

@Processor(QUEUE_VOICE_CALLS)
export class VoiceCallDispatcher extends WorkerHost {
  private readonly logger = new Logger(VoiceCallDispatcher.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly communicationsService: CommunicationsService,
    private readonly notificationsService: NotificationsService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case JOB_PROCESS_TRANSCRIPT:
        return this.handleProcessTranscript(
          job as Job<ProcessTranscriptPayload>,
        );
      case JOB_POST_CALL_ACTIONS:
        return this.handlePostCallActions(
          job as Job<PostCallActionsPayload>,
        );
      default:
        this.logger.warn(`Unknown voice-calls job: ${job.name}`);
    }
  }

  private async handleProcessTranscript(
    job: Job<ProcessTranscriptPayload>,
  ): Promise<void> {
    const { callLogId, tenantId, transcript } = job.data;

    this.logger.log(
      `Processing transcript for callLog=${callLogId} tenant=${tenantId}`,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant', ${tenantId}, TRUE)`;

      await tx.voiceCallLog.update({
        where: { id: callLogId },
        data: {
          transcript: transcript,
        },
      });
    });

    this.logger.log(`Transcript stored for callLog=${callLogId}`);
  }

  private async handlePostCallActions(
    job: Job<PostCallActionsPayload>,
  ): Promise<void> {
    const { callLogId, tenantId, bookingId } = job.data;

    this.logger.log(
      `Processing post-call actions for callLog=${callLogId} tenant=${tenantId}`,
    );

    if (bookingId) {
      try {
        const booking = await this.prisma.booking.findFirst({
          where: { id: bookingId, tenantId },
          include: {
            client: { select: { id: true, email: true, name: true } },
            service: { select: { name: true } },
          },
        });

        if (booking && booking.client) {
          const tenant = await this.prisma.tenant.findUniqueOrThrow({
            where: { id: tenantId },
            select: {
              name: true,
              slug: true,
              logoUrl: true,
              brandColor: true,
              timezone: true,
            },
          });

          const dateTime = new Date(booking.startTime).toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            timeZone: tenant.timezone || 'UTC',
            timeZoneName: 'short',
          });

          await this.communicationsService.createAndSend({
            tenantId,
            recipientId: booking.client.id,
            recipientEmail: booking.client.email,
            recipientName: booking.client.name ?? 'Client',
            channel: 'EMAIL',
            templateKey: 'booking-confirmation',
            templateData: {
              clientName: booking.client.name ?? 'Client',
              serviceName: booking.service.name,
              dateTime,
              businessName: tenant.name,
              logoUrl: tenant.logoUrl,
              brandColor: tenant.brandColor,
            },
            bookingId,
          });

          this.logger.log(
            `Booking confirmation sent for booking=${bookingId} via voice call`,
          );

          // Notify tenant staff about new voice-originated booking
          const members = await this.prisma.tenantMembership.findMany({
            where: {
              tenantId,
              role: { in: ['OWNER', 'ADMIN'] },
            },
            select: { userId: true },
          });

          for (const member of members) {
            await this.notificationsService.create({
              tenantId,
              userId: member.userId,
              title: 'New booking from voice call',
              body: `${booking.client.name ?? 'A client'} booked ${booking.service.name} via phone call`,
              category: 'BOOKING',
              metadata: { bookingId, callLogId },
            });
          }
        }
      } catch (error) {
        this.logger.error(
          `Failed to process post-call actions for booking ${bookingId}: ${error}`,
        );
      }
    }

    this.logger.log(`Post-call actions completed for callLog=${callLogId}`);
  }
}
