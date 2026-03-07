import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
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
@Injectable()
export class BrowserPushHandler {
  private readonly logger = new Logger(BrowserPushHandler.name);

  constructor(
    private readonly browserPushService: BrowserPushService,
  ) {}

  async handle(job: Job<DeliverBrowserPushPayload>): Promise<void> {
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
