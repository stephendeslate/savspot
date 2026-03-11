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
    clientProfile: {
      count: vi.fn(),
    },
    service: {
      count: vi.fn(),
    },
    calendarConnection: {
      count: vi.fn(),
    },
    booking: {
      count: vi.fn(),
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

describe('AdminService — Migration Readiness', () => {
  let service: AdminService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new AdminService(prisma as never);
  });

  describe('getMigrationReadiness', () => {
    it('should throw NotFoundException when tenant not found', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(
        service.getMigrationReadiness('nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return full readiness for a well-set-up tenant', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        id: TENANT_ID,
        name: 'Acme Studio',
        status: 'ACTIVE',
        paymentProviderAccountId: 'acct_123',
      });
      prisma.clientProfile.count
        .mockResolvedValueOnce(20) // totalClients
        .mockResolvedValueOnce(18); // clientsWithEmail
      prisma.service.count.mockResolvedValue(5);
      prisma.calendarConnection.count.mockResolvedValue(1);
      prisma.booking.count
        .mockResolvedValueOnce(15) // last 30 days
        .mockResolvedValueOnce(10); // previous 30 days

      const result = await service.getMigrationReadiness(TENANT_ID);

      expect(result.tenantId).toBe(TENANT_ID);
      expect(result.tenantName).toBe('Acme Studio');
      expect(result.clientCoverage).toBeCloseTo(0.9);
      expect(result.serviceCoverage).toBe(5);
      expect(result.calendarSyncStatus).toBe(true);
      expect(result.stripeOnboardingStatus).toBe(true);
      expect(result.bookingVolumeTrend.last30Days).toBe(15);
      expect(result.bookingVolumeTrend.previous30Days).toBe(10);
      expect(result.bookingVolumeTrend.percentageChange).toBe(50);
      expect(result.switchScore).toBeGreaterThanOrEqual(0);
      expect(result.switchScore).toBeLessThanOrEqual(100);
    });

    it('should return score of 100 for a perfect tenant', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        id: TENANT_ID,
        name: 'Perfect Studio',
        status: 'ACTIVE',
        paymentProviderAccountId: 'acct_456',
      });
      prisma.clientProfile.count
        .mockResolvedValueOnce(50) // totalClients
        .mockResolvedValueOnce(50); // clientsWithEmail (100%)
      prisma.service.count.mockResolvedValue(5); // >= 3
      prisma.calendarConnection.count.mockResolvedValue(2); // has connections
      prisma.booking.count
        .mockResolvedValueOnce(20) // >= 10 in last 30 days
        .mockResolvedValueOnce(15);

      const result = await service.getMigrationReadiness(TENANT_ID);

      expect(result.switchScore).toBe(100);
    });

    it('should return score of 0 for an empty tenant', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        id: TENANT_ID,
        name: 'Empty Studio',
        status: 'ACTIVE',
        paymentProviderAccountId: null,
      });
      prisma.clientProfile.count
        .mockResolvedValueOnce(0) // totalClients
        .mockResolvedValueOnce(0); // clientsWithEmail
      prisma.service.count.mockResolvedValue(0);
      prisma.calendarConnection.count.mockResolvedValue(0);
      prisma.booking.count
        .mockResolvedValueOnce(0) // last 30 days
        .mockResolvedValueOnce(0); // previous 30 days

      const result = await service.getMigrationReadiness(TENANT_ID);

      expect(result.switchScore).toBe(0);
      expect(result.clientCoverage).toBe(0);
      expect(result.calendarSyncStatus).toBe(false);
      expect(result.stripeOnboardingStatus).toBe(false);
    });

    it('should handle tenant with empty string paymentProviderAccountId', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        id: TENANT_ID,
        name: 'Studio',
        status: 'ACTIVE',
        paymentProviderAccountId: '',
      });
      prisma.clientProfile.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      prisma.service.count.mockResolvedValue(0);
      prisma.calendarConnection.count.mockResolvedValue(0);
      prisma.booking.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const result = await service.getMigrationReadiness(TENANT_ID);

      expect(result.stripeOnboardingStatus).toBe(false);
    });

    it('should compute booking volume trend with no previous bookings', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        id: TENANT_ID,
        name: 'New Studio',
        status: 'ACTIVE',
        paymentProviderAccountId: null,
      });
      prisma.clientProfile.count
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(5);
      prisma.service.count.mockResolvedValue(1);
      prisma.calendarConnection.count.mockResolvedValue(0);
      prisma.booking.count
        .mockResolvedValueOnce(5) // last 30 days
        .mockResolvedValueOnce(0); // previous 30 days

      const result = await service.getMigrationReadiness(TENANT_ID);

      expect(result.bookingVolumeTrend.percentageChange).toBe(100);
    });

    it('should compute booking volume trend with zero in both periods', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        id: TENANT_ID,
        name: 'Inactive Studio',
        status: 'ACTIVE',
        paymentProviderAccountId: null,
      });
      prisma.clientProfile.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      prisma.service.count.mockResolvedValue(0);
      prisma.calendarConnection.count.mockResolvedValue(0);
      prisma.booking.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const result = await service.getMigrationReadiness(TENANT_ID);

      expect(result.bookingVolumeTrend.percentageChange).toBe(0);
    });
  });

  describe('getMigrationReadinessSummary', () => {
    it('should return empty summary when no active tenants', async () => {
      prisma.tenant.findMany.mockResolvedValue([]);

      const result = await service.getMigrationReadinessSummary();

      expect(result.totalTenants).toBe(0);
      expect(result.averageSwitchScore).toBe(0);
      expect(result.tenants).toEqual([]);
    });

    it('should return summary across multiple tenants', async () => {
      prisma.tenant.findMany.mockResolvedValue([
        { id: 'tenant-1' },
        { id: 'tenant-2' },
      ]);

      // Tenant 1 — perfect
      prisma.tenant.findUnique
        .mockResolvedValueOnce({
          id: 'tenant-1',
          name: 'Studio A',
          status: 'ACTIVE',
          paymentProviderAccountId: 'acct_1',
        })
        // Tenant 2 — empty
        .mockResolvedValueOnce({
          id: 'tenant-2',
          name: 'Studio B',
          status: 'ACTIVE',
          paymentProviderAccountId: null,
        });

      prisma.clientProfile.count
        // Tenant 1
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(10) // with email
        // Tenant 2
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      prisma.service.count
        .mockResolvedValueOnce(5) // Tenant 1
        .mockResolvedValueOnce(0); // Tenant 2

      prisma.calendarConnection.count
        .mockResolvedValueOnce(1) // Tenant 1
        .mockResolvedValueOnce(0); // Tenant 2

      prisma.booking.count
        .mockResolvedValueOnce(15) // Tenant 1 last 30
        .mockResolvedValueOnce(10) // Tenant 1 prev 30
        .mockResolvedValueOnce(0)  // Tenant 2 last 30
        .mockResolvedValueOnce(0); // Tenant 2 prev 30

      const result = await service.getMigrationReadinessSummary();

      expect(result.totalTenants).toBe(2);
      expect(result.tenants).toHaveLength(2);
      expect(result.averageSwitchScore).toBeGreaterThan(0);
      expect(result.averageSwitchScore).toBeLessThanOrEqual(100);
    });
  });
});
