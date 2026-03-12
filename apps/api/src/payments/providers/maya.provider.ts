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
export class MayaProvider implements PaymentProviderInterface {
  private readonly logger = new Logger(MayaProvider.name);

  private ensureEnabled(): void {
    if (process.env['FEATURE_PAYMENT_MAYA'] !== 'true') {
      throw new BadRequestException(
        'Maya payment provider is not enabled. Set FEATURE_PAYMENT_MAYA=true.',
      );
    }
  }

  async createConnectedAccount(
    email: string,
    country: string,
  ): Promise<ConnectedAccount> {
    this.ensureEnabled();

    const accountId = `MAYA_SUB_${randomUUID().slice(0, 8).toUpperCase()}`;

    this.logger.log(
      `[STUB] Created Maya sub-merchant account ${accountId} for ${email} (${country})`,
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

    const onboardingUrl = `https://test.maya.ph/onboarding/${accountId}?returnUrl=${encodeURIComponent(returnUrl)}`;

    this.logger.log(
      `[STUB] Generated Maya onboarding link for account ${accountId}`,
    );

    return onboardingUrl;
  }

  async getDashboardLink(accountId: string): Promise<string> {
    this.ensureEnabled();

    const dashboardUrl = `https://dashboard.test.maya.ph/accounts/${accountId}`;

    this.logger.log(
      `[STUB] Generated Maya dashboard link for account ${accountId}`,
    );

    return dashboardUrl;
  }

  async getAccountStatus(accountId: string): Promise<AccountStatus> {
    this.ensureEnabled();

    this.logger.log(
      `[STUB] Fetched Maya account status for ${accountId}`,
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

    const sessionId = `MAYA_SESSION_${randomUUID().replace(/-/g, '')}`;
    const sessionData = `mock_session_data_${randomUUID().slice(0, 8)}`;

    this.logger.log(
      `[STUB] Created Maya checkout session ${sessionId} for ${params.amount} ${params.currency}`,
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
      `[STUB] Cancelled Maya payment session ${intentId}`,
    );
  }

  async createRefund(params: CreateRefundParams): Promise<RefundResult> {
    this.ensureEnabled();

    const refundId = `MAYA_REFUND_${randomUUID().slice(0, 8).toUpperCase()}`;

    this.logger.log(
      `[STUB] Created Maya refund ${refundId} for payment ${params.paymentIntentId}`,
    );

    return {
      id: refundId,
      amount: params.amount ?? 0,
      status: 'received',
    };
  }
}
