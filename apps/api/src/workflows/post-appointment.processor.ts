import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  QUEUE_COMMUNICATIONS,
  JOB_PROCESS_POST_APPOINTMENT,
  CRON_EVERY_15_MIN,
} from '../bullmq/queue.constants';

/**
 * PostAppointmentService — registers a repeating BullMQ job on the
 * 'communications' queue that runs every 15 minutes.
 *
 * The actual scan-and-enqueue logic lives in CommunicationsProcessor,
 * which handles the processPostAppointmentTriggers job name. This service
 * is responsible only for ensuring the repeating schedule is registered.
 *
 * Separation of concerns:
 * - This file (workflows/): Owns the scheduling/registration
 * - CommunicationsProcessor: Owns the job execution logic
 */
@Injectable()
export class PostAppointmentService implements OnModuleInit {
  private readonly logger = new Logger(PostAppointmentService.name);

  constructor(
    @InjectQueue(QUEUE_COMMUNICATIONS) private readonly commsQueue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      // Register the repeating job (idempotent — BullMQ deduplicates by repeat key)
      await this.commsQueue.add(
        JOB_PROCESS_POST_APPOINTMENT,
        {},
        {
          repeat: { pattern: CRON_EVERY_15_MIN },
          removeOnComplete: { count: 10 },
          removeOnFail: { count: 50 },
        },
      );

      this.logger.log(
        `Registered repeating job: ${JOB_PROCESS_POST_APPOINTMENT} (every 15 min)`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to register repeating job ${JOB_PROCESS_POST_APPOINTMENT}: ${error}`,
      );
    }
  }
}
