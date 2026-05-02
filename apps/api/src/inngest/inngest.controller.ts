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
import { CurrencyService } from '@/currency/currency.service';
import { CustomDomainsService } from '@/custom-domains/custom-domains.service';
import { DirectoryListingService } from '@/directory/directory-listing.service';
import { ImportsService } from '@/imports/imports.service';
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
      ],
    });
  }

  @All()
  handle(@Req() req: Request, @Res() res: Response): unknown {
    return this.handler(req, res);
  }
}
