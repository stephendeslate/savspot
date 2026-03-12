import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { DirectoryService } from '@/directory/directory.service';
import { DirectoryListingService } from '@/directory/directory-listing.service';
import { SavedBusinessesService } from '@/directory/saved-businesses.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const USER_ID = 'user-001';
const SLUG = 'janes-salon';

function makePrisma() {
  return {
    tenant: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    review: {
      findMany: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
    },
    booking: {
      aggregate: vi.fn(),
      findFirst: vi.fn(),
    },
    availabilityRule: {
      findMany: vi.fn(),
    },
    directoryListing: {
      upsert: vi.fn(),
    },
    savedBusiness: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    $queryRawUnsafe: vi.fn(),
    $queryRaw: vi.fn(),
  };
}

function makeTenant(overrides: Record<string, unknown> = {}) {
  return {
    id: TENANT_ID,
    name: "Jane's Salon",
    slug: SLUG,
    description: 'Best salon in town',
    category: 'BEAUTY',
    isPublished: true,
    status: 'ACTIVE',
    logoUrl: null,
    address: { city: 'Portland', lat: 45.5, lng: -122.6 },
    services: [],
    directoryListing: null,
    venues: [],
    reviews: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// DirectoryService
// ---------------------------------------------------------------------------

describe('DirectoryService', () => {
  let service: DirectoryService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new DirectoryService(prisma as never);
  });

  // -------------------------------------------------------------------------
  // search
  // -------------------------------------------------------------------------

  describe('search', () => {
    it('should return paginated results for basic search', async () => {
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce([
          {
            id: TENANT_ID,
            name: "Jane's Salon",
            slug: SLUG,
            description: null,
            category: 'BEAUTY',
            address: {},
            logo_url: null,
            cover_photo_url: null,
            brand_color: null,
            average_rating: 4.5,
            review_count: 20,
            response_time_min: 5,
            total_bookings: 100,
            relevance: 0,
            distance_miles: 0,
          },
        ])
        .mockResolvedValueOnce([{ count: BigInt(1) }]);

      const result = await service.search({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
    });

    it('should apply text search when q is provided', async () => {
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ count: BigInt(0) }]);

      await service.search({ q: 'salon', page: 1, limit: 10 });

      // Check that the query includes plainto_tsquery
      const queryArg = prisma.$queryRawUnsafe.mock.calls[0][0] as string;
      expect(queryArg).toContain('plainto_tsquery');
    });

    it('should filter by category', async () => {
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ count: BigInt(0) }]);

      await service.search({ category: 'BEAUTY', page: 1, limit: 10 });

      const queryArg = prisma.$queryRawUnsafe.mock.calls[0][0] as string;
      expect(queryArg).toContain('"BusinessCategory"');
    });

    it('should apply geo filter when lat/lng provided', async () => {
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ count: BigInt(0) }]);

      await service.search({
        lat: 45.5,
        lng: -122.6,
        radius: 10,
        page: 1,
        limit: 10,
      });

      const queryArg = prisma.$queryRawUnsafe.mock.calls[0][0] as string;
      expect(queryArg).toContain('distance_miles');
    });

    it('should default to page 1 and limit 20', async () => {
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ count: BigInt(0) }]);

      const result = await service.search({});

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
    });

    it('should handle empty count results', async () => {
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.search({});

      expect(result.pagination.total).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // getCategories
  // -------------------------------------------------------------------------

  describe('getCategories', () => {
    it('should return categories with business counts', async () => {
      const categories = [
        { category: 'BEAUTY', business_count: 10 },
        { category: 'FITNESS', business_count: 5 },
      ];
      prisma.$queryRaw.mockResolvedValue(categories);

      const result = await service.getCategories();

      expect(result).toEqual(categories);
    });
  });

  // -------------------------------------------------------------------------
  // getBusinessBySlug
  // -------------------------------------------------------------------------

  describe('getBusinessBySlug', () => {
    it('should return tenant with services, venues, and reviews', async () => {
      const tenant = makeTenant();
      prisma.tenant.findFirst.mockResolvedValue(tenant);

      const result = await service.getBusinessBySlug(SLUG);

      expect(result.slug).toBe(SLUG);
      expect(prisma.tenant.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { slug: SLUG, isPublished: true, status: 'ACTIVE' },
        }),
      );
    });

    it('should throw NotFoundException when business not found', async () => {
      prisma.tenant.findFirst.mockResolvedValue(null);

      await expect(service.getBusinessBySlug('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // -------------------------------------------------------------------------
  // getBusinessReviews
  // -------------------------------------------------------------------------

  describe('getBusinessReviews', () => {
    it('should return paginated reviews', async () => {
      prisma.tenant.findFirst.mockResolvedValue({ id: TENANT_ID });
      prisma.review.findMany.mockResolvedValue([{ id: 'review-1' }]);
      prisma.review.count.mockResolvedValue(1);

      const result = await service.getBusinessReviews(SLUG, 1, 10);

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });

    it('should throw NotFoundException when business slug not found', async () => {
      prisma.tenant.findFirst.mockResolvedValue(null);

      await expect(
        service.getBusinessReviews('bad-slug', 1, 10),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // -------------------------------------------------------------------------
  // getBusinessAvailability
  // -------------------------------------------------------------------------

  describe('getBusinessAvailability', () => {
    it('should return availability rules for the business', async () => {
      prisma.tenant.findFirst.mockResolvedValue({ id: TENANT_ID });
      const rules = [{ id: 'rule-1', tenantId: TENANT_ID }];
      prisma.availabilityRule.findMany.mockResolvedValue(rules);

      const result = await service.getBusinessAvailability(SLUG);

      expect(result).toEqual(rules);
    });

    it('should throw NotFoundException when business not found', async () => {
      prisma.tenant.findFirst.mockResolvedValue(null);

      await expect(service.getBusinessAvailability('bad')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

// ---------------------------------------------------------------------------
// DirectoryListingService
// ---------------------------------------------------------------------------

describe('DirectoryListingService', () => {
  let service: DirectoryListingService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new DirectoryListingService(prisma as never);
  });

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

    it('should handle null last booking', async () => {
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

  describe('refreshAllListings', () => {
    it('should refresh listings for all published tenants', async () => {
      prisma.tenant.findMany.mockResolvedValue([
        { id: 'tenant-1' },
        { id: 'tenant-2' },
      ]);
      prisma.booking.aggregate.mockResolvedValue({ _count: 0 });
      prisma.review.aggregate.mockResolvedValue({ _avg: { rating: null }, _count: 0 });
      prisma.booking.findFirst.mockResolvedValue(null);
      prisma.directoryListing.upsert.mockResolvedValue({});

      await service.refreshAllListings();

      expect(prisma.directoryListing.upsert).toHaveBeenCalledTimes(2);
    });
  });
});

// ---------------------------------------------------------------------------
// SavedBusinessesService
// ---------------------------------------------------------------------------

describe('SavedBusinessesService', () => {
  let service: SavedBusinessesService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new SavedBusinessesService(prisma as never);
  });

  describe('toggleSave', () => {
    it('should save business when not already saved', async () => {
      prisma.savedBusiness.findUnique.mockResolvedValue(null);
      prisma.savedBusiness.create.mockResolvedValue({});

      const result = await service.toggleSave(USER_ID, TENANT_ID);

      expect(result).toEqual({ saved: true });
      expect(prisma.savedBusiness.create).toHaveBeenCalledWith({
        data: { userId: USER_ID, tenantId: TENANT_ID },
      });
    });

    it('should unsave business when already saved', async () => {
      prisma.savedBusiness.findUnique.mockResolvedValue({
        id: 'saved-001',
        userId: USER_ID,
        tenantId: TENANT_ID,
      });
      prisma.savedBusiness.delete.mockResolvedValue({});

      const result = await service.toggleSave(USER_ID, TENANT_ID);

      expect(result).toEqual({ saved: false });
      expect(prisma.savedBusiness.delete).toHaveBeenCalledWith({
        where: { id: 'saved-001' },
      });
    });
  });

  describe('listSaved', () => {
    it('should return saved businesses with tenant details', async () => {
      const saved = [
        {
          id: 'saved-001',
          userId: USER_ID,
          tenant: { id: TENANT_ID, name: 'Salon', slug: 'salon' },
        },
      ];
      prisma.savedBusiness.findMany.mockResolvedValue(saved);

      const result = await service.listSaved(USER_ID);

      expect(result).toEqual(saved);
      expect(prisma.savedBusiness.findMany).toHaveBeenCalledWith({
        where: { userId: USER_ID },
        include: expect.objectContaining({
          tenant: expect.any(Object),
        }),
        orderBy: { createdAt: 'desc' },
      });
    });
  });
});
