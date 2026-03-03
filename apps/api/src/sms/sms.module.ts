import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_COMMUNICATIONS } from '../bullmq/queue.constants';
import { TwilioService } from './sms.service';
import { SmsProcessor } from './sms.processor';
import { MorningSummaryProcessor } from './morning-summary.processor';
import { WeeklyDigestProcessor } from './weekly-digest.processor';

/**
 * SMS module for provider-facing notifications.
 * Shares the 'communications' queue with other notification channels.
 * Provides Twilio SMS delivery + morning summary + weekly digest processors.
 */
@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_COMMUNICATIONS }),
  ],
  providers: [
    TwilioService,
    SmsProcessor,
    MorningSummaryProcessor,
    WeeklyDigestProcessor,
  ],
  exports: [TwilioService],
})
export class SmsModule {}
