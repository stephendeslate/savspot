import {
  Injectable,
  Logger,
  BadRequestException,
  NotImplementedException,
} from '@nestjs/common';
import {
  PaymentProviderInterface,
  CreatePaymentIntentParams,
  PaymentIntentResult,
  CreateRefundParams,
  RefundResult,
  ConnectedAccount,
  AccountStatus,
} from '../interfaces/payment-provider.interface';

@Injectable()
export class PaypalProvider implements PaymentProviderInterface {
  private readonly logger = new Logger(PaypalProvider.name);

  private ensureEnabled(): void {
    if (process.env['FEATURE_PAYMENT_PAYPAL'] !== 'true') {
      throw new BadRequestException(
        'PayPal payment provider is not enabled. Set FEATURE_PAYMENT_PAYPAL=true.',
      );
    }
  }

  async createConnectedAccount(
    _email: string,
    _country: string,
  ): Promise<ConnectedAccount> {
    this.ensureEnabled();
    throw new NotImplementedException('PayPal provider is not yet implemented. Use Stripe or Offline.');
  }

  async getOnboardingLink(
    _accountId: string,
    _refreshUrl: string,
    _returnUrl: string,
  ): Promise<string> {
    this.ensureEnabled();
    throw new NotImplementedException('PayPal provider is not yet implemented. Use Stripe or Offline.');
  }

  async getDashboardLink(_accountId: string): Promise<string> {
    this.ensureEnabled();
    throw new NotImplementedException('PayPal provider is not yet implemented. Use Stripe or Offline.');
  }

  async getAccountStatus(_accountId: string): Promise<AccountStatus> {
    this.ensureEnabled();
    throw new NotImplementedException('PayPal provider is not yet implemented. Use Stripe or Offline.');
  }

  async createPaymentIntent(
    _params: CreatePaymentIntentParams,
  ): Promise<PaymentIntentResult> {
    this.ensureEnabled();
    throw new NotImplementedException('PayPal provider is not yet implemented. Use Stripe or Offline.');
  }

  async cancelPaymentIntent(_intentId: string): Promise<void> {
    this.ensureEnabled();
    throw new NotImplementedException('PayPal provider is not yet implemented. Use Stripe or Offline.');
  }

  async createRefund(_params: CreateRefundParams): Promise<RefundResult> {
    this.ensureEnabled();
    throw new NotImplementedException('PayPal provider is not yet implemented. Use Stripe or Offline.');
  }

  async listRefunds(_paymentIntentId: string): Promise<RefundResult[]> {
    this.ensureEnabled();
    throw new NotImplementedException('paypal provider is not yet implemented. Use Stripe or Offline.');
  }
}
