import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ServiceProvidersService } from '@/services/service-providers.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const SERVICE_ID = 'service-001';
const USER_ID = 'user-001';

function makePrisma() {
  return {
    service: { findFirst: vi.fn() },
    user: { findUnique: vi.fn() },
    serviceProvider: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('ServiceProvidersService', () => {
  let service: ServiceProvidersService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new ServiceProvidersService(prisma as never);
  });

  // -----------------------------------------------------------------------
  // listProviders
  // -----------------------------------------------------------------------

  describe('listProviders', () => {
    it('should return providers with user info', async () => {
      prisma.service.findFirst.mockResolvedValue({ id: SERVICE_ID });
      const providers = [
        { serviceId: SERVICE_ID, userId: USER_ID, user: { id: USER_ID, name: 'John', email: 'john@test.com' } },
      ];
      prisma.serviceProvider.findMany.mockResolvedValue(providers);

      const result = await service.listProviders(TENANT_ID, SERVICE_ID);
      expect(result).toEqual(providers);
      expect(prisma.serviceProvider.findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID, serviceId: SERVICE_ID },
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'asc' },
      });
    });

    it('should throw NotFoundException when service does not exist', async () => {
      prisma.service.findFirst.mockResolvedValue(null);
      await expect(service.listProviders(TENANT_ID, SERVICE_ID))
        .rejects.toThrow(NotFoundException);
    });
  });

  // -----------------------------------------------------------------------
  // assignProvider
  // -----------------------------------------------------------------------

  describe('assignProvider', () => {
    it('should assign a provider to a service', async () => {
      prisma.service.findFirst.mockResolvedValue({ id: SERVICE_ID });
      prisma.user.findUnique.mockResolvedValue({ id: USER_ID });
      prisma.serviceProvider.findUnique.mockResolvedValue(null);
      const created = {
        serviceId: SERVICE_ID,
        userId: USER_ID,
        tenantId: TENANT_ID,
        user: { id: USER_ID, name: 'John', email: 'john@test.com' },
      };
      prisma.serviceProvider.create.mockResolvedValue(created);

      const result = await service.assignProvider(TENANT_ID, SERVICE_ID, USER_ID);
      expect(result).toEqual(created);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      prisma.service.findFirst.mockResolvedValue({ id: SERVICE_ID });
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.assignProvider(TENANT_ID, SERVICE_ID, USER_ID))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when provider already assigned', async () => {
      prisma.service.findFirst.mockResolvedValue({ id: SERVICE_ID });
      prisma.user.findUnique.mockResolvedValue({ id: USER_ID });
      prisma.serviceProvider.findUnique.mockResolvedValue({
        serviceId: SERVICE_ID,
        userId: USER_ID,
      });

      await expect(service.assignProvider(TENANT_ID, SERVICE_ID, USER_ID))
        .rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException when service does not exist', async () => {
      prisma.service.findFirst.mockResolvedValue(null);
      await expect(service.assignProvider(TENANT_ID, SERVICE_ID, USER_ID))
        .rejects.toThrow(NotFoundException);
    });
  });

  // -----------------------------------------------------------------------
  // unassignProvider
  // -----------------------------------------------------------------------

  describe('unassignProvider', () => {
    it('should unassign a provider', async () => {
      prisma.service.findFirst.mockResolvedValue({ id: SERVICE_ID });
      prisma.serviceProvider.findUnique.mockResolvedValue({
        serviceId: SERVICE_ID,
        userId: USER_ID,
      });
      prisma.serviceProvider.delete.mockResolvedValue({});

      const result = await service.unassignProvider(TENANT_ID, SERVICE_ID, USER_ID);
      expect(result.message).toBe('Provider unassigned successfully');
      expect(prisma.serviceProvider.delete).toHaveBeenCalledWith({
        where: { serviceId_userId: { serviceId: SERVICE_ID, userId: USER_ID } },
      });
    });

    it('should throw NotFoundException when assignment does not exist', async () => {
      prisma.service.findFirst.mockResolvedValue({ id: SERVICE_ID });
      prisma.serviceProvider.findUnique.mockResolvedValue(null);
      await expect(service.unassignProvider(TENANT_ID, SERVICE_ID, USER_ID))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when service does not exist', async () => {
      prisma.service.findFirst.mockResolvedValue(null);
      await expect(service.unassignProvider(TENANT_ID, SERVICE_ID, USER_ID))
        .rejects.toThrow(NotFoundException);
    });
  });
});
