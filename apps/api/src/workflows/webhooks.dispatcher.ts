import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  QUEUE_WEBHOOKS,
  JOB_DISPATCH_WEBHOOK,
} from '../bullmq/queue.constants';
import { WebhookDispatchHandler } from './processors/webhook-dispatch.processor';

@Processor(QUEUE_WEBHOOKS)
export class WebhooksDispatcher extends WorkerHost {
  private readonly logger = new Logger(WebhooksDispatcher.name);

  constructor(
    private readonly dispatchHandler: WebhookDispatchHandler,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case JOB_DISPATCH_WEBHOOK:
        return this.dispatchHandler.handle(job);
      default:
        this.logger.warn(`Unknown webhooks job name: ${job.name}`);
    }
  }
}
