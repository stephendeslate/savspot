import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { SmsService } from './sms.service';
import { RedisService } from '../redis/redis.service';

/** TTL for morning summary deduplication keys (24 hours) */
const DEDUP_TTL_SECONDS = 24 * 60 * 60;

/**
 * Processor for the sendMorningSummary job.
 * Sends a daily morning SMS to tenant owners summarizing today's bookings.
 * Uses Redis-based deduplication to prevent duplicate SMS if the job runs twice.
 * Repeating schedule is registered by JobSchedulerService.
 */
@Injectable()
export class MorningSummaryHandler {
  private readonly logger = new Logger(MorningSummaryHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly smsService: SmsService,
    private readonly redisService: RedisService,
  ) {}

  async handle(_job: Job): Promise<void> {
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

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    for (const membership of ownerMemberships) {
      if (!membership.user.phone) {
        skipped++;
        continue;
      }

      try {
        // Redis-based deduplication: skip if already sent today for this tenant
        const dedupKey = `morning-summary:${membership.tenant.id}:${today}`;
        const alreadySent = await this.redisService.get(dedupKey);
        if (alreadySent) {
          this.logger.debug(
            `Morning summary already sent for tenant ${membership.tenant.id} today, skipping`,
          );
          skipped++;
          continue;
        }

        const message = await this.buildSummary(
          membership.tenant.id,
          membership.tenant.name,
          membership.tenant.timezone,
        );

        if (!message) {
          skipped++;
          continue;
        }

        await this.smsService.sendSms(membership.user.phone, message);

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

        // Mark as sent in Redis to prevent duplicates if job re-runs
        await this.redisService.setex(dedupKey, DEDUP_TTL_SECONDS, '1');

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
