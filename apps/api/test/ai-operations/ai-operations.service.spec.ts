import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { AiOperationsService } from '@/ai-operations/ai-operations.service';

function decimal(val: number) {
  return { toNumber: () => val, toString: () => String(val) };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const INSIGHT_ID = 'insight-001';
const CLIENT_ID = 'client-001';
const USER_ID = 'user-001';

function makePrisma() {
  return {
    slotDemandInsight: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    booking: {
      findFirst: vi.fn(),
      groupBy: vi.fn(),
    },
    clientProfile: {
      findUnique: vi.fn(),
    },
    tenant: {
      findUnique: vi.fn(),
    },
    categoryBenchmark: {
      findMany: vi.fn(),
    },
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('AiOperationsService', () => {
  let service: AiOperationsService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new AiOperationsService(prisma as never);
  });

  // -----------------------------------------------------------------------
  // getSlotDemandInsights
  // -----------------------------------------------------------------------

  describe('getSlotDemandInsights', () => {
    it('should return active non-dismissed non-expired insights', async () => {
      const insights = [{ id: INSIGHT_ID, isDismissed: false }];
      prisma.slotDemandInsight.findMany.mockResolvedValue(insights);

      const result = await service.getSlotDemandInsights(TENANT_ID);

      expect(result).toEqual(insights);
      const call = prisma.slotDemandInsight.findMany.mock.calls[0]![0];
      expect(call.where.tenantId).toBe(TENANT_ID);
      expect(call.where.isDismissed).toBe(false);
      expect(call.where.expiresAt.gt).toBeInstanceOf(Date);
    });
  });

  // -----------------------------------------------------------------------
  // dismissInsight
  // -----------------------------------------------------------------------

  describe('dismissInsight', () => {
    it('should dismiss an existing insight', async () => {
      const insight = { id: INSIGHT_ID, tenantId: TENANT_ID };
      prisma.slotDemandInsight.findFirst.mockResolvedValue(insight);
      prisma.slotDemandInsight.update.mockResolvedValue({
        ...insight,
        isDismissed: true,
        dismissedBy: USER_ID,
      });

      const result = await service.dismissInsight(TENANT_ID, INSIGHT_ID, USER_ID);

      expect(result.isDismissed).toBe(true);
      expect(result.dismissedBy).toBe(USER_ID);
      expect(prisma.slotDemandInsight.update).toHaveBeenCalledWith({
        where: { id: INSIGHT_ID },
        data: { isDismissed: true, dismissedBy: USER_ID },
      });
    });

    it('should throw NotFoundException when insight not found', async () => {
      prisma.slotDemandInsight.findFirst.mockResolvedValue(null);

      await expect(
        service.dismissInsight(TENANT_ID, INSIGHT_ID, USER_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // -----------------------------------------------------------------------
  // getClientRisk
  // -----------------------------------------------------------------------

  describe('getClientRisk', () => {
    it('should return risk data for client with scored booking', async () => {
      prisma.booking.findFirst.mockResolvedValue({
        id: 'booking-001',
        startTime: new Date('2026-04-01T10:00:00Z'),
        noShowRiskScore: decimal(0.75),
        service: { name: 'Haircut' },
      });

      const result = await service.getClientRisk(TENANT_ID, CLIENT_ID);

      expect(result.bookingId).toBe('booking-001');
      expect(result.riskTier).toBe('HIGH');
    });

    it('should return null fields when no scored booking exists', async () => {
      prisma.booking.findFirst.mockResolvedValue(null);

      const result = await service.getClientRisk(TENANT_ID, CLIENT_ID);

      expect(result.bookingId).toBeNull();
      expect(result.riskScore).toBeNull();
      expect(result.riskTier).toBeNull();
    });

    it('should classify LOW risk correctly', async () => {
      prisma.booking.findFirst.mockResolvedValue({
        id: 'booking-001',
        startTime: new Date('2026-04-01T10:00:00Z'),
        noShowRiskScore: decimal(0.15),
        service: { name: 'Haircut' },
      });

      const result = await service.getClientRisk(TENANT_ID, CLIENT_ID);
      expect(result.riskTier).toBe('LOW');
    });

    it('should classify MEDIUM risk correctly', async () => {
      prisma.booking.findFirst.mockResolvedValue({
        id: 'booking-001',
        startTime: new Date('2026-04-01T10:00:00Z'),
        noShowRiskScore: decimal(0.45),
        service: { name: 'Haircut' },
      });

      const result = await service.getClientRisk(TENANT_ID, CLIENT_ID);
      expect(result.riskTier).toBe('MEDIUM');
    });
  });

  // -----------------------------------------------------------------------
  // getClientRebooking
  // -----------------------------------------------------------------------

  describe('getClientRebooking', () => {
    it('should return rebooking data from client profile', async () => {
      prisma.clientProfile.findUnique.mockResolvedValue({
        rebookingIntervalDays: 30,
        optimalReminderLeadHours: decimal(24),
      });

      const result = await service.getClientRebooking(TENANT_ID, CLIENT_ID);

      expect(result.rebookingIntervalDays).toBe(30);
      expect(result.optimalReminderLeadHours).toBeDefined();
    });

    it('should return nulls when no profile exists', async () => {
      prisma.clientProfile.findUnique.mockResolvedValue(null);

      const result = await service.getClientRebooking(TENANT_ID, CLIENT_ID);

      expect(result.rebookingIntervalDays).toBeNull();
      expect(result.optimalReminderLeadHours).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // getBenchmarks
  // -----------------------------------------------------------------------

  describe('getBenchmarks', () => {
    it('should return benchmarks for tenant category', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        category: 'SALON',
        benchmarkOptOut: false,
      });
      const benchmarks = [
        { metricKey: 'no_show_rate', p25: 0.05, p50: 0.1, p75: 0.2 },
      ];
      prisma.categoryBenchmark.findMany.mockResolvedValue(benchmarks);

      const result = await service.getBenchmarks(TENANT_ID);

      expect(result.optedOut).toBe(false);
      expect(result.benchmarks).toEqual(benchmarks);
    });

    it('should return opted out when tenant has benchmarkOptOut', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        category: 'SALON',
        benchmarkOptOut: true,
      });

      const result = await service.getBenchmarks(TENANT_ID);

      expect(result.optedOut).toBe(true);
      expect(result.benchmarks).toEqual([]);
    });

    it('should throw NotFoundException when tenant not found', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(service.getBenchmarks(TENANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
