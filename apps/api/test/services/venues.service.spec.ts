import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { VenuesService } from '@/services/venues.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const VENUE_ID = 'venue-001';

function makePrisma() {
  return {
    venue: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };
}

function makeVenue(overrides: Record<string, unknown> = {}) {
  return {
    id: VENUE_ID,
    tenantId: TENANT_ID,
    name: 'Main Studio',
    description: 'Our primary location',
    address: null,
    capacity: null,
    images: null,
    isActive: true,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('VenuesService', () => {
  let service: VenuesService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new VenuesService(prisma as never);
  });

  // ---------- findAll ----------

  describe('findAll', () => {
    it('should return active venues ordered by name', async () => {
      prisma.venue.findMany.mockResolvedValue([makeVenue()]);

      const result = await service.findAll(TENANT_ID);

      expect(result).toHaveLength(1);
      expect(prisma.venue.findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID, isActive: true },
        orderBy: { name: 'asc' },
      });
    });
  });

  // ---------- findById ----------

  describe('findById', () => {
    it('should return venue when found', async () => {
      prisma.venue.findFirst.mockResolvedValue(makeVenue());

      const result = await service.findById(TENANT_ID, VENUE_ID);

      expect(result.id).toBe(VENUE_ID);
    });

    it('should throw NotFoundException when not found', async () => {
      prisma.venue.findFirst.mockResolvedValue(null);

      await expect(
        service.findById(TENANT_ID, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should enforce tenant isolation', async () => {
      prisma.venue.findFirst.mockResolvedValue(makeVenue());

      await service.findById(TENANT_ID, VENUE_ID);

      expect(prisma.venue.findFirst).toHaveBeenCalledWith({
        where: { id: VENUE_ID, tenantId: TENANT_ID },
      });
    });
  });

  // ---------- create ----------

  describe('create', () => {
    it('should create venue with provided data', async () => {
      prisma.venue.create.mockResolvedValue(makeVenue());

      await service.create(TENANT_ID, {
        name: 'Main Studio',
        description: 'Our primary location',
      } as never);

      expect(prisma.venue.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_ID,
            name: 'Main Studio',
          }),
        }),
      );
    });

    it('should handle address as JSON value', async () => {
      prisma.venue.create.mockResolvedValue(makeVenue());

      await service.create(TENANT_ID, {
        name: 'Studio',
        address: { street: '123 Main St', city: 'NYC' },
      } as never);

      expect(prisma.venue.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            address: { street: '123 Main St', city: 'NYC' },
          }),
        }),
      );
    });
  });

  // ---------- update ----------

  describe('update', () => {
    it('should throw NotFoundException when venue does not exist', async () => {
      prisma.venue.findFirst.mockResolvedValue(null);

      await expect(
        service.update(TENANT_ID, 'nonexistent', { name: 'X' } as never),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update only provided fields', async () => {
      prisma.venue.findFirst.mockResolvedValue(makeVenue());
      prisma.venue.update.mockResolvedValue(makeVenue({ name: 'Renamed' }));

      await service.update(TENANT_ID, VENUE_ID, { name: 'Renamed' } as never);

      expect(prisma.venue.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: VENUE_ID },
          data: { name: 'Renamed' },
        }),
      );
    });
  });

  // ---------- remove ----------

  describe('remove', () => {
    it('should soft-delete by setting isActive to false', async () => {
      prisma.venue.findFirst.mockResolvedValue(makeVenue());
      prisma.venue.update.mockResolvedValue(makeVenue({ isActive: false }));

      const result = await service.remove(TENANT_ID, VENUE_ID);

      expect(result.message).toBe('Venue deactivated successfully');
      expect(prisma.venue.update).toHaveBeenCalledWith({
        where: { id: VENUE_ID },
        data: { isActive: false },
      });
    });

    it('should throw NotFoundException when venue not found', async () => {
      prisma.venue.findFirst.mockResolvedValue(null);

      await expect(
        service.remove(TENANT_ID, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
