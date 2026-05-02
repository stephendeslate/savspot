import { Module } from '@nestjs/common';
import { GoogleCalendarService } from './calendar.service';
import { CalendarController } from './calendar.controller';
import { CalendarWebhookController } from './calendar-webhook.controller';
import { IcalFeedController } from './ical-feed.controller';
import { IcalFeedService } from './ical-feed.service';
import { CalendarPushHandler } from './calendar-push.processor';
import { CalendarSyncHandler } from './calendar-sync.processor';
import { CalendarTokenHandler } from './calendar-token.processor';
import { CalendarEventListener } from './calendar-event.listener';
import { OutlookCalendarService } from './outlook-calendar.service';
import { OutlookCalendarController } from './outlook-calendar.controller';
import { CalendarWebhookRenewGoogleHandler, CalendarWebhookRenewOutlookHandler } from './handlers/calendar-webhook-renew.handler';
import { CalendarSyncFallbackHandler } from './handlers/calendar-sync-fallback.handler';

/**
 * Calendar integration module.
 * Provides Google Calendar OAuth, Outlook/Microsoft 365 OAuth, two-way sync,
 * push notifications, iCal feed generation, and event CRUD for booking ↔ calendar synchronization.
 *
 * Phase 4q cleanup: BullMQ CalendarDispatcher + CalendarWatchRenewalHandler
 * (dead code, never scheduled) retired. Six handlers remain as services
 * dispatched by Inngest functions in InngestModule.
 */
@Module({
  controllers: [CalendarController, CalendarWebhookController, IcalFeedController, OutlookCalendarController],
  providers: [
    GoogleCalendarService,
    IcalFeedService,
    CalendarPushHandler,
    CalendarSyncHandler,
    CalendarTokenHandler,
    CalendarEventListener,
    OutlookCalendarService,
    CalendarWebhookRenewGoogleHandler,
    CalendarWebhookRenewOutlookHandler,
    CalendarSyncFallbackHandler,
  ],
  exports: [
    GoogleCalendarService,
    IcalFeedService,
    OutlookCalendarService,
    CalendarPushHandler,
    CalendarSyncHandler,
    CalendarTokenHandler,
    CalendarWebhookRenewGoogleHandler,
    CalendarWebhookRenewOutlookHandler,
    CalendarSyncFallbackHandler,
  ],
})
export class CalendarModule {}
