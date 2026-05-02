import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GoogleCalendarService } from '../calendar.service';
import { OutlookCalendarService } from '../outlook-calendar.service';

@Injectable()
export class CalendarWebhookRenewGoogleHandler {
  private readonly logger = new Logger(CalendarWebhookRenewGoogleHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly googleCalendar: GoogleCalendarService,
  ) {}

  async handle(): Promise<void> {
    this.logger.log('Starting Google calendar webhook renewal');

    const connections = await this.prisma.calendarConnection.findMany({
      where: { provider: 'GOOGLE', status: 'ACTIVE' },
    });

    let renewed = 0;
    for (const conn of connections) {
      try {
        await this.googleCalendar.renewWebhookSubscription(conn.id);
        renewed++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        this.logger.warn(`Failed to renew Google webhook for connection ${conn.id}: ${msg}`);
      }
    }

    this.logger.log(`Google webhook renewal complete: ${renewed}/${connections.length} renewed`);
  }
}

@Injectable()
export class CalendarWebhookRenewOutlookHandler {
  private readonly logger = new Logger(CalendarWebhookRenewOutlookHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outlookCalendar: OutlookCalendarService,
  ) {}

  async handle(): Promise<void> {
    this.logger.log('Starting Outlook calendar webhook renewal');

    const connections = await this.prisma.calendarConnection.findMany({
      where: { provider: 'MICROSOFT', status: 'ACTIVE' },
    });

    let renewed = 0;
    for (const conn of connections) {
      try {
        await this.outlookCalendar.renewWebhookSubscription(conn.id);
        renewed++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        this.logger.warn(`Failed to renew Outlook webhook for connection ${conn.id}: ${msg}`);
      }
    }

    this.logger.log(`Outlook webhook renewal complete: ${renewed}/${connections.length} renewed`);
  }
}
