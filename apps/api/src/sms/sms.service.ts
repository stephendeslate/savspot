import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Twilio from 'twilio';

/**
 * Twilio SMS service.
 * Follows the same no-op pattern as EmailService: if Twilio credentials
 * are not configured, messages are logged to console instead of sent.
 */
@Injectable()
export class TwilioService {
  private readonly logger = new Logger(TwilioService.name);
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
      this.logger.log('Twilio SMS service initialized');
    } else {
      this.client = null;
      this.logger.warn(
        'Twilio credentials not configured — SMS will be logged to console',
      );
    }
  }

  /**
   * Send an SMS message via Twilio.
   * In dev mode (no credentials), logs the message instead.
   *
   * @returns { success: boolean, sid?: string }
   */
  async sendSms(
    to: string,
    body: string,
  ): Promise<{ success: boolean; sid?: string }> {
    if (!this.client) {
      this.logger.log(`[DEV SMS] To: ${to}`);
      this.logger.log(`[DEV SMS] Body: ${body}`);
      return { success: true };
    }

    try {
      const message = await this.client.messages.create({
        to,
        from: this.fromNumber,
        body,
      });

      this.logger.log(`SMS sent to ${to}: SID=${message.sid}`);
      return { success: true, sid: message.sid };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Failed to send SMS to ${to}: ${errorMessage}`);
      return { success: false };
    }
  }
}
