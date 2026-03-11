import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { EmbedService } from '@/embed/embed.service';

const SLUG = 'acme-salon';
const TENANT_ID = 'tenant-001';
const SERVICE_ID = 'service-001';

function makePrisma() {
  const prisma = {
    tenant: { findUnique: vi.fn() },
    service: { findMany: vi.fn(), findFirst: vi.fn() },
    bookingSession: { create: vi.fn() },
    $executeRaw: vi.fn().mockResolvedValue(0),
    $transaction: vi.fn(),
  };
  prisma.$transaction.mockImplementation(
    (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma),
  );
  return prisma;
}

function makeAvailabilityService() {
  return {
    getAvailableSlots: vi.fn().mockResolvedValue([]),
  };
}

describe('EmbedService', () => {
  let service: EmbedService;
  let prisma: ReturnType<typeof makePrisma>;
  let availabilityService: ReturnType<typeof makeAvailabilityService>;

  beforeEach(() => {
    prisma = makePrisma();
    availabilityService = makeAvailabilityService();
    service = new EmbedService(prisma as never, availabilityService as never);
  });

  describe('getWidgetConfig', () => {
    const activeTenant = {
      id: TENANT_ID,
      name: 'Acme Salon',
      slug: SLUG,
      logoUrl: null,
      brandColor: '#6366f1',
      category: 'SALON',
      subscriptionTier: 'FREE',
      status: 'ACTIVE',
    };

    it('should return widget config for active tenant', async () => {
      prisma.tenant.findUnique.mockResolvedValue(activeTenant);

      const result = await service.getWidgetConfig(SLUG);
      expect(result.name).toBe('Acme Salon');
      expect(result.slug).toBe(SLUG);
      expect(result.brandColor).toBe('#6366f1');
      expect(result.businessType).toBe('SALON');
      expect(result.allowedModes).toEqual(['button']);
    });

    it('should allow popup and inline for premium tier', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        ...activeTenant,
        subscriptionTier: 'PREMIUM',
      });

      const result = await service.getWidgetConfig(SLUG);
      expect(result.allowedModes).toEqual(['button', 'popup', 'inline']);
    });

    it('should throw NotFoundException for missing tenant', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);
      await expect(service.getWidgetConfig('no-exist')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException for inactive tenant', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        ...activeTenant,
        status: 'SUSPENDED',
      });
      await expect(service.getWidgetConfig(SLUG)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getAvailableServices', () => {
    it('should return services for active tenant', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        id: TENANT_ID,
        status: 'ACTIVE',
      });
      const services = [{ id: SERVICE_ID, name: 'Haircut' }];
      prisma.service.findMany.mockResolvedValue(services);

      const result = await service.getAvailableServices(SLUG);
      expect(result).toEqual(services);
      expect(prisma.$executeRaw).toHaveBeenCalled();
    });

    it('should throw NotFoundException for missing tenant', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);
      await expect(service.getAvailableServices('no-exist')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getAvailability', () => {
    it('should delegate to AvailabilityService', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        id: TENANT_ID,
        status: 'ACTIVE',
      });
      const slots = [{ date: '2026-03-15', startTime: '09:00', endTime: '10:00' }];
      availabilityService.getAvailableSlots.mockResolvedValue(slots);

      const result = await service.getAvailability(SLUG, SERVICE_ID, '2026-03-15');
      expect(result).toEqual(slots);
      expect(availabilityService.getAvailableSlots).toHaveBeenCalledWith({
        tenantId: TENANT_ID,
        serviceId: SERVICE_ID,
        startDate: '2026-03-15',
        endDate: '2026-03-15',
      });
    });

    it('should throw NotFoundException for missing tenant', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);
      await expect(
        service.getAvailability('no-exist', SERVICE_ID, '2026-03-15'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createBookingSession', () => {
    const dto = {
      serviceId: SERVICE_ID,
      clientEmail: 'test@example.com',
      clientName: 'Test User',
    };

    it('should create a booking session', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        id: TENANT_ID,
        status: 'ACTIVE',
      });
      prisma.service.findFirst.mockResolvedValue({
        id: SERVICE_ID,
        name: 'Haircut',
      });
      const session = { id: 'session-1', serviceId: SERVICE_ID, status: 'IN_PROGRESS', createdAt: new Date() };
      prisma.bookingSession.create.mockResolvedValue(session);

      const result = await service.createBookingSession(SLUG, dto);
      expect(result.id).toBe('session-1');
      expect(result.status).toBe('IN_PROGRESS');
    });

    it('should throw NotFoundException for inactive tenant', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        id: TENANT_ID,
        status: 'SUSPENDED',
      });
      await expect(
        service.createBookingSession(SLUG, dto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for missing service', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        id: TENANT_ID,
        status: 'ACTIVE',
      });
      prisma.service.findFirst.mockResolvedValue(null);
      await expect(
        service.createBookingSession(SLUG, dto),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
