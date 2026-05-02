import { Module } from '@nestjs/common';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';
import { ChurnRiskService } from './churn-risk.service';

@Module({
  controllers: [RecommendationsController],
  providers: [RecommendationsService, ChurnRiskService],
  exports: [RecommendationsService, ChurnRiskService],
})
export class RecommendationsModule {}
