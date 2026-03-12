import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnalyticsQueryService } from '@/analytics/services/analytics-query.service';
import { BookingFlowTrackerService } from '@/analytics/services/booking-flow-tracker.service';
import { ExportService } from '@/analytics/services/export.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const DATE_RANGE = {
  from: new Date('2026-01-01'),
  to: new Date('2026-03-01'),
};

function makePrisma() {
  return {
    booking: {
      groupBy: vi.fn(),
      aggregate: vi.fn(),
    },
    bookingFlowAnalytics: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    tenant: {
      findUnique: vi.fn(),
    },
    categoryBenchmark: {
      findMany: vi.fn(),
    },
    $queryRaw: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// AnalyticsQueryService
// ---------------------------------------------------------------------------

describe('AnalyticsQueryService', () => {
  let service: AnalyticsQueryService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new AnalyticsQueryService(prisma as never);
  });

  // -------------------------------------------------------------------------
  // getOverview
  // -------------------------------------------------------------------------

  describe('getOverview', () => {
    it('should compute KPIs from booking aggregates', async () => {
      prisma.booking.groupBy.mockResolvedValue([
        { status: 'COMPLETED', _count: { id: 40 } },
        { status: 'CANCELLED', _count: { id: 5 } },
        { status: 'NO_SHOW', _count: { id: 3 } },
        { status: 'IN_PROGRESS', _count: { id: 2 } },
      ]);
      prisma.booking.aggregate.mockResolvedValue({
        _sum: { totalAmount: { toNumber: () => 5000 } },
        _avg: { totalAmount: { toNumber: () => 100 } },
        _count: { id: 50 },
      });

      const result = await service.getOverview(TENANT_ID, DATE_RANGE, {});

      expect(result.totalBookings).toBe(50);
      expect(result.totalRevenue).toBe(5000);
      expect(result.avgBookingValue).toBe(100);
      expect(result.completedBookings).toBe(40);
      expect(result.cancelledBookings).toBe(5);
      // noShowRate = 3 / (40 + 3 + 2) = 3/45
      expect(result.noShowRate).toBeCloseTo(3 / 45);
    });

    it('should return zero values when no bookings exist', async () => {
      prisma.booking.groupBy.mockResolvedValue([]);
      prisma.booking.aggregate.mockResolvedValue({
        _sum: { totalAmount: null },
        _avg: { totalAmount: null },
        _count: { id: 0 },
      });

      const result = await service.getOverview(TENANT_ID, DATE_RANGE, {});

      expect(result.totalBookings).toBe(0);
      expect(result.totalRevenue).toBe(0);
      expect(result.noShowRate).toBe(0);
    });

    it('should apply service filter when provided', async () => {
      prisma.booking.groupBy.mockResolvedValue([]);
      prisma.booking.aggregate.mockResolvedValue({
        _sum: { totalAmount: null },
        _avg: { totalAmount: null },
        _count: { id: 0 },
      });

      await service.getOverview(TENANT_ID, DATE_RANGE, { serviceId: 'svc-1' });

      expect(prisma.booking.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ serviceId: 'svc-1' }),
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // getFunnelData
  // -------------------------------------------------------------------------

  describe('getFunnelData', () => {
    it('should return empty funnel when no analytics exist', async () => {
      prisma.bookingFlowAnalytics.findMany.mockResolvedValue([]);

      const result = await service.getFunnelData(TENANT_ID, DATE_RANGE);

      expect(result).toEqual({
        totalSessions: 0,
        completedSessions: 0,
        conversionRate: 0,
        avgCompletionTimeSec: 0,
        steps: [],
      });
    });

    it('should aggregate step metrics across multiple days', async () => {
      prisma.bookingFlowAnalytics.findMany.mockResolvedValue([
        {
          totalSessions: 100,
          completedSessions: 70,
          avgCompletionTimeSec: 120,
          stepMetrics: [
            { step: 'service', sessions: 100, dropOffs: 10 },
            { step: 'time', sessions: 90, dropOffs: 20 },
          ],
        },
        {
          totalSessions: 80,
          completedSessions: 50,
          avgCompletionTimeSec: 100,
          stepMetrics: [
            { step: 'service', sessions: 80, dropOffs: 5 },
            { step: 'time', sessions: 75, dropOffs: 25 },
          ],
        },
      ]);

      const result = await service.getFunnelData(TENANT_ID, DATE_RANGE);

      expect(result.totalSessions).toBe(180);
      expect(result.completedSessions).toBe(120);
      expect(result.conversionRate).toBeCloseTo(120 / 180);
      expect(result.steps).toHaveLength(2);
      expect(result.steps.find((s) => s.step === 'service')!.sessions).toBe(180);
    });

    it('should handle null stepMetrics gracefully', async () => {
      prisma.bookingFlowAnalytics.findMany.mockResolvedValue([
        {
          totalSessions: 10,
          completedSessions: 5,
          avgCompletionTimeSec: 60,
          stepMetrics: null,
        },
      ]);

      const result = await service.getFunnelData(TENANT_ID, DATE_RANGE);

      expect(result.steps).toEqual([]);
      expect(result.totalSessions).toBe(10);
    });
  });

  // -------------------------------------------------------------------------
  // getBenchmarks
  // -------------------------------------------------------------------------

  describe('getBenchmarks', () => {
    it('should return empty array when tenant opted out', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        category: 'BEAUTY',
        benchmarkOptOut: true,
      });

      const result = await service.getBenchmarks(TENANT_ID);

      expect(result).toEqual([]);
    });

    it('should return empty array when tenant not found', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      const result = await service.getBenchmarks(TENANT_ID);

      expect(result).toEqual([]);
    });

    it('should return benchmark comparisons', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        category: 'BEAUTY',
        benchmarkOptOut: false,
      });
      prisma.categoryBenchmark.findMany.mockResolvedValue([
        {
          metricKey: 'avg_booking_value',
          p25: { toNumber: () => 30 },
          p50: { toNumber: () => 50 },
          p75: { toNumber: () => 80 },
        },
      ]);
      // Mock getOverview dependencies
      prisma.booking.groupBy.mockResolvedValue([]);
      prisma.booking.aggregate.mockResolvedValue({
        _sum: { totalAmount: null },
        _avg: { totalAmount: null },
        _count: { id: 0 },
      });

      const result = await service.getBenchmarks(TENANT_ID);

      expect(result).toHaveLength(1);
      expect(result[0].metricKey).toBe('avg_booking_value');
      expect(result[0].p25).toBe(30);
      expect(result[0].p50).toBe(50);
      expect(result[0].p75).toBe(80);
    });
  });
});

// ---------------------------------------------------------------------------
// BookingFlowTrackerService
// ---------------------------------------------------------------------------

describe('BookingFlowTrackerService', () => {
  let service: BookingFlowTrackerService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new BookingFlowTrackerService(prisma as never);
  });

  describe('handleStepCompleted', () => {
    it('should create new analytics record when none exists', async () => {
      prisma.bookingFlowAnalytics.findUnique.mockResolvedValue(null);
      prisma.bookingFlowAnalytics.create.mockResolvedValue({});

      await service.handleStepCompleted({
        tenantId: TENANT_ID,
        sessionId: 'sess-1',
        flowId: 'flow-1',
        step: 'service',
        durationMs: 5000,
      });

      expect(prisma.bookingFlowAnalytics.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TENANT_ID,
          flowId: 'flow-1',
          totalSessions: 1,
          completedSessions: 0,
          stepMetrics: [
            {
              step: 'service',
              sessions: 1,
              dropOffs: 0,
              avgDurationMs: 5000,
            },
          ],
        }),
      });
    });

    it('should update existing step metrics when record exists', async () => {
      prisma.bookingFlowAnalytics.findUnique.mockResolvedValue({
        id: 'bfa-001',
        stepMetrics: [
          { step: 'service', sessions: 5, dropOffs: 1, avgDurationMs: 4000 },
        ],
      });
      prisma.bookingFlowAnalytics.update.mockResolvedValue({});

      await service.handleStepCompleted({
        tenantId: TENANT_ID,
        sessionId: 'sess-2',
        flowId: 'flow-1',
        step: 'service',
        durationMs: 6000,
      });

      expect(prisma.bookingFlowAnalytics.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'bfa-001' },
        }),
      );
    });

    it('should not throw on error and log instead', async () => {
      prisma.bookingFlowAnalytics.findUnique.mockRejectedValue(new Error('DB error'));

      // Should not throw
      await expect(
        service.handleStepCompleted({
          tenantId: TENANT_ID,
          sessionId: 'sess-1',
          flowId: 'flow-1',
          step: 'service',
          durationMs: 1000,
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe('handleSessionCompleted', () => {
    it('should create new record when none exists', async () => {
      prisma.bookingFlowAnalytics.findUnique.mockResolvedValue(null);
      prisma.bookingFlowAnalytics.create.mockResolvedValue({});

      await service.handleSessionCompleted({
        tenantId: TENANT_ID,
        sessionId: 'sess-1',
        flowId: 'flow-1',
        totalDurationMs: 30000,
        revenue: 100,
      });

      expect(prisma.bookingFlowAnalytics.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          completedSessions: 1,
          conversionRate: 1,
          avgCompletionTimeSec: 30,
          totalRevenue: 100,
        }),
      });
    });

    it('should update completion metrics when record exists', async () => {
      prisma.bookingFlowAnalytics.findUnique.mockResolvedValue({
        id: 'bfa-001',
        totalSessions: 10,
        completedSessions: 5,
        avgCompletionTimeSec: 60,
      });
      prisma.bookingFlowAnalytics.update.mockResolvedValue({});

      await service.handleSessionCompleted({
        tenantId: TENANT_ID,
        sessionId: 'sess-1',
        flowId: 'flow-1',
        totalDurationMs: 90000,
        revenue: 50,
      });

      expect(prisma.bookingFlowAnalytics.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            completedSessions: 6,
            totalRevenue: { increment: 50 },
          }),
        }),
      );
    });
  });

  describe('handleSessionAbandoned', () => {
    it('should increment dropOffs for the last step', async () => {
      prisma.bookingFlowAnalytics.findUnique.mockResolvedValue({
        id: 'bfa-001',
        totalSessions: 10,
        completedSessions: 5,
        stepMetrics: [
          { step: 'service', sessions: 10, dropOffs: 2, avgDurationMs: 3000 },
        ],
      });
      prisma.bookingFlowAnalytics.update.mockResolvedValue({});

      await service.handleSessionAbandoned({
        tenantId: TENANT_ID,
        sessionId: 'sess-1',
        flowId: 'flow-1',
        lastStep: 'service',
      });

      expect(prisma.bookingFlowAnalytics.update).toHaveBeenCalled();
    });

    it('should do nothing when no existing record', async () => {
      prisma.bookingFlowAnalytics.findUnique.mockResolvedValue(null);

      await service.handleSessionAbandoned({
        tenantId: TENANT_ID,
        sessionId: 'sess-1',
        flowId: 'flow-1',
        lastStep: 'service',
      });

      expect(prisma.bookingFlowAnalytics.update).not.toHaveBeenCalled();
    });
  });
});

// ---------------------------------------------------------------------------
// ExportService
// ---------------------------------------------------------------------------

describe('ExportService', () => {
  let service: ExportService;
  let analyticsQuery: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    analyticsQuery = {
      getOverview: vi.fn().mockResolvedValue({
        totalBookings: 10,
        totalRevenue: 1000,
        noShowRate: 0.1,
        avgBookingValue: 100,
        completedBookings: 8,
        cancelledBookings: 1,
      }),
      getRevenueTrends: vi.fn().mockResolvedValue([]),
      getBookingTrends: vi.fn().mockResolvedValue([]),
      getNoShowTrends: vi.fn().mockResolvedValue([]),
      getClientMetrics: vi.fn().mockResolvedValue({}),
      getFunnelData: vi.fn().mockResolvedValue({}),
      getUtilizationHeatmap: vi.fn().mockResolvedValue([]),
      getStaffPerformance: vi.fn().mockResolvedValue([]),
      getBenchmarks: vi.fn().mockResolvedValue([]),
    };
    service = new ExportService(analyticsQuery as never);
  });

  describe('exportCsv', () => {
    it('should return CSV buffer with overview data', async () => {
      const result = await service.exportCsv(
        TENANT_ID,
        ['overview'],
        DATE_RANGE,
        {},
      );

      expect(result.contentType).toBe('text/csv');
      expect(result.filename).toContain('analytics-');
      expect(result.filename).toContain('.csv');
      const content = result.data.toString('utf-8');
      expect(content).toContain('# overview');
      expect(content).toContain('totalBookings');
    });

    it('should handle array metric data', async () => {
      analyticsQuery.getRevenueTrends.mockResolvedValue([
        { period: '2026-01-01', revenue: 500, bookingCount: 5 },
      ]);

      const result = await service.exportCsv(
        TENANT_ID,
        ['revenue'],
        DATE_RANGE,
        {},
      );

      const content = result.data.toString('utf-8');
      expect(content).toContain('period,revenue,bookingCount');
    });

    it('should collect multiple metrics', async () => {
      await service.exportCsv(
        TENANT_ID,
        ['overview', 'revenue'],
        DATE_RANGE,
        {},
      );

      expect(analyticsQuery.getOverview).toHaveBeenCalled();
      expect(analyticsQuery.getRevenueTrends).toHaveBeenCalled();
    });
  });

  describe('exportJson', () => {
    it('should return JSON buffer with metadata', async () => {
      const result = await service.exportJson(
        TENANT_ID,
        ['overview'],
        DATE_RANGE,
        {},
      );

      expect(result.contentType).toBe('application/json');
      expect(result.filename).toContain('.json');
      const parsed = JSON.parse(result.data.toString('utf-8'));
      expect(parsed.exportedAt).toBeDefined();
      expect(parsed.dateRange).toBeDefined();
      expect(parsed.metrics.overview).toBeDefined();
    });

    it('should handle unknown metrics gracefully', async () => {
      const result = await service.exportJson(
        TENANT_ID,
        ['unknown-metric'],
        DATE_RANGE,
        {},
      );

      const parsed = JSON.parse(result.data.toString('utf-8'));
      expect(parsed.metrics).toEqual({});
    });
  });
});
