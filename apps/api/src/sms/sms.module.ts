import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_COMMUNICATIONS } from '../bullmq/queue.constants';
import { TwilioService } from './sms.service';
import { SmsHandler } from './sms.processor';
import { MorningSummaryHandler } from './morning-summary.processor';
import { WeeklyDigestHandler } from './weekly-digest.processor';

/**
 * SMS module for provider-facing notifications.
 * Shares the 'communications' queue with other notification channels.
 * Provides Twilio SMS delivery + morning summary + weekly digest handlers.
 * The queue is registered here for @InjectQueue usage in handlers that
 * need to re-enqueue jobs. The single @Processor lives in CommunicationsModule.
 */
@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_COMMUNICATIONS }),
  ],
  providers: [
    TwilioService,
    SmsHandler,
    MorningSummaryHandler,
    WeeklyDigestHandler,
  ],
  exports: [TwilioService, SmsHandler, MorningSummaryHandler, WeeklyDigestHandler],
})
export class SmsModule {}
