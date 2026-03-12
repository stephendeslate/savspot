import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { ServicesController } from '@/public-api/v1/controllers/services.controller';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePrisma() {
  return {
    tenant: {
      findFirst: vi.fn(),
    },
    service: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    serviceAddon: {
      findMany: vi.fn(),
    },
  };
}

function makeService(overrides: Record<string, unknown> = {}) {
  return {
    id: 'svc-001',
    name: 'Haircut',
    description: 'A basic haircut',
    durationMinutes: 30,
    basePrice: 25,
    currency: 'USD',
    pricingModel: 'FIXED',
    guestConfig: null,
    category: { id: 'cat-1', name: 'Hair' },
    ...overrides,
  };
}

describe('ServicesController (Public API)', () => {
  let controller: ServicesController;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    controller = new ServicesController(prisma as never);
  });

  // ---------- listServicesForBusiness ----------

  describe('listServicesForBusiness', () => {
    it('returns services for a published business', async () => {
      prisma.tenant.findFirst.mockResolvedValue({ id: 'biz-1' });
      prisma.service.findMany.mockResolvedValue([makeService()]);

      const result = await controller.listServicesForBusiness('biz-1', {} as never);

      expect(result.data).toHaveLength(1);
      expect(result.data[0]!.name).toBe('Haircut');
    });

    it('throws NotFoundException when business not found', async () => {
      prisma.tenant.findFirst.mockResolvedValue(null);

      await expect(
        controller.listServicesForBusiness('nope', {} as never),
      ).rejects.toThrow(NotFoundException);
    });

    it('filters by categoryId when provided', async () => {
      prisma.tenant.findFirst.mockResolvedValue({ id: 'biz-1' });
      prisma.service.findMany.mockResolvedValue([]);

      await controller.listServicesForBusiness('biz-1', {
        categoryId: 'cat-1',
      } as never);

      expect(prisma.service.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ categoryId: 'cat-1' }),
        }),
      );
    });
  });

  // ---------- getServiceDetail ----------

  describe('getServiceDetail', () => {
    it('returns service details with add-ons', async () => {
      prisma.service.findFirst.mockResolvedValue(makeService());
      prisma.serviceAddon.findMany.mockResolvedValue([
        { id: 'addon-1', name: 'Deep Conditioning', description: null, price: 10 },
      ]);

      const result = await controller.getServiceDetail('svc-001');

      expect(result.data.addOns).toHaveLength(1);
      expect(result.data.addOns[0]!.name).toBe('Deep Conditioning');
    });

    it('throws NotFoundException when service not found', async () => {
      prisma.service.findFirst.mockResolvedValue(null);

      await expect(
        controller.getServiceDetail('nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
