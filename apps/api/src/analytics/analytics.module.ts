import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsQueryService } from './services/analytics-query.service';
import { BookingFlowTrackerService } from './services/booking-flow-tracker.service';
import { ExportService } from './services/export.service';

@Module({
  controllers: [AnalyticsController],
  providers: [
    AnalyticsQueryService,
    BookingFlowTrackerService,
    ExportService,
  ],
  exports: [AnalyticsQueryService],
})
export class AnalyticsModule {}
