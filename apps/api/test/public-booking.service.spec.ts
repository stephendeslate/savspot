import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { PublicBookingService } from '@/public-booking/public-booking.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SLUG = 'acme-salon';
const TENANT_ID = 'tenant-001';
const SERVICE_ID = 'service-001';

function makePrisma() {
  return {
    tenant: { findUnique: vi.fn() },
    service: { findFirst: vi.fn() },
    availabilityRule: { findMany: vi.fn() },
    $executeRaw: vi.fn().mockResolvedValue(0),
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('PublicBookingService', () => {
  let service: PublicBookingService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new PublicBookingService(prisma as never);
  });

  // -----------------------------------------------------------------------
  // getTenantBySlug
  // -----------------------------------------------------------------------

  describe('getTenantBySlug', () => {
    const tenantSummary = { id: TENANT_ID, status: 'ACTIVE' };
    const fullTenant = {
      id: TENANT_ID,
      name: 'Acme Salon',
      slug: SLUG,
      description: 'Best salon',
      logoUrl: null,
      coverPhotoUrl: null,
      brandColor: '#FF0000',
      timezone: 'America/New_York',
      currency: 'USD',
      country: 'US',
      address: '123 Main St',
      contactEmail: 'info@acme.com',
      contactPhone: null,
      category: 'SALON',
      categoryLabel: null,
      services: [
        {
          id: SERVICE_ID,
          name: 'Haircut',
          description: null,
          durationMinutes: 60,
          basePrice: 50,
          currency: 'USD',
          pricingModel: 'FIXED',
          images: null,
          guestConfig: null,
          intakeFormConfig: null,
          categoryId: null,
          category: null,
        },
      ],
    };

    it('should return tenant profile with active services', async () => {
      // First call returns { id, status }, second returns full tenant
      prisma.tenant.findUnique
        .mockResolvedValueOnce(tenantSummary)
        .mockResolvedValueOnce(fullTenant);

      const result = await service.getTenantBySlug(SLUG);
      expect(result.name).toBe('Acme Salon');
      expect(result.services).toHaveLength(1);
      expect(prisma.$executeRaw).toHaveBeenCalled();
    });

    it('should not include status in response', async () => {
      prisma.tenant.findUnique
        .mockResolvedValueOnce(tenantSummary)
        .mockResolvedValueOnce(fullTenant);

      const result = await service.getTenantBySlug(SLUG);
      expect((result as Record<string, unknown>)['status']).toBeUndefined();
    });

    it('should throw NotFoundException when tenant not found', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);
      await expect(service.getTenantBySlug('no-exist'))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when tenant is inactive', async () => {
      prisma.tenant.findUnique.mockResolvedValueOnce({
        ...tenantSummary,
        status: 'SUSPENDED',
      });
      await expect(service.getTenantBySlug(SLUG))
        .rejects.toThrow(NotFoundException);
    });
  });

  // -----------------------------------------------------------------------
  // getServiceDetail
  // -----------------------------------------------------------------------

  describe('getServiceDetail', () => {
    const activeTenant = {
      id: TENANT_ID,
      name: 'Acme Salon',
      slug: SLUG,
      timezone: 'America/New_York',
      currency: 'USD',
      status: 'ACTIVE',
    };

    const serviceData = {
      id: SERVICE_ID,
      name: 'Haircut',
      description: 'A nice haircut',
      durationMinutes: 60,
      basePrice: 50,
      currency: 'USD',
      pricingModel: 'FIXED',
      images: null,
      guestConfig: null,
      depositConfig: null,
      intakeFormConfig: null,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      cancellationPolicy: null,
      confirmationMode: 'AUTO',
      venue: null,
      category: null,
      availabilityRules: [
        { id: 'rule-1', dayOfWeek: 1, startTime: new Date(), endTime: new Date() },
      ],
    };

    it('should return service with availability rules and tenant info', async () => {
      prisma.tenant.findUnique.mockResolvedValue(activeTenant);
      prisma.service.findFirst.mockResolvedValue(serviceData);
      prisma.availabilityRule.findMany.mockResolvedValue([]);

      const result = await service.getServiceDetail(SLUG, SERVICE_ID);
      expect(result.tenant.id).toBe(TENANT_ID);
      expect(result.service.id).toBe(SERVICE_ID);
      expect(result.tenantWideAvailability).toEqual([]);
    });

    it('should throw NotFoundException for inactive tenant', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        ...activeTenant,
        status: 'SUSPENDED',
      });
      await expect(service.getServiceDetail(SLUG, SERVICE_ID))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for missing service', async () => {
      prisma.tenant.findUnique.mockResolvedValue(activeTenant);
      prisma.service.findFirst.mockResolvedValue(null);

      await expect(service.getServiceDetail(SLUG, 'bad-id'))
        .rejects.toThrow(NotFoundException);
    });

    it('should load tenant-wide availability rules as fallback', async () => {
      prisma.tenant.findUnique.mockResolvedValue(activeTenant);
      prisma.service.findFirst.mockResolvedValue(serviceData);
      const tenantRules = [
        { id: 'tr-1', dayOfWeek: 0, startTime: new Date(), endTime: new Date() },
      ];
      prisma.availabilityRule.findMany.mockResolvedValue(tenantRules);

      const result = await service.getServiceDetail(SLUG, SERVICE_ID);
      expect(result.tenantWideAvailability).toEqual(tenantRules);
      expect(prisma.availabilityRule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT_ID,
            serviceId: null,
            isActive: true,
          }),
        }),
      );
    });
  });
});
