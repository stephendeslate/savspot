import { All, Controller, Req, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { serve } from 'inngest/express';
import { Public } from '@/common/decorators/public.decorator';
import { CurrencyService } from '@/currency/currency.service';
import { CustomDomainsService } from '@/custom-domains/custom-domains.service';
import { DirectoryListingService } from '@/directory/directory-listing.service';
import { ImportsService } from '@/imports/imports.service';
import { PartnerPayoutService } from '@/partners/partner-payout.service';
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
      ],
    });
  }

  @All()
  handle(@Req() req: Request, @Res() res: Response): unknown {
    return this.handler(req, res);
  }
}
