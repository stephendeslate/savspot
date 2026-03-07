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
    $transaction: vi.fn(),
    booking: { findFirst: vi.fn() },
  };
}

function makeEvents() {
  return {
    emitBookingCompleted: vi.fn(),
  };
}

function makeJob(data: Record<string, unknown> = {}) {
  return { data } as never;
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

  it('should expire HELD reservations past their expiresAt time', async () => {
    prisma.dateReservation.updateMany.mockResolvedValue({ count: 3 });

    await handler.handle(makeJob());

    expect(prisma.dateReservation.updateMany).toHaveBeenCalledTimes(1);
    const call = prisma.dateReservation.updateMany.mock.calls[0]![0];
    expect(call.where.status).toBe('HELD');
    expect(call.where.expiresAt).toEqual({ lt: expect.any(Date) });
    expect(call.data.status).toBe('EXPIRED');
  });

  it('should re-throw errors from the database', async () => {
    prisma.dateReservation.updateMany.mockRejectedValue(new Error('DB error'));

    await expect(handler.handle(makeJob()))
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
    prisma.dateReservation.deleteMany.mockResolvedValue({ count: 0 });
    prisma.bookingSession.deleteMany.mockResolvedValue({ count: 0 });
    prisma.notification.deleteMany.mockResolvedValue({ count: 0 });
    handler = new CleanupRetentionHandler(prisma as never);
  });

  it('should delete expired/released reservations older than 30 days', async () => {
    prisma.dateReservation.deleteMany.mockResolvedValue({ count: 5 });

    await handler.handle(makeJob());

    expect(prisma.dateReservation.deleteMany).toHaveBeenCalledTimes(1);
    const call = prisma.dateReservation.deleteMany.mock.calls[0]![0];
    expect(call.where.status).toEqual({ in: ['EXPIRED', 'RELEASED'] });
    expect(call.where.createdAt).toEqual({ lt: expect.any(Date) });

    // Verify the cutoff is approximately 30 days ago
    const cutoff = call.where.createdAt.lt as Date;
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const expectedCutoff = Date.now() - thirtyDaysMs;
    expect(Math.abs(cutoff.getTime() - expectedCutoff)).toBeLessThan(5000);
  });

  it('should delete abandoned/expired sessions older than 90 days', async () => {
    prisma.bookingSession.deleteMany.mockResolvedValue({ count: 2 });

    await handler.handle(makeJob());

    expect(prisma.bookingSession.deleteMany).toHaveBeenCalledTimes(1);
    const call = prisma.bookingSession.deleteMany.mock.calls[0]![0];
    expect(call.where.status).toEqual({ in: ['ABANDONED', 'EXPIRED'] });
    expect(call.where.createdAt).toEqual({ lt: expect.any(Date) });

    const cutoff = call.where.createdAt.lt as Date;
    const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
    const expectedCutoff = Date.now() - ninetyDaysMs;
    expect(Math.abs(cutoff.getTime() - expectedCutoff)).toBeLessThan(5000);
  });

  it('should delete notifications older than 365 days', async () => {
    prisma.notification.deleteMany.mockResolvedValue({ count: 100 });

    await handler.handle(makeJob());

    expect(prisma.notification.deleteMany).toHaveBeenCalledTimes(1);
    const call = prisma.notification.deleteMany.mock.calls[0]![0];
    expect(call.where.createdAt).toEqual({ lt: expect.any(Date) });

    const cutoff = call.where.createdAt.lt as Date;
    const yearMs = 365 * 24 * 60 * 60 * 1000;
    const expectedCutoff = Date.now() - yearMs;
    expect(Math.abs(cutoff.getTime() - expectedCutoff)).toBeLessThan(5000);
  });

  it('should execute all three cleanup steps in a single run', async () => {
    prisma.dateReservation.deleteMany.mockResolvedValue({ count: 1 });
    prisma.bookingSession.deleteMany.mockResolvedValue({ count: 2 });
    prisma.notification.deleteMany.mockResolvedValue({ count: 3 });

    await handler.handle(makeJob());

    expect(prisma.dateReservation.deleteMany).toHaveBeenCalledTimes(1);
    expect(prisma.bookingSession.deleteMany).toHaveBeenCalledTimes(1);
    expect(prisma.notification.deleteMany).toHaveBeenCalledTimes(1);
  });

  it('should re-throw errors from the database', async () => {
    prisma.dateReservation.deleteMany.mockRejectedValue(new Error('Permission denied'));

    await expect(handler.handle(makeJob()))
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
    prisma.$queryRaw.mockResolvedValue([]);

    await handler.handle(makeJob());

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
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

    prisma.$queryRaw.mockResolvedValue([eligibleBooking]);

    const mockTx = {
      $executeRaw: vi.fn(),
      bookingStateHistory: { create: vi.fn() },
    };
    prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn(mockTx),
    );

    await handler.handle(makeJob());

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

    prisma.$queryRaw.mockResolvedValue([eligibleBooking]);
    prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        $executeRaw: vi.fn(),
        bookingStateHistory: { create: vi.fn() },
      }),
    );

    await handler.handle(makeJob());

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
    prisma.$queryRaw.mockResolvedValue([]);

    await handler.handle(makeJob());

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

    prisma.$queryRaw.mockResolvedValue([booking1, booking2]);

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

    await handler.handle(makeJob());

    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(events.emitBookingCompleted).toHaveBeenCalledTimes(1);
    expect(events.emitBookingCompleted).toHaveBeenCalledWith(
      expect.objectContaining({ bookingId: 'booking-ok' }),
    );
  });

  it('should re-throw when the top-level query fails', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('Connection refused'));

    await expect(handler.handle(makeJob()))
      .rejects.toThrow('Connection refused');
  });
});
