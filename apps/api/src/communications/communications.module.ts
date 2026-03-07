import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_COMMUNICATIONS } from '../bullmq/queue.constants';
import { CommunicationsService } from './communications.service';
import { CommunicationsHandler } from './communications.processor';
import { CommunicationsDispatcher } from './communications.dispatcher';
import { SmsModule } from '../sms/sms.module';
import { BrowserPushModule } from '../browser-push/browser-push.module';
import { SupportTriageHandler } from '../jobs/support-triage.processor';

/**
 * CommunicationsModule — handles all outbound communications (email, SMS, push).
 * Registers the 'communications' BullMQ queue, the template-rendering service,
 * and the single CommunicationsDispatcher that routes all jobs on this queue
 * to the appropriate handler.
 *
 * PrismaModule and BullMqModule are global, so they are available without
 * explicit import. ConfigModule is also global.
 */
@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_COMMUNICATIONS }),
    SmsModule,
    BrowserPushModule,
  ],
  providers: [
    CommunicationsService,
    CommunicationsHandler,
    SupportTriageHandler,
    CommunicationsDispatcher,
  ],
  exports: [CommunicationsService],
})
export class CommunicationsModule {}
