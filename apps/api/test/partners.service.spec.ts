import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { PartnersService } from '@/partners/partners.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const USER_ID = 'user-001';
const PARTNER_ID = 'partner-001';
const TENANT_ID = 'tenant-001';

function makePrisma() {
  return {
    partner: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    partnerReferral: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    partnerPayout: {
      findMany: vi.fn(),
    },
  };
}

function makePartner(overrides: Record<string, unknown> = {}) {
  return {
    id: PARTNER_ID,
    userId: USER_ID,
    type: 'REFERRAL',
    companyName: 'Acme Corp',
    companyUrl: null,
    status: 'APPROVED',
    referralCode: 'abc12345',
    tier: 'STANDARD',
    totalReferrals: 5,
    totalEarnings: { toNumber: () => 100 },
    commissionRate: { toNumber: () => 0.10 },
    createdAt: new Date('2026-01-01'),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('PartnersService', () => {
  let service: PartnersService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new PartnersService(prisma as never);
  });

  // -------------------------------------------------------------------------
  // apply
  // -------------------------------------------------------------------------

  describe('apply', () => {
    it('should create a new partner application', async () => {
      prisma.partner.findUnique.mockResolvedValue(null);
      const created = makePartner({ status: 'PENDING' });
      prisma.partner.create.mockResolvedValue(created);

      const result = await service.apply(USER_ID, {
        type: 'REFERRAL' as never,
        companyName: 'Acme Corp',
      });

      expect(result.id).toBe(PARTNER_ID);
      expect(prisma.partner.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: USER_ID,
          type: 'REFERRAL',
          companyName: 'Acme Corp',
          status: 'PENDING',
          referralCode: expect.any(String),
        }),
      });
    });

    it('should throw ConflictException when user already has a partner app', async () => {
      prisma.partner.findUnique.mockResolvedValue(makePartner());

      await expect(
        service.apply(USER_ID, {
          type: 'REFERRAL' as never,
          companyName: 'Acme Corp',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // -------------------------------------------------------------------------
  // getPartnerByUserId
  // -------------------------------------------------------------------------

  describe('getPartnerByUserId', () => {
    it('should return partner with referral and payout counts', async () => {
      const partner = {
        ...makePartner(),
        _count: { referredTenants: 5, payouts: 2 },
      };
      prisma.partner.findUnique.mockResolvedValue(partner);

      const result = await service.getPartnerByUserId(USER_ID);

      expect(result._count.referredTenants).toBe(5);
    });

    it('should throw NotFoundException when partner does not exist', async () => {
      prisma.partner.findUnique.mockResolvedValue(null);

      await expect(service.getPartnerByUserId(USER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // -------------------------------------------------------------------------
  // getReferralLink
  // -------------------------------------------------------------------------

  describe('getReferralLink', () => {
    it('should return formatted referral link', async () => {
      prisma.partner.findUnique.mockResolvedValue({ referralCode: 'xyz789' });

      const result = await service.getReferralLink(PARTNER_ID);

      expect(result).toEqual({
        referralLink: 'https://savspot.co/signup?partner=xyz789',
        referralCode: 'xyz789',
      });
    });

    it('should throw NotFoundException when partner not found', async () => {
      prisma.partner.findUnique.mockResolvedValue(null);

      await expect(service.getReferralLink('bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // -------------------------------------------------------------------------
  // listPartners
  // -------------------------------------------------------------------------

  describe('listPartners', () => {
    it('should return all partners when no status filter', async () => {
      const partners = [makePartner()];
      prisma.partner.findMany.mockResolvedValue(partners);
      prisma.partner.count.mockResolvedValue(1);

      const result = await service.listPartners();

      expect(result).toEqual({ data: partners, meta: { total: 1 } });
    });

    it('should filter by status when provided', async () => {
      prisma.partner.findMany.mockResolvedValue([]);
      prisma.partner.count.mockResolvedValue(0);

      await service.listPartners('PENDING');

      expect(prisma.partner.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'PENDING' },
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // updatePartnerStatus
  // -------------------------------------------------------------------------

  describe('updatePartnerStatus', () => {
    it('should set approvedAt when status is APPROVED', async () => {
      prisma.partner.findUnique.mockResolvedValue(makePartner({ status: 'PENDING' }));
      prisma.partner.update.mockResolvedValue(makePartner());

      await service.updatePartnerStatus(PARTNER_ID, 'APPROVED', 'admin-001');

      expect(prisma.partner.update).toHaveBeenCalledWith({
        where: { id: PARTNER_ID },
        data: expect.objectContaining({
          status: 'APPROVED',
          approvedAt: expect.any(Date),
          approvedBy: 'admin-001',
        }),
      });
    });

    it('should not set approvedAt for non-APPROVED status', async () => {
      prisma.partner.findUnique.mockResolvedValue(makePartner());
      prisma.partner.update.mockResolvedValue(makePartner({ status: 'SUSPENDED' }));

      await service.updatePartnerStatus(PARTNER_ID, 'SUSPENDED');

      expect(prisma.partner.update).toHaveBeenCalledWith({
        where: { id: PARTNER_ID },
        data: { status: 'SUSPENDED' },
      });
    });

    it('should throw NotFoundException when partner not found', async () => {
      prisma.partner.findUnique.mockResolvedValue(null);

      await expect(
        service.updatePartnerStatus('bad-id', 'APPROVED'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // -------------------------------------------------------------------------
  // recordReferral
  // -------------------------------------------------------------------------

  describe('recordReferral', () => {
    it('should create referral and increment totalReferrals', async () => {
      const referral = { id: 'ref-001', partnerId: PARTNER_ID, tenantId: TENANT_ID };
      prisma.partnerReferral.create.mockResolvedValue(referral);
      prisma.partner.update.mockResolvedValue(
        makePartner({ totalReferrals: 6 }),
      );

      const result = await service.recordReferral(PARTNER_ID, TENANT_ID);

      expect(result).toEqual(referral);
      expect(prisma.partner.update).toHaveBeenCalledWith({
        where: { id: PARTNER_ID },
        data: { totalReferrals: { increment: 1 } },
      });
    });

    it('should promote to SILVER at 10 referrals', async () => {
      prisma.partnerReferral.create.mockResolvedValue({});
      prisma.partner.update
        .mockResolvedValueOnce(makePartner({ totalReferrals: 10, tier: 'STANDARD' }))
        .mockResolvedValueOnce(makePartner({ tier: 'SILVER' }));

      await service.recordReferral(PARTNER_ID, TENANT_ID);

      expect(prisma.partner.update).toHaveBeenCalledWith({
        where: { id: PARTNER_ID },
        data: { tier: 'SILVER' },
      });
    });

    it('should promote to GOLD at 50 referrals', async () => {
      prisma.partnerReferral.create.mockResolvedValue({});
      prisma.partner.update
        .mockResolvedValueOnce(makePartner({ totalReferrals: 50, tier: 'SILVER' }))
        .mockResolvedValueOnce(makePartner({ tier: 'GOLD' }));

      await service.recordReferral(PARTNER_ID, TENANT_ID);

      expect(prisma.partner.update).toHaveBeenCalledWith({
        where: { id: PARTNER_ID },
        data: { tier: 'GOLD' },
      });
    });

    it('should not promote when already at GOLD tier', async () => {
      prisma.partnerReferral.create.mockResolvedValue({});
      prisma.partner.update.mockResolvedValue(
        makePartner({ totalReferrals: 60, tier: 'GOLD' }),
      );

      await service.recordReferral(PARTNER_ID, TENANT_ID);

      // Only one update call (the increment), no tier update
      expect(prisma.partner.update).toHaveBeenCalledTimes(1);
    });
  });
});
