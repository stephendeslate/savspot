import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { RecommendationsService } from '@/recommendations/recommendations.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const USER_ID = 'user-001';
const REC_ID = 'rec-001';
const SERVICE_ID = 'service-001';

function makePrisma() {
  return {
    clientRecommendation: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    recommendationModel: {
      create: vi.fn(),
    },
    $queryRaw: vi.fn(),
  };
}

function makeRecommendation(overrides: Record<string, unknown> = {}) {
  return {
    id: REC_ID,
    userId: USER_ID,
    tenantId: TENANT_ID,
    serviceId: SERVICE_ID,
    score: { toNumber: () => 0.85 },
    reason: 'Popular in your category',
    clicked: false,
    impressions: 0,
    expiresAt: new Date('2026-04-15T00:00:00Z'),
    service: {
      id: SERVICE_ID,
      name: 'Deep Tissue Massage',
      basePrice: { toNumber: () => 120 },
      currency: 'USD',
    },
    user: { id: USER_ID, name: 'Jane Doe', email: 'jane@test.com' },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('RecommendationsService', () => {
  let service: RecommendationsService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new RecommendationsService(prisma as never);
  });

  // -------------------------------------------------------------------------
  // getUpsellRecommendations
  // -------------------------------------------------------------------------

  describe('getUpsellRecommendations', () => {
    it('should return empty array when no recommendations exist', async () => {
      prisma.clientRecommendation.findMany.mockResolvedValue([]);

      const result = await service.getUpsellRecommendations(TENANT_ID);

      expect(result).toEqual([]);
      expect(prisma.clientRecommendation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: TENANT_ID }),
          orderBy: { score: 'desc' },
        }),
      );
    });

    it('should group recommendations by service and sort by total score', async () => {
      const rec1 = makeRecommendation({ score: { toNumber: () => 0.9 } });
      const rec2 = makeRecommendation({
        id: 'rec-002',
        userId: 'user-002',
        score: { toNumber: () => 0.7 },
        user: { id: 'user-002', name: 'Bob', email: 'bob@test.com' },
      });
      const rec3 = makeRecommendation({
        id: 'rec-003',
        serviceId: 'service-002',
        score: { toNumber: () => 0.5 },
        service: {
          id: 'service-002',
          name: 'Facial',
          basePrice: { toNumber: () => 80 },
          currency: 'USD',
        },
      });

      prisma.clientRecommendation.findMany.mockResolvedValue([rec1, rec2, rec3]);

      const result = await service.getUpsellRecommendations(TENANT_ID);

      expect(result).toHaveLength(2);
      // First group (service-001) has total 1.6, second (service-002) has 0.5
      expect(result[0]!.serviceId).toBe(SERVICE_ID);
      expect(result[0]!.totalScore).toBe(1.6);
      expect(result[0]!.count).toBe(2);
      expect(result[0]!.clients).toHaveLength(2);
      expect(result[1]!.serviceId).toBe('service-002');
      expect(result[1]!.totalScore).toBe(0.5);
    });
  });

  // -------------------------------------------------------------------------
  // getClientRecommendations
  // -------------------------------------------------------------------------

  describe('getClientRecommendations', () => {
    it('should return recommendations for a specific client', async () => {
      const rec = makeRecommendation();
      prisma.clientRecommendation.findMany.mockResolvedValue([rec]);

      const result = await service.getClientRecommendations(USER_ID, TENANT_ID);

      expect(result).toHaveLength(1);
      expect(prisma.clientRecommendation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: USER_ID,
            tenantId: TENANT_ID,
          }),
          orderBy: { score: 'desc' },
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // trackClick
  // -------------------------------------------------------------------------

  describe('trackClick', () => {
    it('should mark recommendation as clicked and increment impressions', async () => {
      prisma.clientRecommendation.findUnique.mockResolvedValue(makeRecommendation());
      const updated = makeRecommendation({ clicked: true, impressions: 1 });
      prisma.clientRecommendation.update.mockResolvedValue(updated);

      const result = await service.trackClick(REC_ID);

      expect(result.clicked).toBe(true);
      expect(prisma.clientRecommendation.update).toHaveBeenCalledWith({
        where: { id: REC_ID },
        data: {
          clicked: true,
          impressions: { increment: 1 },
        },
      });
    });

    it('should throw NotFoundException for non-existent recommendation', async () => {
      prisma.clientRecommendation.findUnique.mockResolvedValue(null);

      await expect(service.trackClick('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // -------------------------------------------------------------------------
  // computeServiceAffinity
  // -------------------------------------------------------------------------

  describe('computeServiceAffinity', () => {
    it('should create recommendation models for affinity pairs', async () => {
      prisma.$queryRaw.mockResolvedValue([
        { service_a: 'svc-1', service_b: 'svc-2', co_occurrence: BigInt(5), tenant_id: TENANT_ID },
      ]);
      prisma.recommendationModel.create.mockResolvedValue({});

      await service.computeServiceAffinity(TENANT_ID);

      expect(prisma.recommendationModel.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'SERVICE_AFFINITY',
          modelData: expect.objectContaining({
            serviceA: 'svc-1',
            serviceB: 'svc-2',
            coOccurrence: 5,
          }),
          trainingSize: 5,
        }),
      });
    });

    it('should handle empty results without creating models', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      await service.computeServiceAffinity();

      expect(prisma.recommendationModel.create).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // computeClientPreferences
  // -------------------------------------------------------------------------

  describe('computeClientPreferences', () => {
    it('should create client recommendations from popular services', async () => {
      prisma.$queryRaw.mockResolvedValue([
        {
          user_id: USER_ID,
          tenant_id: TENANT_ID,
          service_id: SERVICE_ID,
          category_id: 'cat-1',
          service_name: 'Swedish Massage',
          booking_count: BigInt(10),
        },
      ]);
      prisma.clientRecommendation.create.mockResolvedValue({});

      await service.computeClientPreferences(TENANT_ID);

      expect(prisma.clientRecommendation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: USER_ID,
          tenantId: TENANT_ID,
          serviceId: SERVICE_ID,
          score: 1, // 10/10 = 1.0 since it's the max
          reason: expect.stringContaining('Swedish Massage'),
        }),
      });
    });

    it('should normalize scores when multiple rows exist', async () => {
      prisma.$queryRaw.mockResolvedValue([
        {
          user_id: USER_ID,
          tenant_id: TENANT_ID,
          service_id: 'svc-a',
          category_id: 'cat-1',
          service_name: 'A',
          booking_count: BigInt(10),
        },
        {
          user_id: USER_ID,
          tenant_id: TENANT_ID,
          service_id: 'svc-b',
          category_id: 'cat-1',
          service_name: 'B',
          booking_count: BigInt(5),
        },
      ]);
      prisma.clientRecommendation.create.mockResolvedValue({});

      await service.computeClientPreferences();

      // First call: score = 10/10 = 1.0
      expect(prisma.clientRecommendation.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          data: expect.objectContaining({ score: 1 }),
        }),
      );
      // Second call: score = 5/10 = 0.5
      expect(prisma.clientRecommendation.create).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          data: expect.objectContaining({ score: 0.5 }),
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // cleanupExpired
  // -------------------------------------------------------------------------

  describe('cleanupExpired', () => {
    it('should delete expired recommendations', async () => {
      prisma.clientRecommendation.deleteMany.mockResolvedValue({ count: 3 });

      await service.cleanupExpired();

      expect(prisma.clientRecommendation.deleteMany).toHaveBeenCalledWith({
        where: { expiresAt: { lt: expect.any(Date) } },
      });
    });
  });
});
