import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VoiceTelephonyService } from '@/voice/services/voice-telephony.service';

vi.mock('twilio', () => ({
  validateRequest: vi.fn(),
}));

import { validateRequest } from 'twilio';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfigService(overrides: Record<string, string | undefined> = {}) {
  const config: Record<string, string | undefined> = {
    TWILIO_AUTH_TOKEN: 'test-auth-token',
    ...overrides,
  };
  return {
    get: vi.fn((key: string) => config[key]),
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('VoiceTelephonyService', () => {
  let service: VoiceTelephonyService;
  let configService: ReturnType<typeof makeConfigService>;

  beforeEach(() => {
    vi.clearAllMocks();
    configService = makeConfigService();
    service = new VoiceTelephonyService(configService as never);
  });

  // -----------------------------------------------------------------------
  // generateGatherTwiml
  // -----------------------------------------------------------------------

  describe('generateGatherTwiml', () => {
    it('should generate valid TwiML with default options', () => {
      const twiml = service.generateGatherTwiml('Hello, how can I help?');

      expect(twiml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(twiml).toContain('<Response>');
      expect(twiml).toContain('<Gather');
      expect(twiml).toContain('input="speech"');
      expect(twiml).toContain('timeout="5"');
      expect(twiml).toContain('speechTimeout="auto"');
      expect(twiml).toContain('language="en-US"');
      expect(twiml).toContain('action="/api/voice/gather"');
      expect(twiml).toContain('<Say>Hello, how can I help?</Say>');
      expect(twiml).toContain("We didn't receive any input");
    });

    it('should use custom options when provided', () => {
      const twiml = service.generateGatherTwiml('Prompt', {
        timeout: 10,
        speechTimeout: '5',
        language: 'es-ES',
        actionUrl: '/api/voice/custom',
      });

      expect(twiml).toContain('timeout="10"');
      expect(twiml).toContain('speechTimeout="5"');
      expect(twiml).toContain('language="es-ES"');
      expect(twiml).toContain('action="/api/voice/custom"');
    });

    it('should escape XML special characters in prompt', () => {
      const twiml = service.generateGatherTwiml('Hello & welcome <caller>');

      expect(twiml).toContain('Hello &amp; welcome &lt;caller&gt;');
    });
  });

  // -----------------------------------------------------------------------
  // generateSayTwiml
  // -----------------------------------------------------------------------

  describe('generateSayTwiml', () => {
    it('should generate valid Say TwiML', () => {
      const twiml = service.generateSayTwiml('Goodbye!');

      expect(twiml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(twiml).toContain('<Response>');
      expect(twiml).toContain('<Say>Goodbye!</Say>');
    });

    it('should escape XML characters in text', () => {
      const twiml = service.generateSayTwiml('Cost is $5 & "free" <delivery>');

      expect(twiml).toContain('&amp;');
      expect(twiml).toContain('&quot;');
      expect(twiml).toContain('&lt;delivery&gt;');
    });
  });

  // -----------------------------------------------------------------------
  // generateTransferTwiml
  // -----------------------------------------------------------------------

  describe('generateTransferTwiml', () => {
    it('should generate valid transfer TwiML with dial', () => {
      const twiml = service.generateTransferTwiml('+15551234567', 30);

      expect(twiml).toContain('<Dial timeout="30">');
      expect(twiml).toContain('<Number>+15551234567</Number>');
      expect(twiml).toContain('Please hold while I transfer your call');
      expect(twiml).toContain('unable to connect');
    });

    it('should escape special characters in phone number', () => {
      const twiml = service.generateTransferTwiml('+1 & <test>', 20);

      expect(twiml).toContain('+1 &amp; &lt;test&gt;');
    });
  });

  // -----------------------------------------------------------------------
  // verifySignature
  // -----------------------------------------------------------------------

  describe('verifySignature', () => {
    it('should delegate to twilio validateRequest with correct params', () => {
      vi.mocked(validateRequest).mockReturnValue(true);

      const result = service.verifySignature(
        'https://example.com/webhook',
        { key: 'value' },
        'sig123',
      );

      expect(result).toBe(true);
      expect(validateRequest).toHaveBeenCalledWith(
        'test-auth-token',
        'sig123',
        'https://example.com/webhook',
        { key: 'value' },
      );
    });

    it('should return false when TWILIO_AUTH_TOKEN is not configured', () => {
      configService = makeConfigService({ TWILIO_AUTH_TOKEN: undefined });
      service = new VoiceTelephonyService(configService as never);

      const result = service.verifySignature(
        'https://example.com',
        {},
        'sig',
      );

      expect(result).toBe(false);
      expect(validateRequest).not.toHaveBeenCalled();
    });

    it('should return false when twilio validation fails', () => {
      vi.mocked(validateRequest).mockReturnValue(false);

      const result = service.verifySignature(
        'https://example.com',
        {},
        'bad-sig',
      );

      expect(result).toBe(false);
    });
  });
});
