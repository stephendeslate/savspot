import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { StripeWebhookController } from './stripe-webhook.controller';
import { AdyenWebhookController } from './webhooks/adyen-webhook.controller';
import { PaypalWebhookController } from './webhooks/paypal-webhook.controller';
import { GcashWebhookController } from './webhooks/gcash-webhook.controller';
import { MayaWebhookController } from './webhooks/maya-webhook.controller';
import { RazorpayWebhookController } from './webhooks/razorpay-webhook.controller';
import { MollieWebhookController } from './webhooks/mollie-webhook.controller';
import { DlocalWebhookController } from './webhooks/dlocal-webhook.controller';
import { PaymentsService } from './payments.service';
import { StripeConnectService } from './stripe-connect.service';
import { StripeProvider } from './providers/stripe.provider';
import { AdyenProvider } from './providers/adyen.provider';
import { PaypalProvider } from './providers/paypal.provider';
import { OfflineProvider } from './providers/offline.provider';
import { GcashProvider } from './providers/gcash.provider';
import { MayaProvider } from './providers/maya.provider';
import { RazorpayProvider } from './providers/razorpay.provider';
import { MollieProvider } from './providers/mollie.provider';
import { DlocalProvider } from './providers/dlocal.provider';
import { PaymentProviderFactory } from './providers/payment-provider.factory';
import { CircuitBreaker } from '../common/utils/circuit-breaker';

@Module({
  controllers: [
    PaymentsController,
    StripeWebhookController,
    AdyenWebhookController,
    PaypalWebhookController,
    GcashWebhookController,
    MayaWebhookController,
    RazorpayWebhookController,
    MollieWebhookController,
    DlocalWebhookController,
  ],
  providers: [
    CircuitBreaker,
    StripeProvider,
    AdyenProvider,
    PaypalProvider,
    OfflineProvider,
    GcashProvider,
    MayaProvider,
    RazorpayProvider,
    MollieProvider,
    DlocalProvider,
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
