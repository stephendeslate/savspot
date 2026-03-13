import {
  Controller,
  Post,
  NotImplementedException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Webhooks')
@Controller('payments/webhooks/razorpay')
export class RazorpayWebhookController {
  @Post()
  @Public()
  handleWebhook(): never {
    throw new NotImplementedException('Razorpay integration not yet available');
  }
}
