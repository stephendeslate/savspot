import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PartnerPayoutService } from '@/partners/partner-payout.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PARTNER_ID = 'partner-001';

// Simple Decimal stub matching the mock
class Dec {
  private v: number;
  constructor(val: number | string) {
    this.v = typeof val === 'string' ? parseFloat(val) : val;
  }
  toNumber() { return this.v; }
  toString() { return String(this.v); }
  minus(other: Dec) { return new Dec(this.v - other.toNumber()); }
  lt(other: Dec) { return this.v < other.toNumber(); }
  gte(other: Dec) { return this.v >= other.toNumber(); }
}

function makePrisma() {
  const prisma = {
    partner: {
      findMany: vi.fn(),
    },
    partnerPayout: {
      findMany: vi.fn(),
      createMany: vi.fn(),
      groupBy: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  // $transaction executes the callback with the prisma mock as the tx client
  prisma.$transaction.mockImplementation((fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma));
  return prisma;
}

function makeEligiblePartner(overrides: Record<string, unknown> = {}) {
  return {
    id: PARTNER_ID,
    status: 'APPROVED',
    totalEarnings: new Dec(200),
    createdAt: new Date('2026-01-01'),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('PartnerPayoutService', () => {
  let service: PartnerPayoutService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new PartnerPayoutService(prisma as never);
  });

  // -------------------------------------------------------------------------
  // processPayoutBatch
  // -------------------------------------------------------------------------

  describe('processPayoutBatch', () => {
    it('should create payouts for eligible partners', async () => {
      const partner = makeEligiblePartner();
      prisma.partner.findMany.mockResolvedValue([partner]);
      // No previous payouts, no paid sums
      prisma.partnerPayout.findMany.mockResolvedValue([]);
      prisma.partnerPayout.groupBy.mockResolvedValue([]);
      prisma.partnerPayout.createMany.mockResolvedValue({ count: 1 });

      const result = await service.processPayoutBatch();

      expect(result.processed).toBe(1);
      expect(result.payouts).toHaveLength(1);
      expect(prisma.partnerPayout.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            partnerId: PARTNER_ID,
            currency: 'USD',
            status: 'PENDING',
          }),
        ]),
      });
    });

    it('should skip partners below payout threshold after deducting previous payouts', async () => {
      const partner = makeEligiblePartner({ totalEarnings: new Dec(100) });
      prisma.partner.findMany.mockResolvedValue([partner]);
      prisma.partnerPayout.findMany.mockResolvedValue([
        { partnerId: PARTNER_ID, periodEnd: new Date('2026-02-01') },
      ]);
      prisma.partnerPayout.groupBy.mockResolvedValue([
        { partnerId: PARTNER_ID, _sum: { amount: new Dec(60) } },
      ]);

      const result = await service.processPayoutBatch();

      // 100 - 60 = 40, below threshold of 50
      expect(result.processed).toBe(0);
      expect(prisma.partnerPayout.createMany).not.toHaveBeenCalled();
    });

    it('should return empty results when no eligible partners', async () => {
      prisma.partner.findMany.mockResolvedValue([]);

      const result = await service.processPayoutBatch();

      expect(result).toEqual({ processed: 0, payouts: [] });
    });

    it('should use partner createdAt when no previous payout exists', async () => {
      const partner = makeEligiblePartner();
      prisma.partner.findMany.mockResolvedValue([partner]);
      prisma.partnerPayout.findMany.mockResolvedValue([]); // no previous payouts
      prisma.partnerPayout.groupBy.mockResolvedValue([]);
      prisma.partnerPayout.createMany.mockResolvedValue({ count: 1 });

      await service.processPayoutBatch();

      expect(prisma.partnerPayout.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            periodStart: partner.createdAt,
          }),
        ]),
      });
    });
  });

  // -------------------------------------------------------------------------
  // getPayoutHistory
  // -------------------------------------------------------------------------

  describe('getPayoutHistory', () => {
    it('should return payouts ordered by createdAt desc', async () => {
      const payouts = [{ id: 'p1' }, { id: 'p2' }];
      prisma.partnerPayout.findMany.mockResolvedValue(payouts);

      const result = await service.getPayoutHistory(PARTNER_ID);

      expect(result).toEqual(payouts);
      expect(prisma.partnerPayout.findMany).toHaveBeenCalledWith({
        where: { partnerId: PARTNER_ID },
        orderBy: { createdAt: 'desc' },
      });
    });
  });
});
