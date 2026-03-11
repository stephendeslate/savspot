import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PlivoSmsProvider } from '@/sms/providers/plivo.provider';

function makeConfigService(overrides: Record<string, string | undefined> = {}) {
  const defaults: Record<string, string | undefined> = {
    PLIVO_AUTH_ID: undefined,
    PLIVO_AUTH_TOKEN: undefined,
    PLIVO_FROM_NUMBER: undefined,
  };
  const merged = { ...defaults, ...overrides };
  return {
    get: vi.fn((key: string, defaultValue?: string) => {
      if (key in merged) return merged[key] ?? defaultValue ?? '';
      return defaultValue ?? '';
    }),
  };
}

describe('PlivoSmsProvider', () => {
  describe('without credentials (dev mode)', () => {
    let provider: PlivoSmsProvider;

    beforeEach(() => {
      const config = makeConfigService();
      provider = new PlivoSmsProvider(config as never);
    });

    it('should have providerName "plivo"', () => {
      expect(provider.providerName).toBe('plivo');
    });

    it('should return success without sending when no credentials', async () => {
      const result = await provider.send('+1234567890', 'Hello');
      expect(result.success).toBe(true);
      expect(result.provider).toBe('plivo');
      expect(result.messageId).toBeUndefined();
    });

    it('should return "unknown" for delivery status when no credentials', async () => {
      const status = await provider.getDeliveryStatus('uuid-123');
      expect(status).toBe('unknown');
    });
  });

  describe('with credentials', () => {
    let provider: PlivoSmsProvider;
    let fetchSpy: ReturnType<typeof vi.fn>;
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
      fetchSpy = vi.fn();
      globalThis.fetch = fetchSpy;

      const config = makeConfigService({
        PLIVO_AUTH_ID: 'PLIVO_AUTH_ID_TEST',
        PLIVO_AUTH_TOKEN: 'PLIVO_AUTH_TOKEN_TEST',
        PLIVO_FROM_NUMBER: '+15550000000',
      });
      provider = new PlivoSmsProvider(config as never);
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('should send SMS via Plivo REST API', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            message_uuid: ['plivo-uuid-001'],
            api_id: 'api-001',
            message: 'message(s) queued',
          }),
      });

      const result = await provider.send('+1234567890', 'Test message');

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('plivo-uuid-001');
      expect(result.provider).toBe('plivo');

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.plivo.com/v1/Account/PLIVO_AUTH_ID_TEST/Message/',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: `Basic ${Buffer.from('PLIVO_AUTH_ID_TEST:PLIVO_AUTH_TOKEN_TEST').toString('base64')}`,
          }),
          body: JSON.stringify({
            src: '+15550000000',
            dst: '+1234567890',
            text: 'Test message',
          }),
        }),
      );
    });

    it('should use custom from number when provided', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            message_uuid: ['plivo-uuid-002'],
            api_id: 'api-002',
            message: 'message(s) queued',
          }),
      });

      await provider.send('+1234567890', 'Test', '+19999999999');

      const callBody = JSON.parse(fetchSpy.mock.calls[0]![1]!.body as string);
      expect(callBody.src).toBe('+19999999999');
    });

    it('should return failure on Plivo API error', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Authentication failed'),
      });

      const result = await provider.send('+1234567890', 'Test');
      expect(result.success).toBe(false);
      expect(result.provider).toBe('plivo');
      expect(result.error).toContain('401');
    });

    it('should return failure on fetch exception', async () => {
      fetchSpy.mockRejectedValueOnce(new Error('Network error'));

      const result = await provider.send('+1234567890', 'Test');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should fetch delivery status', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            message_state: 'delivered',
            api_id: 'api-003',
          }),
      });

      const status = await provider.getDeliveryStatus('plivo-uuid-001');
      expect(status).toBe('delivered');

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.plivo.com/v1/Account/PLIVO_AUTH_ID_TEST/Message/plivo-uuid-001/',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: expect.stringContaining('Basic '),
          }),
        }),
      );
    });

    it('should return "unknown" when delivery status API fails', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const status = await provider.getDeliveryStatus('bad-uuid');
      expect(status).toBe('unknown');
    });

    it('should return "unknown" when delivery status fetch throws', async () => {
      fetchSpy.mockRejectedValueOnce(new Error('Network error'));

      const status = await provider.getDeliveryStatus('some-uuid');
      expect(status).toBe('unknown');
    });
  });
});
