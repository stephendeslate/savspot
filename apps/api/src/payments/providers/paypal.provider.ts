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
    email: string,
    country: string,
  ): Promise<ConnectedAccount> {
    this.ensureEnabled();

    // TODO: Replace with real PayPal Partner Referral API call
    // POST /v2/customer/partner-referrals
    const merchantId = `PAYPAL_MERCHANT_${randomUUID().slice(0, 8).toUpperCase()}`;

    this.logger.log(
      `[STUB] Created PayPal partner referral for ${email} (${country}), merchant ID: ${merchantId}`,
    );

    return {
      accountId: merchantId,
      onboardingComplete: false,
    };
  }

  async getOnboardingLink(
    accountId: string,
    _refreshUrl: string,
    returnUrl: string,
  ): Promise<string> {
    this.ensureEnabled();

    // TODO: Replace with real PayPal Partner Referral action_url from response
    const onboardingUrl = `https://www.sandbox.paypal.com/bizsignup/partner/entry?partnerClientId=mock&merchantId=${accountId}&returnUrl=${encodeURIComponent(returnUrl)}`;

    this.logger.log(
      `[STUB] Generated PayPal onboarding link for merchant ${accountId}`,
    );

    return onboardingUrl;
  }

  async getDashboardLink(accountId: string): Promise<string> {
    this.ensureEnabled();

    // TODO: Replace with real PayPal merchant dashboard URL
    const dashboardUrl = `https://www.sandbox.paypal.com/merchantapps/home?merchantId=${accountId}`;

    this.logger.log(
      `[STUB] Generated PayPal dashboard link for merchant ${accountId}`,
    );

    return dashboardUrl;
  }

  async getAccountStatus(accountId: string): Promise<AccountStatus> {
    this.ensureEnabled();

    // TODO: Replace with real PayPal API call
    // GET /v1/customer/partners/{partner_id}/merchant-integrations/{merchant_id}
    this.logger.log(
      `[STUB] Fetched PayPal merchant status for ${accountId}`,
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

    // TODO: Replace with real PayPal Orders API call
    // POST /v2/checkout/orders
    const orderId = `PAYPAL_ORDER_${randomUUID().slice(0, 12).toUpperCase()}`;
    const approvalToken = `EC-${randomUUID().replace(/-/g, '').slice(0, 17).toUpperCase()}`;

    this.logger.log(
      `[STUB] Created PayPal order ${orderId} for ${params.amount} ${params.currency}`,
    );

    return {
      id: orderId,
      clientSecret: approvalToken,
      status: 'CREATED',
      amount: params.amount,
      currency: params.currency,
    };
  }

  async cancelPaymentIntent(intentId: string): Promise<void> {
    this.ensureEnabled();

    // TODO: Replace with real PayPal API call
    // PayPal orders expire automatically; no explicit cancel API.
    // For authorized payments: POST /v2/payments/authorizations/{id}/void
    this.logger.log(
      `[STUB] Voided PayPal order/authorization ${intentId}`,
    );
  }

  async createRefund(params: CreateRefundParams): Promise<RefundResult> {
    this.ensureEnabled();

    // TODO: Replace with real PayPal Payments API call
    // POST /v2/payments/captures/{capture_id}/refund
    const refundId = `PAYPAL_REFUND_${randomUUID().slice(0, 8).toUpperCase()}`;

    this.logger.log(
      `[STUB] Created PayPal refund ${refundId} for capture ${params.paymentIntentId}`,
    );

    return {
      id: refundId,
      amount: params.amount ?? 0,
      status: 'COMPLETED',
    };
  }
}
