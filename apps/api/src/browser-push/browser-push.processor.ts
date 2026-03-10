import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { BrowserPushService } from './browser-push.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  QUEUE_COMMUNICATIONS,
  JOB_DELIVER_BROWSER_PUSH,
} from '../bullmq/queue.constants';
import {
  isInQuietHoursForTimezone,
  msUntilQuietHoursEnd,
} from '../communications/quiet-hours.util';

interface DeliverBrowserPushPayload {
  tenantId: string;
  title: string;
  body: string;
  data?: {
    bookingId?: string;
    actionUrl?: string;
    [key: string]: unknown;
  };
}

/**
 * Processes browser push delivery jobs from the communications queue.
 * Sends push notifications to all OWNER and ADMIN members of the tenant.
 * Respects quiet hours: re-enqueues with delay if in quiet period.
 */
@Injectable()
export class BrowserPushHandler {
  private readonly logger = new Logger(BrowserPushHandler.name);

  constructor(
    private readonly browserPushService: BrowserPushService,
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_COMMUNICATIONS) private readonly commsQueue: Queue,
  ) {}

  async handle(job: Job<DeliverBrowserPushPayload>): Promise<void> {
    const { tenantId, title, body, data } = job.data;

    this.logger.log(
      `Processing browser push delivery for tenant ${tenantId}: ${title}`,
    );

    // Gap 3: Check quiet hours before sending push notifications
    try {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { timezone: true },
      });

      const timezone = tenant?.timezone ?? 'UTC';

      if (isInQuietHoursForTimezone(timezone)) {
        const delayMs = msUntilQuietHoursEnd({
          startHour: 21,
          endHour: 8,
          timezone,
        });
        this.logger.log(
          `Quiet hours for tenant ${tenantId} — re-enqueuing browser push with ${Math.round(delayMs / 60000)}min delay`,
        );

        await this.commsQueue.add(JOB_DELIVER_BROWSER_PUSH, job.data, {
          delay: delayMs,
          jobId: `${job.id}-delayed`,
        });
        return;
      }
    } catch (error) {
      // If quiet hours check fails, proceed with sending
      this.logger.warn(
        `Failed to check quiet hours for tenant ${tenantId}: ${error}`,
      );
    }

    try {
      const sentCount = await this.browserPushService.sendToTenantAdmins(
        tenantId,
        {
          title,
          body,
          data,
        },
      );

      this.logger.log(
        `Delivered ${sentCount} browser push notification(s) for tenant ${tenantId}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to deliver browser push for tenant ${tenantId}: ${message}`,
      );
      throw error;
    }
  }
}
