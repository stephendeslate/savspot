import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { BookingsService } from '@/bookings/bookings.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const BOOKING_ID = 'booking-001';
const USER_ID = 'user-001';
const SERVICE_ID = 'service-001';

function mockBooking(overrides: Record<string, unknown> = {}) {
  return {
    id: BOOKING_ID,
    tenantId: TENANT_ID,
    clientId: 'client-001',
    serviceId: SERVICE_ID,
    status: 'PENDING',
    startTime: new Date('2026-03-15T10:00:00Z'),
    endTime: new Date('2026-03-15T11:00:00Z'),
    totalAmount: { toNumber: () => 50 },
    currency: 'USD',
    rescheduleCount: 0,
    originalStartDate: null,
    notes: null,
    source: 'ONLINE',
    service: {
      id: SERVICE_ID,
      name: 'Haircut',
      durationMinutes: 60,
      basePrice: { toNumber: () => 50 },
      currency: 'USD',
      cancellationPolicy: null,
      maxRescheduleCount: 3,
    },
    client: { id: 'client-001', name: 'John', email: 'john@test.com', phone: null },
    venue: null,
    payments: [],
    invoices: [],
    bookingStateHistory: [],
    ...overrides,
  };
}

function makePrisma() {
  return {
    booking: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    bookingStateHistory: { create: vi.fn() },
    service: { findFirst: vi.fn() },
    user: { findFirst: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(),
  };
}

function makePayments() {
  return { processRefund: vi.fn() };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('BookingsService', () => {
  let service: BookingsService;
  let prisma: ReturnType<typeof makePrisma>;
  let payments: ReturnType<typeof makePayments>;

  beforeEach(() => {
    prisma = makePrisma();
    payments = makePayments();
    service = new BookingsService(prisma as never, payments as never);
  });

  // -----------------------------------------------------------------------
  // State transitions
  // -----------------------------------------------------------------------

  describe('state transitions', () => {
    it('PENDING → CONFIRMED allowed', async () => {
      prisma.booking.findFirst.mockResolvedValue(mockBooking({ status: 'PENDING' }));
      prisma.$transaction.mockImplementation((fns: unknown[]) =>
        Promise.all((fns as Promise<unknown>[]).map((fn) => fn)),
      );
      prisma.booking.update.mockResolvedValue({ ...mockBooking(), status: 'CONFIRMED' });
      prisma.bookingStateHistory.create.mockResolvedValue({});

      const result = await service.confirm(TENANT_ID, BOOKING_ID, USER_ID);
      expect(result.status).toBe('CONFIRMED');
    });

    it('CONFIRMED → NO_SHOW allowed', async () => {
      prisma.booking.findFirst.mockResolvedValue(mockBooking({ status: 'CONFIRMED' }));
      prisma.$transaction.mockImplementation((fns: unknown[]) =>
        Promise.all((fns as Promise<unknown>[]).map((fn) => fn)),
      );
      prisma.booking.update.mockResolvedValue({ ...mockBooking(), status: 'NO_SHOW' });
      prisma.bookingStateHistory.create.mockResolvedValue({});

      const result = await service.markNoShow(TENANT_ID, BOOKING_ID, USER_ID);
      expect(result.status).toBe('NO_SHOW');
    });

    it('PENDING → NO_SHOW rejected', async () => {
      prisma.booking.findFirst.mockResolvedValue(mockBooking({ status: 'PENDING' }));
      await expect(service.markNoShow(TENANT_ID, BOOKING_ID, USER_ID))
        .rejects.toThrow(BadRequestException);
    });

    it('COMPLETED → CONFIRMED rejected', async () => {
      prisma.booking.findFirst.mockResolvedValue(mockBooking({ status: 'COMPLETED' }));
      await expect(service.confirm(TENANT_ID, BOOKING_ID, USER_ID))
        .rejects.toThrow(BadRequestException);
    });

    it('CANCELLED → CONFIRMED rejected', async () => {
      prisma.booking.findFirst.mockResolvedValue(mockBooking({ status: 'CANCELLED' }));
      await expect(service.confirm(TENANT_ID, BOOKING_ID, USER_ID))
        .rejects.toThrow(BadRequestException);
    });

    it('NO_SHOW → CONFIRMED rejected', async () => {
      prisma.booking.findFirst.mockResolvedValue(mockBooking({ status: 'NO_SHOW' }));
      await expect(service.confirm(TENANT_ID, BOOKING_ID, USER_ID))
        .rejects.toThrow(BadRequestException);
    });
  });

  // -----------------------------------------------------------------------
  // findAll
  // -----------------------------------------------------------------------

  describe('findAll', () => {
    it('should return paginated results with meta', async () => {
      prisma.booking.findMany.mockResolvedValue([mockBooking()]);
      prisma.booking.count.mockResolvedValue(1);

      const result = await service.findAll(TENANT_ID, { page: 1, limit: 20 });
      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({ total: 1, page: 1, limit: 20, totalPages: 1 });
    });

    it('should apply status filter', async () => {
      prisma.booking.findMany.mockResolvedValue([]);
      prisma.booking.count.mockResolvedValue(0);

      await service.findAll(TENANT_ID, { status: 'CONFIRMED', page: 1, limit: 10 });
      const where = prisma.booking.findMany.mock.calls[0]![0].where;
      expect(where.status).toBe('CONFIRMED');
    });

    it('should apply search on client name/email', async () => {
      prisma.booking.findMany.mockResolvedValue([]);
      prisma.booking.count.mockResolvedValue(0);

      await service.findAll(TENANT_ID, { search: 'john', page: 1, limit: 10 });
      const where = prisma.booking.findMany.mock.calls[0]![0].where;
      expect(where.client.OR).toHaveLength(2);
    });

    it('should apply date range filters', async () => {
      prisma.booking.findMany.mockResolvedValue([]);
      prisma.booking.count.mockResolvedValue(0);

      await service.findAll(TENANT_ID, {
        startDate: '2026-03-01',
        endDate: '2026-03-31',
        page: 1,
        limit: 10,
      });
      const where = prisma.booking.findMany.mock.calls[0]![0].where;
      expect(where.startTime).toBeDefined();
      expect(where.endTime).toBeDefined();
    });
  });

  // -----------------------------------------------------------------------
  // findById
  // -----------------------------------------------------------------------

  describe('findById', () => {
    it('should return booking when found', async () => {
      prisma.booking.findFirst.mockResolvedValue(mockBooking());
      const result = await service.findById(TENANT_ID, BOOKING_ID);
      expect(result.id).toBe(BOOKING_ID);
    });

    it('should throw NotFoundException when not found', async () => {
      prisma.booking.findFirst.mockResolvedValue(null);
      await expect(service.findById(TENANT_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  // -----------------------------------------------------------------------
  // cancel with auto-refund
  // -----------------------------------------------------------------------

  describe('cancel', () => {
    it('should trigger auto-refund for succeeded payment', async () => {
      prisma.booking.findFirst.mockResolvedValue(mockBooking({
        status: 'CONFIRMED',
        payments: [{ id: 'pay-1', status: 'SUCCEEDED' }],
      }));
      prisma.$transaction.mockImplementation((fns: unknown[]) =>
        Promise.all((fns as Promise<unknown>[]).map((fn) => fn)),
      );
      prisma.booking.update.mockResolvedValue({ ...mockBooking(), status: 'CANCELLED' });
      prisma.bookingStateHistory.create.mockResolvedValue({});
      payments.processRefund.mockResolvedValue({});

      await service.cancel(TENANT_ID, BOOKING_ID, USER_ID, 'CLIENT_REQUEST');
      expect(payments.processRefund).toHaveBeenCalledWith(TENANT_ID, 'pay-1');
    });

    it('should not fail if refund fails', async () => {
      prisma.booking.findFirst.mockResolvedValue(mockBooking({
        status: 'CONFIRMED',
        payments: [{ id: 'pay-1', status: 'SUCCEEDED' }],
      }));
      prisma.$transaction.mockImplementation((fns: unknown[]) =>
        Promise.all((fns as Promise<unknown>[]).map((fn) => fn)),
      );
      prisma.booking.update.mockResolvedValue({ ...mockBooking(), status: 'CANCELLED' });
      prisma.bookingStateHistory.create.mockResolvedValue({});
      payments.processRefund.mockRejectedValue(new Error('Stripe error'));

      const result = await service.cancel(TENANT_ID, BOOKING_ID, USER_ID, 'ADMIN');
      expect(result.status).toBe('CANCELLED');
    });
  });

  // -----------------------------------------------------------------------
  // reschedule
  // -----------------------------------------------------------------------

  describe('reschedule', () => {
    it('should reject when max reschedule count reached', async () => {
      prisma.booking.findFirst.mockResolvedValue(mockBooking({
        status: 'CONFIRMED',
        rescheduleCount: 3,
      }));
      await expect(
        service.reschedule(TENANT_ID, BOOKING_ID, USER_ID, '2026-03-20T10:00:00Z', '2026-03-20T11:00:00Z'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject for COMPLETED booking', async () => {
      prisma.booking.findFirst.mockResolvedValue(mockBooking({ status: 'COMPLETED' }));
      await expect(
        service.reschedule(TENANT_ID, BOOKING_ID, USER_ID, '2026-03-20T10:00:00Z', '2026-03-20T11:00:00Z'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when slot is taken', async () => {
      prisma.booking.findFirst.mockResolvedValue(mockBooking({ status: 'CONFIRMED' }));
      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          $executeRaw: vi.fn(),
          $queryRaw: vi.fn().mockResolvedValueOnce([{ id: 'conflict' }]),
        }),
      );
      await expect(
        service.reschedule(TENANT_ID, BOOKING_ID, USER_ID, '2026-03-20T10:00:00Z', '2026-03-20T11:00:00Z'),
      ).rejects.toThrow(ConflictException);
    });
  });

  // -----------------------------------------------------------------------
  // createWalkIn
  // -----------------------------------------------------------------------

  describe('createWalkIn', () => {
    const walkInDto = {
      serviceId: SERVICE_ID,
      startTime: '2026-03-15T14:00:00Z',
      endTime: '2026-03-15T15:00:00Z',
      clientEmail: 'walkin@test.com',
      clientName: 'Walk Client',
    };

    it('should throw NotFoundException for missing service', async () => {
      prisma.service.findFirst.mockResolvedValue(null);
      await expect(service.createWalkIn(TENANT_ID, walkInDto, USER_ID))
        .rejects.toThrow(NotFoundException);
    });

    it('should create CONFIRMED booking with WALK_IN source', async () => {
      prisma.service.findFirst.mockResolvedValue({
        id: SERVICE_ID, basePrice: 50, currency: 'USD', venueId: null,
      });
      prisma.user.findFirst.mockResolvedValue({ id: 'client-002' });

      const created = { id: 'new-bk', status: 'CONFIRMED', source: 'WALK_IN',
        service: { id: SERVICE_ID, name: 'Cut', durationMinutes: 60 },
        client: { id: 'client-002', name: 'Walk Client', email: 'walkin@test.com' },
      };

      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          $executeRaw: vi.fn(),
          $queryRaw: vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]),
          booking: { create: vi.fn().mockResolvedValue(created) },
          bookingStateHistory: { create: vi.fn() },
        }),
      );

      const result = await service.createWalkIn(TENANT_ID, walkInDto, USER_ID);
      expect(result.status).toBe('CONFIRMED');
      expect(result.source).toBe('WALK_IN');
    });

    it('should create placeholder user for anonymous walk-in', async () => {
      prisma.service.findFirst.mockResolvedValue({
        id: SERVICE_ID, basePrice: 50, currency: 'USD', venueId: null,
      });
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: 'walk-user' });

      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          $executeRaw: vi.fn(),
          $queryRaw: vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]),
          booking: { create: vi.fn().mockResolvedValue({ id: 'b', status: 'CONFIRMED', source: 'WALK_IN' }) },
          bookingStateHistory: { create: vi.fn() },
        }),
      );

      const anonDto = { ...walkInDto, clientEmail: undefined, clientName: undefined };
      await service.createWalkIn(TENANT_ID, anonDto, USER_ID);

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: { email: `walkin+${TENANT_ID}@savspot.co`, name: 'Walk-in Client' },
      });
    });

    it('should throw ConflictException when slot is taken', async () => {
      prisma.service.findFirst.mockResolvedValue({
        id: SERVICE_ID, basePrice: 50, currency: 'USD', venueId: null,
      });
      prisma.user.findFirst.mockResolvedValue({ id: 'c' });

      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          $executeRaw: vi.fn(),
          $queryRaw: vi.fn().mockResolvedValueOnce([{ id: 'conflict' }]),
        }),
      );

      await expect(service.createWalkIn(TENANT_ID, walkInDto, USER_ID))
        .rejects.toThrow(ConflictException);
    });
  });

  // -----------------------------------------------------------------------
  // update
  // -----------------------------------------------------------------------

  describe('update', () => {
    it('should update notes', async () => {
      prisma.booking.findFirst.mockResolvedValue(mockBooking());
      prisma.booking.update.mockResolvedValue({ ...mockBooking(), notes: 'New notes' });

      const result = await service.update(TENANT_ID, BOOKING_ID, 'New notes');
      expect(result.notes).toBe('New notes');
    });

    it('should set notes to null when undefined', async () => {
      prisma.booking.findFirst.mockResolvedValue(mockBooking());
      prisma.booking.update.mockResolvedValue({ ...mockBooking(), notes: null });

      await service.update(TENANT_ID, BOOKING_ID, undefined);
      expect(prisma.booking.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { notes: null } }),
      );
    });
  });
});
