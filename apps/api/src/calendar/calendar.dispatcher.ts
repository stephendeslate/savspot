import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  QUEUE_CALENDAR,
  JOB_CALENDAR_EVENT_PUSH,
  JOB_CALENDAR_TWO_WAY_SYNC,
  JOB_CALENDAR_TOKEN_REFRESH,
  JOB_CALENDAR_WATCH_RENEWAL,
} from '../bullmq/queue.constants';
import { CalendarPushHandler } from './calendar-push.processor';
import { CalendarSyncHandler } from './calendar-sync.processor';
import { CalendarTokenHandler } from './calendar-token.processor';
import { CalendarWatchRenewalHandler } from './calendar-watch-renewal.processor';

@Processor(QUEUE_CALENDAR)
export class CalendarDispatcher extends WorkerHost {
  private readonly logger = new Logger(CalendarDispatcher.name);

  constructor(
    private readonly pushHandler: CalendarPushHandler,
    private readonly syncHandler: CalendarSyncHandler,
    private readonly tokenHandler: CalendarTokenHandler,
    private readonly watchRenewalHandler: CalendarWatchRenewalHandler,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case JOB_CALENDAR_EVENT_PUSH:
        return this.pushHandler.handle(job);
      case JOB_CALENDAR_TWO_WAY_SYNC:
        return this.syncHandler.handle(job);
      case JOB_CALENDAR_TOKEN_REFRESH:
        return this.tokenHandler.handle(job);
      case JOB_CALENDAR_WATCH_RENEWAL:
        return this.watchRenewalHandler.handle(job);
      default:
        this.logger.warn(`Unknown calendar job name: ${job.name}`);
    }
  }
}
