import { All, Controller, Req, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { serve } from 'inngest/express';
import { inngest } from './inngest.client';
import { ping } from './functions/ping.function';

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
 */
@ApiExcludeController()
@Controller('inngest')
export class InngestController {
  private readonly handler = serve({
    client: inngest,
    functions: [
      // Phase 4a — only the connectivity-probe function is registered.
      // Subsequent phases append real ported BullMQ processors here.
      ping,
    ],
  });

  @All()
  handle(@Req() req: Request, @Res() res: Response): unknown {
    return this.handler(req, res);
  }
}
