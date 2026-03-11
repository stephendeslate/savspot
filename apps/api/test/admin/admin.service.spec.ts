import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { AdminService } from '@/admin/admin.service';

const TENANT_ID = 'tenant-001';

function makePrisma() {
  return {
    tenant: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    feedback: {
      findMany: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
    },
    supportTicket: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    auditLog: {
      deleteMany: vi.fn(),
    },
    $queryRaw: vi.fn(),
  };
}

function makeTenant(overrides: Record<string, unknown> = {}) {
  return {
    id: TENANT_ID,
    name: 'Acme Studio',
    slug: 'acme-studio',
    category: 'STUDIO',
    status: 'ACTIVE',
    subscriptionTier: 'PREMIUM',
    currency: 'USD',
    country: 'US',
    isPublished: true,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-06-01T00:00:00Z'),
    ...overrides,
  };
}

describe('AdminService', () => {
  let service: AdminService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new AdminService(prisma as never);
  });

  describe('listTenants', () => {
    it('should return paginated tenants', async () => {
      const tenants = [makeTenant()];
      prisma.tenant.findMany.mockResolvedValue(tenants);
      prisma.tenant.count.mockResolvedValue(1);

      const result = await service.listTenants({ page: 1, limit: 20 });

      expect(result.data).toEqual(tenants);
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('should apply search filter', async () => {
      prisma.tenant.findMany.mockResolvedValue([]);
      prisma.tenant.count.mockResolvedValue(0);

      await service.listTenants({ search: 'acme', page: 1, limit: 20 });

      expect(prisma.tenant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { name: { contains: 'acme', mode: 'insensitive' } },
              { slug: { contains: 'acme', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });

    it('should apply status filter', async () => {
      prisma.tenant.findMany.mockResolvedValue([]);
      prisma.tenant.count.mockResolvedValue(0);

      await service.listTenants({ status: 'SUSPENDED', page: 1, limit: 20 });

      expect(prisma.tenant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'SUSPENDED',
          }),
        }),
      );
    });
  });

  describe('updateTenantStatus', () => {
    it('should update tenant status', async () => {
      const tenant = makeTenant();
      const updated = makeTenant({ status: 'SUSPENDED' });
      prisma.tenant.findUnique.mockResolvedValue(tenant);
      prisma.tenant.update.mockResolvedValue(updated);

      const result = await service.updateTenantStatus(TENANT_ID, 'SUSPENDED');

      expect(result.status).toBe('SUSPENDED');
      expect(prisma.tenant.update).toHaveBeenCalledWith({
        where: { id: TENANT_ID },
        data: { status: 'SUSPENDED' },
      });
    });

    it('should throw NotFoundException when tenant not found', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(
        service.updateTenantStatus('nonexistent', 'SUSPENDED'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPlatformMetrics', () => {
    it('should aggregate and return metrics', async () => {
      prisma.$queryRaw
        .mockResolvedValueOnce([
          { status: 'ACTIVE', count: BigInt(8) },
          { status: 'SUSPENDED', count: BigInt(2) },
        ])
        .mockResolvedValueOnce([
          { total_bookings: BigInt(100), completed_bookings: BigInt(80) },
        ])
        .mockResolvedValueOnce([{ total_revenue: 5000 }]);

      const result = await service.getPlatformMetrics();

      expect(result.tenants.total).toBe(10);
      expect(result.tenants.byStatus).toEqual({ ACTIVE: 8, SUSPENDED: 2 });
      expect(result.bookings.total).toBe(100);
      expect(result.bookings.completed).toBe(80);
      expect(result.revenue.total).toBe(5000);
    });

    it('should handle empty database', async () => {
      prisma.$queryRaw
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.getPlatformMetrics();

      expect(result.tenants.total).toBe(0);
      expect(result.bookings.total).toBe(0);
      expect(result.revenue.total).toBe(0);
    });
  });

  describe('getSubscriptionOverview', () => {
    it('should return tier distribution, MRR, and churn', async () => {
      prisma.$queryRaw
        .mockResolvedValueOnce([
          { subscription_tier: 'FREE', count: BigInt(5) },
          { subscription_tier: 'PREMIUM', count: BigInt(3) },
        ])
        .mockResolvedValueOnce([{ mrr: 147 }])
        .mockResolvedValueOnce([{ churned: BigInt(1) }]);

      const result = await service.getSubscriptionOverview();

      expect(result.tierDistribution).toEqual({ FREE: 5, PREMIUM: 3 });
      expect(result.mrr).toBe(147);
      expect(result.recentChurn).toBe(1);
    });
  });

  describe('listFeedback', () => {
    it('should return paginated feedback', async () => {
      prisma.feedback.findMany.mockResolvedValue([]);
      prisma.feedback.count.mockResolvedValue(0);

      const result = await service.listFeedback({ page: 1, limit: 20 });

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });

    it('should apply type and status filters', async () => {
      prisma.feedback.findMany.mockResolvedValue([]);
      prisma.feedback.count.mockResolvedValue(0);

      await service.listFeedback({
        type: 'FEATURE_REQUEST',
        status: 'NEW',
        page: 1,
        limit: 20,
      });

      expect(prisma.feedback.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: 'FEATURE_REQUEST',
            status: 'NEW',
          }),
        }),
      );
    });
  });

  describe('bulkUpdateFeedbackStatus', () => {
    it('should update multiple feedback items', async () => {
      prisma.feedback.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.bulkUpdateFeedbackStatus({
        ids: ['id-1', 'id-2', 'id-3'],
        status: 'ACKNOWLEDGED',
      });

      expect(result.updated).toBe(3);
      expect(prisma.feedback.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['id-1', 'id-2', 'id-3'] } },
        data: { status: 'ACKNOWLEDGED' },
      });
    });
  });

  describe('listSupportTickets', () => {
    it('should return paginated tickets', async () => {
      prisma.supportTicket.findMany.mockResolvedValue([]);
      prisma.supportTicket.count.mockResolvedValue(0);

      const result = await service.listSupportTickets({ page: 1, limit: 20 });

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });

    it('should apply status and category filters', async () => {
      prisma.supportTicket.findMany.mockResolvedValue([]);
      prisma.supportTicket.count.mockResolvedValue(0);

      await service.listSupportTickets({
        status: 'NEW',
        category: 'BUG',
        page: 1,
        limit: 20,
      });

      expect(prisma.supportTicket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'NEW',
            category: 'BUG',
          }),
        }),
      );
    });
  });

  describe('getSupportMetrics', () => {
    it('should return AI resolution rate and escalation count', async () => {
      prisma.$queryRaw
        .mockResolvedValueOnce([
          { total_tickets: BigInt(50), ai_resolved: BigInt(35) },
        ])
        .mockResolvedValueOnce([{ escalation_count: BigInt(5) }]);

      const result = await service.getSupportMetrics();

      expect(result.totalTickets).toBe(50);
      expect(result.aiResolved).toBe(35);
      expect(result.aiResolutionRate).toBe(0.7);
      expect(result.escalationCount).toBe(5);
    });

    it('should handle zero tickets', async () => {
      prisma.$queryRaw
        .mockResolvedValueOnce([
          { total_tickets: BigInt(0), ai_resolved: BigInt(0) },
        ])
        .mockResolvedValueOnce([{ escalation_count: BigInt(0) }]);

      const result = await service.getSupportMetrics();

      expect(result.totalTickets).toBe(0);
      expect(result.aiResolutionRate).toBe(0);
    });
  });
});
