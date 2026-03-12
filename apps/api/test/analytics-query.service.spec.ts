import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnalyticsQueryService } from '@/analytics/services/analytics-query.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';

function makePrisma() {
  return {
    booking: {
      groupBy: vi.fn(),
      aggregate: vi.fn(),
    },
    bookingFlowAnalytics: {
      findMany: vi.fn(),
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

function makeDateRange(daysAgo = 30) {
  return {
    from: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
    to: new Date(),
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('AnalyticsQueryService', () => {
  let service: AnalyticsQueryService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new AnalyticsQueryService(prisma as never);
  });

  // -----------------------------------------------------------------------
  // getOverview
  // -----------------------------------------------------------------------

  describe('getOverview', () => {
    it('returns correct KPIs from booking status counts and revenue aggregate', async () => {
      prisma.booking.groupBy.mockResolvedValue([
        { status: 'COMPLETED', _count: { id: 10 } },
        { status: 'CANCELLED', _count: { id: 3 } },
        { status: 'NO_SHOW', _count: { id: 2 } },
        { status: 'CONFIRMED', _count: { id: 5 } },
      ]);
      prisma.booking.aggregate.mockResolvedValue({
        _sum: { totalAmount: { toNumber: () => 1500 } },
        _avg: { totalAmount: { toNumber: () => 100 } },
        _count: { id: 15 },
      });

      const result = await service.getOverview(TENANT_ID, makeDateRange(), {});

      expect(result.totalBookings).toBe(20);
      expect(result.totalRevenue).toBe(1500);
      expect(result.avgBookingValue).toBe(100);
      expect(result.completedBookings).toBe(10);
      expect(result.cancelledBookings).toBe(3);
      // noShowRate = 2 / (10 + 2 + 0) = 2/12
      expect(result.noShowRate).toBeCloseTo(2 / 12);
    });

    it('returns zero revenue when no completed bookings', async () => {
      prisma.booking.groupBy.mockResolvedValue([]);
      prisma.booking.aggregate.mockResolvedValue({
        _sum: { totalAmount: null },
        _avg: { totalAmount: null },
        _count: { id: 0 },
      });

      const result = await service.getOverview(TENANT_ID, makeDateRange(), {});

      expect(result.totalBookings).toBe(0);
      expect(result.totalRevenue).toBe(0);
      expect(result.avgBookingValue).toBe(0);
      expect(result.noShowRate).toBe(0);
    });

    it('includes IN_PROGRESS in no-show rate denominator', async () => {
      prisma.booking.groupBy.mockResolvedValue([
        { status: 'COMPLETED', _count: { id: 5 } },
        { status: 'NO_SHOW', _count: { id: 5 } },
        { status: 'IN_PROGRESS', _count: { id: 10 } },
      ]);
      prisma.booking.aggregate.mockResolvedValue({
        _sum: { totalAmount: { toNumber: () => 500 } },
        _avg: { totalAmount: { toNumber: () => 50 } },
        _count: { id: 10 },
      });

      const result = await service.getOverview(TENANT_ID, makeDateRange(), {});

      // eligible = 5 + 5 + 10 = 20, noShowRate = 5/20 = 0.25
      expect(result.noShowRate).toBeCloseTo(0.25);
    });

    it('applies serviceId and source filters to booking where clause', async () => {
      prisma.booking.groupBy.mockResolvedValue([]);
      prisma.booking.aggregate.mockResolvedValue({
        _sum: { totalAmount: null },
        _avg: { totalAmount: null },
        _count: { id: 0 },
      });

      await service.getOverview(TENANT_ID, makeDateRange(), {
        serviceId: 'svc-001',
        source: 'ONLINE',
      });

      const groupByCall = prisma.booking.groupBy.mock.calls[0]![0];
      expect(groupByCall.where.serviceId).toBe('svc-001');
      expect(groupByCall.where.source).toBe('ONLINE');
      expect(groupByCall.where.tenantId).toBe(TENANT_ID);
    });
  });

  // -----------------------------------------------------------------------
  // getRevenueTrends
  // -----------------------------------------------------------------------

  describe('getRevenueTrends', () => {
    it('returns revenue trends mapped from raw query results', async () => {
      const period = new Date('2026-03-01');
      prisma.$queryRaw.mockResolvedValue([
        { period, revenue: '1500.00', booking_count: BigInt(10) },
        { period: new Date('2026-03-02'), revenue: '2000.00', booking_count: BigInt(15) },
      ]);

      const result = await service.getRevenueTrends(TENANT_ID, makeDateRange(), {});

      expect(result).toHaveLength(2);
      expect(result[0]!.period).toBe(period.toISOString());
      expect(result[0]!.revenue).toBe(1500);
      expect(result[0]!.bookingCount).toBe(10);
    });

    it('returns empty array when no data', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      const result = await service.getRevenueTrends(TENANT_ID, makeDateRange(), {});

      expect(result).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // getBookingTrends
  // -----------------------------------------------------------------------

  describe('getBookingTrends', () => {
    it('returns booking status breakdown per period', async () => {
      const period = new Date('2026-03-01');
      prisma.$queryRaw.mockResolvedValue([
        {
          period,
          total: BigInt(20),
          confirmed: BigInt(10),
          cancelled: BigInt(3),
          no_show: BigInt(2),
          completed: BigInt(5),
        },
      ]);

      const result = await service.getBookingTrends(TENANT_ID, makeDateRange(), {});

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        period: period.toISOString(),
        total: 20,
        confirmed: 10,
        cancelled: 3,
        noShow: 2,
        completed: 5,
      });
    });

    it('returns empty array when no bookings in range', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      const result = await service.getBookingTrends(TENANT_ID, makeDateRange(), {});

      expect(result).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // getNoShowTrends
  // -----------------------------------------------------------------------

  describe('getNoShowTrends', () => {
    it('calculates no-show rate per period', async () => {
      const period = new Date('2026-03-01');
      prisma.$queryRaw.mockResolvedValue([
        { period, no_show_count: BigInt(3), total_bookings: BigInt(10) },
      ]);

      const result = await service.getNoShowTrends(TENANT_ID, makeDateRange(), {});

      expect(result[0]!.noShowCount).toBe(3);
      expect(result[0]!.totalBookings).toBe(10);
      expect(result[0]!.noShowRate).toBeCloseTo(0.3);
    });

    it('returns zero no-show rate when total bookings is zero', async () => {
      const period = new Date('2026-03-01');
      prisma.$queryRaw.mockResolvedValue([
        { period, no_show_count: BigInt(0), total_bookings: BigInt(0) },
      ]);

      const result = await service.getNoShowTrends(TENANT_ID, makeDateRange(), {});

      expect(result[0]!.noShowRate).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // getClientMetrics
  // -----------------------------------------------------------------------

  describe('getClientMetrics', () => {
    it('returns client metrics from raw query', async () => {
      prisma.$queryRaw.mockResolvedValue([
        {
          new_clients: BigInt(15),
          returning_clients: BigInt(10),
          rebooking_rate: '0.40',
          avg_lifetime_value: '250.00',
        },
      ]);

      const result = await service.getClientMetrics(TENANT_ID, makeDateRange(), {});

      expect(result.newClients).toBe(15);
      expect(result.returningClients).toBe(10);
      expect(result.rebookingRate).toBeCloseTo(0.4);
      expect(result.avgLifetimeValue).toBe(250);
    });

    it('returns zeros when query returns empty result', async () => {
      prisma.$queryRaw.mockResolvedValue([undefined]);

      const result = await service.getClientMetrics(TENANT_ID, makeDateRange(), {});

      expect(result.newClients).toBe(0);
      expect(result.returningClients).toBe(0);
      expect(result.rebookingRate).toBe(0);
      expect(result.avgLifetimeValue).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // getFunnelData
  // -----------------------------------------------------------------------

  describe('getFunnelData', () => {
    it('returns empty funnel when no analytics records exist', async () => {
      prisma.bookingFlowAnalytics.findMany.mockResolvedValue([]);

      const result = await service.getFunnelData(TENANT_ID, makeDateRange());

      expect(result.totalSessions).toBe(0);
      expect(result.completedSessions).toBe(0);
      expect(result.conversionRate).toBe(0);
      expect(result.avgCompletionTimeSec).toBe(0);
      expect(result.steps).toEqual([]);
    });

    it('aggregates sessions and computes conversion rate', async () => {
      prisma.bookingFlowAnalytics.findMany.mockResolvedValue([
        {
          totalSessions: 100,
          completedSessions: 80,
          avgCompletionTimeSec: 120,
          stepMetrics: [
            { step: 'select-service', sessions: 100, dropOffs: 10 },
            { step: 'select-time', sessions: 90, dropOffs: 10 },
          ],
        },
        {
          totalSessions: 50,
          completedSessions: 30,
          avgCompletionTimeSec: 150,
          stepMetrics: [
            { step: 'select-service', sessions: 50, dropOffs: 5 },
            { step: 'select-time', sessions: 45, dropOffs: 15 },
          ],
        },
      ]);

      const result = await service.getFunnelData(TENANT_ID, makeDateRange());

      expect(result.totalSessions).toBe(150);
      expect(result.completedSessions).toBe(110);
      expect(result.conversionRate).toBeCloseTo(110 / 150);
      // weighted avg: (120*80 + 150*30) / 110 = 14100/110 = 128.18 -> 128
      expect(result.avgCompletionTimeSec).toBe(128);
      expect(result.steps).toHaveLength(2);
    });

    it('aggregates step metrics across multiple records', async () => {
      prisma.bookingFlowAnalytics.findMany.mockResolvedValue([
        {
          totalSessions: 10,
          completedSessions: 5,
          avgCompletionTimeSec: 60,
          stepMetrics: [
            { step: 'select-service', sessions: 10, dropOffs: 2 },
          ],
        },
        {
          totalSessions: 20,
          completedSessions: 15,
          avgCompletionTimeSec: 90,
          stepMetrics: [
            { step: 'select-service', sessions: 20, dropOffs: 3 },
          ],
        },
      ]);

      const result = await service.getFunnelData(TENANT_ID, makeDateRange());

      const selectStep = result.steps.find((s) => s.step === 'select-service');
      expect(selectStep!.sessions).toBe(30);
      // dropOffRate = 5 / 30
      expect(selectStep!.dropOffRate).toBeCloseTo(5 / 30);
    });

    it('handles null stepMetrics gracefully', async () => {
      prisma.bookingFlowAnalytics.findMany.mockResolvedValue([
        {
          totalSessions: 10,
          completedSessions: 5,
          avgCompletionTimeSec: 60,
          stepMetrics: null,
        },
      ]);

      const result = await service.getFunnelData(TENANT_ID, makeDateRange());

      expect(result.totalSessions).toBe(10);
      expect(result.steps).toEqual([]);
    });

    it('returns zero avgCompletionTimeSec when no completed sessions', async () => {
      prisma.bookingFlowAnalytics.findMany.mockResolvedValue([
        {
          totalSessions: 10,
          completedSessions: 0,
          avgCompletionTimeSec: 0,
          stepMetrics: [],
        },
      ]);

      const result = await service.getFunnelData(TENANT_ID, makeDateRange());

      expect(result.avgCompletionTimeSec).toBe(0);
      expect(result.conversionRate).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // getUtilizationHeatmap
  // -----------------------------------------------------------------------

  describe('getUtilizationHeatmap', () => {
    it('normalizes booking counts to utilization between 0 and 1', async () => {
      prisma.$queryRaw.mockResolvedValue([
        { day_of_week: 1, hour_of_day: 9, booking_count: BigInt(5) },
        { day_of_week: 1, hour_of_day: 10, booking_count: BigInt(10) },
        { day_of_week: 2, hour_of_day: 14, booking_count: BigInt(3) },
      ]);

      const result = await service.getUtilizationHeatmap(TENANT_ID, makeDateRange(), {});

      expect(result).toHaveLength(3);
      // max = 10, so utilization for 10 = 1.0, for 5 = 0.5, for 3 = 0.3
      const slot10 = result.find((s) => s.hour === 10);
      expect(slot10!.utilization).toBe(1.0);
      const slot9 = result.find((s) => s.hour === 9);
      expect(slot9!.utilization).toBe(0.5);
      const slot14 = result.find((s) => s.hour === 14);
      expect(slot14!.utilization).toBeCloseTo(0.3);
    });

    it('returns empty array when no bookings in range', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      const result = await service.getUtilizationHeatmap(TENANT_ID, makeDateRange(), {});

      expect(result).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // getStaffPerformance
  // -----------------------------------------------------------------------

  describe('getStaffPerformance', () => {
    it('returns staff metrics with computed rates', async () => {
      prisma.$queryRaw.mockResolvedValue([
        {
          staff_id: 'staff-001',
          staff_name: 'Alice',
          total_bookings: BigInt(20),
          total_revenue: '2000.00',
          no_show_count: BigInt(2),
          completed_count: BigInt(15),
          eligible_count: BigInt(20),
        },
      ]);

      const result = await service.getStaffPerformance(TENANT_ID, makeDateRange(), {});

      expect(result).toHaveLength(1);
      expect(result[0]!.staffId).toBe('staff-001');
      expect(result[0]!.staffName).toBe('Alice');
      expect(result[0]!.totalBookings).toBe(20);
      expect(result[0]!.totalRevenue).toBe(2000);
      expect(result[0]!.noShowRate).toBeCloseTo(0.1);
      expect(result[0]!.completionRate).toBeCloseTo(0.75);
      expect(result[0]!.avgRating).toBe(0);
    });

    it('returns zero rates when eligible count is zero', async () => {
      prisma.$queryRaw.mockResolvedValue([
        {
          staff_id: 'staff-002',
          staff_name: 'Bob',
          total_bookings: BigInt(0),
          total_revenue: '0',
          no_show_count: BigInt(0),
          completed_count: BigInt(0),
          eligible_count: BigInt(0),
        },
      ]);

      const result = await service.getStaffPerformance(TENANT_ID, makeDateRange(), {});

      expect(result[0]!.noShowRate).toBe(0);
      expect(result[0]!.completionRate).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // getBenchmarks
  // -----------------------------------------------------------------------

  describe('getBenchmarks', () => {
    it('returns empty array when tenant has opted out', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        category: 'HAIR_SALON',
        benchmarkOptOut: true,
      });

      const result = await service.getBenchmarks(TENANT_ID);

      expect(result).toEqual([]);
      expect(prisma.categoryBenchmark.findMany).not.toHaveBeenCalled();
    });

    it('returns empty array when tenant not found', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      const result = await service.getBenchmarks(TENANT_ID);

      expect(result).toEqual([]);
    });

    it('maps benchmark data with tenant metric values', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        category: 'HAIR_SALON',
        benchmarkOptOut: false,
      });
      prisma.categoryBenchmark.findMany.mockResolvedValue([
        {
          metricKey: 'avg_booking_value',
          p25: { toNumber: () => 20 },
          p50: { toNumber: () => 35 },
          p75: { toNumber: () => 50 },
        },
      ]);
      // Mock getOverview (called internally)
      prisma.booking.groupBy.mockResolvedValue([
        { status: 'COMPLETED', _count: { id: 10 } },
      ]);
      prisma.booking.aggregate.mockResolvedValue({
        _sum: { totalAmount: { toNumber: () => 400 } },
        _avg: { totalAmount: { toNumber: () => 40 } },
        _count: { id: 10 },
      });

      const result = await service.getBenchmarks(TENANT_ID);

      expect(result).toHaveLength(1);
      expect(result[0]!.metricKey).toBe('avg_booking_value');
      expect(result[0]!.tenantValue).toBe(40);
      expect(result[0]!.p25).toBe(20);
      expect(result[0]!.p50).toBe(35);
      expect(result[0]!.p75).toBe(50);
    });

    it('returns 0 for unknown metric keys', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        category: 'HAIR_SALON',
        benchmarkOptOut: false,
      });
      prisma.categoryBenchmark.findMany.mockResolvedValue([
        {
          metricKey: 'unknown_metric',
          p25: { toNumber: () => 10 },
          p50: { toNumber: () => 20 },
          p75: { toNumber: () => 30 },
        },
      ]);
      prisma.booking.groupBy.mockResolvedValue([]);
      prisma.booking.aggregate.mockResolvedValue({
        _sum: { totalAmount: null },
        _avg: { totalAmount: null },
        _count: { id: 0 },
      });

      const result = await service.getBenchmarks(TENANT_ID);

      expect(result[0]!.tenantValue).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // getBenchmarkTrends
  // -----------------------------------------------------------------------

  describe('getBenchmarkTrends', () => {
    it('returns trend data points from raw query', async () => {
      const period = new Date('2026-03-01');
      prisma.$queryRaw.mockResolvedValue([
        { period, avg_value: '42.50' },
      ]);

      const result = await service.getBenchmarkTrends(TENANT_ID, makeDateRange(), {});

      expect(result).toHaveLength(1);
      expect(result[0]!.period).toBe(period.toISOString());
      expect(result[0]!.value).toBe(42.5);
    });

    it('returns empty array when no data', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      const result = await service.getBenchmarkTrends(TENANT_ID, makeDateRange(), {});

      expect(result).toEqual([]);
    });
  });
});
