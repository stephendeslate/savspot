import { Module } from '@nestjs/common';
import { PlatformMetricsController } from './platform-metrics.controller';
import { PlatformMetricsService } from './platform-metrics.service';

@Module({
  controllers: [PlatformMetricsController],
  providers: [PlatformMetricsService],
  exports: [PlatformMetricsService],
})
export class PlatformMetricsModule {}
