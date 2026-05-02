import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JobDispatcher } from '../bullmq/job-dispatcher.service';
import {
  QUEUE_COMMUNICATIONS,
  JOB_DELIVER_COMMUNICATION,
} from '../bullmq/queue.constants';

/**
 * Processor for the sendWeeklyDigest job.
 * Computes prior-week stats for each active tenant and enqueues
 * a deliverCommunication job with the 'weekly-digest' template
 * to the OWNER's email.
 */
@Injectable()
export class WeeklyDigestHandler {
  private readonly logger = new Logger(WeeklyDigestHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dispatcher: JobDispatcher,
  ) {}

  async handle(): Promise<void> {
    this.logger.log('Starting weekly digest generation');

    // Find all active tenants
    const tenants = await this.prisma.tenant.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, timezone: true, currency: true },
    });

    let enqueued = 0;
    let skipped = 0;

    for (const tenant of tenants) {
      try {
        const digest = await this.buildDigest(tenant.id, tenant.timezone);

        if (!digest) {
          skipped++;
          continue;
        }

        // Find the OWNER's email
        const ownerMembership = await this.prisma.tenantMembership.findFirst({
          where: { tenantId: tenant.id, role: 'OWNER' },
          include: {
            user: { select: { id: true, email: true, name: true } },
          },
        });

        if (!ownerMembership) {
          skipped++;
          continue;
        }

        // Enqueue a deliverCommunication job with the weekly-digest template
        // (routes to BullMQ or Inngest per QUEUE_COMMUNICATIONS_PROVIDER).
        await this.dispatcher.dispatch(QUEUE_COMMUNICATIONS, JOB_DELIVER_COMMUNICATION, {
          tenantId: tenant.id,
          recipientId: ownerMembership.user.id,
          recipientEmail: ownerMembership.user.email,
          recipientName: ownerMembership.user.name,
          channel: 'EMAIL',
          templateKey: 'weekly-digest',
          subject: `[${tenant.name}] Your Weekly Summary`,
          body: this.formatDigestEmail(tenant.name, tenant.currency, digest),
          metadata: {
            weekStart: digest.weekStart.toISOString(),
            weekEnd: digest.weekEnd.toISOString(),
          },
        });

        enqueued++;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        this.logger.error(
          `Weekly digest failed for tenant ${tenant.id}: ${message}`,
        );
      }
    }

    this.logger.log(
      `Weekly digest generation complete: ${enqueued} enqueued, ${skipped} skipped (zero activity)`,
    );
  }

  /**
   * Build digest stats for the prior week.
   * Returns null if there was zero activity.
   */
  private async buildDigest(
    tenantId: string,
    timezone: string,
  ): Promise<{
    weekStart: Date;
    weekEnd: Date;
    bookingsCompleted: number;
    revenueCollected: number;
    newClients: number;
    noShowCount: number;
  } | null> {
    const { weekStart, weekEnd } = this.getPriorWeekRange(timezone);

    // Bookings completed in the prior week
    const bookingsCompleted = await this.prisma.booking.count({
      where: {
        tenantId,
        status: 'COMPLETED',
        updatedAt: { gte: weekStart, lt: weekEnd },
      },
    });

    // Revenue collected (sum of succeeded payments)
    const revenueResult = await this.prisma.payment.aggregate({
      where: {
        tenantId,
        status: 'SUCCEEDED',
        createdAt: { gte: weekStart, lt: weekEnd },
      },
      _sum: { amount: true },
    });
    const revenueCollected = revenueResult._sum.amount
      ? Number(revenueResult._sum.amount)
      : 0;

    // New clients: users who made their first booking with this tenant in the prior week
    const newClientBookings = await this.prisma.booking.findMany({
      where: {
        tenantId,
        createdAt: { gte: weekStart, lt: weekEnd },
      },
      select: { clientId: true },
      distinct: ['clientId'],
    });

    let newClients = 0;
    const clientIds = [...new Set(newClientBookings.map((b) => b.clientId))];

    if (clientIds.length > 0) {
      const existingClients = await this.prisma.booking.groupBy({
        by: ['clientId'],
        where: {
          tenantId,
          clientId: { in: clientIds },
          status: { in: ['CONFIRMED', 'COMPLETED'] },
          createdAt: { lt: weekStart },
        },
      });
      const existingClientIds = new Set(
        existingClients.map((c) => c.clientId),
      );
      newClients = clientIds.filter((id) => !existingClientIds.has(id)).length;
    }

    // No-shows in the prior week
    const noShowCount = await this.prisma.booking.count({
      where: {
        tenantId,
        status: 'NO_SHOW',
        updatedAt: { gte: weekStart, lt: weekEnd },
      },
    });

    // Skip if zero activity
    if (
      bookingsCompleted === 0 &&
      revenueCollected === 0 &&
      newClients === 0 &&
      noShowCount === 0
    ) {
      return null;
    }

    return {
      weekStart,
      weekEnd,
      bookingsCompleted,
      revenueCollected,
      newClients,
      noShowCount,
    };
  }

  /**
   * Format the weekly digest into an HTML email body.
   */
  private formatDigestEmail(
    tenantName: string,
    currency: string,
    digest: {
      weekStart: Date;
      weekEnd: Date;
      bookingsCompleted: number;
      revenueCollected: number;
      newClients: number;
      noShowCount: number;
    },
  ): string {
    const startStr = digest.weekStart.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    const endStr = digest.weekEnd.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const revenueFormatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
    }).format(digest.revenueCollected);

    return `
      <h2>${tenantName} — Weekly Summary</h2>
      <p>${startStr} – ${endStr}</p>
      <table style="border-collapse:collapse;width:100%;max-width:400px;">
        <tr>
          <td style="padding:8px;border-bottom:1px solid #eee;">Bookings Completed</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;font-weight:bold;">${digest.bookingsCompleted}</td>
        </tr>
        <tr>
          <td style="padding:8px;border-bottom:1px solid #eee;">Revenue Collected</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;font-weight:bold;">${revenueFormatted}</td>
        </tr>
        <tr>
          <td style="padding:8px;border-bottom:1px solid #eee;">New Clients</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;font-weight:bold;">${digest.newClients}</td>
        </tr>
        <tr>
          <td style="padding:8px;">No-Shows</td>
          <td style="padding:8px;text-align:right;font-weight:bold;">${digest.noShowCount}</td>
        </tr>
      </table>
      <p style="margin-top:20px;color:#666;font-size:12px;">Powered by SavSpot</p>
    `.trim();
  }

  /**
   * Get the prior week's date range (Monday to Sunday).
   */
  private getPriorWeekRange(timezone: string): {
    weekStart: Date;
    weekEnd: Date;
  } {
    try {
      const now = new Date();

      // Get current date in tenant timezone
      const dateStr = now.toLocaleDateString('en-CA', { timeZone: timezone });
      const [year, month, day] = dateStr.split('-').map(Number);
      const localDate = new Date(Date.UTC(year!, month! - 1, day!));

      // Get day of week (0=Sunday, 1=Monday, ...)
      const dayOfWeek = localDate.getUTCDay();

      // Calculate last Monday (start of prior week)
      const daysToLastMonday = dayOfWeek === 0 ? 13 : dayOfWeek + 6;
      const weekStart = new Date(localDate);
      weekStart.setUTCDate(weekStart.getUTCDate() - daysToLastMonday);

      // Prior week Sunday = last Monday + 7
      const weekEnd = new Date(weekStart);
      weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

      return { weekStart, weekEnd };
    } catch {
      // Fallback: UTC-based prior week
      const now = new Date();
      const dayOfWeek = now.getUTCDay();
      const daysToLastMonday = dayOfWeek === 0 ? 13 : dayOfWeek + 6;

      const weekStart = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
      );
      weekStart.setUTCDate(weekStart.getUTCDate() - daysToLastMonday);

      const weekEnd = new Date(weekStart);
      weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

      return { weekStart, weekEnd };
    }
  }
}
