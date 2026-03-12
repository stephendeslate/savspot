import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { validateRequest } from 'twilio';

interface GatherOptions {
  timeout?: number;
  speechTimeout?: string;
  language?: string;
  actionUrl?: string;
}

@Injectable()
export class VoiceTelephonyService {
  private readonly logger = new Logger(VoiceTelephonyService.name);

  constructor(private readonly configService: ConfigService) {}

  generateGatherTwiml(prompt: string, options?: GatherOptions): string {
    const timeout = options?.timeout ?? 5;
    const speechTimeout = options?.speechTimeout ?? 'auto';
    const language = options?.language ?? 'en-US';
    const actionUrl = options?.actionUrl ?? '/api/voice/gather';

    const escapedPrompt = this.escapeXml(prompt);

    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<Response>',
      `  <Gather input="speech" timeout="${timeout}" speechTimeout="${speechTimeout}" language="${language}" action="${actionUrl}" method="POST">`,
      `    <Say>${escapedPrompt}</Say>`,
      '  </Gather>',
      '  <Say>We didn\'t receive any input. Goodbye.</Say>',
      '</Response>',
    ].join('\n');
  }

  generateSayTwiml(text: string): string {
    const escapedText = this.escapeXml(text);

    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<Response>',
      `  <Say>${escapedText}</Say>`,
      '</Response>',
    ].join('\n');
  }

  generateTransferTwiml(number: string, timeout: number): string {
    const escapedNumber = this.escapeXml(number);

    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<Response>',
      '  <Say>Please hold while I transfer your call.</Say>',
      `  <Dial timeout="${timeout}">`,
      `    <Number>${escapedNumber}</Number>`,
      '  </Dial>',
      '  <Say>We were unable to connect your call. Please try again later. Goodbye.</Say>',
      '</Response>',
    ].join('\n');
  }

  verifySignature(
    url: string,
    params: Record<string, string>,
    signature: string,
  ): boolean {
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    if (!authToken) {
      this.logger.error('TWILIO_AUTH_TOKEN not configured — rejecting request');
      return false;
    }
    return validateRequest(authToken, signature, url, params);
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
