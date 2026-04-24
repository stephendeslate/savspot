import { Injectable, BadRequestException } from '@nestjs/common';
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

/**
 * Offline payment provider for cash / manual payments.
 * Most operations are not supported — only createPaymentIntent returns a mock result.
 */
@Injectable()
export class OfflineProvider implements PaymentProviderInterface {
  async createConnectedAccount(): Promise<ConnectedAccount> {
    throw new BadRequestException(
      'Offline payment provider does not support this operation',
    );
  }

  async getOnboardingLink(): Promise<string> {
    throw new BadRequestException(
      'Offline payment provider does not support this operation',
    );
  }

  async getDashboardLink(): Promise<string> {
    throw new BadRequestException(
      'Offline payment provider does not support this operation',
    );
  }

  async getAccountStatus(): Promise<AccountStatus> {
    throw new BadRequestException(
      'Offline payment provider does not support this operation',
    );
  }

  async createPaymentIntent(
    params: CreatePaymentIntentParams,
  ): Promise<PaymentIntentResult> {
    return {
      id: `offline_${randomUUID()}`,
      clientSecret: '',
      status: 'succeeded',
      amount: params.amount,
      currency: params.currency,
    };
  }

  async cancelPaymentIntent(): Promise<void> {
    throw new BadRequestException(
      'Offline payment provider does not support this operation',
    );
  }

  async createRefund(_params: CreateRefundParams): Promise<RefundResult> {
    throw new BadRequestException(
      'Offline payment provider does not support this operation',
    );
  }

  async listRefunds(_paymentIntentId: string): Promise<RefundResult[]> {
    // Offline payments cannot have electronic refunds; return empty.
    return [];
  }
}
