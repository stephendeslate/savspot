import { Module } from '@nestjs/common';
import { BookingSessionsController } from './booking-sessions.controller';
import { BookingSessionsService } from './booking-sessions.service';
import { ReservationService } from './reservation.service';
import { PaymentsModule } from '../payments/payments.module';
import { ConsentModule } from '../consent/consent.module';

@Module({
  imports: [PaymentsModule, ConsentModule],
  controllers: [BookingSessionsController],
  providers: [BookingSessionsService, ReservationService],
  exports: [BookingSessionsService, ReservationService],
})
export class BookingSessionsModule {}
