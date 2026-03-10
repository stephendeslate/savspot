import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { PrismaService } from '../prisma/prisma.service';
import { CommunicationsService } from './communications.service';
import {
  JOB_DELIVER_COMMUNICATION,
  JOB_PROCESS_POST_APPOINTMENT,
  JOB_SEND_BOOKING_REMINDERS,
} from '../bullmq/queue.constants';
import { SendBookingRemindersHandler } from '../jobs/send-booking-reminders.processor';

interface DeliverCommunicationPayload {
  communicationId: string;
  tenantId: string;
}

/** 24 hours in milliseconds */
const FOLLOW_UP_DELAY_MS = 24 * 60 * 60 * 1000;

/** 15-minute scan window in milliseconds */
const SCAN_WINDOW_MS = 15 * 60 * 1000;

/**
 * BullMQ processor for the 'communications' queue.
 * Handles all job names on this queue:
 * - deliverCommunication: Sends email via Resend
 * - processPostAppointmentTriggers: Scans completed bookings and enqueues follow-ups
 */
@Injectable()
export class CommunicationsHandler {
  private readonly logger = new Logger(CommunicationsHandler.name);
  private readonly resend: Resend | null;
  private readonly fromEmail: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly communicationsService: CommunicationsService,
    private readonly bookingRemindersHandler: SendBookingRemindersHandler,
  ) {

    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.fromEmail = this.configService.get<string>(
      'RESEND_FROM_EMAIL',
      'noreply@savspot.co',
    );

    if (apiKey) {
      this.resend = new Resend(apiKey);
    } else {
      this.logger.warn('RESEND_API_KEY not set — emails will be logged to console');
      this.resend = null;
    }
  }

  async handle(job: Job): Promise<void> {
    switch (job.name) {
      case JOB_DELIVER_COMMUNICATION:
        await this.handleDeliverCommunication(job as Job<DeliverCommunicationPayload>);
        break;
      case JOB_PROCESS_POST_APPOINTMENT:
        await this.handleProcessPostAppointment();
        break;
      case JOB_SEND_BOOKING_REMINDERS:
        await this.bookingRemindersHandler.handle(job);
        break;
      default:
        this.logger.warn(`Unknown job name routed to CommunicationsHandler: ${job.name}`);
    }
  }

  // ---- deliverCommunication ----

  private async handleDeliverCommunication(
    job: Job<DeliverCommunicationPayload>,
  ): Promise<void> {
    const { communicationId, tenantId } = job.data;

    this.logger.log(
      `Processing deliverCommunication: id=${communicationId} tenant=${tenantId}`,
    );

    // Load the communication record with recipient info (within tenant context)
    const communication = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant', ${tenantId}, TRUE)`;
      return tx.communication.findUnique({
        where: { id: communicationId },
        include: {
          recipient: { select: { email: true, name: true } },
          tenant: { select: { name: true, logoUrl: true, brandColor: true } },
        },
      });
    });

    if (!communication) {
      this.logger.error(`Communication not found: ${communicationId}`);
      return;
    }

    if (communication.status !== 'QUEUED') {
      this.logger.warn(
        `Communication ${communicationId} status is ${communication.status}, skipping`,
      );
      return;
    }

    // Resolve recipient email — from metadata or from User record
    const metadata = (communication.metadata ?? {}) as Record<string, unknown>;
    const recipientEmail = metadata['recipientEmail']
      ? String(metadata['recipientEmail'])
      : communication.recipient.email;

    if (!recipientEmail) {
      await this.markFailed(communicationId, tenantId, 'No recipient email available');
      return;
    }

    // Re-render template if templateKey and templateData are available
    let subject = communication.subject ?? 'Notification from SavSpot';
    let html = communication.body;

    if (communication.templateKey && metadata['templateData']) {
      try {
        const templateData = {
          ...(metadata['templateData'] as Record<string, unknown>),
          businessName: communication.tenant.name,
          logoUrl: communication.tenant.logoUrl ?? undefined,
          brandColor: communication.tenant.brandColor ?? undefined,
        };
        const rendered = this.communicationsService.renderTemplate(
          communication.templateKey,
          templateData,
        );
        subject = rendered.subject;
        html = rendered.html;
      } catch (renderError) {
        this.logger.warn(
          `Template re-render failed for ${communicationId}, using stored body: ${renderError}`,
        );
      }
    }

    // Mark as SENDING (within tenant context)
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant', ${tenantId}, TRUE)`;
      await tx.communication.update({
        where: { id: communicationId },
        data: { status: 'SENDING' },
      });
    });

    try {
      if (this.resend) {
        const result = await this.resend.emails.send({
          from: this.fromEmail,
          to: recipientEmail,
          subject,
          html,
        });

        await this.prisma.$transaction(async (tx) => {
          await tx.$executeRaw`SELECT set_config('app.current_tenant', ${tenantId}, TRUE)`;
          await tx.communication.update({
            where: { id: communicationId },
            data: {
              status: 'SENT',
              sentAt: new Date(),
              providerMessageId: result.data?.id ?? null,
            },
          });
        });

        this.logger.log(
          `Email sent: id=${communicationId} to=${recipientEmail} messageId=${result.data?.id}`,
        );
      } else {
        // Dev mode — log the email content
        this.logger.log(`[DEV EMAIL] To: ${recipientEmail} | Subject: ${subject}`);
        this.logger.log(`[DEV EMAIL] Body length: ${html.length} chars`);

        await this.prisma.$transaction(async (tx) => {
          await tx.$executeRaw`SELECT set_config('app.current_tenant', ${tenantId}, TRUE)`;
          await tx.communication.update({
            where: { id: communicationId },
            data: {
              status: 'SENT',
              sentAt: new Date(),
              providerMessageId: `dev-${Date.now()}`,
            },
          });
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to deliver communication ${communicationId}: ${errorMessage}`,
      );
      await this.markFailed(communicationId, tenantId, errorMessage);
      throw error; // Re-throw for BullMQ retry logic
    }
  }

  // ---- processPostAppointmentTriggers ----

  /**
   * Scans for bookings completed in the last 15 minutes and enqueues
   * follow-up emails with a 24-hour delay. Uses BookingReminder table
   * for deduplication.
   */
  private async handleProcessPostAppointment(): Promise<void> {
    this.logger.log('Processing post-appointment triggers...');

    const cutoff = new Date(Date.now() - SCAN_WINDOW_MS);

    // Find bookings completed in the last 15 minutes (cross-tenant raw query)
    const completedBookingRows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        tenant_id: string;
        service_id: string;
        start_time: Date;
        client_id: string;
        client_email: string;
        client_name: string;
        service_name: string;
        tenant_name: string;
        tenant_slug: string | null;
        tenant_logo_url: string | null;
        tenant_brand_color: string | null;
      }>
    >`
      SELECT
        b.id,
        b.tenant_id,
        b.service_id,
        b.start_time,
        b.client_id,
        u.email AS client_email,
        u.name AS client_name,
        s.name AS service_name,
        t.name AS tenant_name,
        t.slug AS tenant_slug,
        t.logo_url AS tenant_logo_url,
        t.brand_color AS tenant_brand_color
      FROM bookings b
      JOIN users u ON u.id = b.client_id
      JOIN services s ON s.id = b.service_id
      JOIN tenants t ON t.id = b.tenant_id
      WHERE b.status = 'COMPLETED'
        AND b.updated_at >= ${cutoff}
    `;

    if (completedBookingRows.length === 0) {
      this.logger.debug('No recently completed bookings found');
      return;
    }

    this.logger.log(
      `Found ${completedBookingRows.length} recently completed booking(s) for follow-up`,
    );

    let enqueued = 0;
    let skipped = 0;

    for (const booking of completedBookingRows) {
      try {
        // Deduplication and reminder creation within tenant context
        const created = await this.prisma.$transaction(async (tx) => {
          await tx.$executeRaw`SELECT set_config('app.current_tenant', ${booking.tenant_id}, TRUE)`;

          const existingReminder = await tx.bookingReminder.findFirst({
            where: {
              bookingId: booking.id,
              reminderType: 'BOOKING',
              channel: 'EMAIL',
            },
          });

          if (existingReminder) {
            return null;
          }

          const scheduledFor = new Date(Date.now() + FOLLOW_UP_DELAY_MS);

          await tx.bookingReminder.create({
            data: {
              bookingId: booking.id,
              tenantId: booking.tenant_id,
              reminderType: 'BOOKING',
              intervalDays: 1,
              scheduledFor,
              channel: 'EMAIL',
              status: 'PENDING',
            },
          });

          // Look up provider for the rebooking deep-link
          const serviceProvider = await tx.serviceProvider.findFirst({
            where: {
              serviceId: booking.service_id,
              tenantId: booking.tenant_id,
            },
            select: { userId: true },
          });

          return { providerId: serviceProvider?.userId ?? null };
        });

        if (!created) {
          this.logger.debug(
            `Skipping follow-up for booking ${booking.id} — reminder already exists`,
          );
          skipped++;
          continue;
        }

        // Enqueue the follow-up email with a 24-hour delay
        await this.communicationsService.createAndSend(
          {
            tenantId: booking.tenant_id,
            recipientId: booking.client_id,
            recipientEmail: booking.client_email,
            recipientName: booking.client_name,
            channel: 'EMAIL',
            templateKey: 'follow-up',
            templateData: {
              clientName: booking.client_name,
              serviceName: booking.service_name,
              dateTime: this.formatDateTime(booking.start_time),
              businessName: booking.tenant_name,
              logoUrl: booking.tenant_logo_url,
              brandColor: booking.tenant_brand_color,
              tenantSlug: booking.tenant_slug,
              serviceId: booking.service_id,
              providerId: created.providerId,
            },
            bookingId: booking.id,
          },
          { delayMs: FOLLOW_UP_DELAY_MS },
        );

        enqueued++;
      } catch (error) {
        this.logger.error(
          `Failed to enqueue follow-up for booking ${booking.id}: ${error}`,
        );
      }
    }

    this.logger.log(
      `Post-appointment processing complete: enqueued=${enqueued} skipped=${skipped}`,
    );
  }

  // ---- Helpers ----

  private async markFailed(communicationId: string, tenantId: string, reason: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant', ${tenantId}, TRUE)`;
      await tx.communication.update({
        where: { id: communicationId },
        data: {
          status: 'FAILED',
          failureReason: reason,
        },
      });
    });
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
