import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Twilio from 'twilio';
import { SmsProvider, SmsSendResult } from './sms-provider.interface';

export class TwilioSmsProvider implements SmsProvider {
  readonly providerName = 'twilio' as const;
  private readonly logger = new Logger(TwilioSmsProvider.name);
  private readonly client: Twilio.Twilio | null;
  private readonly fromNumber: string;

  constructor(private readonly configService: ConfigService) {
    const accountSid = this.configService.get<string>('twilio.accountSid');
    const authToken = this.configService.get<string>('twilio.authToken');
    this.fromNumber = this.configService.get<string>(
      'twilio.phoneNumber',
      '',
    );

    if (accountSid && authToken && this.fromNumber) {
      this.client = Twilio(accountSid, authToken);
      this.logger.log('Twilio SMS provider initialized');
    } else {
      this.client = null;
      this.logger.warn(
        'Twilio credentials not configured — SMS will be logged to console',
      );
    }
  }

  async send(to: string, body: string, from?: string): Promise<SmsSendResult> {
    if (!this.client) {
      this.logger.log(`[DEV SMS] To: ${to}`);
      this.logger.log(`[DEV SMS] Body: ${body}`);
      return { success: true, provider: 'twilio' };
    }

    try {
      const message = await this.client.messages.create({
        to,
        from: from || this.fromNumber,
        body,
      });

      this.logger.log(`SMS sent to ${to}: SID=${message.sid}`);
      return { success: true, messageId: message.sid, provider: 'twilio' };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Failed to send SMS to ${to}: ${errorMessage}`);
      return { success: false, provider: 'twilio', error: errorMessage };
    }
  }

  async getDeliveryStatus(messageId: string): Promise<string> {
    if (!this.client) {
      return 'unknown';
    }

    try {
      const message = await this.client.messages(messageId).fetch();
      return message.status;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(
        `Failed to get delivery status for ${messageId}: ${errorMessage}`,
      );
      return 'unknown';
    }
  }
}
