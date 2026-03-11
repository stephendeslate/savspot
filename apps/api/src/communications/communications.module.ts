import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_COMMUNICATIONS } from '../bullmq/queue.constants';
import { CommunicationsService } from './communications.service';
import { CommunicationsHandler } from './communications.processor';
import { CommunicationsDispatcher } from './communications.dispatcher';
import { CircuitBreaker } from '../common/utils/circuit-breaker';
import { ResendWebhookController } from './resend-webhook.controller';
import { CommunicationTemplatesController } from './communication-templates.controller';
import { CommunicationTemplatesService } from './communication-templates.service';
import { SmsModule } from '../sms/sms.module';
import { BrowserPushModule } from '../browser-push/browser-push.module';
import { SupportTriageHandler } from '../jobs/support-triage.processor';
import { SendBookingRemindersHandler } from '../jobs/send-booking-reminders.processor';
import { ProcessNotificationDigestsHandler } from '../jobs/process-notification-digests.processor';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_COMMUNICATIONS }),
    SmsModule,
    BrowserPushModule,
  ],
  controllers: [ResendWebhookController, CommunicationTemplatesController],
  providers: [
    CommunicationsService,
    CommunicationsHandler,
    CommunicationTemplatesService,
    SendBookingRemindersHandler,
    SupportTriageHandler,
    ProcessNotificationDigestsHandler,
    CircuitBreaker,
    CommunicationsDispatcher,
  ],
  exports: [CommunicationsService, CommunicationTemplatesService, CircuitBreaker],
})
export class CommunicationsModule {}
