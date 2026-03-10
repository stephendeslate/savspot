import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_COMMUNICATIONS } from '../bullmq/queue.constants';
import { BrowserPushController } from './browser-push.controller';
import { BrowserPushService } from './browser-push.service';
import { BrowserPushHandler } from './browser-push.processor';

/**
 * Manages browser push (Web Push) subscriptions and delivery.
 * Uses web-push library with VAPID keys for secure push messaging.
 * Operates in no-op mode when VAPID keys are not configured.
 * The BrowserPushHandler is exported for use by CommunicationsDispatcher.
 */
@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_COMMUNICATIONS }),
  ],
  controllers: [BrowserPushController],
  providers: [BrowserPushService, BrowserPushHandler],
  exports: [BrowserPushService, BrowserPushHandler],
})
export class BrowserPushModule {}
