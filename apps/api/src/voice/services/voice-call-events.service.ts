import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CommunicationsService } from '../../communications/communications.service';
import { NotificationsService } from '../../notifications/notifications.service';

export interface ProcessTranscriptPayload {
  callLogId: string;
  tenantId: string;
  transcript: Array<{ role: string; text: string }>;
}

export interface PostCallActionsPayload {
  callLogId: string;
  tenantId: string;
  bookingId?: string;
}

/**
 * Pure service version of the former VoiceCallDispatcher BullMQ processor.
 * Each method matches one of the previous case branches; the Inngest
 * functions in `apps/api/src/inngest/functions/voice-calls/` call into
 * these methods so the function bodies stay thin.
 */
@Injectable()
export class VoiceCallEventsService {
  private readonly logger = new Logger(VoiceCallEventsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly communicationsService: CommunicationsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async processTranscript(payload: ProcessTranscriptPayload): Promise<void> {
    const { callLogId, tenantId, transcript } = payload;

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

  async processPostCallActions(payload: PostCallActionsPayload): Promise<void> {
    const { callLogId, tenantId, bookingId } = payload;

    this.logger.log(
      `Processing post-call actions for callLog=${callLogId} tenant=${tenantId}`,
    );

    if (!bookingId) {
      this.logger.log(`Post-call actions completed for callLog=${callLogId}`);
      return;
    }

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

    this.logger.log(`Post-call actions completed for callLog=${callLogId}`);
  }
}
