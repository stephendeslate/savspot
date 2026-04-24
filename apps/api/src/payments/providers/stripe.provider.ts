import {
  Injectable,
  Logger,
  BadRequestException,
  BadGatewayException,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
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
import { CircuitBreaker } from '../../common/utils/circuit-breaker';

@Injectable()
export class StripeProvider implements PaymentProviderInterface {
  private readonly logger = new Logger(StripeProvider.name);
  private stripe: Stripe | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly circuitBreaker: CircuitBreaker,
  ) {
    const secretKey = this.configService.get<string>('stripe.secretKey');

    if (secretKey) {
      // Pin API version so SDK upgrades cannot silently change response shapes
      // or webhook event formats in production. Matches the version baked
      // into stripe@20.4.0.
      this.stripe = new Stripe(secretKey, { apiVersion: '2026-02-25.clover' });
      this.logger.log('Stripe provider initialized');
    } else {
      this.logger.warn(
        'STRIPE_SECRET_KEY not configured — Stripe operations will fail',
      );
    }
  }

  private ensureStripe(): Stripe {
    if (!this.stripe) {
      throw new ServiceUnavailableException(
        'Stripe is not configured. Please set STRIPE_SECRET_KEY.',
      );
    }
    return this.stripe;
  }

  /**
   * Convert Stripe SDK errors into appropriate NestJS HttpExceptions
   * so the global exception filter returns proper status codes.
   */
  private handleStripeError(error: unknown): never {
    if (error instanceof Stripe.errors.StripeAuthenticationError) {
      throw new InternalServerErrorException('Stripe authentication failed — check your API key');
    }
    if (error instanceof Stripe.errors.StripeInvalidRequestError) {
      throw new BadRequestException(`Stripe: ${error.message}`);
    }
    if (error instanceof Stripe.errors.StripeConnectionError) {
      throw new BadGatewayException('Unable to connect to Stripe');
    }
    if (error instanceof Stripe.errors.StripeRateLimitError) {
      throw new BadGatewayException('Stripe rate limit exceeded — try again shortly');
    }
    if (error instanceof Stripe.errors.StripeAPIError) {
      throw new InternalServerErrorException('Stripe service error — try again later');
    }
    throw error;
  }

  /**
   * Returns true if the error is a network/5xx Stripe error that should
   * count toward the circuit breaker. Validation errors (invalid card,
   * bad request) are NOT circuit-breaker-worthy.
   */
  private isCircuitBreakerError(error: unknown): boolean {
    return (
      error instanceof Stripe.errors.StripeConnectionError ||
      error instanceof Stripe.errors.StripeAPIError ||
      error instanceof Stripe.errors.StripeRateLimitError
    );
  }

  async createConnectedAccount(
    email: string,
    country: string,
  ): Promise<ConnectedAccount> {
    const stripe = this.ensureStripe();

    try {
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
    } catch (error) {
      this.handleStripeError(error);
    }
  }

  async getOnboardingLink(
    accountId: string,
    refreshUrl: string,
    returnUrl: string,
  ): Promise<string> {
    const stripe = this.ensureStripe();

    try {
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding',
      });

      return accountLink.url;
    } catch (error) {
      this.handleStripeError(error);
    }
  }

  async getDashboardLink(accountId: string): Promise<string> {
    const stripe = this.ensureStripe();

    try {
      const loginLink = await stripe.accounts.createLoginLink(accountId);
      return loginLink.url;
    } catch (error) {
      this.handleStripeError(error);
    }
  }

  async getAccountStatus(accountId: string): Promise<AccountStatus> {
    const stripe = this.ensureStripe();

    try {
      const account = await stripe.accounts.retrieve(accountId);

      const requirements = account.requirements;
      return {
        accountId: account.id,
        chargesEnabled: account.charges_enabled ?? false,
        payoutsEnabled: account.payouts_enabled ?? false,
        detailsSubmitted: account.details_submitted ?? false,
        requirements: requirements
          ? {
              currentlyDue: requirements.currently_due ?? [],
              pastDue: requirements.past_due ?? [],
              disabledReason: requirements.disabled_reason ?? null,
            }
          : undefined,
      };
    } catch (error) {
      this.handleStripeError(error);
    }
  }

  async createPaymentIntent(
    params: CreatePaymentIntentParams,
  ): Promise<PaymentIntentResult> {
    const stripe = this.ensureStripe();
    const tenantId = params.metadata?.['tenantId'] as string | undefined;
    const scopeKey = `stripe:${tenantId ?? 'global'}`;

    // Check circuit breaker before calling Stripe
    if (tenantId && !(await this.circuitBreaker.canSend(scopeKey, tenantId))) {
      throw new ServiceUnavailableException(
        'Payment service temporarily unavailable, please try again shortly',
      );
    }

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

    if (params.setupFutureUsage) {
      intentParams.setup_future_usage = params.setupFutureUsage;
    }

    try {
      const intent = await stripe.paymentIntents.create(intentParams);

      if (tenantId) {
        await this.circuitBreaker.recordSuccess(scopeKey, tenantId);
      }

      return {
        id: intent.id,
        clientSecret: intent.client_secret ?? '',
        status: intent.status,
        amount: intent.amount,
        currency: intent.currency,
      };
    } catch (error) {
      if (tenantId && this.isCircuitBreakerError(error)) {
        await this.circuitBreaker.recordFailure(scopeKey, tenantId);
      }
      this.handleStripeError(error);
    }
  }

  async cancelPaymentIntent(intentId: string): Promise<void> {
    const stripe = this.ensureStripe();
    try {
      await stripe.paymentIntents.cancel(intentId);
    } catch (error) {
      this.handleStripeError(error);
    }
  }

  async createRefund(params: CreateRefundParams): Promise<RefundResult> {
    const stripe = this.ensureStripe();
    const tenantId = params.tenantId;
    const scopeKey = `stripe:${tenantId ?? 'global'}`;

    // Check circuit breaker before calling Stripe
    if (tenantId && !(await this.circuitBreaker.canSend(scopeKey, tenantId))) {
      throw new ServiceUnavailableException(
        'Payment service temporarily unavailable, please try again shortly',
      );
    }

    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: params.paymentIntentId,
      // Destination charges: reverse the transfer so the refund comes out of
      // the connected account, not the platform balance.
      reverse_transfer: true,
      // refund_application_fee applies to the ENTIRE platform fee, not a
      // proportional share, so only set it on full refunds. Caller is
      // responsible for computing this flag based on cumulative refund total.
      refund_application_fee: params.refundApplicationFee ?? false,
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

    try {
      const refund = await stripe.refunds.create(refundParams);

      if (tenantId) {
        await this.circuitBreaker.recordSuccess(scopeKey, tenantId);
      }

      return {
        id: refund.id,
        amount: refund.amount,
        status: refund.status ?? 'pending',
      };
    } catch (error) {
      if (tenantId && this.isCircuitBreakerError(error)) {
        await this.circuitBreaker.recordFailure(scopeKey, tenantId);
      }
      this.handleStripeError(error);
    }
  }

  /**
   * Find or create a Stripe Customer for a (tenant, client) pair.
   * Customer lives on the PLATFORM account (not the connected account) so
   * saved payment methods work across destination charges. Tenant isolation
   * is enforced by storing the returned ID scoped to (tenantId, clientId).
   */
  async getOrCreateCustomer(params: {
    existingCustomerId: string | null;
    email: string;
    name?: string;
    metadata: Record<string, string>;
  }): Promise<string> {
    const stripe = this.ensureStripe();

    if (params.existingCustomerId) {
      try {
        const customer = await stripe.customers.retrieve(
          params.existingCustomerId,
        );
        // Stripe returns a DeletedCustomer stub if the Customer was deleted.
        if (!customer.deleted) {
          return customer.id;
        }
        // Fall through to re-create a new Customer below.
      } catch (error) {
        // If the stored ID is invalid (e.g. test-mode leftover in live),
        // don't fail the booking — just create a new one.
        this.logger.warn(
          `Stored Stripe customer ${params.existingCustomerId} unusable, creating new: ${
            error instanceof Error ? error.message : 'unknown'
          }`,
        );
      }
    }

    try {
      const customer = await stripe.customers.create({
        email: params.email,
        name: params.name,
        metadata: params.metadata,
      });
      return customer.id;
    } catch (error) {
      this.handleStripeError(error);
    }
  }

  /**
   * List all refunds for a PaymentIntent.
   * Used to compute cumulative refunded amount before accepting a new refund,
   * so partial refunds can be accumulated without over-refunding.
   */
  async listRefunds(paymentIntentId: string): Promise<RefundResult[]> {
    const stripe = this.ensureStripe();
    try {
      // Use autoPagingToArray so payments with >100 refunds (rare but
      // possible with micro-refunds) are fully enumerated. A bounded limit
      // still applies so a pathological input cannot exhaust memory.
      const refunds = await stripe.refunds
        .list({ payment_intent: paymentIntentId })
        .autoPagingToArray({ limit: 10_000 });
      return refunds.map((r) => ({
        id: r.id,
        amount: r.amount,
        status: r.status ?? 'pending',
      }));
    } catch (error) {
      this.handleStripeError(error);
    }
  }

  /**
   * Retrieve a PaymentIntent by ID.
   * Used by the retry processor to check current status before confirming.
   */
  async retrievePaymentIntent(
    intentId: string,
  ): Promise<{ id: string; status: string }> {
    const stripe = this.ensureStripe();
    try {
      const intent = await stripe.paymentIntents.retrieve(intentId);
      return { id: intent.id, status: intent.status };
    } catch (error) {
      this.handleStripeError(error);
    }
  }

  /**
   * Confirm a PaymentIntent by ID.
   * Used by the retry processor to re-attempt failed payments.
   */
  async confirmPaymentIntent(
    intentId: string,
  ): Promise<{ id: string; status: string }> {
    const stripe = this.ensureStripe();
    try {
      const intent = await stripe.paymentIntents.confirm(intentId);
      return { id: intent.id, status: intent.status };
    } catch (error) {
      this.handleStripeError(error);
    }
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
    try {
      return stripe.webhooks.constructEvent(rawBody, signature, secret);
    } catch (error) {
      this.handleStripeError(error);
    }
  }
}
