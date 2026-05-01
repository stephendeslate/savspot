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
import { CalendarModule } from './calendar/calendar.module';
import { SmsModule } from './sms/sms.module';
import { JobsModule } from './jobs/jobs.module';
import { InngestModule } from './inngest/inngest.module';
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
import { GalleryModule } from './gallery/gallery.module';
import { OnboardingToursModule } from './onboarding-tours/onboarding-tours.module';
import { ReviewsModule } from './reviews/reviews.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { MessagingModule } from './messaging/messaging.module';
import { EmbedModule } from './embed/embed.module';
import { ImportsModule } from './imports/imports.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ReferralsModule } from './referrals/referrals.module';
import { CurrencyModule } from './currency/currency.module';
import { DevicePushTokensModule } from './device-push-tokens/device-push-tokens.module';
import { WaitlistModule } from './waitlist/waitlist.module';
import { PosthogModule } from './posthog/posthog.module';
import { CustomThrottlerGuard } from './common/guards/throttle.guard';
import { CsrfGuard } from './common/guards/csrf.guard';
import { TenantStatusGuard } from './common/guards/tenant-status.guard';
import { DemoTenantGuard } from './common/guards/demo-tenant.guard';
import { SecurityHeadersMiddleware } from './common/middleware/security-headers.middleware';
import { validateEnv } from './config/env.validation';
import {
  appConfig,
  jwtConfig,
  googleConfig,
  resendConfig,
  r2Config,
  supabaseConfig,
  storageConfig,
  inngestConfig,
  stripeConfig,
  smsConfig,
  twilioConfig,
  plivoConfig,
  googleCalendarConfig,
  microsoftCalendarConfig,
  vapidConfig,
  posthogConfig,
} from './config/configuration';

// EE modules — loaded conditionally when @savspot/ee is installed
function isEeAvailable(): boolean {
  try {
    require.resolve('@savspot/ee');
    return true;
  } catch {
    return false;
  }
}

/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any */
function getEeModules(): any[] {
  if (!isEeAvailable()) {
    return [];
  }
  const ee = require('@savspot/ee');
  return [
    ee.LicenseModule,
    require('./audit/audit.module').AuditModule,
    require('./workflows/workflows.module').WorkflowsModule,
    require('./contracts/contracts.module').ContractsModule,
    require('./quotes/quotes.module').QuotesModule,
    require('./custom-domains/custom-domains.module').CustomDomainsModule,
    require('./multi-location/multi-location.module').MultiLocationModule,
    require('./partners/partners.module').PartnersModule,
    require('./recommendations/recommendations.module').RecommendationsModule,
    require('./voice/voice.module').VoiceModule,
    require('./accounting/accounting.module').AccountingModule,
    require('./directory/directory.module').DirectoryModule,
    require('./platform-metrics/platform-metrics.module').PlatformMetricsModule,
    require('./admin/admin.module').AdminModule,
    require('./ai-operations/ai-operations.module').AiOperationsModule,
    require('./public-api/public-api.module').PublicApiModule,
  ];
}
/* eslint-enable @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any */

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      load: [appConfig, jwtConfig, googleConfig, resendConfig, r2Config, supabaseConfig, storageConfig, inngestConfig, stripeConfig, smsConfig, twilioConfig, plivoConfig, googleCalendarConfig, microsoftCalendarConfig, vapidConfig, posthogConfig],
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
    CalendarModule,
    SmsModule,
    JobsModule,
    InngestModule,
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
    GalleryModule,
    OnboardingToursModule,
    ReviewsModule,
    SubscriptionsModule,
    MessagingModule,
    EmbedModule,
    ImportsModule,
    AnalyticsModule,
    ReferralsModule,
    CurrencyModule,
    DevicePushTokensModule,
    PosthogModule,
    WaitlistModule,
    // EE modules — conditionally loaded when @savspot/ee is installed
    ...getEeModules(),
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: TenantStatusGuard,
    },
    {
      provide: APP_GUARD,
      useClass: DemoTenantGuard,
    },
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

