import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  QUEUE_CALENDAR,
  JOB_CALENDAR_EVENT_PUSH,
  JOB_CALENDAR_TWO_WAY_SYNC,
  JOB_CALENDAR_TOKEN_REFRESH,
  JOB_CALENDAR_WATCH_RENEWAL,
  JOB_CALENDAR_WEBHOOK_RENEW_GOOGLE,
  JOB_CALENDAR_WEBHOOK_RENEW_OUTLOOK,
  JOB_CALENDAR_SYNC_FALLBACK,
} from '../bullmq/queue.constants';
import {
  CalendarPushHandler,
  CalendarEventPushJobData,
} from './calendar-push.processor';
import {
  CalendarSyncHandler,
  CalendarSyncJobData,
} from './calendar-sync.processor';
import { CalendarTokenHandler } from './calendar-token.processor';
import { CalendarWatchRenewalHandler } from './calendar-watch-renewal.processor';
import { CalendarWebhookRenewGoogleHandler, CalendarWebhookRenewOutlookHandler } from './handlers/calendar-webhook-renew.handler';
import { CalendarSyncFallbackHandler } from './handlers/calendar-sync-fallback.handler';

@Processor(QUEUE_CALENDAR)
export class CalendarDispatcher extends WorkerHost {
  private readonly logger = new Logger(CalendarDispatcher.name);

  constructor(
    private readonly pushHandler: CalendarPushHandler,
    private readonly syncHandler: CalendarSyncHandler,
    private readonly tokenHandler: CalendarTokenHandler,
    private readonly watchRenewalHandler: CalendarWatchRenewalHandler,
    private readonly webhookRenewGoogleHandler: CalendarWebhookRenewGoogleHandler,
    private readonly webhookRenewOutlookHandler: CalendarWebhookRenewOutlookHandler,
    private readonly syncFallbackHandler: CalendarSyncFallbackHandler,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case JOB_CALENDAR_EVENT_PUSH:
        return this.pushHandler.handle(job.data as CalendarEventPushJobData);
      case JOB_CALENDAR_TWO_WAY_SYNC:
        return this.syncHandler.handle(job.data as CalendarSyncJobData);
      case JOB_CALENDAR_TOKEN_REFRESH:
        return this.tokenHandler.handle();
      case JOB_CALENDAR_WATCH_RENEWAL:
        return this.watchRenewalHandler.handle();
      case JOB_CALENDAR_WEBHOOK_RENEW_GOOGLE:
        return this.webhookRenewGoogleHandler.handle();
      case JOB_CALENDAR_WEBHOOK_RENEW_OUTLOOK:
        return this.webhookRenewOutlookHandler.handle();
      case JOB_CALENDAR_SYNC_FALLBACK:
        return this.syncFallbackHandler.handle();
      default:
        this.logger.warn(`Unknown calendar job name: ${job.name}`);
    }
  }
}
