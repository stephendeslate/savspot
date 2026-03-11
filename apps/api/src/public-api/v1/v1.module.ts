import { Module } from '@nestjs/common';
import { TenantContextModule } from '../../tenant-context/tenant-context.module';
import { AvailabilityModule } from '../../availability/availability.module';
import { BookingSessionsModule } from '../../booking-sessions/booking-sessions.module';
import { BookingsModule } from '../../bookings/bookings.module';
import { PublicApiKeyService } from '../services/api-key.service';
import { PublicApiKeyGuard } from './guards/api-key.guard';
import { BusinessesController } from './controllers/businesses.controller';
import { ServicesController } from './controllers/services.controller';
import { AvailabilityController } from './controllers/availability.controller';
import { BookingSessionsController } from './controllers/booking-sessions.controller';
import { BookingsController } from './controllers/bookings.controller';

@Module({
  imports: [
    TenantContextModule,
    AvailabilityModule,
    BookingSessionsModule,
    BookingsModule,
  ],
  controllers: [
    BusinessesController,
    ServicesController,
    AvailabilityController,
    BookingSessionsController,
    BookingsController,
  ],
  providers: [PublicApiKeyService, PublicApiKeyGuard],
})
export class V1Module {}
