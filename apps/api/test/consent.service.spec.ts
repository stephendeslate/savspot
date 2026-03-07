import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConsentService } from '@/consent/consent.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const USER_ID = 'user-001';

function makePrisma() {
  return {
    consentRecord: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
  };
}

function makeConsent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'consent-001',
    userId: USER_ID,
    purpose: 'DATA_PROCESSING',
    consented: true,
    consentedAt: new Date('2026-03-01T10:00:00Z'),
    withdrawnAt: null,
    ipAddress: '127.0.0.1',
    userAgent: 'TestAgent/1.0',
    consentTextVersion: '1.0',
    createdAt: new Date('2026-03-01T10:00:00Z'),
    updatedAt: new Date('2026-03-01T10:00:00Z'),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('ConsentService', () => {
  let service: ConsentService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new ConsentService(prisma as never);
  });

  // -----------------------------------------------------------------------
  // findAllForUser
  // -----------------------------------------------------------------------

  describe('findAllForUser', () => {
    it('should return all consent records for the user', async () => {
      const records = [
        makeConsent(),
        makeConsent({ id: 'consent-002', purpose: 'MARKETING', consented: false }),
      ];
      prisma.consentRecord.findMany.mockResolvedValue(records);

      const result = await service.findAllForUser(USER_ID);

      expect(result).toEqual(records);
      expect(prisma.consentRecord.findMany).toHaveBeenCalledWith({
        where: { userId: USER_ID },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when user has no consents', async () => {
      prisma.consentRecord.findMany.mockResolvedValue([]);

      const result = await service.findAllForUser(USER_ID);

      expect(result).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // upsertConsent
  // -----------------------------------------------------------------------

  describe('upsertConsent', () => {
    it('should upsert a consent record when granting consent', async () => {
      const record = makeConsent();
      prisma.consentRecord.upsert.mockResolvedValue(record);

      const result = await service.upsertConsent(
        USER_ID,
        'DATA_PROCESSING',
        true,
        '127.0.0.1',
        'TestAgent/1.0',
      );

      expect(result).toEqual(record);
      expect(prisma.consentRecord.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_purpose: { userId: USER_ID, purpose: 'DATA_PROCESSING' } },
          create: expect.objectContaining({
            userId: USER_ID,
            purpose: 'DATA_PROCESSING',
            consented: true,
            ipAddress: '127.0.0.1',
            userAgent: 'TestAgent/1.0',
            consentTextVersion: '1.0',
          }),
          update: expect.objectContaining({
            consented: true,
            ipAddress: '127.0.0.1',
            userAgent: 'TestAgent/1.0',
          }),
        }),
      );
    });

    it('should set withdrawnAt when withdrawing consent', async () => {
      const record = makeConsent({ consented: false, withdrawnAt: new Date() });
      prisma.consentRecord.upsert.mockResolvedValue(record);

      await service.upsertConsent(USER_ID, 'MARKETING', false);

      const call = prisma.consentRecord.upsert.mock.calls[0]![0];
      expect(call.update.consented).toBe(false);
      expect(call.update.withdrawnAt).toBeInstanceOf(Date);
    });

    it('should set consentedAt and clear withdrawnAt when granting consent', async () => {
      prisma.consentRecord.upsert.mockResolvedValue(makeConsent());

      await service.upsertConsent(USER_ID, 'DATA_PROCESSING', true);

      const call = prisma.consentRecord.upsert.mock.calls[0]![0];
      expect(call.update.consentedAt).toBeInstanceOf(Date);
      expect(call.update.withdrawnAt).toBeNull();
    });

    it('should handle missing IP and user-agent gracefully', async () => {
      prisma.consentRecord.upsert.mockResolvedValue(makeConsent());

      await service.upsertConsent(USER_ID, 'ANALYTICS', true);

      const call = prisma.consentRecord.upsert.mock.calls[0]![0];
      expect(call.create.ipAddress).toBeNull();
      expect(call.create.userAgent).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // createBookingConsent
  // -----------------------------------------------------------------------

  describe('createBookingConsent', () => {
    it('should create DATA_PROCESSING consent for booking', async () => {
      prisma.consentRecord.upsert.mockResolvedValue(makeConsent());

      await service.createBookingConsent(USER_ID, '10.0.0.1', 'BookingAgent');

      const call = prisma.consentRecord.upsert.mock.calls[0]![0];
      expect(call.where.userId_purpose.purpose).toBe('DATA_PROCESSING');
      expect(call.create.consented).toBe(true);
      expect(call.create.ipAddress).toBe('10.0.0.1');
    });
  });
});
