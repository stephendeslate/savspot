import { Inject, Injectable, Logger } from '@nestjs/common';
import { SmsProvider, SmsSendResult, SMS_PROVIDER } from './providers';

/**
 * SMS service that delegates to the configured SMS provider (Twilio or Plivo).
 * Provider is selected via SMS_PROVIDER env var (default: 'twilio').
 *
 * Maintains backward-compatible API: sendSms(to, body) returns { success, sid? }.
 * Also exported as TwilioService for existing import compatibility.
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(
    @Inject(SMS_PROVIDER) private readonly provider: SmsProvider,
  ) {
    this.logger.log(`SMS service using provider: ${this.provider.providerName}`);
  }

  /**
   * Send an SMS message via the configured provider.
   * In dev mode (no credentials), logs the message instead.
   *
   * @returns { success: boolean, sid?: string }
   */
  async sendSms(
    to: string,
    body: string,
  ): Promise<{ success: boolean; sid?: string }> {
    const result: SmsSendResult = await this.provider.send(to, body);

    return {
      success: result.success,
      sid: result.messageId,
    };
  }

  /**
   * Get delivery status for a message by its provider-specific ID.
   */
  async getDeliveryStatus(messageId: string): Promise<string> {
    return this.provider.getDeliveryStatus(messageId);
  }

  /**
   * The name of the active SMS provider.
   */
  get providerName(): string {
    return this.provider.providerName;
  }
}

/**
 * @deprecated Use SmsService instead. Kept for backward compatibility.
 */
export const TwilioService = SmsService;
