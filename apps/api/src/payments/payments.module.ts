import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { StripeWebhookController } from './stripe-webhook.controller';
import { AdyenWebhookController } from './webhooks/adyen-webhook.controller';
import { PaypalWebhookController } from './webhooks/paypal-webhook.controller';
import { PaymentsService } from './payments.service';
import { StripeConnectService } from './stripe-connect.service';
import { StripeProvider } from './providers/stripe.provider';
import { AdyenProvider } from './providers/adyen.provider';
import { PaypalProvider } from './providers/paypal.provider';
import { OfflineProvider } from './providers/offline.provider';
import { PaymentProviderFactory } from './providers/payment-provider.factory';
import { CircuitBreaker } from '../common/utils/circuit-breaker';

@Module({
  controllers: [
    PaymentsController,
    StripeWebhookController,
    AdyenWebhookController,
    PaypalWebhookController,
  ],
  providers: [
    CircuitBreaker,
    StripeProvider,
    AdyenProvider,
    PaypalProvider,
    OfflineProvider,
    PaymentProviderFactory,
    PaymentsService,
    StripeConnectService,
  ],
  exports: [
    PaymentsService,
    StripeConnectService,
    StripeProvider,
    PaymentProviderFactory,
  ],
})
export class PaymentsModule {}
