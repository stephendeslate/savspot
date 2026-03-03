import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { TenantContextModule } from './tenant-context/tenant-context.module';
import { UploadModule } from './upload/upload.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TenantsModule } from './tenants/tenants.module';
import { ServicesModule } from './services/services.module';
import { AvailabilityModule } from './availability/availability.module';
import { BookingSessionsModule } from './booking-sessions/booking-sessions.module';
import { PaymentsModule } from './payments/payments.module';
import { BookingsModule } from './bookings/bookings.module';
import { InvoicesModule } from './invoices/invoices.module';
import { PublicBookingModule } from './public-booking/public-booking.module';
import { validateEnv } from './config/env.validation';
import {
  appConfig,
  jwtConfig,
  googleConfig,
  resendConfig,
  r2Config,
  stripeConfig,
} from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      load: [appConfig, jwtConfig, googleConfig, resendConfig, r2Config, stripeConfig],
    }),
    PrismaModule,
    RedisModule,
    TenantContextModule,
    HealthModule,
    UploadModule,
    AuthModule,
    UsersModule,
    TenantsModule,
    ServicesModule,
    AvailabilityModule,
    BookingSessionsModule,
    PaymentsModule,
    BookingsModule,
    InvoicesModule,
    PublicBookingModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
