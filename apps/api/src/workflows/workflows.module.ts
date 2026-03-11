import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CommunicationsModule } from '../communications/communications.module';
import { SmsModule } from '../sms/sms.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { BrowserPushModule } from '../browser-push/browser-push.module';
import { QUEUE_WEBHOOKS } from '../bullmq/queue.constants';
import { WorkflowEngineService } from './workflow-engine.service';
import { WorkflowsController } from './workflows.controller';
import { WebhooksController } from './webhooks.controller';
import { TemplateService } from './services/template.service';
import { StageService } from './services/stage.service';
import { ExecutionService } from './services/execution.service';
import { WebhookService } from './services/webhook.service';
import { WebhookDispatchHandler } from './processors/webhook-dispatch.processor';
import { WebhooksDispatcher } from './webhooks.dispatcher';

@Module({
  imports: [
    CommunicationsModule,
    SmsModule,
    InvoicesModule,
    BrowserPushModule,
    BullModule.registerQueue({ name: QUEUE_WEBHOOKS }),
  ],
  controllers: [WorkflowsController, WebhooksController],
  providers: [
    WorkflowEngineService,
    TemplateService,
    StageService,
    ExecutionService,
    WebhookService,
    WebhookDispatchHandler,
    WebhooksDispatcher,
  ],
  exports: [WorkflowEngineService, WebhookService, ExecutionService],
})
export class WorkflowsModule {}
