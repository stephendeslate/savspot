import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { PlatformMetricsService } from '@/platform-metrics/platform-metrics.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ALERT_ID = 'alert-001';

function makePrisma() {
  return {
    platformMetric: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    platformAlert: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    $queryRawUnsafe: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('PlatformMetricsService', () => {
  let service: PlatformMetricsService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new PlatformMetricsService(prisma as never);
  });

  // -------------------------------------------------------------------------
  // computeAllMetrics
  // -------------------------------------------------------------------------

  describe('computeAllMetrics', () => {
    it('should compute and store all metric definitions', async () => {
      prisma.$queryRawUnsafe.mockResolvedValue([{ value: 10 }]);
      prisma.platformMetric.create.mockResolvedValue({});
      prisma.platformAlert.findFirst.mockResolvedValue(null);

      await service.computeAllMetrics();

      // There are 4 metric definitions
      expect(prisma.$queryRawUnsafe).toHaveBeenCalledTimes(4);
      expect(prisma.platformMetric.create).toHaveBeenCalledTimes(4);
    });

    it('should create alert when value exceeds threshold', async () => {
      prisma.$queryRawUnsafe.mockResolvedValue([{ value: 250 }]);
      prisma.platformMetric.create.mockResolvedValue({});
      prisma.platformAlert.findFirst.mockResolvedValue(null);
      prisma.platformAlert.create.mockResolvedValue({});

      await service.computeAllMetrics();

      // All 4 metrics return 250, all exceed their thresholds
      expect(prisma.platformAlert.create).toHaveBeenCalled();
    });

    it('should not create duplicate alerts', async () => {
      prisma.$queryRawUnsafe.mockResolvedValue([{ value: 999 }]);
      prisma.platformMetric.create.mockResolvedValue({});
      prisma.platformAlert.findFirst.mockResolvedValue({
        id: ALERT_ID,
        acknowledgedAt: null,
      });

      await service.computeAllMetrics();

      expect(prisma.platformAlert.create).not.toHaveBeenCalled();
    });

    it('should handle query errors gracefully and continue', async () => {
      prisma.$queryRawUnsafe
        .mockRejectedValueOnce(new Error('DB error'))
        .mockResolvedValue([{ value: 5 }]);
      prisma.platformMetric.create.mockResolvedValue({});

      await service.computeAllMetrics();

      // 1 failed + 3 successful
      expect(prisma.platformMetric.create).toHaveBeenCalledTimes(3);
    });

    it('should handle empty query results', async () => {
      prisma.$queryRawUnsafe.mockResolvedValue([]);
      prisma.platformMetric.create.mockResolvedValue({});

      await service.computeAllMetrics();

      expect(prisma.platformMetric.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ value: 0 }),
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // getAllMetrics
  // -------------------------------------------------------------------------

  describe('getAllMetrics', () => {
    it('should return latest metric for each key', async () => {
      prisma.platformMetric.findFirst.mockResolvedValue({
        key: 'published_businesses',
        value: 50,
      });

      const result = await service.getAllMetrics();

      expect(result.length).toBeGreaterThan(0);
      expect(prisma.platformMetric.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should filter out null entries', async () => {
      prisma.platformMetric.findFirst.mockResolvedValue(null);

      const result = await service.getAllMetrics();

      expect(result).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // getMetricHistory
  // -------------------------------------------------------------------------

  describe('getMetricHistory', () => {
    it('should return up to 100 entries for a metric key', async () => {
      prisma.platformMetric.findMany.mockResolvedValue([]);

      await service.getMetricHistory('published_businesses');

      expect(prisma.platformMetric.findMany).toHaveBeenCalledWith({
        where: { key: 'published_businesses' },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
    });
  });

  // -------------------------------------------------------------------------
  // getUnacknowledgedAlerts
  // -------------------------------------------------------------------------

  describe('getUnacknowledgedAlerts', () => {
    it('should return alerts with null acknowledgedAt', async () => {
      prisma.platformAlert.findMany.mockResolvedValue([]);

      await service.getUnacknowledgedAlerts();

      expect(prisma.platformAlert.findMany).toHaveBeenCalledWith({
        where: { acknowledgedAt: null },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  // -------------------------------------------------------------------------
  // acknowledgeAlert
  // -------------------------------------------------------------------------

  describe('acknowledgeAlert', () => {
    it('should set acknowledgedAt timestamp', async () => {
      prisma.platformAlert.findUnique.mockResolvedValue({ id: ALERT_ID });
      prisma.platformAlert.update.mockResolvedValue({
        id: ALERT_ID,
        acknowledgedAt: new Date(),
      });

      await service.acknowledgeAlert(ALERT_ID);

      expect(prisma.platformAlert.update).toHaveBeenCalledWith({
        where: { id: ALERT_ID },
        data: { acknowledgedAt: expect.any(Date) },
      });
    });

    it('should throw NotFoundException when alert not found', async () => {
      prisma.platformAlert.findUnique.mockResolvedValue(null);

      await expect(service.acknowledgeAlert('bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
