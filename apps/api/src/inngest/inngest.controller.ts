import { All, Controller, Req, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { serve } from 'inngest/express';
import { Public } from '@/common/decorators/public.decorator';
import { CurrencyService } from '@/currency/currency.service';
import { inngest } from './inngest.client';
import { ping } from './functions/ping.function';
import { createRefreshRatesFunction } from './functions/currency-refresh/refresh-rates.function';

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

  constructor(private readonly currencyService: CurrencyService) {
    this.handler = serve({
      client: inngest,
      functions: [
        ping,
        createRefreshRatesFunction(this.currencyService),
      ],
    });
  }

  @All()
  handle(@Req() req: Request, @Res() res: Response): unknown {
    return this.handler(req, res);
  }
}
