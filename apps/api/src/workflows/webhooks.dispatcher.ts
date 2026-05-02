import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  QUEUE_WEBHOOKS,
  JOB_DISPATCH_WEBHOOK,
  JOB_EXECUTE_STAGE,
} from '../bullmq/queue.constants';
import {
  WebhookDispatchHandler,
  WebhookDispatchJobData,
} from './processors/webhook-dispatch.processor';
import {
  StageExecutionHandler,
  StageExecutionJobData,
} from './processors/stage-execution.handler';

@Processor(QUEUE_WEBHOOKS)
export class WebhooksDispatcher extends WorkerHost {
  private readonly logger = new Logger(WebhooksDispatcher.name);

  constructor(
    private readonly dispatchHandler: WebhookDispatchHandler,
    private readonly stageExecutionHandler: StageExecutionHandler,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case JOB_DISPATCH_WEBHOOK:
        return this.dispatchHandler.handle(
          (job as Job<WebhookDispatchJobData>).data,
        );
      case JOB_EXECUTE_STAGE:
        return this.stageExecutionHandler.handle(
          (job as Job<StageExecutionJobData>).data,
        );
      default:
        this.logger.warn(`Unknown webhooks job name: ${job.name}`);
    }
  }
}
