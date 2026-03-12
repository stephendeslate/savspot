import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
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
export class RazorpayProvider implements PaymentProviderInterface {
  private readonly logger = new Logger(RazorpayProvider.name);

  private ensureEnabled(): void {
    if (process.env['FEATURE_PAYMENT_RAZORPAY'] !== 'true') {
      throw new BadRequestException(
        'Razorpay payment provider is not enabled. Set FEATURE_PAYMENT_RAZORPAY=true.',
      );
    }
  }

  async createConnectedAccount(
    email: string,
    country: string,
  ): Promise<ConnectedAccount> {
    this.ensureEnabled();

    const accountId = `RZP_SUB_${randomUUID().slice(0, 8).toUpperCase()}`;

    this.logger.log(
      `[STUB] Created Razorpay sub-merchant account ${accountId} for ${email} (${country})`,
    );

    return {
      accountId,
      onboardingComplete: false,
    };
  }

  async getOnboardingLink(
    accountId: string,
    _refreshUrl: string,
    returnUrl: string,
  ): Promise<string> {
    this.ensureEnabled();

    const onboardingUrl = `https://test.razorpay.com/onboarding/${accountId}?returnUrl=${encodeURIComponent(returnUrl)}`;

    this.logger.log(
      `[STUB] Generated Razorpay onboarding link for account ${accountId}`,
    );

    return onboardingUrl;
  }

  async getDashboardLink(accountId: string): Promise<string> {
    this.ensureEnabled();

    const dashboardUrl = `https://dashboard.test.razorpay.com/accounts/${accountId}`;

    this.logger.log(
      `[STUB] Generated Razorpay dashboard link for account ${accountId}`,
    );

    return dashboardUrl;
  }

  async getAccountStatus(accountId: string): Promise<AccountStatus> {
    this.ensureEnabled();

    this.logger.log(
      `[STUB] Fetched Razorpay account status for ${accountId}`,
    );

    return {
      accountId,
      chargesEnabled: true,
      payoutsEnabled: true,
      detailsSubmitted: true,
    };
  }

  async createPaymentIntent(
    params: CreatePaymentIntentParams,
  ): Promise<PaymentIntentResult> {
    this.ensureEnabled();

    const sessionId = `RZP_SESSION_${randomUUID().replace(/-/g, '')}`;
    const sessionData = `mock_session_data_${randomUUID().slice(0, 8)}`;

    this.logger.log(
      `[STUB] Created Razorpay checkout session ${sessionId} for ${params.amount} ${params.currency}`,
    );

    return {
      id: sessionId,
      clientSecret: sessionData,
      status: 'pending',
      amount: params.amount,
      currency: params.currency,
    };
  }

  async cancelPaymentIntent(intentId: string): Promise<void> {
    this.ensureEnabled();

    this.logger.log(
      `[STUB] Cancelled Razorpay payment session ${intentId}`,
    );
  }

  async createRefund(params: CreateRefundParams): Promise<RefundResult> {
    this.ensureEnabled();

    const refundId = `RZP_REFUND_${randomUUID().slice(0, 8).toUpperCase()}`;

    this.logger.log(
      `[STUB] Created Razorpay refund ${refundId} for payment ${params.paymentIntentId}`,
    );

    return {
      id: refundId,
      amount: params.amount ?? 0,
      status: 'received',
    };
  }
}
