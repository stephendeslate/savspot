import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SmsService } from '@/sms/sms.service';
import { SmsProvider, SmsSendResult } from '@/sms/providers/sms-provider.interface';

function makeMockProvider(providerName: 'twilio' | 'plivo' = 'twilio'): SmsProvider {
  return {
    providerName,
    send: vi.fn(),
    getDeliveryStatus: vi.fn(),
  };
}

describe('SmsService', () => {
  let service: SmsService;
  let provider: SmsProvider;

  beforeEach(() => {
    provider = makeMockProvider('twilio');
    service = new SmsService(provider);
  });

  describe('sendSms', () => {
    it('should delegate to provider.send and map result', async () => {
      const sendResult: SmsSendResult = {
        success: true,
        messageId: 'MSG-001',
        provider: 'twilio',
      };
      (provider.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce(sendResult);

      const result = await service.sendSms('+1234567890', 'Hello world');

      expect(provider.send).toHaveBeenCalledWith('+1234567890', 'Hello world');
      expect(result.success).toBe(true);
      expect(result.sid).toBe('MSG-001');
    });

    it('should map messageId to sid for backward compatibility', async () => {
      const sendResult: SmsSendResult = {
        success: true,
        messageId: 'plivo-uuid-001',
        provider: 'plivo',
      };
      (provider.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce(sendResult);

      const result = await service.sendSms('+1234567890', 'Test');
      expect(result.sid).toBe('plivo-uuid-001');
    });

    it('should return success false on provider failure', async () => {
      const sendResult: SmsSendResult = {
        success: false,
        provider: 'twilio',
        error: 'Invalid number',
      };
      (provider.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce(sendResult);

      const result = await service.sendSms('+bad', 'Test');
      expect(result.success).toBe(false);
      expect(result.sid).toBeUndefined();
    });
  });

  describe('getDeliveryStatus', () => {
    it('should delegate to provider.getDeliveryStatus', async () => {
      (provider.getDeliveryStatus as ReturnType<typeof vi.fn>).mockResolvedValueOnce('delivered');

      const status = await service.getDeliveryStatus('MSG-001');
      expect(status).toBe('delivered');
      expect(provider.getDeliveryStatus).toHaveBeenCalledWith('MSG-001');
    });
  });

  describe('providerName', () => {
    it('should expose the underlying provider name', () => {
      expect(service.providerName).toBe('twilio');
    });

    it('should reflect plivo when using plivo provider', () => {
      const plivoProvider = makeMockProvider('plivo');
      const plivoService = new SmsService(plivoProvider);
      expect(plivoService.providerName).toBe('plivo');
    });
  });
});
