import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { BusinessesController } from '@/public-api/v1/controllers/businesses.controller';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePrisma() {
  return {
    tenant: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
  };
}

function makeTenant(overrides: Record<string, unknown> = {}) {
  return {
    id: 'tenant-001',
    name: 'Test Salon',
    slug: 'test-salon',
    description: 'A test salon',
    category: 'SALON',
    categoryLabel: 'Hair Salon',
    address: { city: 'NY' },
    contactEmail: 'test@example.com',
    contactPhone: '+15551234',
    logoUrl: null,
    coverPhotoUrl: null,
    timezone: 'America/New_York',
    currency: 'USD',
    ...overrides,
  };
}

describe('BusinessesController', () => {
  let controller: BusinessesController;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    controller = new BusinessesController(prisma as never);
  });

  // ---------- listBusinesses ----------

  describe('listBusinesses', () => {
    it('returns paginated list of businesses', async () => {
      const tenants = [makeTenant()];
      prisma.tenant.findMany.mockResolvedValue(tenants);

      const result = await controller.listBusinesses({} as never);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].bookingPageUrl).toBe('/book/test-salon');
      expect(result.pagination.has_more).toBe(false);
    });

    it('sets has_more to true when more results exist', async () => {
      // Default limit is 20, so 21 results means has_more = true
      const tenants = Array.from({ length: 21 }, (_, i) =>
        makeTenant({ id: `t-${i}`, slug: `t-${i}` }),
      );
      prisma.tenant.findMany.mockResolvedValue(tenants);

      const result = await controller.listBusinesses({} as never);

      expect(result.pagination.has_more).toBe(true);
      expect(result.data).toHaveLength(20);
      expect(result.pagination.next_cursor).toBe('t-19');
    });

    it('filters by category when provided', async () => {
      prisma.tenant.findMany.mockResolvedValue([]);

      await controller.listBusinesses({ category: 'SALON' } as never);

      expect(prisma.tenant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ category: 'SALON' }),
        }),
      );
    });

    it('filters by query when provided', async () => {
      prisma.tenant.findMany.mockResolvedValue([]);

      await controller.listBusinesses({ query: 'hair' } as never);

      expect(prisma.tenant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: { contains: 'hair', mode: 'insensitive' },
          }),
        }),
      );
    });

    it('uses cursor-based pagination', async () => {
      prisma.tenant.findMany.mockResolvedValue([makeTenant()]);

      await controller.listBusinesses({ cursor: 'cursor-id' } as never);

      expect(prisma.tenant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          cursor: { id: 'cursor-id' },
          skip: 1,
        }),
      );
    });
  });

  // ---------- getBusinessDetail ----------

  describe('getBusinessDetail', () => {
    it('returns business details with services count', async () => {
      prisma.tenant.findFirst.mockResolvedValue({
        ...makeTenant(),
        _count: { services: 5 },
      });

      const result = await controller.getBusinessDetail('tenant-001');

      expect(result.data.servicesCount).toBe(5);
      expect(result.data.id).toBe('tenant-001');
    });

    it('throws NotFoundException when business not found', async () => {
      prisma.tenant.findFirst.mockResolvedValue(null);

      await expect(
        controller.getBusinessDetail('nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
