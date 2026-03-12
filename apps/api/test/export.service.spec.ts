import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExportService } from '@/analytics/services/export.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';

function makeDateRange() {
  return {
    from: new Date('2026-03-01T00:00:00Z'),
    to: new Date('2026-03-31T23:59:59Z'),
  };
}

function makeAnalyticsQueryService() {
  return {
    getOverview: vi.fn(),
    getRevenueTrends: vi.fn(),
    getBookingTrends: vi.fn(),
    getNoShowTrends: vi.fn(),
    getClientMetrics: vi.fn(),
    getFunnelData: vi.fn(),
    getUtilizationHeatmap: vi.fn(),
    getStaffPerformance: vi.fn(),
    getBenchmarks: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('ExportService', () => {
  let service: ExportService;
  let analyticsQuery: ReturnType<typeof makeAnalyticsQueryService>;

  beforeEach(() => {
    analyticsQuery = makeAnalyticsQueryService();
    service = new ExportService(analyticsQuery as never);
  });

  // -----------------------------------------------------------------------
  // exportCsv
  // -----------------------------------------------------------------------

  describe('exportCsv', () => {
    it('returns a CSV buffer with correct content type and filename', async () => {
      analyticsQuery.getOverview.mockResolvedValue({
        totalBookings: 10,
        totalRevenue: 500,
        noShowRate: 0.1,
        avgBookingValue: 50,
        completedBookings: 8,
        cancelledBookings: 2,
      });

      const result = await service.exportCsv(
        TENANT_ID,
        ['overview'],
        makeDateRange(),
        {},
      );

      expect(result.contentType).toBe('text/csv');
      expect(result.filename).toBe('analytics-2026-03-01-2026-03-31.csv');
      expect(Buffer.isBuffer(result.data)).toBe(true);
    });

    it('formats object metrics as metric,value rows', async () => {
      analyticsQuery.getOverview.mockResolvedValue({
        totalBookings: 10,
        totalRevenue: 500,
      });

      const result = await service.exportCsv(
        TENANT_ID,
        ['overview'],
        makeDateRange(),
        {},
      );

      const csv = result.data.toString('utf-8');
      expect(csv).toContain('# overview');
      expect(csv).toContain('metric,value');
      expect(csv).toContain('totalBookings,10');
      expect(csv).toContain('totalRevenue,500');
    });

    it('formats array metrics as header row followed by data rows', async () => {
      analyticsQuery.getRevenueTrends.mockResolvedValue([
        { period: '2026-03-01', revenue: 100, bookingCount: 5 },
        { period: '2026-03-02', revenue: 200, bookingCount: 10 },
      ]);

      const result = await service.exportCsv(
        TENANT_ID,
        ['revenue'],
        makeDateRange(),
        {},
      );

      const csv = result.data.toString('utf-8');
      expect(csv).toContain('# revenue');
      expect(csv).toContain('period,revenue,bookingCount');
      expect(csv).toContain('2026-03-01,100,5');
      expect(csv).toContain('2026-03-02,200,10');
    });

    it('quotes string values containing commas', async () => {
      analyticsQuery.getStaffPerformance.mockResolvedValue([
        {
          staffId: 'staff-001',
          staffName: 'Doe, Jane',
          totalBookings: 5,
        },
      ]);

      const result = await service.exportCsv(
        TENANT_ID,
        ['staff-performance'],
        makeDateRange(),
        {},
      );

      const csv = result.data.toString('utf-8');
      expect(csv).toContain('"Doe, Jane"');
    });

    it('collects multiple metrics into a single CSV', async () => {
      analyticsQuery.getOverview.mockResolvedValue({ totalBookings: 10 });
      analyticsQuery.getRevenueTrends.mockResolvedValue([
        { period: '2026-03-01', revenue: 100 },
      ]);

      const result = await service.exportCsv(
        TENANT_ID,
        ['overview', 'revenue'],
        makeDateRange(),
        {},
      );

      const csv = result.data.toString('utf-8');
      expect(csv).toContain('# overview');
      expect(csv).toContain('# revenue');
    });

    it('handles empty metrics list', async () => {
      const result = await service.exportCsv(
        TENANT_ID,
        [],
        makeDateRange(),
        {},
      );

      const csv = result.data.toString('utf-8');
      expect(csv).toBe('');
    });

    it('handles empty array metric data', async () => {
      analyticsQuery.getRevenueTrends.mockResolvedValue([]);

      const result = await service.exportCsv(
        TENANT_ID,
        ['revenue'],
        makeDateRange(),
        {},
      );

      const csv = result.data.toString('utf-8');
      expect(csv).toContain('# revenue');
      // Should not have header row since array is empty
      expect(csv).not.toContain('period');
    });

    it('ignores unknown metric names', async () => {
      const result = await service.exportCsv(
        TENANT_ID,
        ['nonexistent-metric'],
        makeDateRange(),
        {},
      );

      const csv = result.data.toString('utf-8');
      // Unknown metrics are skipped, so CSV should be empty
      expect(csv).toBe('');
    });
  });

  // -----------------------------------------------------------------------
  // exportJson
  // -----------------------------------------------------------------------

  describe('exportJson', () => {
    it('returns a JSON buffer with correct content type and filename', async () => {
      analyticsQuery.getOverview.mockResolvedValue({ totalBookings: 10 });

      const result = await service.exportJson(
        TENANT_ID,
        ['overview'],
        makeDateRange(),
        {},
      );

      expect(result.contentType).toBe('application/json');
      expect(result.filename).toBe('analytics-2026-03-01-2026-03-31.json');
      expect(Buffer.isBuffer(result.data)).toBe(true);
    });

    it('includes exportedAt, dateRange, and metrics in the JSON payload', async () => {
      analyticsQuery.getOverview.mockResolvedValue({
        totalBookings: 10,
        totalRevenue: 500,
      });

      const result = await service.exportJson(
        TENANT_ID,
        ['overview'],
        makeDateRange(),
        {},
      );

      const parsed = JSON.parse(result.data.toString('utf-8'));
      expect(parsed.exportedAt).toBeDefined();
      expect(parsed.dateRange.from).toBe('2026-03-01T00:00:00.000Z');
      expect(parsed.dateRange.to).toBe('2026-03-31T23:59:59.000Z');
      expect(parsed.metrics.overview.totalBookings).toBe(10);
    });

    it('includes multiple metrics in the JSON payload', async () => {
      analyticsQuery.getOverview.mockResolvedValue({ totalBookings: 5 });
      analyticsQuery.getClientMetrics.mockResolvedValue({
        newClients: 3,
        returningClients: 2,
      });

      const result = await service.exportJson(
        TENANT_ID,
        ['overview', 'clients'],
        makeDateRange(),
        {},
      );

      const parsed = JSON.parse(result.data.toString('utf-8'));
      expect(parsed.metrics.overview.totalBookings).toBe(5);
      expect(parsed.metrics.clients.newClients).toBe(3);
    });

    it('returns empty metrics when no metrics requested', async () => {
      const result = await service.exportJson(
        TENANT_ID,
        [],
        makeDateRange(),
        {},
      );

      const parsed = JSON.parse(result.data.toString('utf-8'));
      expect(parsed.metrics).toEqual({});
    });

    it('produces valid pretty-printed JSON', async () => {
      analyticsQuery.getOverview.mockResolvedValue({ totalBookings: 1 });

      const result = await service.exportJson(
        TENANT_ID,
        ['overview'],
        makeDateRange(),
        {},
      );

      const jsonString = result.data.toString('utf-8');
      // Pretty-printed JSON has newlines
      expect(jsonString).toContain('\n');
      // Should parse without error
      expect(() => JSON.parse(jsonString)).not.toThrow();
    });
  });

  // -----------------------------------------------------------------------
  // collectMetrics (tested through export methods)
  // -----------------------------------------------------------------------

  describe('metric collection routing', () => {
    it('routes "overview" to getOverview', async () => {
      analyticsQuery.getOverview.mockResolvedValue({});

      await service.exportJson(TENANT_ID, ['overview'], makeDateRange(), {});

      expect(analyticsQuery.getOverview).toHaveBeenCalledWith(
        TENANT_ID,
        makeDateRange(),
        {},
      );
    });

    it('routes "revenue" to getRevenueTrends', async () => {
      analyticsQuery.getRevenueTrends.mockResolvedValue([]);

      await service.exportJson(TENANT_ID, ['revenue'], makeDateRange(), {});

      expect(analyticsQuery.getRevenueTrends).toHaveBeenCalled();
    });

    it('routes "bookings" to getBookingTrends', async () => {
      analyticsQuery.getBookingTrends.mockResolvedValue([]);

      await service.exportJson(TENANT_ID, ['bookings'], makeDateRange(), {});

      expect(analyticsQuery.getBookingTrends).toHaveBeenCalled();
    });

    it('routes "no-shows" to getNoShowTrends', async () => {
      analyticsQuery.getNoShowTrends.mockResolvedValue([]);

      await service.exportJson(TENANT_ID, ['no-shows'], makeDateRange(), {});

      expect(analyticsQuery.getNoShowTrends).toHaveBeenCalled();
    });

    it('routes "clients" to getClientMetrics', async () => {
      analyticsQuery.getClientMetrics.mockResolvedValue({});

      await service.exportJson(TENANT_ID, ['clients'], makeDateRange(), {});

      expect(analyticsQuery.getClientMetrics).toHaveBeenCalled();
    });

    it('routes "funnel" to getFunnelData', async () => {
      analyticsQuery.getFunnelData.mockResolvedValue({});

      await service.exportJson(TENANT_ID, ['funnel'], makeDateRange(), {});

      expect(analyticsQuery.getFunnelData).toHaveBeenCalledWith(
        TENANT_ID,
        makeDateRange(),
      );
    });

    it('routes "utilization" to getUtilizationHeatmap', async () => {
      analyticsQuery.getUtilizationHeatmap.mockResolvedValue([]);

      await service.exportJson(TENANT_ID, ['utilization'], makeDateRange(), {});

      expect(analyticsQuery.getUtilizationHeatmap).toHaveBeenCalled();
    });

    it('routes "staff-performance" to getStaffPerformance', async () => {
      analyticsQuery.getStaffPerformance.mockResolvedValue([]);

      await service.exportJson(
        TENANT_ID,
        ['staff-performance'],
        makeDateRange(),
        {},
      );

      expect(analyticsQuery.getStaffPerformance).toHaveBeenCalled();
    });

    it('routes "benchmarks" to getBenchmarks', async () => {
      analyticsQuery.getBenchmarks.mockResolvedValue([]);

      await service.exportJson(TENANT_ID, ['benchmarks'], makeDateRange(), {});

      expect(analyticsQuery.getBenchmarks).toHaveBeenCalledWith(TENANT_ID);
    });

    it('passes filters through to analytics query methods', async () => {
      analyticsQuery.getOverview.mockResolvedValue({});
      const filters = { serviceId: 'svc-001', source: 'ONLINE' };

      await service.exportJson(
        TENANT_ID,
        ['overview'],
        makeDateRange(),
        filters,
      );

      expect(analyticsQuery.getOverview).toHaveBeenCalledWith(
        TENANT_ID,
        makeDateRange(),
        filters,
      );
    });
  });
});
