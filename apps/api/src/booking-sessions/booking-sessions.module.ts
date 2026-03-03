import { Module } from '@nestjs/common';
import { BookingSessionsController } from './booking-sessions.controller';
import { BookingSessionsService } from './booking-sessions.service';
import { ReservationService } from './reservation.service';

@Module({
  controllers: [BookingSessionsController],
  providers: [BookingSessionsService, ReservationService],
  exports: [BookingSessionsService, ReservationService],
})
export class BookingSessionsModule {}
