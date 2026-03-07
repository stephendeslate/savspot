import { Module } from '@nestjs/common';
import { BookingFlowController } from './booking-flow.controller';
import { BookingFlowService } from './booking-flow.service';

@Module({
  controllers: [BookingFlowController],
  providers: [BookingFlowService],
  exports: [BookingFlowService],
})
export class BookingFlowModule {}
