export interface CreatePaymentIntentParams {
  amount: number; // in minor units (cents)
  currency: string;
  connectedAccountId: string;
  platformFeeAmount: number;
  metadata: Record<string, string>;
  customerId?: string;
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
}

export interface PaymentProviderInterface {
  createConnectedAccount(email: string, country: string): Promise<ConnectedAccount>;
  getOnboardingLink(accountId: string, refreshUrl: string, returnUrl: string): Promise<string>;
  getDashboardLink(accountId: string): Promise<string>;
  getAccountStatus(accountId: string): Promise<AccountStatus>;
  createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntentResult>;
  cancelPaymentIntent(intentId: string): Promise<void>;
  createRefund(params: CreateRefundParams): Promise<RefundResult>;
}
