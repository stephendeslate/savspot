import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { StripeWebhookController } from './stripe-webhook.controller';
import { PaymentsService } from './payments.service';
import { StripeConnectService } from './stripe-connect.service';
import { StripeProvider } from './providers/stripe.provider';
import { OfflineProvider } from './providers/offline.provider';

@Module({
  controllers: [PaymentsController, StripeWebhookController],
  providers: [
    StripeProvider,
    OfflineProvider,
    PaymentsService,
    StripeConnectService,
  ],
  exports: [PaymentsService, StripeConnectService],
})
export class PaymentsModule {}
