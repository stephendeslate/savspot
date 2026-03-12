import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChurnRiskService } from '@/recommendations/churn-risk.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const CLIENT_ID = 'client-001';

function makePrisma() {
  return {
    churnRiskScore: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    $queryRaw: vi.fn(),
    $transaction: vi.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  };
}

function makeChurnScore(overrides: Record<string, unknown> = {}) {
  return {
    clientId: CLIENT_ID,
    tenantId: TENANT_ID,
    riskLevel: 'MEDIUM',
    score: { toNumber: () => 0.45 },
    factors: { daysSinceLast: 30, medianIntervalDays: 28 },
    lastBooking: new Date('2026-02-01'),
    expectedNext: new Date('2026-03-01'),
    computedAt: new Date(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('ChurnRiskService', () => {
  let service: ChurnRiskService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new ChurnRiskService(prisma as never);
  });

  // -------------------------------------------------------------------------
  // getClientChurnRisk
  // -------------------------------------------------------------------------

  describe('getClientChurnRisk', () => {
    it('should return score when it exists', async () => {
      const score = makeChurnScore();
      prisma.churnRiskScore.findUnique.mockResolvedValue(score);

      const result = await service.getClientChurnRisk(CLIENT_ID, TENANT_ID);

      expect(result).toBe(score);
      expect(prisma.churnRiskScore.findUnique).toHaveBeenCalledWith({
        where: { clientId_tenantId: { clientId: CLIENT_ID, tenantId: TENANT_ID } },
      });
    });

    it('should return null fields when no score exists', async () => {
      prisma.churnRiskScore.findUnique.mockResolvedValue(null);

      const result = await service.getClientChurnRisk(CLIENT_ID, TENANT_ID);

      expect(result).toEqual({
        clientId: CLIENT_ID,
        tenantId: TENANT_ID,
        riskLevel: null,
        score: null,
      });
    });
  });

  // -------------------------------------------------------------------------
  // getAtRiskClients
  // -------------------------------------------------------------------------

  describe('getAtRiskClients', () => {
    it('should filter by MEDIUM and above when no minLevel given', async () => {
      prisma.churnRiskScore.findMany.mockResolvedValue([]);

      await service.getAtRiskClients(TENANT_ID);

      expect(prisma.churnRiskScore.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: TENANT_ID,
          riskLevel: { in: expect.arrayContaining(['MEDIUM', 'HIGH', 'CRITICAL']) },
        },
        orderBy: { score: 'desc' },
      });
    });

    it('should filter by HIGH and above when minLevel is HIGH', async () => {
      prisma.churnRiskScore.findMany.mockResolvedValue([]);

      await service.getAtRiskClients(TENANT_ID, 'HIGH');

      expect(prisma.churnRiskScore.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: TENANT_ID,
          riskLevel: { in: expect.arrayContaining(['HIGH', 'CRITICAL']) },
        },
        orderBy: { score: 'desc' },
      });
    });

    it('should include only CRITICAL when minLevel is CRITICAL', async () => {
      prisma.churnRiskScore.findMany.mockResolvedValue([]);

      await service.getAtRiskClients(TENANT_ID, 'CRITICAL');

      expect(prisma.churnRiskScore.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: TENANT_ID,
          riskLevel: { in: ['CRITICAL'] },
        },
        orderBy: { score: 'desc' },
      });
    });

    it('should default to MEDIUM when invalid minLevel given', async () => {
      prisma.churnRiskScore.findMany.mockResolvedValue([]);

      await service.getAtRiskClients(TENANT_ID, 'INVALID');

      expect(prisma.churnRiskScore.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: TENANT_ID,
          riskLevel: { in: expect.arrayContaining(['MEDIUM', 'HIGH', 'CRITICAL']) },
        },
        orderBy: { score: 'desc' },
      });
    });
  });

  // -------------------------------------------------------------------------
  // computeChurnRisk
  // -------------------------------------------------------------------------

  describe('computeChurnRisk', () => {
    it('should upsert scores for returned rows', async () => {
      const lastBooking = new Date('2026-01-15');
      prisma.$queryRaw.mockResolvedValue([
        {
          client_id: CLIENT_ID,
          tenant_id: TENANT_ID,
          last_booking: lastBooking,
          median_interval_days: 20,
          days_since_last: 25,
        },
      ]);
      prisma.churnRiskScore.upsert.mockResolvedValue({});

      await service.computeChurnRisk();

      // score = 25 / (1.5 * 20) = 25/30 = 0.8333
      expect(prisma.churnRiskScore.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            clientId_tenantId: {
              clientId: CLIENT_ID,
              tenantId: TENANT_ID,
            },
          },
          create: expect.objectContaining({
            clientId: CLIENT_ID,
            tenantId: TENANT_ID,
            riskLevel: 'HIGH', // 0.8333 >= 0.6, < 0.85
          }),
          update: expect.objectContaining({
            riskLevel: 'HIGH',
          }),
        }),
      );
    });

    it('should skip rows with zero median interval', async () => {
      prisma.$queryRaw.mockResolvedValue([
        {
          client_id: CLIENT_ID,
          tenant_id: TENANT_ID,
          last_booking: new Date(),
          median_interval_days: 0,
          days_since_last: 10,
        },
      ]);

      await service.computeChurnRisk();

      expect(prisma.churnRiskScore.upsert).not.toHaveBeenCalled();
    });

    it('should cap score at 1.0 for very overdue clients', async () => {
      prisma.$queryRaw.mockResolvedValue([
        {
          client_id: CLIENT_ID,
          tenant_id: TENANT_ID,
          last_booking: new Date('2025-01-01'),
          median_interval_days: 7,
          days_since_last: 100,
        },
      ]);
      prisma.churnRiskScore.upsert.mockResolvedValue({});

      await service.computeChurnRisk();

      expect(prisma.churnRiskScore.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            riskLevel: 'CRITICAL', // score capped at 1.0
          }),
        }),
      );
    });

    it('should handle empty query results', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      await service.computeChurnRisk();

      expect(prisma.churnRiskScore.upsert).not.toHaveBeenCalled();
    });
  });
});
