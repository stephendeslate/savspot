import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { ServicesService } from '@/services/services.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const SERVICE_ID = 'svc-001';

function makePrisma() {
  return {
    service: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      aggregate: vi.fn(),
    },
  };
}

function makeRedis() {
  return {
    get: vi.fn().mockResolvedValue(null),
    setex: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    getClient: vi.fn(),
  };
}

function makeService(overrides: Record<string, unknown> = {}) {
  return {
    id: SERVICE_ID,
    tenantId: TENANT_ID,
    name: 'Haircut',
    description: 'A basic haircut',
    durationMinutes: 30,
    basePrice: 25,
    currency: 'USD',
    pricingModel: 'FIXED',
    confirmationMode: 'AUTO_CONFIRM',
    categoryId: null,
    venueId: null,
    bufferBeforeMinutes: 0,
    bufferAfterMinutes: 0,
    isActive: true,
    sortOrder: 0,
    autoCancelOnOverdue: null,
    maxRescheduleCount: null,
    noShowGraceMinutes: null,
    approvalDeadlineHours: null,
    contractTemplateId: null,
    guestConfig: null,
    tierConfig: null,
    depositConfig: null,
    intakeFormConfig: null,
    cancellationPolicy: null,
    preferenceTemplate: null,
    category: null,
    venue: null,
    ...overrides,
  };
}

describe('ServicesService', () => {
  let service: ServicesService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new ServicesService(prisma as never, makeRedis() as never);
  });

  // ---------- findAll ----------

  describe('findAll', () => {
    it('returns active services for a tenant ordered by sortOrder', async () => {
      prisma.service.findMany.mockResolvedValue([makeService()]);

      const result = await service.findAll(TENANT_ID);

      expect(result).toHaveLength(1);
      expect(prisma.service.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID, isActive: true },
          orderBy: { sortOrder: 'asc' },
        }),
      );
    });

    it('returns empty array when no active services', async () => {
      prisma.service.findMany.mockResolvedValue([]);

      const result = await service.findAll(TENANT_ID);

      expect(result).toEqual([]);
    });
  });

  // ---------- findById ----------

  describe('findById', () => {
    it('returns service when found', async () => {
      prisma.service.findFirst.mockResolvedValue(makeService());

      const result = await service.findById(TENANT_ID, SERVICE_ID);

      expect(result.id).toBe(SERVICE_ID);
    });

    it('throws NotFoundException when service not found', async () => {
      prisma.service.findFirst.mockResolvedValue(null);

      await expect(
        service.findById(TENANT_ID, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('enforces tenant isolation by including tenantId in query', async () => {
      prisma.service.findFirst.mockResolvedValue(makeService());

      await service.findById(TENANT_ID, SERVICE_ID);

      expect(prisma.service.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: SERVICE_ID, tenantId: TENANT_ID },
        }),
      );
    });
  });

  // ---------- create ----------

  describe('create', () => {
    it('creates a service with defaults', async () => {
      prisma.service.create.mockResolvedValue(makeService());

      const dto = { name: 'Haircut', currency: 'USD' };
      const result = await service.create(TENANT_ID, dto as never);

      expect(result.name).toBe('Haircut');
      expect(prisma.service.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_ID,
            durationMinutes: 60,
            basePrice: 0,
            pricingModel: 'FIXED',
            confirmationMode: 'AUTO_CONFIRM',
          }),
        }),
      );
    });

    it('uses provided values over defaults', async () => {
      prisma.service.create.mockResolvedValue(makeService({ durationMinutes: 90 }));

      const dto = {
        name: 'Deep Clean',
        currency: 'USD',
        durationMinutes: 90,
        basePrice: 100,
        pricingModel: 'HOURLY',
        confirmationMode: 'MANUAL_APPROVAL',
      };
      await service.create(TENANT_ID, dto as never);

      expect(prisma.service.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            durationMinutes: 90,
            basePrice: 100,
            pricingModel: 'HOURLY',
            confirmationMode: 'MANUAL_APPROVAL',
          }),
        }),
      );
    });
  });

  // ---------- update ----------

  describe('update', () => {
    it('updates service fields', async () => {
      prisma.service.findFirst.mockResolvedValue(makeService());
      prisma.service.update.mockResolvedValue(
        makeService({ name: 'Premium Haircut', basePrice: 50 }),
      );

      const result = await service.update(TENANT_ID, SERVICE_ID, {
        name: 'Premium Haircut',
        basePrice: 50,
      } as never);

      expect(result.name).toBe('Premium Haircut');
    });

    it('throws NotFoundException when service does not exist', async () => {
      prisma.service.findFirst.mockResolvedValue(null);

      await expect(
        service.update(TENANT_ID, 'nonexistent', { name: 'X' } as never),
      ).rejects.toThrow(NotFoundException);
    });

    it('handles JSON field updates', async () => {
      prisma.service.findFirst.mockResolvedValue(makeService());
      prisma.service.update.mockResolvedValue(makeService());

      await service.update(TENANT_ID, SERVICE_ID, {
        guestConfig: { min: 1, max: 10 },
        depositConfig: { required: true, percent: 50 },
      } as never);

      expect(prisma.service.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            guestConfig: { min: 1, max: 10 },
            depositConfig: { required: true, percent: 50 },
          }),
        }),
      );
    });
  });

  // ---------- remove ----------

  describe('remove', () => {
    it('soft-deletes by setting isActive to false', async () => {
      prisma.service.findFirst.mockResolvedValue(makeService());
      prisma.service.update.mockResolvedValue(makeService({ isActive: false }));

      const result = await service.remove(TENANT_ID, SERVICE_ID);

      expect(result.message).toBe('Service deactivated successfully');
      expect(prisma.service.update).toHaveBeenCalledWith({
        where: { id: SERVICE_ID },
        data: { isActive: false },
      });
    });

    it('throws NotFoundException when service not found', async () => {
      prisma.service.findFirst.mockResolvedValue(null);

      await expect(
        service.remove(TENANT_ID, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ---------- getPreferenceTemplate ----------

  describe('getPreferenceTemplate', () => {
    it('returns the preference template for a service', async () => {
      const template = { hairType: 'straight', length: 'medium' };
      prisma.service.findFirst.mockResolvedValue(
        makeService({ preferenceTemplate: template }),
      );

      const result = await service.getPreferenceTemplate(TENANT_ID, SERVICE_ID);

      expect(result.template).toEqual(template);
      expect(result.serviceId).toBe(SERVICE_ID);
    });

    it('returns null template when not set', async () => {
      prisma.service.findFirst.mockResolvedValue(makeService());

      const result = await service.getPreferenceTemplate(TENANT_ID, SERVICE_ID);

      expect(result.template).toBeNull();
    });
  });

  // ---------- setPreferenceTemplate ----------

  describe('setPreferenceTemplate', () => {
    it('sets the preference template', async () => {
      const template = { color: ['red', 'blue'] };
      prisma.service.findFirst.mockResolvedValue(makeService());
      prisma.service.update.mockResolvedValue({
        id: SERVICE_ID,
        preferenceTemplate: template,
      });

      const result = await service.setPreferenceTemplate(
        TENANT_ID,
        SERVICE_ID,
        template,
      );

      expect(result.template).toEqual(template);
    });

    it('throws NotFoundException when service not found', async () => {
      prisma.service.findFirst.mockResolvedValue(null);

      await expect(
        service.setPreferenceTemplate(TENANT_ID, 'nonexistent', {}),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ---------- copy ----------

  describe('copy', () => {
    it('copies a service with (Copy) suffix and incremented sort order', async () => {
      prisma.service.findFirst.mockResolvedValue(makeService());
      prisma.service.aggregate.mockResolvedValue({ _max: { sortOrder: 5 } });
      prisma.service.create.mockResolvedValue(
        makeService({ id: 'svc-copy', name: 'Haircut (Copy)', sortOrder: 6 }),
      );

      const result = await service.copy(TENANT_ID, SERVICE_ID);

      expect(result.name).toBe('Haircut (Copy)');
      expect(prisma.service.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Haircut (Copy)',
            sortOrder: 6,
          }),
        }),
      );
    });

    it('throws NotFoundException when source service not found', async () => {
      prisma.service.findFirst.mockResolvedValue(null);

      await expect(
        service.copy(TENANT_ID, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('starts from sortOrder 1 when no existing services', async () => {
      prisma.service.findFirst.mockResolvedValue(makeService());
      prisma.service.aggregate.mockResolvedValue({ _max: { sortOrder: null } });
      prisma.service.create.mockResolvedValue(makeService({ sortOrder: 1 }));

      await service.copy(TENANT_ID, SERVICE_ID);

      expect(prisma.service.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ sortOrder: 1 }),
        }),
      );
    });
  });
});
