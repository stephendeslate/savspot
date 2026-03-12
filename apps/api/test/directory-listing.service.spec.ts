import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DirectoryListingService } from '@/directory/directory-listing.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';

function makePrisma() {
  return {
    tenant: {
      findMany: vi.fn(),
    },
    booking: {
      aggregate: vi.fn(),
      findFirst: vi.fn(),
    },
    review: {
      aggregate: vi.fn(),
    },
    directoryListing: {
      upsert: vi.fn(),
    },
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('DirectoryListingService', () => {
  let service: DirectoryListingService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new DirectoryListingService(prisma as never);
  });

  // ---------- refreshListing ----------

  describe('refreshListing', () => {
    it('should aggregate booking and review stats and upsert listing', async () => {
      prisma.booking.aggregate.mockResolvedValue({ _count: 42 });
      prisma.review.aggregate.mockResolvedValue({
        _avg: { rating: 4.5 },
        _count: 10,
      });
      prisma.booking.findFirst.mockResolvedValue({
        createdAt: new Date('2026-03-01'),
      });
      prisma.directoryListing.upsert.mockResolvedValue({});

      await service.refreshListing(TENANT_ID);

      expect(prisma.directoryListing.upsert).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID },
        create: expect.objectContaining({
          tenantId: TENANT_ID,
          totalBookings: 42,
          averageRating: 4.5,
          reviewCount: 10,
        }),
        update: expect.objectContaining({
          totalBookings: 42,
          averageRating: 4.5,
          reviewCount: 10,
        }),
      });
    });

    it('should handle null lastBooking', async () => {
      prisma.booking.aggregate.mockResolvedValue({ _count: 0 });
      prisma.review.aggregate.mockResolvedValue({
        _avg: { rating: null },
        _count: 0,
      });
      prisma.booking.findFirst.mockResolvedValue(null);
      prisma.directoryListing.upsert.mockResolvedValue({});

      await service.refreshListing(TENANT_ID);

      expect(prisma.directoryListing.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            lastActiveAt: undefined,
          }),
        }),
      );
    });
  });

  // ---------- refreshAllListings ----------

  describe('refreshAllListings', () => {
    it('should refresh listing for each published tenant', async () => {
      prisma.tenant.findMany.mockResolvedValue([
        { id: 'tenant-a' },
        { id: 'tenant-b' },
      ]);
      prisma.booking.aggregate.mockResolvedValue({ _count: 0 });
      prisma.review.aggregate.mockResolvedValue({
        _avg: { rating: null },
        _count: 0,
      });
      prisma.booking.findFirst.mockResolvedValue(null);
      prisma.directoryListing.upsert.mockResolvedValue({});

      await service.refreshAllListings();

      expect(prisma.directoryListing.upsert).toHaveBeenCalledTimes(2);
    });

    it('should query only published and active tenants', async () => {
      prisma.tenant.findMany.mockResolvedValue([]);

      await service.refreshAllListings();

      expect(prisma.tenant.findMany).toHaveBeenCalledWith({
        where: { isPublished: true, status: 'ACTIVE' },
        select: { id: true },
      });
    });

    it('should handle zero tenants without error', async () => {
      prisma.tenant.findMany.mockResolvedValue([]);

      await expect(service.refreshAllListings()).resolves.toBeUndefined();
    });
  });
});
