import { Module } from '@nestjs/common';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';
import { AvailabilityRulesService } from './availability-rules.service';
import { BlockedDatesService } from './blocked-dates.service';

@Module({
  controllers: [AvailabilityController],
  providers: [AvailabilityService, AvailabilityRulesService, BlockedDatesService],
  exports: [AvailabilityService, AvailabilityRulesService, BlockedDatesService],
})
export class AvailabilityModule {}
