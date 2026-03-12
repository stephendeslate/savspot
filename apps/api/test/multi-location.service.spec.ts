import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MultiLocationService } from '@/multi-location/multi-location.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const VENUE_ID = 'venue-001';
const USER_ID = 'user-001';

function makePrisma() {
  return {
    venueStaff: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
    },
    $queryRawUnsafe: vi.fn(),
  };
}

function makeStaffRecord(overrides: Record<string, unknown> = {}) {
  return {
    venueId: VENUE_ID,
    userId: USER_ID,
    isPrimary: true,
    createdAt: new Date('2026-01-01'),
    user: {
      id: USER_ID,
      name: 'John Staff',
      email: 'john@test.com',
      avatarUrl: null,
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('MultiLocationService', () => {
  let service: MultiLocationService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new MultiLocationService(prisma as never);
  });

  // -------------------------------------------------------------------------
  // getVenueStaff
  // -------------------------------------------------------------------------

  describe('getVenueStaff', () => {
    it('should return staff for a venue ordered by createdAt', async () => {
      const staff = [makeStaffRecord()];
      prisma.venueStaff.findMany.mockResolvedValue(staff);

      const result = await service.getVenueStaff(VENUE_ID);

      expect(result).toEqual(staff);
      expect(prisma.venueStaff.findMany).toHaveBeenCalledWith({
        where: { venueId: VENUE_ID },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });
    });

    it('should return empty array when venue has no staff', async () => {
      prisma.venueStaff.findMany.mockResolvedValue([]);

      const result = await service.getVenueStaff(VENUE_ID);

      expect(result).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // assignStaff
  // -------------------------------------------------------------------------

  describe('assignStaff', () => {
    it('should upsert staff assignment', async () => {
      const record = makeStaffRecord();
      prisma.venueStaff.upsert.mockResolvedValue(record);

      const result = await service.assignStaff(VENUE_ID, USER_ID, true);

      expect(result).toEqual(record);
      expect(prisma.venueStaff.upsert).toHaveBeenCalledWith({
        where: { venueId_userId: { venueId: VENUE_ID, userId: USER_ID } },
        create: { venueId: VENUE_ID, userId: USER_ID, isPrimary: true },
        update: { isPrimary: true },
        include: expect.objectContaining({
          user: expect.any(Object),
        }),
      });
    });

    it('should assign as non-primary staff', async () => {
      const record = makeStaffRecord({ isPrimary: false });
      prisma.venueStaff.upsert.mockResolvedValue(record);

      const result = await service.assignStaff(VENUE_ID, USER_ID, false);

      expect(result.isPrimary).toBe(false);
      expect(prisma.venueStaff.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ isPrimary: false }),
          update: { isPrimary: false },
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // removeStaff
  // -------------------------------------------------------------------------

  describe('removeStaff', () => {
    it('should delete the staff record', async () => {
      prisma.venueStaff.delete.mockResolvedValue({});

      await service.removeStaff(VENUE_ID, USER_ID);

      expect(prisma.venueStaff.delete).toHaveBeenCalledWith({
        where: { venueId_userId: { venueId: VENUE_ID, userId: USER_ID } },
      });
    });
  });

  // -------------------------------------------------------------------------
  // getVenueAnalytics
  // -------------------------------------------------------------------------

  describe('getVenueAnalytics', () => {
    it('should return parsed analytics from raw query', async () => {
      prisma.$queryRawUnsafe.mockResolvedValue([
        {
          total_bookings: BigInt(42),
          total_revenue: '5250.00',
          avg_utilization: '78.50',
        },
      ]);

      const from = new Date('2026-01-01');
      const to = new Date('2026-03-01');
      const result = await service.getVenueAnalytics(VENUE_ID, from, to);

      expect(result).toEqual({
        totalBookings: 42,
        totalRevenue: '5250.00',
        utilization: '78.50',
      });
    });

    it('should handle null values in analytics', async () => {
      prisma.$queryRawUnsafe.mockResolvedValue([
        {
          total_bookings: BigInt(0),
          total_revenue: null,
          avg_utilization: null,
        },
      ]);

      const result = await service.getVenueAnalytics(
        VENUE_ID,
        new Date(),
        new Date(),
      );

      expect(result).toEqual({
        totalBookings: 0,
        totalRevenue: '0',
        utilization: '0',
      });
    });

    it('should handle empty results', async () => {
      prisma.$queryRawUnsafe.mockResolvedValue([]);

      const result = await service.getVenueAnalytics(
        VENUE_ID,
        new Date(),
        new Date(),
      );

      expect(result).toEqual({
        totalBookings: 0,
        totalRevenue: '0',
        utilization: '0',
      });
    });
  });

  // -------------------------------------------------------------------------
  // getCrossLocationAnalytics
  // -------------------------------------------------------------------------

  describe('getCrossLocationAnalytics', () => {
    it('should return analytics for all venues in a tenant', async () => {
      prisma.$queryRawUnsafe.mockResolvedValue([
        {
          venue_id: 'v1',
          venue_name: 'Downtown',
          total_bookings: BigInt(20),
          total_revenue: '2000.00',
          avg_utilization: '65.00',
        },
        {
          venue_id: 'v2',
          venue_name: 'Uptown',
          total_bookings: BigInt(15),
          total_revenue: null,
          avg_utilization: null,
        },
      ]);

      const result = await service.getCrossLocationAnalytics(
        TENANT_ID,
        new Date('2026-01-01'),
        new Date('2026-03-01'),
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        venueId: 'v1',
        venueName: 'Downtown',
        totalBookings: 20,
        totalRevenue: '2000.00',
        utilization: '65.00',
      });
      expect(result[1].totalRevenue).toBe('0');
      expect(result[1].utilization).toBe('0');
    });
  });
});
