import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleCalendarService } from './calendar.service';
import {
  QUEUE_CALENDAR,
  JOB_CALENDAR_WATCH_RENEWAL,
} from '../bullmq/queue.constants';

/**
 * Processor for the calendarWatchRenewal job.
 * Runs daily to renew Google Calendar watch channels that are expiring
 * within the next 7 days, ensuring continuous push notifications.
 */
@Processor(QUEUE_CALENDAR)
export class CalendarWatchRenewalProcessor extends WorkerHost {
  private readonly logger = new Logger(CalendarWatchRenewalProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly calendarService: GoogleCalendarService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== JOB_CALENDAR_WATCH_RENEWAL) {
      return; // Not our job
    }

    this.logger.log('Starting daily calendar watch channel renewal');

    // Find all active connections that have watch channels
    const connections = await this.prisma.calendarConnection.findMany({
      where: {
        status: 'ACTIVE',
        icalFeedToken: { not: null },
      },
      select: { id: true, tenantId: true, icalFeedToken: true },
    });

    if (connections.length === 0) {
      this.logger.log('No active watch channels found — nothing to renew');
      return;
    }

    let renewed = 0;
    let errors = 0;
    let skipped = 0;

    for (const connection of connections) {
      try {
        // Parse watch metadata to check expiry
        let watchMeta: { expiry: string };
        try {
          watchMeta = JSON.parse(connection.icalFeedToken!);
        } catch {
          skipped++;
          continue;
        }

        const expiry = new Date(watchMeta.expiry);
        const sevenDaysFromNow = new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        );

        // Only renew if expiring within 7 days
        if (expiry > sevenDaysFromNow) {
          skipped++;
          continue;
        }

        await this.calendarService.renewWatchChannels(connection.id);
        renewed++;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        this.logger.error(
          `Watch channel renewal failed for connection ${connection.id}: ${message}`,
        );
        errors++;
      }
    }

    this.logger.log(
      `Watch channel renewal complete: ${renewed} renewed, ${errors} errors, ${skipped} skipped (not expiring soon)`,
    );
  }
}
