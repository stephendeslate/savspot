import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TwilioSmsProvider } from '@/sms/providers/twilio.provider';

vi.mock('twilio', () => {
  const mockCreate = vi.fn();
  const mockFetch = vi.fn();
  const mockClient = {
    messages: Object.assign(
      (sid: string) => ({ fetch: mockFetch, sid }),
      { create: mockCreate },
    ),
  };
  const twilioFn = vi.fn(() => mockClient);
  return { default: twilioFn, __mockCreate: mockCreate, __mockFetch: mockFetch };
});

function makeConfigService(overrides: Record<string, string | undefined> = {}) {
  const defaults: Record<string, string | undefined> = {
    'twilio.accountSid': undefined,
    'twilio.authToken': undefined,
    'twilio.phoneNumber': '',
  };
  const merged = { ...defaults, ...overrides };
  return {
    get: vi.fn((key: string, defaultValue?: string) => {
      if (key in merged) return merged[key] ?? defaultValue;
      return defaultValue ?? '';
    }),
  };
}

describe('TwilioSmsProvider', () => {
  describe('without credentials (dev mode)', () => {
    let provider: TwilioSmsProvider;

    beforeEach(() => {
      const config = makeConfigService();
      provider = new TwilioSmsProvider(config as never);
    });

    it('should have providerName "twilio"', () => {
      expect(provider.providerName).toBe('twilio');
    });

    it('should return success without sending when no credentials', async () => {
      const result = await provider.send('+1234567890', 'Hello');
      expect(result.success).toBe(true);
      expect(result.provider).toBe('twilio');
      expect(result.messageId).toBeUndefined();
    });

    it('should return "unknown" for delivery status when no credentials', async () => {
      const status = await provider.getDeliveryStatus('SM123');
      expect(status).toBe('unknown');
    });
  });

  describe('with credentials', () => {
    let provider: TwilioSmsProvider;

    beforeEach(async () => {
      const config = makeConfigService({
        'twilio.accountSid': 'AC_TEST',
        'twilio.authToken': 'token_test',
        'twilio.phoneNumber': '+10000000000',
      });
      provider = new TwilioSmsProvider(config as never);
    });

    it('should send SMS and return messageId on success', async () => {
      const twilio = await import('twilio');
      const mockCreate = (twilio as Record<string, unknown>)['__mockCreate'] as ReturnType<typeof vi.fn>;
      mockCreate.mockResolvedValueOnce({ sid: 'SM_TEST_SID' });

      const result = await provider.send('+1234567890', 'Test message');
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('SM_TEST_SID');
      expect(result.provider).toBe('twilio');
      expect(mockCreate).toHaveBeenCalledWith({
        to: '+1234567890',
        from: '+10000000000',
        body: 'Test message',
      });
    });

    it('should use custom from number when provided', async () => {
      const twilio = await import('twilio');
      const mockCreate = (twilio as Record<string, unknown>)['__mockCreate'] as ReturnType<typeof vi.fn>;
      mockCreate.mockResolvedValueOnce({ sid: 'SM_CUSTOM' });

      await provider.send('+1234567890', 'Test', '+19999999999');
      expect(mockCreate).toHaveBeenCalledWith({
        to: '+1234567890',
        from: '+19999999999',
        body: 'Test',
      });
    });

    it('should return failure with error on Twilio error', async () => {
      const twilio = await import('twilio');
      const mockCreate = (twilio as Record<string, unknown>)['__mockCreate'] as ReturnType<typeof vi.fn>;
      mockCreate.mockRejectedValueOnce(new Error('Invalid number'));

      const result = await provider.send('+1234567890', 'Test');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid number');
      expect(result.provider).toBe('twilio');
    });

    it('should fetch delivery status', async () => {
      const twilio = await import('twilio');
      const mockFetch = (twilio as Record<string, unknown>)['__mockFetch'] as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValueOnce({ status: 'delivered' });

      const status = await provider.getDeliveryStatus('SM123');
      expect(status).toBe('delivered');
    });

    it('should return "unknown" when delivery status fetch fails', async () => {
      const twilio = await import('twilio');
      const mockFetch = (twilio as Record<string, unknown>)['__mockFetch'] as ReturnType<typeof vi.fn>;
      mockFetch.mockRejectedValueOnce(new Error('Not found'));

      const status = await provider.getDeliveryStatus('SM123');
      expect(status).toBe('unknown');
    });
  });
});
