import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleCalendarService } from './calendar.service';
import {
  QUEUE_CALENDAR,
  JOB_CALENDAR_TOKEN_REFRESH,
} from '../bullmq/queue.constants';

/**
 * Processor for the calendarTokenRefresh job.
 * Runs hourly to proactively refresh access tokens for all active connections,
 * preventing token expiry during scheduled syncs.
 */
@Processor(QUEUE_CALENDAR)
export class CalendarTokenProcessor extends WorkerHost {
  private readonly logger = new Logger(CalendarTokenProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly calendarService: GoogleCalendarService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== JOB_CALENDAR_TOKEN_REFRESH) {
      return; // Not our job
    }

    this.logger.log('Starting hourly calendar token refresh cycle');

    const connections = await this.prisma.calendarConnection.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, tenantId: true, tokenExpiresAt: true },
    });

    if (connections.length === 0) {
      this.logger.log('No active calendar connections — nothing to refresh');
      return;
    }

    let refreshed = 0;
    let errors = 0;

    for (const connection of connections) {
      // Only refresh if token expires within the next 30 minutes
      // or if we don't know when it expires
      const shouldRefresh =
        !connection.tokenExpiresAt ||
        connection.tokenExpiresAt.getTime() < Date.now() + 30 * 60 * 1000;

      if (!shouldRefresh) {
        continue;
      }

      try {
        await this.calendarService.refreshToken(connection.id);
        refreshed++;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        this.logger.error(
          `Token refresh failed for connection ${connection.id}: ${message}`,
        );
        errors++;
      }
    }

    this.logger.log(
      `Token refresh cycle complete: ${refreshed} refreshed, ${errors} errors, ${connections.length - refreshed - errors} skipped`,
    );
  }
}
