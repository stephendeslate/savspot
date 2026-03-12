import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Webhooks')
@Controller('payments/webhooks/mollie')
export class MollieWebhookController {
  private readonly logger = new Logger(MollieWebhookController.name);

  @Post()
  @Public()
  @HttpCode(HttpStatus.OK)
  handleWebhook(@Body() body: Record<string, unknown>) {
    this.logger.log(`[STUB] Received Mollie webhook: ${JSON.stringify(body)}`);
    return { received: true };
  }
}
