import {
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Webhooks')
@Controller('payments/webhooks/gcash')
export class GcashWebhookController {
  private readonly logger = new Logger(GcashWebhookController.name);

  @Post()
  @Public()
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  handleWebhook() {
    this.logger.warn('[STUB] GCash webhook not yet implemented');
    return { error: 'GCash webhooks are not yet implemented' };
  }
}
