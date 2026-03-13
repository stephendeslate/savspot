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
@Controller('payments/webhooks/dlocal')
export class DlocalWebhookController {
  private readonly logger = new Logger(DlocalWebhookController.name);

  @Post()
  @Public()
  @HttpCode(HttpStatus.OK)
  handleWebhook(@Body() _body: Record<string, unknown>) {
    if (process.env['FEATURE_PAYMENT_DLOCAL'] !== 'true') {
      throw new NotFoundException();
    }

    this.logger.log('[STUB] Received dLocal webhook');
    return { received: true };
  }
}
