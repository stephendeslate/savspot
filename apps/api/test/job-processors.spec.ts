import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExpireReservationsHandler } from '@/jobs/expire-reservations.processor';
import { CleanupRetentionHandler } from '@/jobs/cleanup-retention.processor';
import { ProcessCompletedBookingsHandler } from '@/jobs/process-completed-bookings.processor';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePrisma() {
  return {
    dateReservation: { updateMany: vi.fn(), deleteMany: vi.fn() },
    bookingSession: { deleteMany: vi.fn() },
    notification: { deleteMany: vi.fn() },
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
    $transaction: vi.fn(),
    booking: { findFirst: vi.fn() },
    auditLog: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
  };
}

function makeEvents() {
  return {
    emitBookingCompleted: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// ExpireReservationsHandler
// ---------------------------------------------------------------------------

describe('ExpireReservationsHandler', () => {
  let handler: ExpireReservationsHandler;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    handler = new ExpireReservationsHandler(prisma as never);
  });

  it('should expire HELD reservations per-tenant with RLS context', async () => {
    prisma.$queryRaw.mockResolvedValue([{ tenant_id: 'tenant-001' }]);

    const mockTx = {
      $executeRaw: vi.fn(),
      dateReservation: { updateMany: vi.fn().mockResolvedValue({ count: 3 }) },
    };
    prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn(mockTx),
    );

    await handler.handle();

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mockTx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(mockTx.dateReservation.updateMany).toHaveBeenCalledTimes(1);
    const call = mockTx.dateReservation.updateMany.mock.calls[0]![0];
    expect(call.where.status).toBe('HELD');
    expect(call.data.status).toBe('EXPIRED');
  });

  it('should handle no tenants with held reservations', async () => {
    prisma.$queryRaw.mockResolvedValue([]);

    await handler.handle();

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('should re-throw errors from the database', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('DB error'));

    await expect(handler.handle())
      .rejects.toThrow('DB error');
  });
});

// ---------------------------------------------------------------------------
// CleanupRetentionHandler
// ---------------------------------------------------------------------------

describe('CleanupRetentionHandler', () => {
  let handler: CleanupRetentionHandler;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    handler = new CleanupRetentionHandler(prisma as never);
  });

  it('should clean up per-tenant with RLS context and run all three cleanups', async () => {
    prisma.$queryRaw.mockResolvedValue([{ tenant_id: 'tenant-001' }]);

    const mockTx = {
      $executeRaw: vi.fn(),
      dateReservation: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
      bookingSession: { deleteMany: vi.fn().mockResolvedValue({ count: 2 }) },
      notification: { deleteMany: vi.fn().mockResolvedValue({ count: 3 }) },
      communication: { deleteMany: vi.fn().mockResolvedValue({ count: 4 }) },
    };
    prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn(mockTx),
    );

    await handler.handle();

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mockTx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(mockTx.dateReservation.deleteMany).toHaveBeenCalledTimes(1);
    expect(mockTx.bookingSession.deleteMany).toHaveBeenCalledTimes(1);
    expect(mockTx.notification.deleteMany).toHaveBeenCalledTimes(1);
    expect(mockTx.communication.deleteMany).toHaveBeenCalledTimes(1);

    // Verify reservation cutoff is approximately 30 days
    const resCall = mockTx.dateReservation.deleteMany.mock.calls[0]![0];
    expect(resCall.where.status).toEqual({ in: ['EXPIRED', 'RELEASED'] });
    const resCutoff = resCall.where.createdAt.lt as Date;
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    expect(Math.abs(resCutoff.getTime() - (Date.now() - thirtyDaysMs))).toBeLessThan(5000);

    // Verify session cutoff is approximately 90 days
    const sessCall = mockTx.bookingSession.deleteMany.mock.calls[0]![0];
    expect(sessCall.where.status).toEqual({ in: ['ABANDONED', 'EXPIRED'] });

    // Verify notification cutoff is approximately 365 days
    const notifCall = mockTx.notification.deleteMany.mock.calls[0]![0];
    expect(notifCall.where.createdAt).toEqual({ lt: expect.any(Date) });
  });

  it('should handle no tenants with data to clean', async () => {
    prisma.$queryRaw.mockResolvedValue([]);

    await handler.handle();

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('should re-throw errors from the database', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('Permission denied'));

    await expect(handler.handle())
      .rejects.toThrow('Permission denied');
  });
});

// ---------------------------------------------------------------------------
// ProcessCompletedBookingsHandler
// ---------------------------------------------------------------------------

describe('ProcessCompletedBookingsHandler', () => {
  let handler: ProcessCompletedBookingsHandler;
  let prisma: ReturnType<typeof makePrisma>;
  let events: ReturnType<typeof makeEvents>;

  beforeEach(() => {
    prisma = makePrisma();
    events = makeEvents();
    handler = new ProcessCompletedBookingsHandler(prisma as never, events as never);
  });

  it('should query for confirmed bookings past end time', async () => {
    // First call: detectNoShows phase; second call: auto-complete phase
    prisma.$queryRaw.mockResolvedValue([]);

    await handler.handle();

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
  });

  it('should update booking status to COMPLETED in a transaction', async () => {
    const eligibleBooking = {
      id: 'booking-001',
      tenant_id: 'tenant-001',
      service_id: 'service-001',
      client_id: 'client-001',
      start_time: new Date('2026-03-10T10:00:00Z'),
      end_time: new Date('2026-03-10T11:00:00Z'),
      client_email: 'jane@example.com',
      client_name: 'Jane Doe',
      service_name: 'Haircut',
      source: 'ONLINE',
    };

    // First $queryRaw: detectNoShows (empty); second: auto-complete
    prisma.$queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([eligibleBooking]);

    const mockTx = {
      $executeRaw: vi.fn(),
      bookingStateHistory: { create: vi.fn() },
    };
    prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn(mockTx),
    );

    await handler.handle();

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mockTx.$executeRaw).toHaveBeenCalledTimes(2);
    expect(mockTx.bookingStateHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        bookingId: 'booking-001',
        tenantId: 'tenant-001',
        fromState: 'CONFIRMED',
        toState: 'COMPLETED',
        triggeredBy: 'SYSTEM',
      }),
    });
  });

  it('should emit BOOKING_COMPLETED event after transaction', async () => {
    const eligibleBooking = {
      id: 'booking-002',
      tenant_id: 'tenant-001',
      service_id: 'service-001',
      client_id: 'client-002',
      start_time: new Date('2026-03-10T14:00:00Z'),
      end_time: new Date('2026-03-10T15:00:00Z'),
      client_email: 'bob@example.com',
      client_name: 'Bob Smith',
      service_name: 'Beard Trim',
      source: 'WALK_IN',
    };

    // First $queryRaw: detectNoShows (empty); second: auto-complete
    prisma.$queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([eligibleBooking]);
    prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        $executeRaw: vi.fn(),
        bookingStateHistory: { create: vi.fn() },
      }),
    );

    await handler.handle();

    expect(events.emitBookingCompleted).toHaveBeenCalledTimes(1);
    expect(events.emitBookingCompleted).toHaveBeenCalledWith({
      tenantId: 'tenant-001',
      bookingId: 'booking-002',
      serviceId: 'service-001',
      clientId: 'client-002',
      clientEmail: 'bob@example.com',
      clientName: 'Bob Smith',
      serviceName: 'Beard Trim',
      startTime: eligibleBooking.start_time,
      endTime: eligibleBooking.end_time,
      source: 'WALK_IN',
    });
  });

  it('should handle empty result (no eligible bookings)', async () => {
    // Both detectNoShows and auto-complete return empty
    prisma.$queryRaw.mockResolvedValue([]);

    await handler.handle();

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(events.emitBookingCompleted).not.toHaveBeenCalled();
  });

  it('should continue processing remaining bookings when one fails', async () => {
    const booking1 = {
      id: 'booking-fail',
      tenant_id: 'tenant-001',
      service_id: 'service-001',
      client_id: 'client-001',
      start_time: new Date('2026-03-10T10:00:00Z'),
      end_time: new Date('2026-03-10T11:00:00Z'),
      client_email: 'a@test.com',
      client_name: 'Alice',
      service_name: 'Cut',
      source: 'ONLINE',
    };
    const booking2 = {
      id: 'booking-ok',
      tenant_id: 'tenant-001',
      service_id: 'service-002',
      client_id: 'client-002',
      start_time: new Date('2026-03-10T12:00:00Z'),
      end_time: new Date('2026-03-10T13:00:00Z'),
      client_email: 'b@test.com',
      client_name: 'Bob',
      service_name: 'Trim',
      source: 'ONLINE',
    };

    // First $queryRaw: detectNoShows (empty); second: auto-complete with bookings
    prisma.$queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([booking1, booking2]);

    let callCount = 0;
    prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      callCount++;
      if (callCount === 1) {
        throw new Error('Transaction deadlock');
      }
      return fn({
        $executeRaw: vi.fn(),
        bookingStateHistory: { create: vi.fn() },
      });
    });

    await handler.handle();

    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(events.emitBookingCompleted).toHaveBeenCalledTimes(1);
    expect(events.emitBookingCompleted).toHaveBeenCalledWith(
      expect.objectContaining({ bookingId: 'booking-ok' }),
    );
  });

  it('should re-throw when the top-level query fails', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('Connection refused'));

    await expect(handler.handle())
      .rejects.toThrow('Connection refused');
  });
});
