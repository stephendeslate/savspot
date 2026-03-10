import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { StripeWebhookController } from './stripe-webhook.controller';
import { PaymentsService } from './payments.service';
import { StripeConnectService } from './stripe-connect.service';
import { StripeProvider } from './providers/stripe.provider';
import { OfflineProvider } from './providers/offline.provider';
import { CircuitBreaker } from '../common/utils/circuit-breaker';

@Module({
  controllers: [PaymentsController, StripeWebhookController],
  providers: [
    CircuitBreaker,
    StripeProvider,
    OfflineProvider,
    PaymentsService,
    StripeConnectService,
  ],
  exports: [PaymentsService, StripeConnectService, StripeProvider],
})
export class PaymentsModule {}
