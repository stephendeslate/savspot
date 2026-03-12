import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_PLATFORM_METRICS, JOB_COMPUTE_PLATFORM_METRICS } from '../bullmq/queue.constants';
import { PlatformMetricsService } from './platform-metrics.service';

@Processor(QUEUE_PLATFORM_METRICS)
export class PlatformMetricsProcessor extends WorkerHost {
  private readonly logger = new Logger(PlatformMetricsProcessor.name);

  constructor(private readonly metricsService: PlatformMetricsService) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing job ${job.name} (${job.id})`);

    switch (job.name) {
      case JOB_COMPUTE_PLATFORM_METRICS:
        await this.metricsService.computeAllMetrics();
        break;
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }
}
