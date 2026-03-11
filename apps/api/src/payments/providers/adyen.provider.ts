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
export class AdyenProvider implements PaymentProviderInterface {
  private readonly logger = new Logger(AdyenProvider.name);

  private ensureEnabled(): void {
    if (process.env['FEATURE_PAYMENT_ADYEN'] !== 'true') {
      throw new BadRequestException(
        'Adyen payment provider is not enabled. Set FEATURE_PAYMENT_ADYEN=true.',
      );
    }
  }

  async createConnectedAccount(
    email: string,
    country: string,
  ): Promise<ConnectedAccount> {
    this.ensureEnabled();

    // TODO: Replace with real Adyen for Platforms API call
    // POST /Account/createAccountHolder
    const accountId = `ADYEN_SUB_${randomUUID().slice(0, 8).toUpperCase()}`;

    this.logger.log(
      `[STUB] Created Adyen sub-merchant account ${accountId} for ${email} (${country})`,
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

    // TODO: Replace with real Adyen hosted onboarding page URL
    const onboardingUrl = `https://test.adyen.com/onboarding/${accountId}?returnUrl=${encodeURIComponent(returnUrl)}`;

    this.logger.log(
      `[STUB] Generated Adyen onboarding link for account ${accountId}`,
    );

    return onboardingUrl;
  }

  async getDashboardLink(accountId: string): Promise<string> {
    this.ensureEnabled();

    // TODO: Replace with real Adyen Customer Area link generation
    const dashboardUrl = `https://ca-test.adyen.com/ca/ca/accounts/${accountId}`;

    this.logger.log(
      `[STUB] Generated Adyen dashboard link for account ${accountId}`,
    );

    return dashboardUrl;
  }

  async getAccountStatus(accountId: string): Promise<AccountStatus> {
    this.ensureEnabled();

    // TODO: Replace with real Adyen API call
    // GET /Account/getAccountHolder
    this.logger.log(
      `[STUB] Fetched Adyen account status for ${accountId}`,
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

    // TODO: Replace with real Adyen Checkout API call
    // POST /v71/sessions
    const sessionId = `ADYEN_SESSION_${randomUUID().replace(/-/g, '')}`;
    const sessionData = `mock_session_data_${randomUUID().slice(0, 8)}`;

    this.logger.log(
      `[STUB] Created Adyen checkout session ${sessionId} for ${params.amount} ${params.currency}`,
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

    // TODO: Replace with real Adyen API call
    // POST /v71/payments/{intentId}/cancels
    this.logger.log(
      `[STUB] Cancelled Adyen payment session ${intentId}`,
    );
  }

  async createRefund(params: CreateRefundParams): Promise<RefundResult> {
    this.ensureEnabled();

    // TODO: Replace with real Adyen API call
    // POST /v71/payments/{paymentPspReference}/refunds
    const refundId = `ADYEN_REFUND_${randomUUID().slice(0, 8).toUpperCase()}`;

    this.logger.log(
      `[STUB] Created Adyen refund ${refundId} for payment ${params.paymentIntentId}`,
    );

    return {
      id: refundId,
      amount: params.amount ?? 0,
      status: 'received',
    };
  }
}
