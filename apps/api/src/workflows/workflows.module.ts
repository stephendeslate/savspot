import { Module } from '@nestjs/common';
import { CommunicationsModule } from '../communications/communications.module';
import { SmsModule } from '../sms/sms.module';
import { WorkflowEngineService } from './workflow-engine.service';

/**
 * WorkflowsModule — orchestrates business automation rules.
 *
 * Listens to domain events via @OnEvent decorators (WorkflowEngineService)
 * and dispatches actions (email, SMS, notifications) based on
 * workflow_automations table configuration.
 *
 * Dependencies:
 * - CommunicationsModule: For sending emails via CommunicationsService
 * - SmsModule: For sending SMS via TwilioService
 * - PrismaModule (global): For DB access
 * - EventsModule (global): For @OnEvent decorators
 *
 * Note: Post-appointment repeating job schedule is registered by
 * JobSchedulerService in JobsModule.
 */
@Module({
  imports: [CommunicationsModule, SmsModule],
  providers: [WorkflowEngineService],
  exports: [WorkflowEngineService],
})
export class WorkflowsModule {}
