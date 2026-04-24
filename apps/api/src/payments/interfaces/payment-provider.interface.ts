export interface CreatePaymentIntentParams {
  amount: number; // in minor units (cents)
  currency: string;
  connectedAccountId: string;
  platformFeeAmount: number;
  metadata: Record<string, string>;
  customerId?: string;
  // When set, Stripe saves the payment method to the customer for reuse.
  // 'off_session' = suitable for merchant-initiated future charges;
  // 'on_session' = only reusable when the customer is present. Booking
  // flows use 'off_session' so clients can re-book with 1-click.
  setupFutureUsage?: 'on_session' | 'off_session';
}

export interface PaymentIntentResult {
  id: string;
  clientSecret: string;
  status: string;
  amount: number;
  currency: string;
}

export interface CreateRefundParams {
  paymentIntentId: string;
  amount?: number; // partial refund amount, omit for full
  reason?: string;
  tenantId?: string; // used by circuit breaker for per-tenant scoping
  // When true, refund the platform application fee along with the charge.
  // Stripe refunds the ENTIRE application fee regardless of partial amount,
  // so callers should only set this on full refunds to avoid losing the
  // platform fee on a partial. Default false.
  refundApplicationFee?: boolean;
}

export interface RefundResult {
  id: string;
  amount: number;
  status: string;
}

export interface ConnectedAccount {
  accountId: string;
  onboardingComplete: boolean;
}

export interface AccountStatus {
  accountId: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  // Stripe may mark a connected account as restricted after onboarding if
  // additional verification is needed (e.g. document expired, new
  // regulatory requirement). When set, the tenant should be prompted to
  // revisit the Stripe onboarding link to provide the missing info.
  requirements?: {
    currentlyDue: string[];
    pastDue: string[];
    disabledReason: string | null;
  };
}

export interface PaymentProviderInterface {
  createConnectedAccount(email: string, country: string): Promise<ConnectedAccount>;
  getOnboardingLink(accountId: string, refreshUrl: string, returnUrl: string): Promise<string>;
  getDashboardLink(accountId: string): Promise<string>;
  getAccountStatus(accountId: string): Promise<AccountStatus>;
  createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntentResult>;
  cancelPaymentIntent(intentId: string): Promise<void>;
  createRefund(params: CreateRefundParams): Promise<RefundResult>;
  listRefunds(paymentIntentId: string): Promise<RefundResult[]>;
}
