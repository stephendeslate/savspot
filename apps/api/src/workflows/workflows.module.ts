import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_COMMUNICATIONS } from '../bullmq/queue.constants';
import { CommunicationsModule } from '../communications/communications.module';
import { SmsModule } from '../sms/sms.module';
import { WorkflowEngineService } from './workflow-engine.service';
import { PostAppointmentService } from './post-appointment.processor';

/**
 * WorkflowsModule — orchestrates business automation rules.
 *
 * Listens to domain events via @OnEvent decorators (WorkflowEngineService)
 * and dispatches actions (email, SMS, notifications) based on
 * workflow_automations table configuration.
 *
 * Also registers the post-appointment follow-up repeating job
 * (PostAppointmentService) that scans for completed bookings every 15 min.
 *
 * Dependencies:
 * - CommunicationsModule: For sending emails via CommunicationsService
 * - SmsModule: For sending SMS via TwilioService
 * - BullModule (QUEUE_COMMUNICATIONS): For registering repeating jobs
 * - PrismaModule (global): For DB access
 * - EventsModule (global): For @OnEvent decorators
 */
@Module({
  imports: [
    CommunicationsModule,
    SmsModule,
    BullModule.registerQueue({ name: QUEUE_COMMUNICATIONS }),
  ],
  providers: [WorkflowEngineService, PostAppointmentService],
  exports: [WorkflowEngineService],
})
export class WorkflowsModule {}
