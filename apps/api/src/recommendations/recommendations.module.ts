import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_AI_OPERATIONS } from '../bullmq/queue.constants';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';
import { ChurnRiskService } from './churn-risk.service';
import { RecommendationsProcessor } from './recommendations.processor';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_AI_OPERATIONS })],
  controllers: [RecommendationsController],
  providers: [RecommendationsService, ChurnRiskService, RecommendationsProcessor],
  exports: [RecommendationsService, ChurnRiskService],
})
export class RecommendationsModule {}
