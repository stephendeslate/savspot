import { Module } from '@nestjs/common';
import { CommunicationsModule } from '../communications/communications.module';
import { SmsModule } from '../sms/sms.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { BrowserPushModule } from '../browser-push/browser-push.module';
import { DevicePushTokensModule } from '../device-push-tokens/device-push-tokens.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WorkflowEngineService } from './workflow-engine.service';
import { WorkflowsController } from './workflows.controller';
import { WebhooksController } from './webhooks.controller';
import { TemplateService } from './services/template.service';
import { StageService } from './services/stage.service';
import { ExecutionService } from './services/execution.service';
import { WebhookService } from './services/webhook.service';
import { StageAutomationService } from './services/stage-automation.service';
import { StageOrchestratorService } from './services/stage-orchestrator.service';
import { WebhookDispatchHandler } from './processors/webhook-dispatch.processor';
import { StageExecutionHandler } from './processors/stage-execution.handler';

@Module({
  imports: [
    CommunicationsModule,
    SmsModule,
    InvoicesModule,
    BrowserPushModule,
    DevicePushTokensModule,
    NotificationsModule,
  ],
  controllers: [WorkflowsController, WebhooksController],
  providers: [
    WorkflowEngineService,
    TemplateService,
    StageService,
    ExecutionService,
    WebhookService,
    StageAutomationService,
    StageOrchestratorService,
    WebhookDispatchHandler,
    StageExecutionHandler,
  ],
  exports: [
    WorkflowEngineService,
    WebhookService,
    ExecutionService,
    WebhookDispatchHandler,
    StageExecutionHandler,
  ],
})
export class WorkflowsModule {}
