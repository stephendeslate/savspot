import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { GoogleCalendarService } from './calendar.service';

interface CalendarSyncJobData {
  connectionId: string;
  tenantId: string;
  manual?: boolean;
  triggeredBy?: string;
  channelId?: string;
  resourceId?: string;
}

/**
 * Processor for the calendarTwoWaySync job.
 * Performs incremental inbound sync from Google Calendar and logs results.
 */
@Injectable()
export class CalendarSyncHandler {
  private readonly logger = new Logger(CalendarSyncHandler.name);

  constructor(private readonly calendarService: GoogleCalendarService) {}

  async handle(job: Job<CalendarSyncJobData>): Promise<void> {
    const { connectionId, tenantId, manual, triggeredBy } = job.data;

    this.logger.log(
      `Starting calendar sync for connection ${connectionId} (tenant: ${tenantId}, trigger: ${triggeredBy || (manual ? 'manual' : 'scheduled')})`,
    );

    try {
      const result =
        await this.calendarService.syncInboundEvents(connectionId);

      this.logger.log(
        `Calendar sync complete for connection ${connectionId}: ` +
          `added=${result.added}, updated=${result.updated}, deleted=${result.deleted}`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(
        `Calendar sync failed for connection ${connectionId}: ${message}`,
      );
      throw err; // Let BullMQ retry
    }
  }
}
