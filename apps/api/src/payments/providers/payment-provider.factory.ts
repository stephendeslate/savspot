import { Injectable, BadRequestException } from '@nestjs/common';
import { PaymentProviderInterface } from '../interfaces/payment-provider.interface';
import { StripeProvider } from './stripe.provider';
import { AdyenProvider } from './adyen.provider';
import { PaypalProvider } from './paypal.provider';
import { OfflineProvider } from './offline.provider';

@Injectable()
export class PaymentProviderFactory {
  constructor(
    private readonly stripeProvider: StripeProvider,
    private readonly adyenProvider: AdyenProvider,
    private readonly paypalProvider: PaypalProvider,
    private readonly offlineProvider: OfflineProvider,
  ) {}

  getProvider(providerName: string): PaymentProviderInterface {
    switch (providerName) {
      case 'stripe':
        return this.stripeProvider;
      case 'adyen':
        return this.adyenProvider;
      case 'paypal':
        return this.paypalProvider;
      case 'offline':
        return this.offlineProvider;
      default:
        throw new BadRequestException(
          `Unknown payment provider: ${providerName}`,
        );
    }
  }
}
