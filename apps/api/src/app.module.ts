import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { SentryModule } from '@sentry/nestjs/setup';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';
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
import { TeamModule } from './team/team.module';
import { SupportModule } from './support/support.module';
import { NotesModule } from './notes/notes.module';
import { FeedbackModule } from './feedback/feedback.module';
import { BullMqModule } from './bullmq/bullmq.module';
import { EventsModule } from './events/events.module';
import { TaxRatesModule } from './tax-rates/tax-rates.module';
import { ConsentModule } from './consent/consent.module';
import { BookingFlowModule } from './booking-flow/booking-flow.module';
import { AuditModule } from './audit/audit.module';
import { GalleryModule } from './gallery/gallery.module';
import { OnboardingToursModule } from './onboarding-tours/onboarding-tours.module';
import { CustomThrottlerGuard } from './common/guards/throttle.guard';
import { CsrfGuard } from './common/guards/csrf.guard';
import { SecurityHeadersMiddleware } from './common/middleware/security-headers.middleware';
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
    SentryModule.forRoot(),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env['NODE_ENV'] === 'production' ? 'info' : 'debug',
        transport: process.env['NODE_ENV'] !== 'production'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
        genReqId: (req) => (req.headers['x-request-id'] as string) || randomUUID(),
      },
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        // Higher limit in test mode to avoid E2E rate-limit failures
        limit: process.env['NODE_ENV'] === 'test' ? 600 : 60,
      },
    ]),
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
    TeamModule,
    SupportModule,
    NotesModule,
    FeedbackModule,
    TaxRatesModule,
    ConsentModule,
    BookingFlowModule,
    AuditModule,
    GalleryModule,
    OnboardingToursModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: CsrfGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(SecurityHeadersMiddleware).forRoutes('*');
  }
}
