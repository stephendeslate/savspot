import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_PLATFORM_METRICS } from '../bullmq/queue.constants';
import { PlatformMetricsController } from './platform-metrics.controller';
import { PlatformMetricsService } from './platform-metrics.service';
import { PlatformMetricsProcessor } from './platform-metrics.processor';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_PLATFORM_METRICS })],
  controllers: [PlatformMetricsController],
  providers: [PlatformMetricsService, PlatformMetricsProcessor],
  exports: [PlatformMetricsService],
})
export class PlatformMetricsModule {}
