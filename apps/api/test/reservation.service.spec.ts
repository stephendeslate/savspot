import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ReservationService } from '@/booking-sessions/reservation.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const TENANT_ID_OTHER = 'tenant-002';
const SESSION_ID = 'session-001';
const SERVICE_ID = 'service-001';
const VENUE_ID = 'venue-001';
const TOKEN = 'reservation-token-abc';
const RESERVATION_ID = 'reservation-001';

function makePrisma() {
  const txClient = {
    $executeRaw: vi.fn().mockResolvedValue(1),
    $queryRaw: vi.fn().mockResolvedValue([]),
  };

  return {
    $transaction: vi.fn((cb: (tx: typeof txClient) => Promise<unknown>) =>
      cb(txClient),
    ),
    dateReservation: {
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    _txClient: txClient,
  };
}

function makeReservation(overrides: Record<string, unknown> = {}) {
  return {
    id: RESERVATION_ID,
    tenantId: TENANT_ID,
    sessionId: SESSION_ID,
    serviceId: SERVICE_ID,
    venueId: null,
    token: TOKEN,
    status: 'HELD',
    reservedDate: new Date('2026-03-15'),
    startTime: new Date('2026-03-15T10:00:00Z'),
    endTime: new Date('2026-03-15T11:00:00Z'),
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    createdAt: new Date(),
    ...overrides,
  };
}

function makeReservationRow(overrides: Record<string, unknown> = {}) {
  return {
    id: RESERVATION_ID,
    tenant_id: TENANT_ID,
    session_id: SESSION_ID,
    service_id: SERVICE_ID,
    venue_id: null,
    reserved_date: new Date('2026-03-15'),
    start_time: new Date('2026-03-15T10:00:00Z'),
    end_time: new Date('2026-03-15T11:00:00Z'),
    token: TOKEN,
    expires_at: new Date(Date.now() + 5 * 60 * 1000),
    status: 'HELD',
    created_at: new Date(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('ReservationService', () => {
  let service: ReservationService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new ReservationService(prisma as never);
  });

  // -----------------------------------------------------------------------
  // reserveSlot
  // -----------------------------------------------------------------------

  describe('reserveSlot', () => {
    const baseParams = {
      tenantId: TENANT_ID,
      sessionId: SESSION_ID,
      serviceId: SERVICE_ID,
      startTime: new Date('2026-03-15T10:00:00Z'),
      endTime: new Date('2026-03-15T11:00:00Z'),
    };

    it('should create a reservation when no conflicts exist', async () => {
      const row = makeReservationRow();
      // First $queryRaw: no reservation conflicts
      // Second $queryRaw: no booking conflicts
      // Third $queryRaw: INSERT RETURNING
      prisma._txClient.$queryRaw
        .mockResolvedValueOnce([]) // reservation conflicts
        .mockResolvedValueOnce([]) // booking conflicts
        .mockResolvedValueOnce([row]); // insert result

      const result = await service.reserveSlot(baseParams);

      expect(result).toEqual(row);
      expect(prisma._txClient.$executeRaw).toHaveBeenCalledTimes(1);
      expect(prisma._txClient.$queryRaw).toHaveBeenCalledTimes(3);
    });

    it('should pass venueId when provided', async () => {
      const row = makeReservationRow({ venue_id: VENUE_ID });
      prisma._txClient.$queryRaw
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([row]);

      const result = await service.reserveSlot({
        ...baseParams,
        venueId: VENUE_ID,
      });

      expect(result.venue_id).toBe(VENUE_ID);
    });

    it('should throw ConflictException when a held reservation conflicts', async () => {
      prisma._txClient.$queryRaw.mockResolvedValueOnce([
        { id: 'existing-reservation' },
      ]);

      await expect(service.reserveSlot(baseParams)).rejects.toThrow(
        new ConflictException('Slot already reserved'),
      );
    });

    it('should throw ConflictException when a confirmed booking conflicts', async () => {
      prisma._txClient.$queryRaw
        .mockResolvedValueOnce([]) // no reservation conflicts
        .mockResolvedValueOnce([{ id: 'existing-booking' }]); // booking conflict

      await expect(service.reserveSlot(baseParams)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException with correct message for booking conflicts', async () => {
      prisma._txClient.$queryRaw
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: 'existing-booking' }]);

      await expect(service.reserveSlot(baseParams)).rejects.toThrow(
        'Slot already booked',
      );
    });

    it('should throw Error when INSERT returns empty result', async () => {
      prisma._txClient.$queryRaw
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]); // empty insert result

      await expect(service.reserveSlot(baseParams)).rejects.toThrow(
        'Failed to create reservation',
      );
    });

    it('should set tenant context via set_config before queries', async () => {
      prisma._txClient.$queryRaw
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([makeReservationRow()]);

      await service.reserveSlot(baseParams);

      // $executeRaw is called first to set tenant context
      expect(prisma._txClient.$executeRaw).toHaveBeenCalledTimes(1);
      // The reservation queries come after
      expect(prisma._txClient.$queryRaw).toHaveBeenCalledTimes(3);
    });

    it('should use $transaction for pessimistic locking', async () => {
      prisma._txClient.$queryRaw
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([makeReservationRow()]);

      await service.reserveSlot(baseParams);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should handle venueId being undefined by defaulting to null', async () => {
      const row = makeReservationRow({ venue_id: null });
      prisma._txClient.$queryRaw
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([row]);

      const result = await service.reserveSlot(baseParams);

      expect(result.venue_id).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // releaseReservation
  // -----------------------------------------------------------------------

  describe('releaseReservation', () => {
    it('should update reservation status to RELEASED', async () => {
      const reservation = makeReservation();
      prisma.dateReservation.findFirst.mockResolvedValue(reservation);
      prisma.dateReservation.update.mockResolvedValue({
        ...reservation,
        status: 'RELEASED',
      });

      await service.releaseReservation(TENANT_ID, TOKEN);

      expect(prisma.dateReservation.findFirst).toHaveBeenCalledWith({
        where: {
          tenantId: TENANT_ID,
          token: TOKEN,
          status: 'HELD',
        },
      });
      expect(prisma.dateReservation.update).toHaveBeenCalledWith({
        where: { id: RESERVATION_ID },
        data: { status: 'RELEASED' },
      });
    });

    it('should throw NotFoundException when no active reservation exists', async () => {
      prisma.dateReservation.findFirst.mockResolvedValue(null);

      await expect(
        service.releaseReservation(TENANT_ID, TOKEN),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.releaseReservation(TENANT_ID, TOKEN),
      ).rejects.toThrow('Active reservation not found');
    });

    it('should not update when reservation is not found', async () => {
      prisma.dateReservation.findFirst.mockResolvedValue(null);

      await expect(
        service.releaseReservation(TENANT_ID, TOKEN),
      ).rejects.toThrow();

      expect(prisma.dateReservation.update).not.toHaveBeenCalled();
    });

    it('should only find HELD reservations for the correct tenant', async () => {
      prisma.dateReservation.findFirst.mockResolvedValue(null);

      await expect(
        service.releaseReservation(TENANT_ID_OTHER, TOKEN),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.dateReservation.findFirst).toHaveBeenCalledWith({
        where: {
          tenantId: TENANT_ID_OTHER,
          token: TOKEN,
          status: 'HELD',
        },
      });
    });
  });

  // -----------------------------------------------------------------------
  // convertReservation
  // -----------------------------------------------------------------------

  describe('convertReservation', () => {
    it('should update reservation status to CONFIRMED', async () => {
      const reservation = makeReservation();
      prisma.dateReservation.findFirst.mockResolvedValue(reservation);
      prisma.dateReservation.update.mockResolvedValue({
        ...reservation,
        status: 'CONFIRMED',
      });

      await service.convertReservation(TENANT_ID, TOKEN);

      expect(prisma.dateReservation.findFirst).toHaveBeenCalledWith({
        where: {
          tenantId: TENANT_ID,
          token: TOKEN,
          status: 'HELD',
        },
      });
      expect(prisma.dateReservation.update).toHaveBeenCalledWith({
        where: { id: RESERVATION_ID },
        data: { status: 'CONFIRMED' },
      });
    });

    it('should throw NotFoundException when no active reservation exists', async () => {
      prisma.dateReservation.findFirst.mockResolvedValue(null);

      await expect(
        service.convertReservation(TENANT_ID, TOKEN),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.convertReservation(TENANT_ID, TOKEN),
      ).rejects.toThrow('Active reservation not found');
    });

    it('should not update when reservation is not found', async () => {
      prisma.dateReservation.findFirst.mockResolvedValue(null);

      await expect(
        service.convertReservation(TENANT_ID, TOKEN),
      ).rejects.toThrow();

      expect(prisma.dateReservation.update).not.toHaveBeenCalled();
    });

    it('should enforce tenant isolation on convert', async () => {
      prisma.dateReservation.findFirst.mockResolvedValue(null);

      await expect(
        service.convertReservation(TENANT_ID_OTHER, TOKEN),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.dateReservation.findFirst).toHaveBeenCalledWith({
        where: {
          tenantId: TENANT_ID_OTHER,
          token: TOKEN,
          status: 'HELD',
        },
      });
    });
  });

  // -----------------------------------------------------------------------
  // releaseAllForSession
  // -----------------------------------------------------------------------

  describe('releaseAllForSession', () => {
    it('should update all HELD reservations for a session to RELEASED', async () => {
      prisma.dateReservation.updateMany.mockResolvedValue({ count: 3 });

      await service.releaseAllForSession(TENANT_ID, SESSION_ID);

      expect(prisma.dateReservation.updateMany).toHaveBeenCalledWith({
        where: {
          tenantId: TENANT_ID,
          sessionId: SESSION_ID,
          status: 'HELD',
        },
        data: { status: 'RELEASED' },
      });
    });

    it('should not throw when no reservations match', async () => {
      prisma.dateReservation.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.releaseAllForSession(TENANT_ID, SESSION_ID),
      ).resolves.toBeUndefined();
    });

    it('should scope release to the correct tenant and session', async () => {
      prisma.dateReservation.updateMany.mockResolvedValue({ count: 1 });

      await service.releaseAllForSession(TENANT_ID_OTHER, 'session-999');

      expect(prisma.dateReservation.updateMany).toHaveBeenCalledWith({
        where: {
          tenantId: TENANT_ID_OTHER,
          sessionId: 'session-999',
          status: 'HELD',
        },
        data: { status: 'RELEASED' },
      });
    });
  });
});
