import { All, Controller, Req, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { serve } from 'inngest/express';
import { Public } from '@/common/decorators/public.decorator';
import {
  AccountingSyncClientsHandler,
  AccountingSyncInvoicesHandler,
  AccountingSyncPaymentsHandler,
  AccountingSyncSingleInvoiceHandler,
} from '@/accounting/accounting-sync.processor';
import { CalendarPushHandler } from '@/calendar/calendar-push.processor';
import { CalendarSyncHandler } from '@/calendar/calendar-sync.processor';
import { CalendarTokenHandler } from '@/calendar/calendar-token.processor';
import { CalendarSyncFallbackHandler } from '@/calendar/handlers/calendar-sync-fallback.handler';
import {
  CalendarWebhookRenewGoogleHandler,
  CalendarWebhookRenewOutlookHandler,
} from '@/calendar/handlers/calendar-webhook-renew.handler';
import { BrowserPushHandler } from '@/browser-push/browser-push.processor';
import { CommunicationsHandler } from '@/communications/communications.processor';
import { ComputeClientInsightsHandler } from '@/jobs/compute-client-insights.processor';
import { ProcessNotificationDigestsHandler } from '@/jobs/process-notification-digests.processor';
import { SendBookingRemindersHandler } from '@/jobs/send-booking-reminders.processor';
import { SupportTriageHandler } from '@/jobs/support-triage.processor';
import { MorningSummaryHandler } from '@/sms/morning-summary.processor';
import { SmsHandler } from '@/sms/sms.processor';
import { WeeklyDigestHandler } from '@/sms/weekly-digest.processor';
import { CurrencyService } from '@/currency/currency.service';
import { CustomDomainsService } from '@/custom-domains/custom-domains.service';
import { DirectoryListingService } from '@/directory/directory-listing.service';
import { ImportsService } from '@/imports/imports.service';
import { AbandonedRecoveryHandler } from '@/jobs/abandoned-recovery.processor';
import { AccountDeletionHandler } from '@/jobs/account-deletion.processor';
import { CleanupRetentionHandler } from '@/jobs/cleanup-retention.processor';
import { ComputeBenchmarksHandler } from '@/jobs/compute-benchmarks.processor';
import { ComputeDemandAnalysisHandler } from '@/jobs/compute-demand-analysis.processor';
import { ComputeNoShowRiskHandler } from '@/jobs/compute-no-show-risk.processor';
import { DataExportHandler } from '@/jobs/data-export.processor';
import { EnforceApprovalDeadlinesHandler } from '@/jobs/enforce-approval-deadlines.processor';
import { ExpireReservationsHandler } from '@/jobs/expire-reservations.processor';
import { InvoicePdfService } from '@/jobs/invoice-pdf.service';
import { ProcessCompletedBookingsHandler } from '@/jobs/process-completed-bookings.processor';
import { ChurnRiskService } from '@/recommendations/churn-risk.service';
import { RecommendationsService } from '@/recommendations/recommendations.service';
import { PartnerPayoutService } from '@/partners/partner-payout.service';
import { PlatformMetricsService } from '@/platform-metrics/platform-metrics.service';
import { VoiceCallEventsService } from '@/voice/services/voice-call-events.service';
import { StageExecutionHandler } from '@/workflows/processors/stage-execution.handler';
import { WebhookDispatchHandler } from '@/workflows/processors/webhook-dispatch.processor';
import { inngest } from './inngest.client';
import { ping } from './functions/ping.function';
import { createRefreshRatesFunction } from './functions/currency-refresh/refresh-rates.function';
import { createCustomDomainsHealthCheckFunction } from './functions/custom-domains/health-check.function';
import { createDnsVerifyFunction } from './functions/custom-domains/dns-verify.function';
import { createSslRenewFunction } from './functions/custom-domains/ssl-renew.function';
import { createDirectoryListingRefreshFunction } from './functions/directory/listing-refresh.function';
import { directorySitemapGenerate } from './functions/directory/sitemap-generate.function';
import { createProcessImportFunction } from './functions/imports/process-import.function';
import { createPartnerPayoutBatchFunction } from './functions/partners/payout-batch.function';
import { createComputePlatformMetricsFunction } from './functions/platform-metrics/compute-platform-metrics.function';
import {
  createAccountingSyncClientsFunction,
  createAccountingSyncInvoicesFunction,
  createAccountingSyncPaymentsFunction,
  createAccountingSyncSingleInvoiceFunction,
} from './functions/accounting/sync.functions';
import { createPostCallActionsFunction } from './functions/voice-calls/post-call-actions.function';
import { createProcessTranscriptFunction } from './functions/voice-calls/process-transcript.function';
import { createDispatchWebhookFunction } from './functions/webhooks/dispatch-webhook.function';
import { createExecuteStageFunction } from './functions/webhooks/execute-stage.function';
import { createAccountDeletionFunction } from './functions/gdpr/account-deletion.function';
import { createCleanupRetentionFunction } from './functions/gdpr/cleanup-retention.function';
import { createComputeBenchmarksFunction } from './functions/gdpr/compute-benchmarks.function';
import { createDataExportFunction } from './functions/gdpr/data-export.function';
import { createGenerateInvoicePdfFunction } from './functions/invoices/generate-invoice-pdf.function';
import {
  createChurnRiskComputeFunction,
  createRecommendationCleanupFunction,
  createRecommendationClientPreferenceFunction,
  createRecommendationServiceAffinityFunction,
} from './functions/ai-operations/recommendations.functions';
import {
  createAbandonedBookingRecoveryFunction,
  createComputeDemandAnalysisFunction,
  createComputeNoShowRiskFunction,
  createEnforceApprovalDeadlinesFunction,
  createExpireReservationsFunction,
  createProcessCompletedBookingsFunction,
} from './functions/bookings/cron.functions';
import { createCalendarEventPushFunction } from './functions/calendar/event-push.function';
import { createCalendarTwoWaySyncFunction } from './functions/calendar/two-way-sync.function';
import { createCalendarTokenRefreshFunction } from './functions/calendar/token-refresh.function';
import { createCalendarSyncFallbackFunction } from './functions/calendar/sync-fallback.function';
import {
  createCalendarWebhookRenewGoogleFunction,
  createCalendarWebhookRenewOutlookFunction,
} from './functions/calendar/webhook-renew.functions';
import { createDeliverCommunicationFunction } from './functions/communications/deliver-communication.function';
import { createProcessPostAppointmentFunction } from './functions/communications/process-post-appointment.function';
import { createSendBookingRemindersFunction } from './functions/communications/send-booking-reminders.function';
import { createDeliverProviderSmsFunction } from './functions/communications/deliver-provider-sms.function';
import { createSendMorningSummaryFunction } from './functions/communications/morning-summary.function';
import { createSendWeeklyDigestFunction } from './functions/communications/weekly-digest.function';
import { createDeliverBrowserPushFunction } from './functions/communications/deliver-browser-push.function';
import { createSupportTriageFunction } from './functions/communications/support-triage.function';
import {
  createProcessHourlyDigestsFunction,
  createProcessDailyDigestsFunction,
} from './functions/communications/notification-digests.functions';
import { createComputeClientInsightsFunction } from './functions/communications/compute-client-insights.function';

/**
 * Serves Inngest's webhook endpoint at /inngest. Inngest cloud:
 *   - calls GET to discover registered functions during deploys
 *   - calls POST to invoke a function when an event matches
 *   - calls PUT during the registration/sync flow
 *
 * The body parser must be raw for signature verification — handled by the
 * Inngest serve handler internally; ensure no global JSON parser intercepts
 * this path before the controller (current api uses default Express JSON
 * parsing globally; the Inngest serve handler accepts a parsed body and
 * verifies signatures from headers).
 *
 * Function registration: Inngest functions that need NestJS-injected services
 * are produced by closure factories (`create*Function(service)`) that capture
 * the service via DI in this controller's constructor. Static, dependency-free
 * functions (e.g. `ping`) are imported and registered directly.
 */
@ApiExcludeController()
@Public()
@Controller('inngest')
export class InngestController {
  private readonly handler: ReturnType<typeof serve>;

  constructor(
    private readonly currencyService: CurrencyService,
    private readonly directoryListingService: DirectoryListingService,
    private readonly partnerPayoutService: PartnerPayoutService,
    private readonly customDomainsService: CustomDomainsService,
    private readonly importsService: ImportsService,
    private readonly platformMetricsService: PlatformMetricsService,
    private readonly voiceCallEventsService: VoiceCallEventsService,
    private readonly accountingSyncInvoicesHandler: AccountingSyncInvoicesHandler,
    private readonly accountingSyncPaymentsHandler: AccountingSyncPaymentsHandler,
    private readonly accountingSyncClientsHandler: AccountingSyncClientsHandler,
    private readonly accountingSyncSingleInvoiceHandler: AccountingSyncSingleInvoiceHandler,
    private readonly webhookDispatchHandler: WebhookDispatchHandler,
    private readonly stageExecutionHandler: StageExecutionHandler,
    private readonly cleanupRetentionHandler: CleanupRetentionHandler,
    private readonly accountDeletionHandler: AccountDeletionHandler,
    private readonly computeBenchmarksHandler: ComputeBenchmarksHandler,
    private readonly dataExportHandler: DataExportHandler,
    private readonly invoicePdfService: InvoicePdfService,
    private readonly recommendationsService: RecommendationsService,
    private readonly churnRiskService: ChurnRiskService,
    private readonly expireReservationsHandler: ExpireReservationsHandler,
    private readonly abandonedRecoveryHandler: AbandonedRecoveryHandler,
    private readonly processCompletedBookingsHandler: ProcessCompletedBookingsHandler,
    private readonly enforceApprovalDeadlinesHandler: EnforceApprovalDeadlinesHandler,
    private readonly computeNoShowRiskHandler: ComputeNoShowRiskHandler,
    private readonly computeDemandAnalysisHandler: ComputeDemandAnalysisHandler,
    private readonly calendarPushHandler: CalendarPushHandler,
    private readonly calendarSyncHandler: CalendarSyncHandler,
    private readonly calendarTokenHandler: CalendarTokenHandler,
    private readonly calendarWebhookRenewGoogleHandler: CalendarWebhookRenewGoogleHandler,
    private readonly calendarWebhookRenewOutlookHandler: CalendarWebhookRenewOutlookHandler,
    private readonly calendarSyncFallbackHandler: CalendarSyncFallbackHandler,
    private readonly communicationsHandler: CommunicationsHandler,
    private readonly smsHandler: SmsHandler,
    private readonly morningSummaryHandler: MorningSummaryHandler,
    private readonly weeklyDigestHandler: WeeklyDigestHandler,
    private readonly browserPushHandler: BrowserPushHandler,
    private readonly supportTriageHandler: SupportTriageHandler,
    private readonly notificationDigestsHandler: ProcessNotificationDigestsHandler,
    private readonly computeClientInsightsHandler: ComputeClientInsightsHandler,
    private readonly bookingRemindersHandler: SendBookingRemindersHandler,
  ) {
    this.handler = serve({
      client: inngest,
      functions: [
        ping,
        createRefreshRatesFunction(this.currencyService),
        createDirectoryListingRefreshFunction(this.directoryListingService),
        directorySitemapGenerate,
        createPartnerPayoutBatchFunction(this.partnerPayoutService),
        createDnsVerifyFunction(this.customDomainsService),
        createSslRenewFunction(this.customDomainsService),
        createCustomDomainsHealthCheckFunction(this.customDomainsService),
        createProcessImportFunction(this.importsService),
        createComputePlatformMetricsFunction(this.platformMetricsService),
        createProcessTranscriptFunction(this.voiceCallEventsService),
        createPostCallActionsFunction(this.voiceCallEventsService),
        createAccountingSyncInvoicesFunction(this.accountingSyncInvoicesHandler),
        createAccountingSyncPaymentsFunction(this.accountingSyncPaymentsHandler),
        createAccountingSyncClientsFunction(this.accountingSyncClientsHandler),
        createAccountingSyncSingleInvoiceFunction(this.accountingSyncSingleInvoiceHandler),
        createDispatchWebhookFunction(this.webhookDispatchHandler),
        createExecuteStageFunction(this.stageExecutionHandler),
        createCleanupRetentionFunction(this.cleanupRetentionHandler),
        createAccountDeletionFunction(this.accountDeletionHandler),
        createComputeBenchmarksFunction(this.computeBenchmarksHandler),
        createDataExportFunction(this.dataExportHandler),
        createGenerateInvoicePdfFunction(this.invoicePdfService),
        createRecommendationServiceAffinityFunction(this.recommendationsService),
        createRecommendationClientPreferenceFunction(this.recommendationsService),
        createChurnRiskComputeFunction(this.churnRiskService),
        createRecommendationCleanupFunction(this.recommendationsService),
        createExpireReservationsFunction(this.expireReservationsHandler),
        createAbandonedBookingRecoveryFunction(this.abandonedRecoveryHandler),
        createProcessCompletedBookingsFunction(this.processCompletedBookingsHandler),
        createEnforceApprovalDeadlinesFunction(this.enforceApprovalDeadlinesHandler),
        createComputeNoShowRiskFunction(this.computeNoShowRiskHandler),
        createComputeDemandAnalysisFunction(this.computeDemandAnalysisHandler),
        createCalendarEventPushFunction(this.calendarPushHandler),
        createCalendarTwoWaySyncFunction(this.calendarSyncHandler),
        createCalendarTokenRefreshFunction(this.calendarTokenHandler),
        createCalendarWebhookRenewGoogleFunction(
          this.calendarWebhookRenewGoogleHandler,
        ),
        createCalendarWebhookRenewOutlookFunction(
          this.calendarWebhookRenewOutlookHandler,
        ),
        createCalendarSyncFallbackFunction(this.calendarSyncFallbackHandler),
        createDeliverCommunicationFunction(this.communicationsHandler),
        createProcessPostAppointmentFunction(this.communicationsHandler),
        createSendBookingRemindersFunction(this.bookingRemindersHandler),
        createDeliverProviderSmsFunction(this.smsHandler),
        createSendMorningSummaryFunction(this.morningSummaryHandler),
        createSendWeeklyDigestFunction(this.weeklyDigestHandler),
        createDeliverBrowserPushFunction(this.browserPushHandler),
        createSupportTriageFunction(this.supportTriageHandler),
        createProcessHourlyDigestsFunction(this.notificationDigestsHandler),
        createProcessDailyDigestsFunction(this.notificationDigestsHandler),
        createComputeClientInsightsFunction(this.computeClientInsightsHandler),
      ],
    });
  }

  @All()
  handle(@Req() req: Request, @Res() res: Response): unknown {
    return this.handler(req, res);
  }
}
