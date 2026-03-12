import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ReferralsService } from '@/referrals/referrals.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const USER_ID = 'user-001';
const LINK_ID = 'link-001';

function makePrisma() {
  return {
    referralLink: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };
}

function makeLink(overrides: Record<string, unknown> = {}) {
  return {
    id: LINK_ID,
    tenantId: TENANT_ID,
    code: 'ABCD1234',
    name: 'Summer Promo',
    createdBy: USER_ID,
    usageCount: 0,
    isActive: true,
    expiresAt: null,
    createdAt: new Date('2026-03-01'),
    creator: { id: USER_ID, name: 'Test User', email: 'test@example.com' },
    ...overrides,
  };
}

describe('ReferralsService', () => {
  let service: ReferralsService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new ReferralsService(prisma as never);
  });

  // ---------- listLinks ----------

  describe('listLinks', () => {
    it('returns paginated links for a tenant', async () => {
      const links = [makeLink()];
      prisma.referralLink.findMany.mockResolvedValue(links);
      prisma.referralLink.count.mockResolvedValue(1);

      const result = await service.listLinks(TENANT_ID, { page: 1, limit: 20 });

      expect(result.data).toEqual(links);
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('calculates correct skip for page 2', async () => {
      prisma.referralLink.findMany.mockResolvedValue([]);
      prisma.referralLink.count.mockResolvedValue(0);

      await service.listLinks(TENANT_ID, { page: 2, limit: 10 });

      expect(prisma.referralLink.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });
  });

  // ---------- createLink ----------

  describe('createLink', () => {
    it('creates a referral link with provided code', async () => {
      prisma.referralLink.count.mockResolvedValue(0);
      prisma.referralLink.create.mockResolvedValue(makeLink({ code: 'CUSTOM' }));

      const result = await service.createLink(
        TENANT_ID,
        { name: 'Custom', code: 'CUSTOM' } as never,
        USER_ID,
      );

      expect(result.code).toBe('CUSTOM');
      expect(prisma.referralLink.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ code: 'CUSTOM' }),
        }),
      );
    });

    it('generates random code when none provided', async () => {
      prisma.referralLink.count.mockResolvedValue(0);
      prisma.referralLink.create.mockImplementation(({ data }: { data: { code: string } }) =>
        Promise.resolve(makeLink({ code: data.code })),
      );

      const result = await service.createLink(
        TENANT_ID,
        { name: 'Auto Code' } as never,
        USER_ID,
      );

      expect(result.code).toMatch(/^[0-9A-F]{8}$/);
    });

    it('throws BadRequestException when daily limit reached', async () => {
      prisma.referralLink.count.mockResolvedValue(10);

      await expect(
        service.createLink(TENANT_ID, { name: 'Too Many' } as never, USER_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('allows creating when 9 links exist (under limit)', async () => {
      prisma.referralLink.count.mockResolvedValue(9);
      prisma.referralLink.create.mockResolvedValue(makeLink());

      await expect(
        service.createLink(TENANT_ID, { name: 'OK' } as never, USER_ID),
      ).resolves.toBeDefined();
    });

    it('sets expiresAt when provided in dto', async () => {
      prisma.referralLink.count.mockResolvedValue(0);
      prisma.referralLink.create.mockResolvedValue(makeLink());

      await service.createLink(
        TENANT_ID,
        { name: 'Expiring', expiresAt: '2026-12-31T00:00:00Z' } as never,
        USER_ID,
      );

      expect(prisma.referralLink.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            expiresAt: new Date('2026-12-31T00:00:00Z'),
          }),
        }),
      );
    });
  });

  // ---------- updateLink ----------

  describe('updateLink', () => {
    it('updates an existing link', async () => {
      prisma.referralLink.findUnique.mockResolvedValue(makeLink());
      prisma.referralLink.update.mockResolvedValue(makeLink({ name: 'Updated' }));

      const result = await service.updateLink(LINK_ID, { name: 'Updated' } as never);

      expect(result.name).toBe('Updated');
    });

    it('throws NotFoundException when link does not exist', async () => {
      prisma.referralLink.findUnique.mockResolvedValue(null);

      await expect(
        service.updateLink('nonexistent', { name: 'X' } as never),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ---------- deleteLink ----------

  describe('deleteLink', () => {
    it('soft-deletes by setting isActive to false', async () => {
      prisma.referralLink.findUnique.mockResolvedValue(makeLink());
      prisma.referralLink.update.mockResolvedValue(makeLink({ isActive: false }));

      await service.deleteLink(LINK_ID);

      expect(prisma.referralLink.update).toHaveBeenCalledWith({
        where: { id: LINK_ID },
        data: { isActive: false },
      });
    });

    it('throws NotFoundException when link does not exist', async () => {
      prisma.referralLink.findUnique.mockResolvedValue(null);

      await expect(service.deleteLink('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ---------- getLinkAnalytics ----------

  describe('getLinkAnalytics', () => {
    it('returns analytics for a valid link', async () => {
      prisma.referralLink.findUnique.mockResolvedValue(makeLink({ usageCount: 42 }));

      const result = await service.getLinkAnalytics(LINK_ID);

      expect(result.usageCount).toBe(42);
      expect(result.code).toBe('ABCD1234');
    });

    it('throws NotFoundException when link does not exist', async () => {
      prisma.referralLink.findUnique.mockResolvedValue(null);

      await expect(service.getLinkAnalytics('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ---------- validateAndResolveReferralCode ----------

  describe('validateAndResolveReferralCode', () => {
    it('returns link ID for valid active code', async () => {
      prisma.referralLink.findUnique.mockResolvedValue(makeLink());

      const result = await service.validateAndResolveReferralCode(TENANT_ID, 'ABCD1234');

      expect(result).toBe(LINK_ID);
    });

    it('returns null for nonexistent code', async () => {
      prisma.referralLink.findUnique.mockResolvedValue(null);

      const result = await service.validateAndResolveReferralCode(TENANT_ID, 'NOPE');

      expect(result).toBeNull();
    });

    it('returns null for inactive link', async () => {
      prisma.referralLink.findUnique.mockResolvedValue(makeLink({ isActive: false }));

      const result = await service.validateAndResolveReferralCode(TENANT_ID, 'ABCD1234');

      expect(result).toBeNull();
    });

    it('returns null for expired link', async () => {
      prisma.referralLink.findUnique.mockResolvedValue(
        makeLink({ expiresAt: new Date('2020-01-01') }),
      );

      const result = await service.validateAndResolveReferralCode(TENANT_ID, 'ABCD1234');

      expect(result).toBeNull();
    });

    it('returns link ID when expiresAt is in the future', async () => {
      prisma.referralLink.findUnique.mockResolvedValue(
        makeLink({ expiresAt: new Date('2030-01-01') }),
      );

      const result = await service.validateAndResolveReferralCode(TENANT_ID, 'ABCD1234');

      expect(result).toBe(LINK_ID);
    });
  });

  // ---------- incrementUsageCount ----------

  describe('incrementUsageCount', () => {
    it('increments usage count by 1', async () => {
      prisma.referralLink.update.mockResolvedValue(makeLink({ usageCount: 1 }));

      await service.incrementUsageCount(LINK_ID);

      expect(prisma.referralLink.update).toHaveBeenCalledWith({
        where: { id: LINK_ID },
        data: { usageCount: { increment: 1 } },
      });
    });
  });
});
