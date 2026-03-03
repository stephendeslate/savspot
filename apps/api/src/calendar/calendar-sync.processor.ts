import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { GoogleCalendarService } from './calendar.service';
import {
  QUEUE_CALENDAR,
  JOB_CALENDAR_TWO_WAY_SYNC,
} from '../bullmq/queue.constants';

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
@Processor(QUEUE_CALENDAR)
export class CalendarSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(CalendarSyncProcessor.name);

  constructor(private readonly calendarService: GoogleCalendarService) {
    super();
  }

  async process(job: Job<CalendarSyncJobData>): Promise<void> {
    if (job.name !== JOB_CALENDAR_TWO_WAY_SYNC) {
      return; // Not our job — let other processors handle it
    }

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
