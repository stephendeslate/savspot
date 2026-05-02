import { Module } from '@nestjs/common';
import { CommunicationsService } from './communications.service';
import { CommunicationsHandler } from './communications.processor';
import { CircuitBreaker } from '../common/utils/circuit-breaker';
import { ResendWebhookController } from './resend-webhook.controller';
import { CommunicationTemplatesController } from './communication-templates.controller';
import { CommunicationTemplatesService } from './communication-templates.service';
import { CommunicationsComposeController } from './communications-compose.controller';
import { CommunicationsLogController } from './communications-log.controller';
import { PreferenceCenterController } from './preference-center.controller';
import { CommunicationsComposeService } from './communications-compose.service';
import { CommunicationsLogService } from './communications-log.service';
import { PreferenceCenterService } from './preference-center.service';
import { SmsModule } from '../sms/sms.module';
import { BrowserPushModule } from '../browser-push/browser-push.module';
import { SupportTriageHandler } from '../jobs/support-triage.processor';
import { SendBookingRemindersHandler } from '../jobs/send-booking-reminders.processor';
import { ProcessNotificationDigestsHandler } from '../jobs/process-notification-digests.processor';
import { ComputeClientInsightsHandler } from '../jobs/compute-client-insights.processor';

@Module({
  imports: [
    SmsModule,
    BrowserPushModule,
  ],
  controllers: [
    ResendWebhookController,
    CommunicationTemplatesController,
    CommunicationsComposeController,
    CommunicationsLogController,
    PreferenceCenterController,
  ],
  providers: [
    CommunicationsService,
    CommunicationsHandler,
    CommunicationTemplatesService,
    SendBookingRemindersHandler,
    SupportTriageHandler,
    ProcessNotificationDigestsHandler,
    ComputeClientInsightsHandler,
    CircuitBreaker,
    CommunicationsComposeService,
    CommunicationsLogService,
    PreferenceCenterService,
  ],
  exports: [
    CommunicationsService,
    CommunicationTemplatesService,
    CircuitBreaker,
    CommunicationsHandler,
    SupportTriageHandler,
    SendBookingRemindersHandler,
    ProcessNotificationDigestsHandler,
    ComputeClientInsightsHandler,
  ],
})
export class CommunicationsModule {}
