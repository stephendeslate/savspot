import { describe, it, expect, vi } from 'vitest';
import { createSmsProvider } from '@/sms/providers/sms-provider.factory';
import { TwilioSmsProvider } from '@/sms/providers/twilio.provider';
import { PlivoSmsProvider } from '@/sms/providers/plivo.provider';

function makeConfigService(overrides: Record<string, string> = {}) {
  return {
    get: vi.fn((key: string, defaultValue?: string) => {
      if (key in overrides) return overrides[key];
      return defaultValue ?? '';
    }),
  };
}

describe('createSmsProvider', () => {
  it('should return TwilioSmsProvider when SMS_PROVIDER is not set', () => {
    const config = makeConfigService();
    const provider = createSmsProvider(config as never);
    expect(provider).toBeInstanceOf(TwilioSmsProvider);
    expect(provider.providerName).toBe('twilio');
  });

  it('should return TwilioSmsProvider when SMS_PROVIDER is "twilio"', () => {
    const config = makeConfigService({ SMS_PROVIDER: 'twilio' });
    const provider = createSmsProvider(config as never);
    expect(provider).toBeInstanceOf(TwilioSmsProvider);
  });

  it('should return PlivoSmsProvider when SMS_PROVIDER is "plivo"', () => {
    const config = makeConfigService({ SMS_PROVIDER: 'plivo' });
    const provider = createSmsProvider(config as never);
    expect(provider).toBeInstanceOf(PlivoSmsProvider);
    expect(provider.providerName).toBe('plivo');
  });

  it('should handle case-insensitive provider name', () => {
    const config = makeConfigService({ SMS_PROVIDER: 'Plivo' });
    const provider = createSmsProvider(config as never);
    expect(provider).toBeInstanceOf(PlivoSmsProvider);
  });

  it('should default to Twilio for unknown provider names', () => {
    const config = makeConfigService({ SMS_PROVIDER: 'unknown' });
    const provider = createSmsProvider(config as never);
    expect(provider).toBeInstanceOf(TwilioSmsProvider);
  });
});
