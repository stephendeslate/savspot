import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_COMMUNICATIONS } from '../bullmq/queue.constants';
import { SmsService } from './sms.service';
import { SmsHandler } from './sms.processor';
import { SmsEventListener } from './sms-event.listener';
import { MorningSummaryHandler } from './morning-summary.processor';
import { WeeklyDigestHandler } from './weekly-digest.processor';
import { smsProviderFactory } from './providers';

/**
 * SMS module for provider-facing notifications.
 * Shares the 'communications' queue with other notification channels.
 * Provides SMS delivery via configurable provider (Twilio/Plivo) +
 * morning summary + weekly digest handlers.
 * The queue is registered here for @InjectQueue usage in handlers that
 * need to re-enqueue jobs. The single @Processor lives in CommunicationsModule.
 */
@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_COMMUNICATIONS }),
  ],
  providers: [
    smsProviderFactory,
    SmsService,
    SmsHandler,
    SmsEventListener,
    MorningSummaryHandler,
    WeeklyDigestHandler,
  ],
  exports: [SmsService, SmsHandler, MorningSummaryHandler, WeeklyDigestHandler],
})
export class SmsModule {}
