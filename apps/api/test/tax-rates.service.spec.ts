import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { TaxRatesService } from '@/tax-rates/tax-rates.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const TAX_RATE_ID = 'tax-001';

function makePrisma() {
  return {
    taxRate: {
      findMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  };
}

function makeTaxRate(overrides: Record<string, unknown> = {}) {
  return {
    id: TAX_RATE_ID,
    tenantId: TENANT_ID,
    name: 'Sales Tax',
    rate: 8.875,
    region: 'NY',
    isInclusive: false,
    isDefault: false,
    isActive: true,
    createdAt: new Date('2026-03-01T00:00:00Z'),
    updatedAt: new Date('2026-03-01T00:00:00Z'),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('TaxRatesService', () => {
  let service: TaxRatesService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new TaxRatesService(prisma as never);
  });

  // -----------------------------------------------------------------------
  // findAll
  // -----------------------------------------------------------------------

  describe('findAll', () => {
    it('should return all tax rates for the tenant ordered by name', async () => {
      const rates = [makeTaxRate(), makeTaxRate({ id: 'tax-002', name: 'VAT' })];
      prisma.taxRate.findMany.mockResolvedValue(rates);

      const result = await service.findAll(TENANT_ID);

      expect(result).toEqual(rates);
      expect(prisma.taxRate.findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID },
        orderBy: { name: 'asc' },
      });
    });

    it('should return empty array when no tax rates exist', async () => {
      prisma.taxRate.findMany.mockResolvedValue([]);

      const result = await service.findAll(TENANT_ID);

      expect(result).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // create
  // -----------------------------------------------------------------------

  describe('create', () => {
    it('should create a tax rate with required fields', async () => {
      const rate = makeTaxRate();
      prisma.taxRate.create.mockResolvedValue(rate);

      const result = await service.create(TENANT_ID, {
        name: 'Sales Tax',
        rate: 8.875,
      });

      expect(result).toEqual(rate);
      expect(prisma.taxRate.create).toHaveBeenCalledWith({
        data: {
          tenantId: TENANT_ID,
          name: 'Sales Tax',
          rate: 8.875,
          region: null,
          isInclusive: false,
          isDefault: false,
        },
      });
    });

    it('should unset existing default when creating a new default rate', async () => {
      const rate = makeTaxRate({ isDefault: true });
      prisma.taxRate.updateMany.mockResolvedValue({ count: 1 });
      prisma.taxRate.create.mockResolvedValue(rate);

      await service.create(TENANT_ID, {
        name: 'New Default Tax',
        rate: 10,
        isDefault: true,
      });

      expect(prisma.taxRate.updateMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID, isDefault: true },
        data: { isDefault: false },
      });
    });

    it('should not unset defaults when isDefault is false', async () => {
      prisma.taxRate.create.mockResolvedValue(makeTaxRate());

      await service.create(TENANT_ID, {
        name: 'Non-default Tax',
        rate: 5,
        isDefault: false,
      });

      expect(prisma.taxRate.updateMany).not.toHaveBeenCalled();
    });

    it('should pass optional fields when provided', async () => {
      prisma.taxRate.create.mockResolvedValue(
        makeTaxRate({ region: 'CA', isInclusive: true }),
      );

      await service.create(TENANT_ID, {
        name: 'CA Sales Tax',
        rate: 7.25,
        region: 'CA',
        isInclusive: true,
      });

      expect(prisma.taxRate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          region: 'CA',
          isInclusive: true,
        }),
      });
    });
  });

  // -----------------------------------------------------------------------
  // update
  // -----------------------------------------------------------------------

  describe('update', () => {
    it('should update an existing tax rate', async () => {
      const existing = makeTaxRate();
      const updated = makeTaxRate({ name: 'Updated Tax' });
      prisma.taxRate.findFirst.mockResolvedValue(existing);
      prisma.taxRate.update.mockResolvedValue(updated);

      const result = await service.update(TENANT_ID, TAX_RATE_ID, {
        name: 'Updated Tax',
      });

      expect(result).toEqual(updated);
      expect(prisma.taxRate.update).toHaveBeenCalledWith({
        where: { id: TAX_RATE_ID },
        data: { name: 'Updated Tax' },
      });
    });

    it('should throw NotFoundException for non-existent tax rate', async () => {
      prisma.taxRate.findFirst.mockResolvedValue(null);

      await expect(
        service.update(TENANT_ID, 'nonexistent', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should unset other defaults when setting as default', async () => {
      prisma.taxRate.findFirst.mockResolvedValue(makeTaxRate());
      prisma.taxRate.updateMany.mockResolvedValue({ count: 1 });
      prisma.taxRate.update.mockResolvedValue(makeTaxRate({ isDefault: true }));

      await service.update(TENANT_ID, TAX_RATE_ID, { isDefault: true });

      expect(prisma.taxRate.updateMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID, isDefault: true, id: { not: TAX_RATE_ID } },
        data: { isDefault: false },
      });
    });

    it('should only include provided fields in the update', async () => {
      prisma.taxRate.findFirst.mockResolvedValue(makeTaxRate());
      prisma.taxRate.update.mockResolvedValue(makeTaxRate({ rate: 10 }));

      await service.update(TENANT_ID, TAX_RATE_ID, { rate: 10 });

      expect(prisma.taxRate.update).toHaveBeenCalledWith({
        where: { id: TAX_RATE_ID },
        data: { rate: 10 },
      });
    });
  });

  // -----------------------------------------------------------------------
  // remove
  // -----------------------------------------------------------------------

  describe('remove', () => {
    it('should soft delete by setting isActive to false', async () => {
      prisma.taxRate.findFirst.mockResolvedValue(makeTaxRate());
      prisma.taxRate.update.mockResolvedValue(makeTaxRate({ isActive: false }));

      const result = await service.remove(TENANT_ID, TAX_RATE_ID);

      expect(result.isActive).toBe(false);
      expect(prisma.taxRate.update).toHaveBeenCalledWith({
        where: { id: TAX_RATE_ID },
        data: { isActive: false },
      });
    });

    it('should throw NotFoundException for non-existent tax rate', async () => {
      prisma.taxRate.findFirst.mockResolvedValue(null);

      await expect(
        service.remove(TENANT_ID, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
