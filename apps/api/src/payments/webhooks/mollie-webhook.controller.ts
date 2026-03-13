import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
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
  handleWebhook(@Body() _body: Record<string, unknown>) {
    if (process.env['FEATURE_PAYMENT_MOLLIE'] !== 'true') {
      throw new NotFoundException();
    }

    this.logger.log('[STUB] Received Mollie webhook');
    return { received: true };
  }
}
