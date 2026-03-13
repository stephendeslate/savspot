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
@Controller('payments/webhooks/razorpay')
export class RazorpayWebhookController {
  private readonly logger = new Logger(RazorpayWebhookController.name);

  @Post()
  @Public()
  @HttpCode(HttpStatus.OK)
  handleWebhook(@Body() _body: Record<string, unknown>) {
    if (process.env['FEATURE_PAYMENT_RAZORPAY'] !== 'true') {
      throw new NotFoundException();
    }

    this.logger.log('[STUB] Received Razorpay webhook');
    return { received: true };
  }
}
