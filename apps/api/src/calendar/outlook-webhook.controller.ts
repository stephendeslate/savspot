import {
  Controller,
  Post,
  Query,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Public } from '../common/decorators/public.decorator';
import {
  QUEUE_CALENDAR,
  JOB_CALENDAR_TWO_WAY_SYNC,
} from '../bullmq/queue.constants';
import { OutlookCalendarService } from './outlook-calendar.service';

interface OutlookChangeNotification {
  subscriptionId: string;
  clientState?: string;
  changeType?: string;
  resource?: string;
}

interface OutlookNotificationPayload {
  value?: OutlookChangeNotification[];
}

@ApiTags('Webhooks')
@Throttle({ default: { limit: 500, ttl: 60_000 } })
@Controller('webhooks/outlook-calendar')
export class OutlookWebhookController {
  private readonly logger = new Logger(OutlookWebhookController.name);

  constructor(
    private readonly outlookService: OutlookCalendarService,
    @InjectQueue(QUEUE_CALENDAR) private readonly calendarQueue: Queue,
  ) {}

  @Post()
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async handleNotification(
    @Query('validationToken') validationToken: string | undefined,
    @Body() body: OutlookNotificationPayload,
  ) {
    // Microsoft validation request — echo token back as plain text
    if (validationToken) {
      this.logger.log('Outlook webhook validation request received');
      return validationToken;
    }

    // Process change notifications
    if (body?.value && Array.isArray(body.value)) {
      for (const notification of body.value) {
        const subscriptionId = notification.subscriptionId;
        const clientState = notification.clientState;

        this.logger.log(
          `Outlook change notification: subscription=${subscriptionId}`,
        );

        // Look up connection by webhook channel ID (subscriptionId)
        const connection =
          await this.outlookService.findConnectionBySubscriptionId(
            subscriptionId,
          );

        if (!connection) {
          this.logger.warn(
            `No connection for subscription ${subscriptionId}`,
          );
          continue;
        }

        // Verify client state
        if (connection.webhookToken && connection.webhookToken !== clientState) {
          this.logger.warn(
            `Client state mismatch for subscription ${subscriptionId}`,
          );
          continue;
        }

        await this.calendarQueue.add(
          JOB_CALENDAR_TWO_WAY_SYNC,
          {
            connectionId: connection.id,
            tenantId: connection.tenantId,
            triggeredBy: 'outlook-webhook',
            subscriptionId,
          },
          { jobId: `calendar-sync-${connection.id}-${Date.now()}` },
        );
      }
    }

    return { received: true };
  }
}
