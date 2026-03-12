import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  QUEUE_AI_OPERATIONS,
  JOB_RECOMMENDATION_SERVICE_AFFINITY,
  JOB_RECOMMENDATION_CLIENT_PREFERENCE,
  JOB_CHURN_RISK_COMPUTE,
  JOB_RECOMMENDATION_CLEANUP,
} from '../bullmq/queue.constants';
import { RecommendationsService } from './recommendations.service';
import { ChurnRiskService } from './churn-risk.service';

@Processor(QUEUE_AI_OPERATIONS)
export class RecommendationsProcessor extends WorkerHost {
  private readonly logger = new Logger(RecommendationsProcessor.name);

  constructor(
    private readonly recommendationsService: RecommendationsService,
    private readonly churnRiskService: ChurnRiskService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing job ${job.name}`);

    switch (job.name) {
      case JOB_RECOMMENDATION_SERVICE_AFFINITY:
        await this.recommendationsService.computeServiceAffinity(
          job.data?.tenantId as string | undefined,
        );
        break;
      case JOB_RECOMMENDATION_CLIENT_PREFERENCE:
        await this.recommendationsService.computeClientPreferences(
          job.data?.tenantId as string | undefined,
        );
        break;
      case JOB_CHURN_RISK_COMPUTE:
        await this.churnRiskService.computeChurnRisk();
        break;
      case JOB_RECOMMENDATION_CLEANUP:
        await this.recommendationsService.cleanupExpired();
        break;
      default:
        this.logger.warn(`Unknown job: ${job.name}`);
    }
  }
}
