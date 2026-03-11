import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { ServiceAddonsService } from '@/services/service-addons.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const SERVICE_ID = 'service-001';
const ADDON_ID = 'addon-001';

function makePrisma() {
  return {
    service: { findFirst: vi.fn() },
    serviceAddon: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('ServiceAddonsService', () => {
  let service: ServiceAddonsService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new ServiceAddonsService(prisma as never);
  });

  // -----------------------------------------------------------------------
  // listAddons
  // -----------------------------------------------------------------------

  describe('listAddons', () => {
    it('should return active addons sorted by sortOrder', async () => {
      prisma.service.findFirst.mockResolvedValue({ id: SERVICE_ID });
      const addons = [
        { id: 'a1', name: 'Setup', sortOrder: 0 },
        { id: 'a2', name: 'Cleanup', sortOrder: 1 },
      ];
      prisma.serviceAddon.findMany.mockResolvedValue(addons);

      const result = await service.listAddons(TENANT_ID, SERVICE_ID);
      expect(result).toEqual(addons);
      expect(prisma.serviceAddon.findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID, serviceId: SERVICE_ID, isActive: true },
        orderBy: { sortOrder: 'asc' },
      });
    });

    it('should throw NotFoundException when service does not exist', async () => {
      prisma.service.findFirst.mockResolvedValue(null);
      await expect(service.listAddons(TENANT_ID, SERVICE_ID))
        .rejects.toThrow(NotFoundException);
    });
  });

  // -----------------------------------------------------------------------
  // createAddon
  // -----------------------------------------------------------------------

  describe('createAddon', () => {
    it('should create an addon with required fields', async () => {
      prisma.service.findFirst.mockResolvedValue({ id: SERVICE_ID });
      const created = { id: ADDON_ID, name: 'Premium Setup', price: 25 };
      prisma.serviceAddon.create.mockResolvedValue(created);

      const result = await service.createAddon(TENANT_ID, SERVICE_ID, {
        name: 'Premium Setup',
        price: 25,
      });
      expect(result).toEqual(created);
      expect(prisma.serviceAddon.create).toHaveBeenCalledWith({
        data: {
          tenantId: TENANT_ID,
          serviceId: SERVICE_ID,
          name: 'Premium Setup',
          description: undefined,
          price: 25,
          isRequired: false,
          sortOrder: 0,
        },
      });
    });

    it('should throw NotFoundException when service does not exist', async () => {
      prisma.service.findFirst.mockResolvedValue(null);
      await expect(
        service.createAddon(TENANT_ID, SERVICE_ID, { name: 'Test', price: 10 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // -----------------------------------------------------------------------
  // updateAddon
  // -----------------------------------------------------------------------

  describe('updateAddon', () => {
    it('should partial update an addon', async () => {
      prisma.serviceAddon.findFirst.mockResolvedValue({ id: ADDON_ID });
      prisma.serviceAddon.update.mockResolvedValue({
        id: ADDON_ID,
        name: 'Updated Name',
      });

      const result = await service.updateAddon(TENANT_ID, SERVICE_ID, ADDON_ID, {
        name: 'Updated Name',
      });
      expect(result.name).toBe('Updated Name');
      expect(prisma.serviceAddon.update).toHaveBeenCalledWith({
        where: { id: ADDON_ID },
        data: { name: 'Updated Name' },
      });
    });

    it('should throw NotFoundException when addon does not exist', async () => {
      prisma.serviceAddon.findFirst.mockResolvedValue(null);
      await expect(
        service.updateAddon(TENANT_ID, SERVICE_ID, 'bad-id', { name: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // -----------------------------------------------------------------------
  // deleteAddon (soft delete)
  // -----------------------------------------------------------------------

  describe('deleteAddon', () => {
    it('should soft-delete by setting isActive=false', async () => {
      prisma.serviceAddon.findFirst.mockResolvedValue({ id: ADDON_ID });
      prisma.serviceAddon.update.mockResolvedValue({ id: ADDON_ID, isActive: false });

      const result = await service.deleteAddon(TENANT_ID, SERVICE_ID, ADDON_ID);
      expect(result.message).toBe('Add-on deactivated successfully');
      expect(prisma.serviceAddon.update).toHaveBeenCalledWith({
        where: { id: ADDON_ID },
        data: { isActive: false },
      });
    });

    it('should throw NotFoundException when addon does not exist', async () => {
      prisma.serviceAddon.findFirst.mockResolvedValue(null);
      await expect(
        service.deleteAddon(TENANT_ID, SERVICE_ID, 'bad-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
