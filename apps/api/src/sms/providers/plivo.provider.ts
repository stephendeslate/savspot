import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmsProvider, SmsSendResult } from './sms-provider.interface';

interface PlivoMessageResponse {
  message_uuid: string[];
  api_id: string;
  message: string;
}

interface PlivoMessageStatusResponse {
  message_state: string;
  api_id: string;
}

export class PlivoSmsProvider implements SmsProvider {
  readonly providerName = 'plivo' as const;
  private readonly logger = new Logger(PlivoSmsProvider.name);
  private readonly authId: string;
  private readonly authToken: string;
  private readonly fromNumber: string;
  private readonly configured: boolean;

  constructor(private readonly configService: ConfigService) {
    this.authId = this.configService.get<string>('PLIVO_AUTH_ID', '');
    this.authToken = this.configService.get<string>('PLIVO_AUTH_TOKEN', '');
    this.fromNumber = this.configService.get<string>('PLIVO_FROM_NUMBER', '');

    if (this.authId && this.authToken && this.fromNumber) {
      this.configured = true;
      this.logger.log('Plivo SMS provider initialized');
    } else {
      this.configured = false;
      this.logger.warn(
        'Plivo credentials not configured — SMS will be logged to console',
      );
    }
  }

  async send(to: string, body: string, from?: string): Promise<SmsSendResult> {
    if (!this.configured) {
      this.logger.log(`[DEV SMS] To: ${to}`);
      this.logger.log(`[DEV SMS] Body: ${body}`);
      return { success: true, provider: 'plivo' };
    }

    try {
      const url = `https://api.plivo.com/v1/Account/${this.authId}/Message/`;
      const credentials = Buffer.from(
        `${this.authId}:${this.authToken}`,
      ).toString('base64');

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${credentials}`,
        },
        body: JSON.stringify({
          src: from || this.fromNumber,
          dst: to,
          text: body,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `Plivo API error (${response.status}): ${errorText}`,
        );
        return {
          success: false,
          provider: 'plivo',
          error: `Plivo API error: ${response.status}`,
        };
      }

      const data = (await response.json()) as PlivoMessageResponse;
      const messageId = data.message_uuid[0];

      this.logger.log(`SMS sent to ${to}: UUID=${messageId}`);
      return { success: true, messageId, provider: 'plivo' };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Failed to send SMS to ${to}: ${errorMessage}`);
      return { success: false, provider: 'plivo', error: errorMessage };
    }
  }

  async getDeliveryStatus(messageId: string): Promise<string> {
    if (!this.configured) {
      return 'unknown';
    }

    try {
      const url = `https://api.plivo.com/v1/Account/${this.authId}/Message/${messageId}/`;
      const credentials = Buffer.from(
        `${this.authId}:${this.authToken}`,
      ).toString('base64');

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Basic ${credentials}`,
        },
      });

      if (!response.ok) {
        return 'unknown';
      }

      const data = (await response.json()) as PlivoMessageStatusResponse;
      return data.message_state;
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
