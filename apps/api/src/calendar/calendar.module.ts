import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_CALENDAR } from '../bullmq/queue.constants';
import { GoogleCalendarService } from './calendar.service';
import { CalendarController } from './calendar.controller';
import { CalendarWebhookController } from './calendar-webhook.controller';
import { IcalFeedController } from './ical-feed.controller';
import { IcalFeedService } from './ical-feed.service';
import { CalendarDispatcher } from './calendar.dispatcher';
import { CalendarPushHandler } from './calendar-push.processor';
import { CalendarSyncHandler } from './calendar-sync.processor';
import { CalendarTokenHandler } from './calendar-token.processor';
import { CalendarWatchRenewalHandler } from './calendar-watch-renewal.processor';
import { CalendarEventListener } from './calendar-event.listener';
import { OutlookCalendarService } from './outlook-calendar.service';
import { OutlookCalendarController } from './outlook-calendar.controller';

/**
 * Calendar integration module.
 * Provides Google Calendar OAuth, Outlook/Microsoft 365 OAuth, two-way sync,
 * push notifications, iCal feed generation, and event CRUD for booking ↔ calendar synchronization.
 */
@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_CALENDAR }),
  ],
  controllers: [CalendarController, CalendarWebhookController, IcalFeedController, OutlookCalendarController],
  providers: [
    GoogleCalendarService,
    IcalFeedService,
    CalendarDispatcher,
    CalendarPushHandler,
    CalendarSyncHandler,
    CalendarTokenHandler,
    CalendarWatchRenewalHandler,
    CalendarEventListener,
    OutlookCalendarService,
  ],
  exports: [GoogleCalendarService, IcalFeedService, OutlookCalendarService],
})
export class CalendarModule {}
