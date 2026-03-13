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
@Controller('payments/webhooks/maya')
export class MayaWebhookController {
  private readonly logger = new Logger(MayaWebhookController.name);

  @Post()
  @Public()
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  handleWebhook() {
    this.logger.warn('[STUB] Maya webhook not yet implemented');
    return { error: 'Maya webhooks are not yet implemented' };
  }
}
