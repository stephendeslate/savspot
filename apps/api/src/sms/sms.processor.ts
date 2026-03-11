import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { SmsService } from './sms.service';
import {
  QUEUE_COMMUNICATIONS,
  JOB_DELIVER_PROVIDER_SMS,
} from '../bullmq/queue.constants';
import {
  BOOKING_CONFIRMED,
  BOOKING_CANCELLED,
  BOOKING_RESCHEDULED,
  BOOKING_COMPLETED,
  BOOKING_NO_SHOW,
} from '../events/event.types';
import {
  isInQuietHoursForTimezone,
  msUntilQuietHoursEnd,
} from '../communications/quiet-hours.util';

interface DeliverProviderSmsJobData {
  tenantId: string;
  eventType: string;
  bookingData: {
    bookingId: string;
    clientName: string;
    serviceName: string;
    startTime: string; // ISO string
    endTime: string;
    previousStartTime?: string;
    newStartTime?: string;
  };
}

/**
 * Default quiet hours: 9 PM to 8 AM in tenant timezone.
 */
const QUIET_HOURS_START = 21; // 9 PM
const QUIET_HOURS_END = 8; // 8 AM

/**
 * Processor for the deliverProviderSMS job.
 * Sends SMS notifications to tenant owners for booking events.
 * Respects quiet hours: re-enqueues with delay if in quiet period.
 */
@Injectable()
export class SmsHandler {
  private readonly logger = new Logger(SmsHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly smsService: SmsService,
    @InjectQueue(QUEUE_COMMUNICATIONS) private readonly commsQueue: Queue,
  ) {}

  async handle(job: Job<DeliverProviderSmsJobData>): Promise<void> {
    const { tenantId, eventType, bookingData } = job.data;

    this.logger.log(
      `Processing provider SMS: ${eventType} for booking ${bookingData.bookingId} (tenant: ${tenantId})`,
    );

    // Look up the tenant OWNER's phone number
    const ownerMembership = await this.prisma.tenantMembership.findFirst({
      where: {
        tenantId,
        role: 'OWNER',
      },
      include: {
        user: { select: { id: true, phone: true, name: true } },
        tenant: { select: { timezone: true, name: true } },
      },
    });

    if (!ownerMembership?.user?.phone) {
      this.logger.log(
        `No phone number for tenant ${tenantId} owner — skipping SMS`,
      );
      return;
    }

    const phone = ownerMembership.user.phone;
    const tenantTimezone = ownerMembership.tenant.timezone || 'UTC';

    // Check quiet hours (using shared utility)
    if (isInQuietHoursForTimezone(tenantTimezone)) {
      const delayMs = msUntilQuietHoursEnd({
        startHour: QUIET_HOURS_START,
        endHour: QUIET_HOURS_END,
        timezone: tenantTimezone,
      });
      this.logger.log(
        `Quiet hours for tenant ${tenantId} — re-enqueuing SMS with ${Math.round(delayMs / 60000)}min delay`,
      );

      // Re-enqueue with delay instead of sending now
      await this.commsQueue.add(JOB_DELIVER_PROVIDER_SMS, job.data, {
        delay: delayMs,
        jobId: `${job.id}-delayed`,
      });
      return;
    }

    // Format message based on event type
    const message = this.formatMessage(
      eventType,
      bookingData,
      ownerMembership.tenant.name,
    );

    if (!message) {
      this.logger.log(`No SMS template for event type: ${eventType}`);
      return;
    }

    // Send the SMS
    const result = await this.smsService.sendSms(phone, message);

    // Log the communication
    await this.prisma.communication.create({
      data: {
        tenantId,
        recipientId: ownerMembership.user.id,
        bookingId: bookingData.bookingId,
        channel: 'SMS',
        templateKey: eventType,
        body: message,
        status: result.success ? 'SENT' : 'FAILED',
        providerMessageId: result.sid || null,
        sentAt: result.success ? new Date() : null,
        failureReason: result.success ? null : 'SMS delivery failed',
      },
    });

    if (result.success) {
      this.logger.log(
        `Provider SMS sent for ${eventType} — booking ${bookingData.bookingId}`,
      );
    } else {
      this.logger.error(
        `Provider SMS failed for ${eventType} — booking ${bookingData.bookingId}`,
      );
    }
  }

  /**
   * Format the SMS message body based on event type.
   */
  private formatMessage(
    eventType: string,
    bookingData: DeliverProviderSmsJobData['bookingData'],
    tenantName: string,
  ): string | null {
    const { clientName, serviceName, startTime } = bookingData;
    const start = new Date(startTime);
    const timeStr = start.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    switch (eventType) {
      case BOOKING_CONFIRMED:
        return `[${tenantName}] New booking confirmed: ${clientName} — ${serviceName} on ${timeStr}`;

      case BOOKING_CANCELLED:
        return `[${tenantName}] Booking cancelled: ${clientName} — ${serviceName} on ${timeStr}`;

      case BOOKING_RESCHEDULED: {
        const newStart = bookingData.newStartTime
          ? new Date(bookingData.newStartTime).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            })
          : timeStr;
        return `[${tenantName}] Booking rescheduled: ${clientName} — ${serviceName} moved to ${newStart}`;
      }

      case BOOKING_COMPLETED:
        return `[${tenantName}] Booking completed: ${clientName} — ${serviceName}`;

      case BOOKING_NO_SHOW:
        return `[${tenantName}] No-show: ${clientName} — ${serviceName} on ${timeStr}`;

      default:
        return null;
    }
  }

}
