import { Injectable, BadRequestException } from '@nestjs/common';
import { PaymentProviderInterface } from '../interfaces/payment-provider.interface';
import { StripeProvider } from './stripe.provider';
import { AdyenProvider } from './adyen.provider';
import { PaypalProvider } from './paypal.provider';
import { OfflineProvider } from './offline.provider';
import { GcashProvider } from './gcash.provider';
import { MayaProvider } from './maya.provider';
import { RazorpayProvider } from './razorpay.provider';
import { MollieProvider } from './mollie.provider';
import { DlocalProvider } from './dlocal.provider';

@Injectable()
export class PaymentProviderFactory {
  constructor(
    private readonly stripeProvider: StripeProvider,
    private readonly adyenProvider: AdyenProvider,
    private readonly paypalProvider: PaypalProvider,
    private readonly offlineProvider: OfflineProvider,
    private readonly gcashProvider: GcashProvider,
    private readonly mayaProvider: MayaProvider,
    private readonly razorpayProvider: RazorpayProvider,
    private readonly mollieProvider: MollieProvider,
    private readonly dlocalProvider: DlocalProvider,
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
      case 'gcash':
        return this.gcashProvider;
      case 'maya':
        return this.mayaProvider;
      case 'razorpay':
        return this.razorpayProvider;
      case 'mollie':
        return this.mollieProvider;
      case 'dlocal':
        return this.dlocalProvider;
      default:
        throw new BadRequestException(
          `Unknown payment provider: ${providerName}`,
        );
    }
  }
}
