import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuditService } from '@/audit/audit.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';

function makePrisma() {
  return {
    auditLog: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('AuditService', () => {
  let service: AuditService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new AuditService(prisma as never);
  });

  // -----------------------------------------------------------------------
  // log
  // -----------------------------------------------------------------------

  describe('log', () => {
    it('should create an audit log entry', () => {
      prisma.auditLog.create.mockResolvedValue({});

      service.log({
        tenantId: TENANT_ID,
        entityType: 'booking',
        entityId: 'booking-001',
        action: 'CREATE' as never,
        actorId: 'user-001',
        actorType: 'USER' as never,
        ipAddress: '127.0.0.1',
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TENANT_ID,
          entityType: 'booking',
          entityId: 'booking-001',
          action: 'CREATE',
          actorId: 'user-001',
          actorType: 'USER',
          ipAddress: '127.0.0.1',
        }),
      });
    });

    it('should not throw when database write fails (fire-and-forget)', () => {
      prisma.auditLog.create.mockRejectedValue(new Error('DB error'));

      // Should not throw
      expect(() =>
        service.log({
          entityType: 'booking',
          entityId: 'booking-001',
          action: 'UPDATE' as never,
          actorType: 'SYSTEM' as never,
        }),
      ).not.toThrow();
    });

    it('should pass oldValues and newValues when provided', () => {
      prisma.auditLog.create.mockResolvedValue({});

      service.log({
        entityType: 'tax_rate',
        entityId: 'tax-001',
        action: 'UPDATE' as never,
        actorType: 'USER' as never,
        oldValues: { rate: 5 },
        newValues: { rate: 10 },
      });

      const call = prisma.auditLog.create.mock.calls[0]![0];
      expect(call.data.oldValues).toEqual({ rate: 5 });
      expect(call.data.newValues).toEqual({ rate: 10 });
    });

    it('should handle null tenantId and actorId', () => {
      prisma.auditLog.create.mockResolvedValue({});

      service.log({
        entityType: 'user',
        entityId: 'user-001',
        action: 'DELETE' as never,
        actorType: 'SYSTEM' as never,
      });

      const call = prisma.auditLog.create.mock.calls[0]![0];
      expect(call.data.tenantId).toBeNull();
      expect(call.data.actorId).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // query
  // -----------------------------------------------------------------------

  describe('query', () => {
    it('should return paginated audit logs with default page and limit', async () => {
      const logs = [{ id: 'log-001' }, { id: 'log-002' }];
      prisma.auditLog.findMany.mockResolvedValue(logs);
      prisma.auditLog.count.mockResolvedValue(2);

      const result = await service.query({ tenantId: TENANT_ID });

      expect(result.data).toEqual(logs);
      expect(result.meta).toEqual({
        total: 2,
        page: 1,
        limit: 50,
        totalPages: 1,
      });
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID },
        orderBy: { timestamp: 'desc' },
        skip: 0,
        take: 50,
      });
    });

    it('should apply pagination parameters', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(100);

      const result = await service.query({
        tenantId: TENANT_ID,
        page: 3,
        limit: 10,
      });

      expect(result.meta.page).toBe(3);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.totalPages).toBe(10);
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });

    it('should filter by entityType and action', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(0);

      await service.query({
        tenantId: TENANT_ID,
        entityType: 'booking',
        action: 'CREATE' as never,
      });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: TENANT_ID,
            entityType: 'booking',
            action: 'CREATE',
          },
        }),
      );
    });

    it('should filter by date range', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(0);

      const from = new Date('2026-03-01');
      const to = new Date('2026-03-31');

      await service.query({ from, to });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            timestamp: { gte: from, lte: to },
          },
        }),
      );
    });
  });
});
