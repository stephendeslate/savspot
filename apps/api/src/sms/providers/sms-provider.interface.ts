export interface SmsSendResult {
  success: boolean;
  messageId?: string;
  provider: 'twilio' | 'plivo';
  error?: string;
}

export interface SmsProvider {
  send(to: string, body: string, from?: string): Promise<SmsSendResult>;
  getDeliveryStatus(messageId: string): Promise<string>;
  readonly providerName: 'twilio' | 'plivo';
}

export const SMS_PROVIDER = Symbol('SMS_PROVIDER');
