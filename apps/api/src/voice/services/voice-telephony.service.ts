import { Injectable, Logger } from '@nestjs/common';

interface GatherOptions {
  timeout?: number;
  speechTimeout?: string;
  language?: string;
  actionUrl?: string;
}

@Injectable()
export class VoiceTelephonyService {
  private readonly logger = new Logger(VoiceTelephonyService.name);

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
    _url: string,
    _params: Record<string, string>,
    _signature: string,
  ): boolean {
    this.logger.warn(
      'Twilio signature verification is stubbed — returning true',
    );
    return true;
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
