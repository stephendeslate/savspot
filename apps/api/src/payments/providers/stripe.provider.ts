import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
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
export class StripeProvider implements PaymentProviderInterface {
  private readonly logger = new Logger(StripeProvider.name);
  private stripe: Stripe | null = null;

  constructor(private readonly configService: ConfigService) {
    const secretKey = this.configService.get<string>('stripe.secretKey');

    if (secretKey) {
      this.stripe = new Stripe(secretKey);
      this.logger.log('Stripe provider initialized');
    } else {
      this.logger.warn(
        'STRIPE_SECRET_KEY not configured — Stripe operations will fail',
      );
    }
  }

  private ensureStripe(): Stripe {
    if (!this.stripe) {
      throw new BadRequestException(
        'Stripe is not configured. Please set STRIPE_SECRET_KEY.',
      );
    }
    return this.stripe;
  }

  async createConnectedAccount(
    email: string,
    country: string,
  ): Promise<ConnectedAccount> {
    const stripe = this.ensureStripe();

    const account = await stripe.accounts.create({
      type: 'express',
      email,
      country,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    return {
      accountId: account.id,
      onboardingComplete: account.details_submitted ?? false,
    };
  }

  async getOnboardingLink(
    accountId: string,
    refreshUrl: string,
    returnUrl: string,
  ): Promise<string> {
    const stripe = this.ensureStripe();

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });

    return accountLink.url;
  }

  async getDashboardLink(accountId: string): Promise<string> {
    const stripe = this.ensureStripe();

    const loginLink = await stripe.accounts.createLoginLink(accountId);
    return loginLink.url;
  }

  async getAccountStatus(accountId: string): Promise<AccountStatus> {
    const stripe = this.ensureStripe();

    const account = await stripe.accounts.retrieve(accountId);

    return {
      accountId: account.id,
      chargesEnabled: account.charges_enabled ?? false,
      payoutsEnabled: account.payouts_enabled ?? false,
      detailsSubmitted: account.details_submitted ?? false,
    };
  }

  async createPaymentIntent(
    params: CreatePaymentIntentParams,
  ): Promise<PaymentIntentResult> {
    const stripe = this.ensureStripe();

    const intentParams: Stripe.PaymentIntentCreateParams = {
      amount: params.amount,
      currency: params.currency,
      application_fee_amount: params.platformFeeAmount,
      transfer_data: {
        destination: params.connectedAccountId,
      },
      metadata: params.metadata,
    };

    if (params.customerId) {
      intentParams.customer = params.customerId;
    }

    const intent = await stripe.paymentIntents.create(intentParams);

    return {
      id: intent.id,
      clientSecret: intent.client_secret ?? '',
      status: intent.status,
      amount: intent.amount,
      currency: intent.currency,
    };
  }

  async cancelPaymentIntent(intentId: string): Promise<void> {
    const stripe = this.ensureStripe();
    await stripe.paymentIntents.cancel(intentId);
  }

  async createRefund(params: CreateRefundParams): Promise<RefundResult> {
    const stripe = this.ensureStripe();

    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: params.paymentIntentId,
    };

    if (params.amount !== undefined) {
      refundParams.amount = params.amount;
    }

    if (params.reason) {
      // Map to Stripe's accepted reasons
      const reasonMap: Record<string, Stripe.RefundCreateParams.Reason> = {
        duplicate: 'duplicate',
        fraudulent: 'fraudulent',
        requested_by_customer: 'requested_by_customer',
      };
      refundParams.reason = reasonMap[params.reason] ?? 'requested_by_customer';
    }

    const refund = await stripe.refunds.create(refundParams);

    return {
      id: refund.id,
      amount: refund.amount,
      status: refund.status ?? 'pending',
    };
  }

  /**
   * Retrieve a PaymentIntent by ID.
   * Used by the retry processor to check current status before confirming.
   */
  async retrievePaymentIntent(
    intentId: string,
  ): Promise<{ id: string; status: string }> {
    const stripe = this.ensureStripe();
    const intent = await stripe.paymentIntents.retrieve(intentId);
    return { id: intent.id, status: intent.status };
  }

  /**
   * Confirm a PaymentIntent by ID.
   * Used by the retry processor to re-attempt failed payments.
   */
  async confirmPaymentIntent(
    intentId: string,
  ): Promise<{ id: string; status: string }> {
    const stripe = this.ensureStripe();
    const intent = await stripe.paymentIntents.confirm(intentId);
    return { id: intent.id, status: intent.status };
  }

  /**
   * Construct a webhook event from the raw body and signature header.
   * Used by the webhook controller.
   */
  constructWebhookEvent(
    rawBody: Buffer,
    signature: string,
    secret: string,
  ): Stripe.Event {
    const stripe = this.ensureStripe();
    return stripe.webhooks.constructEvent(rawBody, signature, secret);
  }
}
