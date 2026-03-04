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
import { CommunicationsModule } from './communications/communications.module';
import { WorkflowsModule } from './workflows/workflows.module';
import { CalendarModule } from './calendar/calendar.module';
import { SmsModule } from './sms/sms.module';
import { JobsModule } from './jobs/jobs.module';
import { NotificationsModule } from './notifications/notifications.module';
import { BrowserPushModule } from './browser-push/browser-push.module';
import { ClientPortalModule } from './client-portal/client-portal.module';
import { ClientsModule } from './clients/clients.module';
import { DiscountsModule } from './discounts/discounts.module';
import { BullMqModule } from './bullmq/bullmq.module';
import { EventsModule } from './events/events.module';
import { validateEnv } from './config/env.validation';
import {
  appConfig,
  jwtConfig,
  googleConfig,
  resendConfig,
  r2Config,
  stripeConfig,
  twilioConfig,
  googleCalendarConfig,
  vapidConfig,
} from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      load: [appConfig, jwtConfig, googleConfig, resendConfig, r2Config, stripeConfig, twilioConfig, googleCalendarConfig, vapidConfig],
    }),
    PrismaModule,
    RedisModule,
    BullMqModule,
    EventsModule,
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
    CommunicationsModule,
    WorkflowsModule,
    CalendarModule,
    SmsModule,
    JobsModule,
    NotificationsModule,
    BrowserPushModule,
    ClientPortalModule,
    ClientsModule,
    DiscountsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
