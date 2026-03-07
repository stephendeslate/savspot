import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_CALENDAR } from '../bullmq/queue.constants';
import { GoogleCalendarService } from './calendar.service';
import { CalendarController } from './calendar.controller';
import { CalendarWebhookController } from './calendar-webhook.controller';
import { CalendarDispatcher } from './calendar.dispatcher';
import { CalendarPushHandler } from './calendar-push.processor';
import { CalendarSyncHandler } from './calendar-sync.processor';
import { CalendarTokenHandler } from './calendar-token.processor';
import { CalendarWatchRenewalHandler } from './calendar-watch-renewal.processor';

/**
 * Calendar integration module.
 * Provides Google Calendar OAuth, two-way sync, push notifications,
 * and event CRUD for booking ↔ calendar synchronization.
 */
@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_CALENDAR }),
  ],
  controllers: [CalendarController, CalendarWebhookController],
  providers: [
    GoogleCalendarService,
    CalendarDispatcher,
    CalendarPushHandler,
    CalendarSyncHandler,
    CalendarTokenHandler,
    CalendarWatchRenewalHandler,
  ],
  exports: [GoogleCalendarService],
})
export class CalendarModule {}
