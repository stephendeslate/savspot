import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { GoogleCalendarService } from '../calendar.service';

@Injectable()
export class CalendarSyncFallbackHandler {
  private readonly logger = new Logger(CalendarSyncFallbackHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly calendarService: GoogleCalendarService,
  ) {}

  async handle(_job: Job): Promise<void> {
    this.logger.log('Starting calendar sync fallback');

    const staleThreshold = new Date(Date.now() - 30 * 60 * 1000); // 30 min ago

    const connections = await this.prisma.calendarConnection.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { lastSyncedAt: null },
          { lastSyncedAt: { lt: staleThreshold } },
        ],
      },
    });

    let synced = 0;
    for (const conn of connections) {
      try {
        await this.calendarService.syncConnection(conn.id, conn.tenantId);
        synced++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        this.logger.warn(`Fallback sync failed for connection ${conn.id}: ${msg}`);
      }
    }

    this.logger.log(`Calendar sync fallback complete: ${synced}/${connections.length} synced`);
  }
}
