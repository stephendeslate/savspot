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
@Controller('payments/webhooks/maya')
export class MayaWebhookController {
  private readonly logger = new Logger(MayaWebhookController.name);

  @Post()
  @Public()
  @HttpCode(HttpStatus.OK)
  handleWebhook(@Body() body: Record<string, unknown>) {
    this.logger.log(`[STUB] Received Maya webhook: ${JSON.stringify(body)}`);
    return { received: true };
  }
}
