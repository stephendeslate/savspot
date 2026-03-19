import { Module } from '@nestjs/common';
import { WaitlistService } from './waitlist.service';
import { WaitlistController } from './waitlist.controller';
import { WaitlistEventListener } from './waitlist-event.listener';
import { BookingSessionsModule } from '../booking-sessions/booking-sessions.module';
import { CommunicationsModule } from '../communications/communications.module';

@Module({
  imports: [BookingSessionsModule, CommunicationsModule],
  controllers: [WaitlistController],
  providers: [WaitlistService, WaitlistEventListener],
  exports: [WaitlistService],
})
export class WaitlistModule {}
