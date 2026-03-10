import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { Prisma } from '../../../../prisma/generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import {
  QUEUE_COMMUNICATIONS,
  JOB_DELIVER_COMMUNICATION,
} from '../bullmq/queue.constants';
import { CommunicationsService } from '../communications/communications.service';

/**
 * Processor for hourly and daily notification digest jobs.
 *
 * - processHourlyDigests: Gathers unread notifications from the last hour
 *   for users with HOURLY digest preference and sends a summary email.
 * - processDailyDigests: Gathers unread notifications from the last 24 hours
 *   for users with DAILY digest preference and sends a summary email.
 */
@Injectable()
export class ProcessNotificationDigestsHandler {
  private readonly logger = new Logger(ProcessNotificationDigestsHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly communicationsService: CommunicationsService,
    @InjectQueue(QUEUE_COMMUNICATIONS) private readonly commsQueue: Queue,
  ) {}

  /**
   * Handle hourly digest job.
   */
  async handleHourly(_job: Job): Promise<void> {
    this.logger.log('Processing hourly notification digests');
    await this.processDigests('HOURLY', 60 * 60 * 1000); // 1 hour
  }

  /**
   * Handle daily digest job.
   */
  async handleDaily(_job: Job): Promise<void> {
    this.logger.log('Processing daily notification digests');
    await this.processDigests('DAILY', 24 * 60 * 60 * 1000); // 24 hours
  }

  /**
   * Core digest processing logic shared by hourly and daily.
   */
  private async processDigests(
    frequency: 'HOURLY' | 'DAILY',
    windowMs: number,
  ): Promise<void> {
    const cutoff = new Date(Date.now() - windowMs);

    // Find users with this digest frequency
    const preferences = await this.prisma.notificationPreference.findMany({
      where: { digestFrequency: frequency },
      select: {
        userId: true,
        user: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    if (preferences.length === 0) {
      this.logger.debug(
        `No users with ${frequency} digest preference — skipping`,
      );
      return;
    }

    this.logger.log(
      `Found ${preferences.length} user(s) with ${frequency} digest preference`,
    );

    let sent = 0;
    let skipped = 0;

    for (const pref of preferences) {
      try {
        const { user } = pref;

        if (!user.email) {
          skipped++;
          continue;
        }

        // Gather unread notifications since cutoff
        const notifications = await this.prisma.notification.findMany({
          where: {
            userId: user.id,
            isRead: false,
            createdAt: { gte: cutoff },
          },
          include: {
            notificationType: { select: { category: true } },
            tenant: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 50, // Cap at 50 to keep digest manageable
        });

        if (notifications.length === 0) {
          skipped++;
          continue;
        }

        // Build and send digest email
        const subject = this.buildSubject(frequency, notifications.length);
        const body = this.buildDigestHtml(
          user.name ?? 'there',
          frequency,
          notifications,
        );

        // Find a tenant context for this user (use the first notification's tenant)
        const tenantId = notifications.find((n) => n.tenantId)?.tenantId;

        if (tenantId) {
          // Use CommunicationsService to create a proper Communication record
          await this.communicationsService.createAndSend({
            tenantId,
            recipientId: user.id,
            recipientEmail: user.email,
            channel: 'EMAIL',
            templateKey: 'notification-digest',
            templateData: {
              businessName: 'SavSpot',
              message: body,
            },
          });
        } else {
          // No tenant context — enqueue a raw delivery
          await this.commsQueue.add(JOB_DELIVER_COMMUNICATION, {
            tenantId: null,
            recipientEmail: user.email,
            recipientName: user.name,
            channel: 'EMAIL',
            subject,
            body,
          });
        }

        // Record in NotificationDigest table
        const notificationIds = notifications.map((n) => n.id);
        await this.prisma.notificationDigest.create({
          data: {
            userId: user.id,
            frequency,
            notificationIds: notificationIds as unknown as Prisma.InputJsonValue,
            status: 'SENT',
            scheduledFor: new Date(),
            sentAt: new Date(),
          },
        });

        // Mark notifications as read
        await this.prisma.notification.updateMany({
          where: {
            id: { in: notificationIds },
          },
          data: {
            isRead: true,
            readAt: new Date(),
          },
        });

        sent++;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(
          `Failed to process ${frequency} digest for user ${pref.userId}: ${message}`,
        );
      }
    }

    this.logger.log(
      `${frequency} digest processing complete: ${sent} sent, ${skipped} skipped`,
    );
  }

  /**
   * Build the email subject line.
   */
  private buildSubject(frequency: string, count: number): string {
    const period = frequency === 'HOURLY' ? 'Hourly' : 'Daily';
    return `${period} Notification Digest — ${count} update${count !== 1 ? 's' : ''}`;
  }

  /**
   * Build a simple HTML digest email body.
   */
  private buildDigestHtml(
    userName: string,
    frequency: string,
    notifications: Array<{
      title: string;
      body: string;
      createdAt: Date;
      notificationType: { category: string };
      tenant: { name: string } | null;
    }>,
  ): string {
    const period = frequency === 'HOURLY' ? 'hour' : '24 hours';
    const rows = notifications
      .map((n) => {
        const time = n.createdAt.toLocaleString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
        const tenant = n.tenant?.name ?? '';
        return `
          <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#666;font-size:12px;width:80px;">${time}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;">
              <strong>${this.esc(n.title)}</strong>
              ${tenant ? `<span style="color:#888;font-size:12px;"> — ${this.esc(tenant)}</span>` : ''}
              <br/><span style="color:#666;font-size:13px;">${this.esc(n.body)}</span>
            </td>
          </tr>
        `;
      })
      .join('');

    return `
      <h2 style="color:#333;margin:0 0 16px;">Notification Digest</h2>
      <p>Hi ${this.esc(userName)},</p>
      <p>Here's a summary of your notifications from the past ${period}:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        ${rows}
      </table>
      <p style="margin-top:20px;color:#666;font-size:12px;">
        You're receiving this because your digest preference is set to ${frequency.toLowerCase()}.
        Update your preferences in your account settings.
      </p>
      <p style="color:#888;font-size:12px;">Powered by SavSpot</p>
    `.trim();
  }

  private esc(value: unknown): string {
    const str = value == null ? '' : String(value);
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
