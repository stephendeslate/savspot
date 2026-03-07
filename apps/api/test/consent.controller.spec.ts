import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { ConsentController } from '@/consent/consent.controller';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const USER_ID = 'user-001';

const makeService = () => ({
  findAllForUser: vi.fn(),
  upsertConsent: vi.fn(),
});

function makeRequest(overrides: Record<string, unknown> = {}) {
  return {
    ip: '127.0.0.1',
    headers: { 'user-agent': 'test-agent' },
    ...overrides,
  } as never;
}

const VALID_PURPOSES = [
  'DATA_PROCESSING',
  'MARKETING',
  'ANALYTICS',
  'THIRD_PARTY_SHARING',
  'FOLLOW_UP_EMAILS',
];

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('ConsentController', () => {
  let controller: ConsentController;
  let service: ReturnType<typeof makeService>;

  beforeEach(() => {
    service = makeService();
    controller = new ConsentController(service as never);
  });

  // -----------------------------------------------------------------------
  // findAll
  // -----------------------------------------------------------------------

  describe('findAll', () => {
    it('should call service.findAllForUser with userId', async () => {
      const consents = [{ purpose: 'MARKETING', consented: true }];
      service.findAllForUser.mockResolvedValue(consents);

      const result = await controller.findAll(USER_ID);

      expect(service.findAllForUser).toHaveBeenCalledWith(USER_ID);
      expect(result).toEqual(consents);
    });

    it('should return empty array when no consents exist', async () => {
      service.findAllForUser.mockResolvedValue([]);

      const result = await controller.findAll(USER_ID);

      expect(result).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // update (upsertConsent)
  // -----------------------------------------------------------------------

  describe('update', () => {
    it.each(VALID_PURPOSES)(
      'should accept valid purpose %s',
      async (purpose) => {
        const dto = { consented: true };
        service.upsertConsent.mockResolvedValue({ purpose, consented: true });

        const result = await controller.update(
          USER_ID,
          purpose.toLowerCase(),
          dto as never,
          makeRequest(),
        );

        expect(service.upsertConsent).toHaveBeenCalledWith(
          USER_ID,
          purpose,
          true,
          '127.0.0.1',
          'test-agent',
        );
        expect(result).toEqual({ purpose, consented: true });
      },
    );

    it('should uppercase the purpose parameter before validation', async () => {
      const dto = { consented: false };
      service.upsertConsent.mockResolvedValue({ purpose: 'MARKETING', consented: false });

      await controller.update(USER_ID, 'marketing', dto as never, makeRequest());

      expect(service.upsertConsent).toHaveBeenCalledWith(
        USER_ID,
        'MARKETING',
        false,
        '127.0.0.1',
        'test-agent',
      );
    });

    it('should throw BadRequestException for invalid purpose', async () => {
      const dto = { consented: true };

      await expect(
        controller.update(USER_ID, 'INVALID_PURPOSE', dto as never, makeRequest()),
      ).rejects.toThrow(BadRequestException);
    });

    it('should include valid purposes in the error message', async () => {
      const dto = { consented: true };

      await expect(
        controller.update(USER_ID, 'INVALID', dto as never, makeRequest()),
      ).rejects.toThrow(/Must be one of/);
    });

    it('should pass req.ip to the service', async () => {
      const dto = { consented: true };
      const req = makeRequest({ ip: '192.168.1.1' });
      service.upsertConsent.mockResolvedValue({});

      await controller.update(USER_ID, 'MARKETING', dto as never, req);

      expect(service.upsertConsent).toHaveBeenCalledWith(
        USER_ID,
        'MARKETING',
        true,
        '192.168.1.1',
        'test-agent',
      );
    });

    it('should pass user-agent header to the service', async () => {
      const dto = { consented: true };
      const req = makeRequest({ headers: { 'user-agent': 'Mozilla/5.0' } });
      service.upsertConsent.mockResolvedValue({});

      await controller.update(USER_ID, 'ANALYTICS', dto as never, req);

      expect(service.upsertConsent).toHaveBeenCalledWith(
        USER_ID,
        'ANALYTICS',
        true,
        '127.0.0.1',
        'Mozilla/5.0',
      );
    });

    it('should pass consented=false to the service', async () => {
      const dto = { consented: false };
      service.upsertConsent.mockResolvedValue({});

      await controller.update(USER_ID, 'MARKETING', dto as never, makeRequest());

      expect(service.upsertConsent).toHaveBeenCalledWith(
        USER_ID,
        'MARKETING',
        false,
        '127.0.0.1',
        'test-agent',
      );
    });

    it('should not call the service when purpose is invalid', async () => {
      const dto = { consented: true };

      try {
        await controller.update(USER_ID, 'INVALID', dto as never, makeRequest());
      } catch {
        // expected
      }

      expect(service.upsertConsent).not.toHaveBeenCalled();
    });
  });
});
