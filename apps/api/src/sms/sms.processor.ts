import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { TwilioService } from './sms.service';
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
    private readonly twilioService: TwilioService,
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

    // Check quiet hours
    if (this.isQuietHours(tenantTimezone)) {
      const delayMs = this.msUntilQuietHoursEnd(tenantTimezone);
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
    const result = await this.twilioService.sendSms(phone, message);

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
        failureReason: result.success ? null : 'Twilio delivery failed',
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

  /**
   * Check if the current time is within quiet hours for the given timezone.
   */
  private isQuietHours(timezone: string): boolean {
    try {
      const now = new Date();
      const hour = parseInt(
        now.toLocaleString('en-US', {
          timeZone: timezone,
          hour: 'numeric',
          hour12: false,
        }),
        10,
      );

      return hour >= QUIET_HOURS_START || hour < QUIET_HOURS_END;
    } catch {
      return false; // If timezone is invalid, don't enforce quiet hours
    }
  }

  /**
   * Calculate milliseconds until quiet hours end (8 AM in tenant timezone).
   */
  private msUntilQuietHoursEnd(timezone: string): number {
    try {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
      });
      const parts = formatter.formatToParts(now);
      const hourPart = parts.find((p) => p.type === 'hour');
      const minutePart = parts.find((p) => p.type === 'minute');

      const currentHour = parseInt(hourPart?.value || '0', 10);
      const currentMinute = parseInt(minutePart?.value || '0', 10);

      let hoursUntilEnd: number;
      if (currentHour >= QUIET_HOURS_START) {
        // Evening: hours until midnight + hours from midnight to 8 AM
        hoursUntilEnd = 24 - currentHour + QUIET_HOURS_END;
      } else {
        // Early morning: hours from now to 8 AM
        hoursUntilEnd = QUIET_HOURS_END - currentHour;
      }

      const minutesUntilEnd = hoursUntilEnd * 60 - currentMinute;
      return Math.max(minutesUntilEnd * 60 * 1000, 60 * 1000); // Min 1 minute
    } catch {
      // Fallback: delay 8 hours
      return 8 * 60 * 60 * 1000;
    }
  }
}
