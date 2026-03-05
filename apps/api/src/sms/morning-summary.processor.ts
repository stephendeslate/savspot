import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { TwilioService } from './sms.service';
import {
  QUEUE_COMMUNICATIONS,
  JOB_SEND_MORNING_SUMMARY,
} from '../bullmq/queue.constants';

/**
 * Processor for the sendMorningSummary job.
 * Sends a daily morning SMS to tenant owners summarizing today's bookings.
 * Repeating schedule is registered by JobSchedulerService.
 */
@Processor(QUEUE_COMMUNICATIONS)
export class MorningSummaryProcessor extends WorkerHost {
  private readonly logger = new Logger(MorningSummaryProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly twilioService: TwilioService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== JOB_SEND_MORNING_SUMMARY) {
      return; // Not our job
    }

    this.logger.log('Starting morning summary delivery');

    // Find all active tenants with an OWNER who has a phone number
    const ownerMemberships = await this.prisma.tenantMembership.findMany({
      where: {
        role: 'OWNER',
        tenant: { status: 'ACTIVE' },
        user: { phone: { not: null } },
      },
      include: {
        user: { select: { id: true, phone: true, name: true } },
        tenant: { select: { id: true, name: true, timezone: true } },
      },
    });

    let sent = 0;
    let skipped = 0;

    for (const membership of ownerMemberships) {
      if (!membership.user.phone) {
        skipped++;
        continue;
      }

      try {
        const message = await this.buildSummary(
          membership.tenant.id,
          membership.tenant.name,
          membership.tenant.timezone,
        );

        if (!message) {
          skipped++;
          continue;
        }

        await this.twilioService.sendSms(membership.user.phone, message);

        // Log the communication
        await this.prisma.communication.create({
          data: {
            tenantId: membership.tenant.id,
            recipientId: membership.user.id,
            channel: 'SMS',
            templateKey: 'morning-summary',
            body: message,
            status: 'SENT',
            sentAt: new Date(),
          },
        });

        sent++;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        this.logger.error(
          `Morning summary failed for tenant ${membership.tenant.id}: ${errorMessage}`,
        );
      }
    }

    this.logger.log(
      `Morning summary complete: ${sent} sent, ${skipped} skipped`,
    );
  }

  /**
   * Build the morning summary SMS text for a tenant.
   * Returns null if there are no bookings today.
   */
  private async buildSummary(
    tenantId: string,
    tenantName: string,
    timezone: string,
  ): Promise<string | null> {
    // Calculate today's date range in the tenant's timezone
    const { startOfDay, endOfDay } = this.getTodayRange(timezone);

    const bookings = await this.prisma.booking.findMany({
      where: {
        tenantId,
        startTime: { gte: startOfDay, lt: endOfDay },
        status: { in: ['CONFIRMED', 'PENDING'] },
      },
      include: {
        client: { select: { name: true } },
        service: { select: { name: true, durationMinutes: true } },
      },
      orderBy: { startTime: 'asc' },
    });

    if (bookings.length === 0) {
      return null; // No bookings today — skip
    }

    const count = bookings.length;
    const next = bookings[0]!;
    const nextTime = new Date(next.startTime).toLocaleString('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    return (
      `[${tenantName}] Today: ${count} booking${count > 1 ? 's' : ''}. ` +
      `Next: ${next.client.name} at ${nextTime} ` +
      `(${next.service.name}, ${next.service.durationMinutes}min).`
    );
  }

  /**
   * Get the start and end of "today" in the given timezone.
   */
  private getTodayRange(timezone: string): {
    startOfDay: Date;
    endOfDay: Date;
  } {
    try {
      const now = new Date();

      // Get today's date string in the tenant's timezone
      const dateStr = now.toLocaleDateString('en-CA', { timeZone: timezone });
      // en-CA gives YYYY-MM-DD format

      // Create start/end of day in UTC by computing the offset
      const startOfDay = new Date(`${dateStr}T00:00:00`);
      const endOfDay = new Date(`${dateStr}T23:59:59.999`);

      // Adjust to account for timezone offset
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        timeZoneName: 'shortOffset',
      });
      const parts = formatter.formatToParts(now);
      const tzPart = parts.find((p) => p.type === 'timeZoneName');
      const offsetStr = tzPart?.value || 'GMT';

      // Parse offset like "GMT-5" or "GMT+5:30"
      const offsetMatch = offsetStr.match(/GMT([+-]?\d+)?(?::(\d+))?/);
      let offsetMinutes = 0;
      if (offsetMatch) {
        const hours = parseInt(offsetMatch[1] || '0', 10);
        const minutes = parseInt(offsetMatch[2] || '0', 10);
        offsetMinutes = hours * 60 + (hours < 0 ? -minutes : minutes);
      }

      // Convert local timezone dates to UTC
      const startUtc = new Date(startOfDay.getTime() - offsetMinutes * 60000);
      const endUtc = new Date(endOfDay.getTime() - offsetMinutes * 60000);

      return { startOfDay: startUtc, endOfDay: endUtc };
    } catch {
      // Fallback: use UTC today
      const now = new Date();
      const startOfDay = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
      );
      const endOfDay = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate(),
          23,
          59,
          59,
          999,
        ),
      );
      return { startOfDay, endOfDay };
    }
  }
}
