import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { BlockedDatesService } from '@/availability/blocked-dates.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const USER_ID = 'user-001';
const BLOCKED_DATE_ID = 'bd-001';

function makePrisma() {
  return {
    blockedDate: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  };
}

function makeBlockedDate(overrides: Record<string, unknown> = {}) {
  return {
    id: BLOCKED_DATE_ID,
    tenantId: TENANT_ID,
    blockedDate: new Date('2026-12-25'),
    reason: 'Christmas',
    serviceId: null,
    venueId: null,
    createdBy: USER_ID,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('BlockedDatesService', () => {
  let service: BlockedDatesService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new BlockedDatesService(prisma as never);
  });

  // ---------- findAll ----------

  describe('findAll', () => {
    it('should return blocked dates ordered by date', async () => {
      prisma.blockedDate.findMany.mockResolvedValue([makeBlockedDate()]);

      const result = await service.findAll(TENANT_ID);

      expect(result).toHaveLength(1);
      expect(prisma.blockedDate.findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID },
        orderBy: { blockedDate: 'asc' },
      });
    });

    it('should filter by serviceId when provided', async () => {
      prisma.blockedDate.findMany.mockResolvedValue([]);

      await service.findAll(TENANT_ID, 'svc-001');

      expect(prisma.blockedDate.findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID, serviceId: 'svc-001' },
        orderBy: { blockedDate: 'asc' },
      });
    });

    it('should filter by venueId when provided', async () => {
      prisma.blockedDate.findMany.mockResolvedValue([]);

      await service.findAll(TENANT_ID, undefined, 'venue-001');

      expect(prisma.blockedDate.findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID, venueId: 'venue-001' },
        orderBy: { blockedDate: 'asc' },
      });
    });

    it('should filter by both serviceId and venueId', async () => {
      prisma.blockedDate.findMany.mockResolvedValue([]);

      await service.findAll(TENANT_ID, 'svc-001', 'venue-001');

      expect(prisma.blockedDate.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: TENANT_ID,
          serviceId: 'svc-001',
          venueId: 'venue-001',
        },
        orderBy: { blockedDate: 'asc' },
      });
    });
  });

  // ---------- create ----------

  describe('create', () => {
    it('should create blocked date with required fields', async () => {
      prisma.blockedDate.create.mockResolvedValue(makeBlockedDate());

      await service.create(TENANT_ID, USER_ID, {
        blockedDate: '2026-12-25',
      } as never);

      expect(prisma.blockedDate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TENANT_ID,
          createdBy: USER_ID,
          reason: null,
          serviceId: null,
          venueId: null,
        }),
      });
    });

    it('should pass optional reason and scoping IDs', async () => {
      prisma.blockedDate.create.mockResolvedValue(makeBlockedDate());

      await service.create(TENANT_ID, USER_ID, {
        blockedDate: '2026-12-25',
        reason: 'Holiday',
        serviceId: 'svc-001',
        venueId: 'venue-001',
      } as never);

      expect(prisma.blockedDate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          reason: 'Holiday',
          serviceId: 'svc-001',
          venueId: 'venue-001',
        }),
      });
    });
  });

  // ---------- remove ----------

  describe('remove', () => {
    it('should delete blocked date and return success message', async () => {
      prisma.blockedDate.findFirst.mockResolvedValue(makeBlockedDate());
      prisma.blockedDate.delete.mockResolvedValue(makeBlockedDate());

      const result = await service.remove(TENANT_ID, BLOCKED_DATE_ID);

      expect(result.message).toBe('Blocked date deleted successfully');
      expect(prisma.blockedDate.delete).toHaveBeenCalledWith({
        where: { id: BLOCKED_DATE_ID },
      });
    });

    it('should throw NotFoundException when blocked date not found', async () => {
      prisma.blockedDate.findFirst.mockResolvedValue(null);

      await expect(
        service.remove(TENANT_ID, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should enforce tenant isolation in lookup', async () => {
      prisma.blockedDate.findFirst.mockResolvedValue(null);

      await expect(service.remove(TENANT_ID, BLOCKED_DATE_ID)).rejects.toThrow();

      expect(prisma.blockedDate.findFirst).toHaveBeenCalledWith({
        where: { id: BLOCKED_DATE_ID, tenantId: TENANT_ID },
      });
    });
  });
});
