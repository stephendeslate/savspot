import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { ServiceCategoriesService } from '@/services/service-categories.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const CATEGORY_ID = 'cat-001';

function makePrisma() {
  return {
    serviceCategory: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
}

function makeCategory(overrides: Record<string, unknown> = {}) {
  return {
    id: CATEGORY_ID,
    tenantId: TENANT_ID,
    name: 'Hair Services',
    description: 'All hair-related services',
    sortOrder: 0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('ServiceCategoriesService', () => {
  let service: ServiceCategoriesService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new ServiceCategoriesService(prisma as never);
  });

  // ---------- findAll ----------

  describe('findAll', () => {
    it('should return categories ordered by sortOrder', async () => {
      prisma.serviceCategory.findMany.mockResolvedValue([makeCategory()]);

      const result = await service.findAll(TENANT_ID);

      expect(result).toHaveLength(1);
      expect(prisma.serviceCategory.findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID },
        orderBy: { sortOrder: 'asc' },
      });
    });
  });

  // ---------- findById ----------

  describe('findById', () => {
    it('should return category when found', async () => {
      prisma.serviceCategory.findFirst.mockResolvedValue(makeCategory());

      const result = await service.findById(TENANT_ID, CATEGORY_ID);

      expect(result.id).toBe(CATEGORY_ID);
    });

    it('should throw NotFoundException when not found', async () => {
      prisma.serviceCategory.findFirst.mockResolvedValue(null);

      await expect(
        service.findById(TENANT_ID, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ---------- create ----------

  describe('create', () => {
    it('should create category with defaults', async () => {
      prisma.serviceCategory.create.mockResolvedValue(makeCategory());

      await service.create(TENANT_ID, { name: 'Hair Services' } as never);

      expect(prisma.serviceCategory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TENANT_ID,
          name: 'Hair Services',
          sortOrder: 0,
        }),
      });
    });

    it('should use provided sortOrder', async () => {
      prisma.serviceCategory.create.mockResolvedValue(
        makeCategory({ sortOrder: 5 }),
      );

      await service.create(TENANT_ID, {
        name: 'Nails',
        sortOrder: 5,
      } as never);

      expect(prisma.serviceCategory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ sortOrder: 5 }),
      });
    });
  });

  // ---------- update ----------

  describe('update', () => {
    it('should throw NotFoundException when category does not exist', async () => {
      prisma.serviceCategory.findFirst.mockResolvedValue(null);

      await expect(
        service.update(TENANT_ID, 'nonexistent', { name: 'X' } as never),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update category', async () => {
      prisma.serviceCategory.findFirst.mockResolvedValue(makeCategory());
      prisma.serviceCategory.update.mockResolvedValue(
        makeCategory({ name: 'Renamed' }),
      );

      const result = await service.update(TENANT_ID, CATEGORY_ID, {
        name: 'Renamed',
      } as never);

      expect(result.name).toBe('Renamed');
    });
  });

  // ---------- remove ----------

  describe('remove', () => {
    it('should delete category and return success message', async () => {
      prisma.serviceCategory.findFirst.mockResolvedValue(makeCategory());
      prisma.serviceCategory.delete.mockResolvedValue(makeCategory());

      const result = await service.remove(TENANT_ID, CATEGORY_ID);

      expect(result.message).toBe('Service category deleted successfully');
      expect(prisma.serviceCategory.delete).toHaveBeenCalledWith({
        where: { id: CATEGORY_ID },
      });
    });

    it('should throw NotFoundException when category not found', async () => {
      prisma.serviceCategory.findFirst.mockResolvedValue(null);

      await expect(
        service.remove(TENANT_ID, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
