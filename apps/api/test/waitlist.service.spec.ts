import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { WaitlistService } from '../src/waitlist/waitlist.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePrisma() {
  return {
    bookingSession: {
      findUnique: vi.fn(),
    },
    waitlistEntry: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('WaitlistService', () => {
  let service: WaitlistService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new WaitlistService(prisma as never);
  });

  // -------------------------------------------------------------------------
  // createFromSession
  // -------------------------------------------------------------------------

  describe('createFromSession', () => {
    const sessionBase = {
      id: 'session-001',
      tenantId: 'tenant-001',
      serviceId: 'service-001',
      service: { id: 'service-001', name: 'Haircut' },
      data: {
        guestEmail: 'john@example.com',
        guestName: 'John Doe',
        staffId: 'staff-001',
      },
    };

    it('should create a waitlist entry from a valid session', async () => {
      prisma.bookingSession.findUnique.mockResolvedValue(sessionBase);
      prisma.waitlistEntry.findFirst.mockResolvedValue(null);
      prisma.waitlistEntry.create.mockResolvedValue({
        id: 'wl-001',
        tenantId: 'tenant-001',
        serviceId: 'service-001',
        staffId: 'staff-001',
        clientEmail: 'john@example.com',
        clientName: 'John Doe',
        status: 'ACTIVE',
      });

      const result = await service.createFromSession('session-001');

      expect(prisma.waitlistEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 'tenant-001',
          serviceId: 'service-001',
          staffId: 'staff-001',
          clientEmail: 'john@example.com',
          clientName: 'John Doe',
        }),
      });
      expect(result.id).toBe('wl-001');
    });

    it('should throw NotFoundException when session does not exist', async () => {
      prisma.bookingSession.findUnique.mockResolvedValue(null);

      await expect(
        service.createFromSession('nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when session has no serviceId', async () => {
      prisma.bookingSession.findUnique.mockResolvedValue({
        ...sessionBase,
        serviceId: null,
      });

      await expect(
        service.createFromSession('session-001'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when session data lacks client info', async () => {
      prisma.bookingSession.findUnique.mockResolvedValue({
        ...sessionBase,
        data: {},
      });

      await expect(
        service.createFromSession('session-001'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return existing entry for idempotent calls', async () => {
      const existingEntry = {
        id: 'wl-existing',
        tenantId: 'tenant-001',
        serviceId: 'service-001',
        clientEmail: 'john@example.com',
        status: 'ACTIVE',
      };
      prisma.bookingSession.findUnique.mockResolvedValue(sessionBase);
      prisma.waitlistEntry.findFirst.mockResolvedValue(existingEntry);

      const result = await service.createFromSession('session-001');

      expect(result.id).toBe('wl-existing');
      expect(prisma.waitlistEntry.create).not.toHaveBeenCalled();
    });

    it('should store preferred date and time when provided', async () => {
      prisma.bookingSession.findUnique.mockResolvedValue(sessionBase);
      prisma.waitlistEntry.findFirst.mockResolvedValue(null);
      prisma.waitlistEntry.create.mockResolvedValue({ id: 'wl-002' });

      await service.createFromSession(
        'session-001',
        '2026-03-25',
        '09:00',
        '12:00',
      );

      expect(prisma.waitlistEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          preferredDate: new Date('2026-03-25'),
          preferredTimeStart: '09:00',
          preferredTimeEnd: '12:00',
        }),
      });
    });

    it('should set null staffId when session has no staffId', async () => {
      prisma.bookingSession.findUnique.mockResolvedValue({
        ...sessionBase,
        data: { guestEmail: 'a@b.com', guestName: 'A' },
      });
      prisma.waitlistEntry.findFirst.mockResolvedValue(null);
      prisma.waitlistEntry.create.mockResolvedValue({ id: 'wl-003' });

      await service.createFromSession('session-001');

      expect(prisma.waitlistEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          staffId: null,
        }),
      });
    });
  });

  // -------------------------------------------------------------------------
  // listByTenant
  // -------------------------------------------------------------------------

  describe('listByTenant', () => {
    it('should return active waitlist entries ordered by creation date', async () => {
      const entries = [
        { id: 'wl-001', clientEmail: 'a@b.com', status: 'ACTIVE' },
        { id: 'wl-002', clientEmail: 'c@d.com', status: 'ACTIVE' },
      ];
      prisma.waitlistEntry.findMany.mockResolvedValue(entries);

      const result = await service.listByTenant('tenant-001');

      expect(result).toHaveLength(2);
      expect(prisma.waitlistEntry.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-001', status: 'ACTIVE' },
        orderBy: { createdAt: 'asc' },
        include: {
          service: { select: { id: true, name: true } },
          staff: { select: { id: true, name: true } },
        },
      });
    });
  });

  // -------------------------------------------------------------------------
  // remove
  // -------------------------------------------------------------------------

  describe('remove', () => {
    it('should delete a waitlist entry', async () => {
      prisma.waitlistEntry.findFirst.mockResolvedValue({
        id: 'wl-001',
        tenantId: 'tenant-001',
      });
      prisma.waitlistEntry.delete.mockResolvedValue({});

      const result = await service.remove('tenant-001', 'wl-001');

      expect(result).toEqual({ deleted: true });
      expect(prisma.waitlistEntry.delete).toHaveBeenCalledWith({
        where: { id: 'wl-001' },
      });
    });

    it('should throw NotFoundException when entry does not exist', async () => {
      prisma.waitlistEntry.findFirst.mockResolvedValue(null);

      await expect(
        service.remove('tenant-001', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // -------------------------------------------------------------------------
  // findMatchingEntries
  // -------------------------------------------------------------------------

  describe('findMatchingEntries', () => {
    it('should find entries for a specific service and date', async () => {
      prisma.waitlistEntry.findMany.mockResolvedValue([{ id: 'wl-001' }]);

      const date = new Date('2026-03-25');
      const result = await service.findMatchingEntries(
        'tenant-001',
        'service-001',
        date,
      );

      expect(result).toHaveLength(1);
      expect(prisma.waitlistEntry.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-001',
          serviceId: 'service-001',
          status: 'ACTIVE',
          preferredDate: date,
        },
        orderBy: { createdAt: 'asc' },
        take: 5,
      });
    });

    it('should find entries without date filter when date not provided', async () => {
      prisma.waitlistEntry.findMany.mockResolvedValue([]);

      await service.findMatchingEntries('tenant-001', 'service-001');

      expect(prisma.waitlistEntry.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-001',
          serviceId: 'service-001',
          status: 'ACTIVE',
        },
        orderBy: { createdAt: 'asc' },
        take: 5,
      });
    });
  });

  // -------------------------------------------------------------------------
  // markNotified
  // -------------------------------------------------------------------------

  describe('markNotified', () => {
    it('should update entry status to NOTIFIED with timestamps', async () => {
      prisma.waitlistEntry.update.mockResolvedValue({
        id: 'wl-001',
        status: 'NOTIFIED',
      });

      const result = await service.markNotified('wl-001');

      expect(result.status).toBe('NOTIFIED');
      expect(prisma.waitlistEntry.update).toHaveBeenCalledWith({
        where: { id: 'wl-001' },
        data: {
          status: 'NOTIFIED',
          notifiedAt: expect.any(Date),
          expiresAt: expect.any(Date),
        },
      });
    });

    it('should set expiresAt to approximately 24 hours from now', async () => {
      let capturedData: Record<string, unknown> = {};
      prisma.waitlistEntry.update.mockImplementation(
        async (args: { data: Record<string, unknown> }) => {
          capturedData = args.data;
          return { id: 'wl-001', status: 'NOTIFIED' };
        },
      );

      await service.markNotified('wl-001');

      const expiresAt = capturedData.expiresAt as Date;
      const now = new Date();
      const diffMs = expiresAt.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      // Should be approximately 24 hours (within 1 minute tolerance)
      expect(diffHours).toBeGreaterThan(23.9);
      expect(diffHours).toBeLessThan(24.1);
    });
  });
});
