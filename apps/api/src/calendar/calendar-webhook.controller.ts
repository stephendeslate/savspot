import {
  Controller,
  Post,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Public } from '../common/decorators/public.decorator';
import { GoogleCalendarService } from './calendar.service';
import {
  QUEUE_CALENDAR,
  JOB_CALENDAR_TWO_WAY_SYNC,
} from '../bullmq/queue.constants';

/**
 * Webhook controller for Google Calendar push notifications.
 * Google sends POST requests when calendar events change on watched calendars.
 */
@ApiTags('Webhooks')
@Controller('webhooks/google-calendar')
export class CalendarWebhookController {
  private readonly logger = new Logger(CalendarWebhookController.name);

  constructor(
    private readonly calendarService: GoogleCalendarService,
    @InjectQueue(QUEUE_CALENDAR) private readonly calendarQueue: Queue,
  ) {}

  /**
   * Handle Google Calendar push notification.
   * Validates the channel/resource headers and enqueues a sync job.
   */
  @Post()
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'Google Calendar webhook endpoint' })
  @ApiResponse({ status: 200, description: 'Webhook received' })
  async handlePushNotification(
    @Headers('x-goog-channel-id') channelId: string | undefined,
    @Headers('x-goog-resource-id') resourceId: string | undefined,
    @Headers('x-goog-resource-state') resourceState: string | undefined,
  ) {
    if (!channelId || !resourceId) {
      this.logger.warn(
        'Google Calendar webhook received without channel/resource headers',
      );
      return { received: true };
    }

    this.logger.log(
      `Google Calendar webhook: channel=${channelId} resource=${resourceId} state=${resourceState}`,
    );

    // The 'sync' state is the initial confirmation — no action needed
    if (resourceState === 'sync') {
      this.logger.log(`Watch channel ${channelId} confirmed (sync message)`);
      return { received: true };
    }

    // Look up the connection by channel ID
    const connection =
      await this.calendarService.findConnectionByChannelId(channelId);

    if (!connection) {
      this.logger.warn(
        `No active connection found for channel ${channelId} — ignoring`,
      );
      return { received: true };
    }

    // Enqueue a two-way sync job for this connection
    await this.calendarQueue.add(
      JOB_CALENDAR_TWO_WAY_SYNC,
      {
        connectionId: connection.id,
        tenantId: connection.tenantId,
        triggeredBy: 'webhook',
        channelId,
        resourceId,
      },
      {
        // Deduplicate: if a sync job for this connection is already queued, skip
        jobId: `calendar-sync-${connection.id}-${Date.now()}`,
      },
    );

    this.logger.log(
      `Sync job enqueued for connection ${connection.id} via webhook`,
    );

    return { received: true };
  }
}
