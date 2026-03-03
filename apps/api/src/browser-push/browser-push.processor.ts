import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  QUEUE_COMMUNICATIONS,
  JOB_DELIVER_BROWSER_PUSH,
} from '../bullmq/queue.constants';
import { BrowserPushService } from './browser-push.service';

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
 */
@Processor(QUEUE_COMMUNICATIONS)
export class BrowserPushProcessor extends WorkerHost {
  private readonly logger = new Logger(BrowserPushProcessor.name);

  constructor(
    private readonly browserPushService: BrowserPushService,
  ) {
    super();
  }

  async process(job: Job<DeliverBrowserPushPayload>): Promise<void> {
    if (job.name !== JOB_DELIVER_BROWSER_PUSH) {
      return;
    }

    const { tenantId, title, body, data } = job.data;

    this.logger.log(
      `Processing browser push delivery for tenant ${tenantId}: ${title}`,
    );

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
