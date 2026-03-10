import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ClientPortalService } from '@/client-portal/client-portal.service';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const USER_ID = 'user-001';
const BOOKING_ID = 'booking-001';
const TENANT_ID = 'tenant-001';
const SERVICE_ID = 'service-001';
const PAYMENT_ID = 'payment-001';

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

function mockBooking(overrides: Record<string, unknown> = {}) {
  return {
    id: BOOKING_ID,
    tenantId: TENANT_ID,
    clientId: USER_ID,
    serviceId: SERVICE_ID,
    status: 'PENDING',
    startTime: new Date('2026-03-15T10:00:00Z'),
    endTime: new Date('2026-03-15T11:00:00Z'),
    totalAmount: { toNumber: () => 50 },
    currency: 'USD',
    cancellationReason: null,
    cancelledAt: null,
    notes: null,
    source: 'ONLINE',
    service: {
      id: SERVICE_ID,
      name: 'Haircut',
      durationMinutes: 60,
      basePrice: { toNumber: () => 50 },
      currency: 'USD',
      cancellationPolicy: null,
    },
    tenant: {
      id: TENANT_ID,
      name: 'Test Salon',
      slug: 'test-salon',
    },
    payments: [],
    bookingStateHistory: [],
    ...overrides,
  };
}

function mockUser(overrides: Record<string, unknown> = {}) {
  return {
    id: USER_ID,
    name: 'Jane Doe',
    email: 'jane@test.com',
    phone: '+15551234567',
    avatarUrl: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

function mockInvoice(overrides: Record<string, unknown> = {}) {
  return {
    id: 'invoice-001',
    tenantId: TENANT_ID,
    bookingId: BOOKING_ID,
    invoiceNumber: 'INV-0001',
    totalAmount: { toNumber: () => 50 },
    status: 'PAID',
    createdAt: new Date('2026-03-01T00:00:00Z'),
    payments: [{ id: PAYMENT_ID, status: 'SUCCEEDED', amount: { toNumber: () => 50 } }],
    booking: {
      id: BOOKING_ID,
      startTime: new Date('2026-03-15T10:00:00Z'),
      endTime: new Date('2026-03-15T11:00:00Z'),
      service: { id: SERVICE_ID, name: 'Haircut' },
    },
    tenant: { id: TENANT_ID, name: 'Test Salon', slug: 'test-salon' },
    ...overrides,
  };
}

function mockPayment(overrides: Record<string, unknown> = {}) {
  return {
    id: PAYMENT_ID,
    tenantId: TENANT_ID,
    status: 'SUCCEEDED',
    amount: { toNumber: () => 50 },
    currency: 'USD',
    createdAt: new Date('2026-03-01T00:00:00Z'),
    booking: {
      id: BOOKING_ID,
      startTime: new Date('2026-03-15T10:00:00Z'),
      service: { id: SERVICE_ID, name: 'Haircut' },
    },
    tenant: { id: TENANT_ID, name: 'Test Salon' },
    ...overrides,
  };
}

function makePrisma() {
  return {
    booking: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    bookingStateHistory: {
      create: vi.fn(),
    },
    payment: {
      findMany: vi.fn(),
    },
    invoice: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    dataRequest: {
      create: vi.fn(),
    },
    $transaction: vi.fn().mockImplementation((fns: unknown[]) =>
      Promise.all((fns as Promise<unknown>[]).map((fn) => fn)),
    ),
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

function makeQueue() {
  return {
    add: vi.fn().mockResolvedValue({}),
  };
}

describe('ClientPortalService', () => {
  let service: ClientPortalService;
  let prisma: ReturnType<typeof makePrisma>;
  let queue: ReturnType<typeof makeQueue>;

  beforeEach(() => {
    prisma = makePrisma();
    queue = makeQueue();
    const mockPaymentsService = { processRefund: vi.fn().mockResolvedValue({}) };
    const mockAvailabilityService = { getAvailableSlots: vi.fn().mockResolvedValue([]) };
    service = new ClientPortalService(prisma as never, mockPaymentsService as never, mockAvailabilityService as never, queue as never);
  });

  // -----------------------------------------------------------------------
  // getDashboard
  // -----------------------------------------------------------------------

  describe('getDashboard', () => {
    it('should return upcoming bookings, recent payments, and stats', async () => {
      const upcoming = [mockBooking({ status: 'CONFIRMED' })];
      const payments = [mockPayment()];

      prisma.booking.findMany.mockResolvedValue(upcoming);
      prisma.payment.findMany.mockResolvedValue(payments);
      prisma.booking.count
        .mockResolvedValueOnce(15) // totalBookings
        .mockResolvedValueOnce(3); // upcomingCount

      const result = await service.getDashboard(USER_ID);

      expect(result.upcomingBookings).toHaveLength(1);
      expect(result.recentPayments).toHaveLength(1);
      expect(result.stats.totalBookings).toBe(15);
      expect(result.stats.upcomingCount).toBe(3);
    });

    it('should return empty arrays and zero stats for a new user', async () => {
      prisma.booking.findMany.mockResolvedValue([]);
      prisma.payment.findMany.mockResolvedValue([]);
      prisma.booking.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const result = await service.getDashboard(USER_ID);

      expect(result.upcomingBookings).toHaveLength(0);
      expect(result.recentPayments).toHaveLength(0);
      expect(result.stats.totalBookings).toBe(0);
      expect(result.stats.upcomingCount).toBe(0);
    });

    it('should scope all queries by clientId / userId', async () => {
      prisma.booking.findMany.mockResolvedValue([]);
      prisma.payment.findMany.mockResolvedValue([]);
      prisma.booking.count.mockResolvedValue(0);

      await service.getDashboard(USER_ID);

      // booking.findMany scoped to clientId
      const bookingWhere = prisma.booking.findMany.mock.calls[0]![0].where;
      expect(bookingWhere.clientId).toBe(USER_ID);

      // payment.findMany scoped through booking.clientId
      const paymentWhere = prisma.payment.findMany.mock.calls[0]![0].where;
      expect(paymentWhere.booking.clientId).toBe(USER_ID);

      // booking.count (first call) scoped to clientId
      const countWhere1 = prisma.booking.count.mock.calls[0]![0].where;
      expect(countWhere1.clientId).toBe(USER_ID);

      // booking.count (second call) scoped to clientId
      const countWhere2 = prisma.booking.count.mock.calls[1]![0].where;
      expect(countWhere2.clientId).toBe(USER_ID);
    });
  });

  // -----------------------------------------------------------------------
  // findAllBookings
  // -----------------------------------------------------------------------

  describe('findAllBookings', () => {
    it('should return paginated results with meta', async () => {
      prisma.booking.findMany.mockResolvedValue([mockBooking(), mockBooking({ id: 'booking-002' })]);
      prisma.booking.count.mockResolvedValue(2);

      const result = await service.findAllBookings(USER_ID, { page: 1, limit: 20 });

      expect(result.data).toHaveLength(2);
      expect(result.meta).toEqual({
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('should apply status filter', async () => {
      prisma.booking.findMany.mockResolvedValue([]);
      prisma.booking.count.mockResolvedValue(0);

      await service.findAllBookings(USER_ID, { status: 'CONFIRMED', page: 1, limit: 10 });

      const where = prisma.booking.findMany.mock.calls[0]![0].where;
      expect(where.status).toBe('CONFIRMED');
      expect(where.clientId).toBe(USER_ID);
    });

    it('should apply search filter on service name and tenant name', async () => {
      prisma.booking.findMany.mockResolvedValue([]);
      prisma.booking.count.mockResolvedValue(0);

      await service.findAllBookings(USER_ID, { search: 'salon', page: 1, limit: 10 });

      const where = prisma.booking.findMany.mock.calls[0]![0].where;
      expect(where.OR).toHaveLength(2);
      expect(where.OR[0]).toEqual({
        service: { name: { contains: 'salon', mode: 'insensitive' } },
      });
      expect(where.OR[1]).toEqual({
        tenant: { name: { contains: 'salon', mode: 'insensitive' } },
      });
    });

    it('should handle empty results', async () => {
      prisma.booking.findMany.mockResolvedValue([]);
      prisma.booking.count.mockResolvedValue(0);

      const result = await service.findAllBookings(USER_ID, { page: 1, limit: 20 });

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });

    it('should calculate correct pagination for multiple pages', async () => {
      prisma.booking.findMany.mockResolvedValue([mockBooking()]);
      prisma.booking.count.mockResolvedValue(50);

      const result = await service.findAllBookings(USER_ID, { page: 3, limit: 10 });

      expect(result.meta).toEqual({
        total: 50,
        page: 3,
        limit: 10,
        totalPages: 5,
      });

      // Verify skip is calculated correctly: (3-1) * 10 = 20
      const findManyArgs = prisma.booking.findMany.mock.calls[0]![0];
      expect(findManyArgs.skip).toBe(20);
      expect(findManyArgs.take).toBe(10);
    });

    it('should use default page=1 and limit=20 when not provided', async () => {
      prisma.booking.findMany.mockResolvedValue([]);
      prisma.booking.count.mockResolvedValue(0);

      await service.findAllBookings(USER_ID, {});

      const findManyArgs = prisma.booking.findMany.mock.calls[0]![0];
      expect(findManyArgs.skip).toBe(0);
      expect(findManyArgs.take).toBe(20);
    });
  });

  // -----------------------------------------------------------------------
  // findBookingById
  // -----------------------------------------------------------------------

  describe('findBookingById', () => {
    it('should return booking when found', async () => {
      prisma.booking.findFirst.mockResolvedValue(mockBooking());

      const result = await service.findBookingById(USER_ID, BOOKING_ID);

      expect(result.id).toBe(BOOKING_ID);
      expect(result.clientId).toBe(USER_ID);
    });

    it('should throw NotFoundException when booking not found', async () => {
      prisma.booking.findFirst.mockResolvedValue(null);

      await expect(service.findBookingById(USER_ID, 'nonexistent-id'))
        .rejects.toThrow(NotFoundException);
    });

    it('should scope query by both bookingId and clientId (prevents other users)', async () => {
      prisma.booking.findFirst.mockResolvedValue(null);

      await expect(service.findBookingById('other-user', BOOKING_ID))
        .rejects.toThrow(NotFoundException);

      const where = prisma.booking.findFirst.mock.calls[0]![0].where;
      expect(where.id).toBe(BOOKING_ID);
      expect(where.clientId).toBe('other-user');
    });

    it('should include service, tenant, payments, and state history', async () => {
      prisma.booking.findFirst.mockResolvedValue(mockBooking());

      await service.findBookingById(USER_ID, BOOKING_ID);

      const include = prisma.booking.findFirst.mock.calls[0]![0].include;
      expect(include.service).toBeDefined();
      expect(include.tenant).toBeDefined();
      expect(include.payments).toBeDefined();
      expect(include.bookingStateHistory).toBeDefined();
    });
  });

  // -----------------------------------------------------------------------
  // cancelBooking
  // -----------------------------------------------------------------------

  describe('cancelBooking', () => {
    it('should successfully cancel a PENDING booking (free cancellation)', async () => {
      // Booking is far in the future with a free cancellation policy
      const futureStart = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours from now
      prisma.booking.findFirst.mockResolvedValue(
        mockBooking({
          status: 'PENDING',
          startTime: futureStart,
          service: {
            id: SERVICE_ID,
            name: 'Haircut',
            cancellationPolicy: {
              free_cancellation_hours: 24,
              late_cancellation_fee_percent: 50,
            },
          },
          payments: [],
        }),
      );

      const updatedBooking = mockBooking({ status: 'CANCELLED' });
      prisma.booking.update.mockResolvedValue(updatedBooking);
      prisma.bookingStateHistory.create.mockResolvedValue({});

      const result = await service.cancelBooking(USER_ID, BOOKING_ID);

      expect(result.booking.status).toBe('CANCELLED');
      expect(result.cancellation.refundType).toBe('FULL_REFUND');
      expect(result.cancellation.refundAmount).toBe(0);
      expect(result.cancellation.fee).toBe(0);
      expect(result.cancellation.refundInfo).toBeNull();
    });

    it('should successfully cancel a CONFIRMED booking (late cancellation with fee)', async () => {
      // Booking is within the free cancellation window
      const soonStart = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now
      prisma.booking.findFirst.mockResolvedValue(
        mockBooking({
          status: 'CONFIRMED',
          startTime: soonStart,
          service: {
            id: SERVICE_ID,
            name: 'Haircut',
            cancellationPolicy: {
              free_cancellation_hours: 24,
              late_cancellation_fee_percent: 50,
              late_cancellation_flat_fee: 10,
            },
          },
          payments: [],
        }),
      );

      const updatedBooking = mockBooking({ status: 'CANCELLED' });
      prisma.booking.update.mockResolvedValue(updatedBooking);
      prisma.bookingStateHistory.create.mockResolvedValue({});

      const result = await service.cancelBooking(USER_ID, BOOKING_ID, 'Schedule conflict');

      expect(result.booking.status).toBe('CANCELLED');
      // Legacy fields: late_cancellation_flat_fee=10 takes precedence (fixed type)
      // 2h before, free=24h, so it's a late cancel. Fixed fee of $10, but no payment so totalAmount=0
      expect(result.cancellation.refundType).toBe('FULL_REFUND');
      expect(result.cancellation.fee).toBe(0);
    });

    it('should throw NotFoundException when booking not found', async () => {
      prisma.booking.findFirst.mockResolvedValue(null);

      await expect(service.cancelBooking(USER_ID, 'bad-id'))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for COMPLETED booking', async () => {
      prisma.booking.findFirst.mockResolvedValue(
        mockBooking({
          status: 'COMPLETED',
          service: { id: SERVICE_ID, name: 'Haircut', cancellationPolicy: null },
          payments: [],
        }),
      );

      await expect(service.cancelBooking(USER_ID, BOOKING_ID))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for CANCELLED booking', async () => {
      prisma.booking.findFirst.mockResolvedValue(
        mockBooking({
          status: 'CANCELLED',
          service: { id: SERVICE_ID, name: 'Haircut', cancellationPolicy: null },
          payments: [],
        }),
      );

      await expect(service.cancelBooking(USER_ID, BOOKING_ID))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for NO_SHOW booking', async () => {
      prisma.booking.findFirst.mockResolvedValue(
        mockBooking({
          status: 'NO_SHOW',
          service: { id: SERVICE_ID, name: 'Haircut', cancellationPolicy: null },
          payments: [],
        }),
      );

      await expect(service.cancelBooking(USER_ID, BOOKING_ID))
        .rejects.toThrow(BadRequestException);
    });

    it('should create BookingStateHistory record with correct data', async () => {
      const futureStart = new Date(Date.now() + 72 * 60 * 60 * 1000);
      prisma.booking.findFirst.mockResolvedValue(
        mockBooking({
          status: 'CONFIRMED',
          startTime: futureStart,
          service: {
            id: SERVICE_ID,
            name: 'Haircut',
            cancellationPolicy: {
              free_cancellation_hours: 24,
            },
          },
          payments: [],
        }),
      );

      const updatedBooking = mockBooking({ status: 'CANCELLED' });
      prisma.booking.update.mockResolvedValue(updatedBooking);
      prisma.bookingStateHistory.create.mockResolvedValue({});

      await service.cancelBooking(USER_ID, BOOKING_ID, 'Changed my mind');

      // $transaction receives an array of Prisma promise-like operations.
      // The mock resolves each element. The second element is bookingStateHistory.create.
      expect(prisma.bookingStateHistory.create).toHaveBeenCalledWith({
        data: {
          bookingId: BOOKING_ID,
          tenantId: TENANT_ID,
          fromState: 'CONFIRMED',
          toState: 'CANCELLED',
          triggeredBy: 'CLIENT',
          reason: 'Client cancellation: Changed my mind',
          metadata: {
            refundType: 'FULL_REFUND',
            refundAmount: 0,
            fee: 0,
          },
        },
      });
    });

    it('should return refundInfo when a succeeded payment exists', async () => {
      const futureStart = new Date(Date.now() + 72 * 60 * 60 * 1000);
      prisma.booking.findFirst.mockResolvedValue(
        mockBooking({
          status: 'CONFIRMED',
          startTime: futureStart,
          service: {
            id: SERVICE_ID,
            name: 'Haircut',
            cancellationPolicy: null,
          },
          payments: [
            { id: PAYMENT_ID, status: 'SUCCEEDED', amount: { toNumber: () => 5000 } },
          ],
        }),
      );

      const updatedBooking = mockBooking({ status: 'CANCELLED' });
      prisma.booking.update.mockResolvedValue(updatedBooking);
      prisma.bookingStateHistory.create.mockResolvedValue({});

      const result = await service.cancelBooking(USER_ID, BOOKING_ID);

      expect(result.cancellation.refundInfo).toEqual({
        paymentId: PAYMENT_ID,
        amount: '5000',
        refundType: 'FULL_REFUND',
      });
    });

    it('should return null refundInfo when no succeeded payment exists', async () => {
      const futureStart = new Date(Date.now() + 72 * 60 * 60 * 1000);
      prisma.booking.findFirst.mockResolvedValue(
        mockBooking({
          status: 'PENDING',
          startTime: futureStart,
          service: {
            id: SERVICE_ID,
            name: 'Haircut',
            cancellationPolicy: null,
          },
          payments: [],
        }),
      );

      const updatedBooking = mockBooking({ status: 'CANCELLED' });
      prisma.booking.update.mockResolvedValue(updatedBooking);
      prisma.bookingStateHistory.create.mockResolvedValue({});

      const result = await service.cancelBooking(USER_ID, BOOKING_ID);

      expect(result.cancellation.refundInfo).toBeNull();
    });

    it('should use default cancellation note when no reason provided', async () => {
      const futureStart = new Date(Date.now() + 72 * 60 * 60 * 1000);
      prisma.booking.findFirst.mockResolvedValue(
        mockBooking({
          status: 'PENDING',
          startTime: futureStart,
          service: {
            id: SERVICE_ID,
            name: 'Haircut',
            cancellationPolicy: null,
          },
          payments: [],
        }),
      );

      prisma.booking.update.mockResolvedValue(mockBooking({ status: 'CANCELLED' }));
      prisma.bookingStateHistory.create.mockResolvedValue({});

      await service.cancelBooking(USER_ID, BOOKING_ID);

      expect(prisma.bookingStateHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reason: 'Client cancellation',
          }),
        }),
      );
    });

    it('should evaluate LATE cancellation when booking start time has passed', async () => {
      const pastStart = new Date(Date.now() - 1 * 60 * 60 * 1000); // 1 hour ago
      prisma.booking.findFirst.mockResolvedValue(
        mockBooking({
          status: 'CONFIRMED',
          startTime: pastStart,
          service: {
            id: SERVICE_ID,
            name: 'Haircut',
            cancellationPolicy: {
              free_cancellation_hours: 24,
              late_cancellation_fee_percent: 75,
            },
          },
          payments: [],
        }),
      );

      prisma.booking.update.mockResolvedValue(mockBooking({ status: 'CANCELLED' }));
      prisma.bookingStateHistory.create.mockResolvedValue({});

      const result = await service.cancelBooking(USER_ID, BOOKING_ID);

      // Past start, no payment (totalAmount=0), so refundAmount=0
      expect(result.cancellation.refundType).toBe('FULL_REFUND');
      expect(result.cancellation.refundAmount).toBe(0);
    });

    it('should use default policy when no cancellation policy exists', async () => {
      prisma.booking.findFirst.mockResolvedValue(
        mockBooking({
          status: 'PENDING',
          service: {
            id: SERVICE_ID,
            name: 'Haircut',
            cancellationPolicy: null,
          },
          payments: [],
        }),
      );

      prisma.booking.update.mockResolvedValue(mockBooking({ status: 'CANCELLED' }));
      prisma.bookingStateHistory.create.mockResolvedValue({});

      const result = await service.cancelBooking(USER_ID, BOOKING_ID);

      // Null policy → default (24h free). Booking start is far future (mockBooking default),
      // no payment, so totalAmount=0 → FULL_REFUND with 0 amount
      expect(result.cancellation.refundType).toBe('FULL_REFUND');
      expect(result.cancellation.refundAmount).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // findAllPayments
  // -----------------------------------------------------------------------

  describe('findAllPayments', () => {
    it('should return paginated invoices with meta', async () => {
      prisma.invoice.findMany.mockResolvedValue([mockInvoice()]);
      prisma.invoice.count.mockResolvedValue(1);

      const result = await service.findAllPayments(USER_ID, 1, 20);

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('should handle empty results', async () => {
      prisma.invoice.findMany.mockResolvedValue([]);
      prisma.invoice.count.mockResolvedValue(0);

      const result = await service.findAllPayments(USER_ID, 1, 20);

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });

    it('should calculate correct skip for pagination', async () => {
      prisma.invoice.findMany.mockResolvedValue([]);
      prisma.invoice.count.mockResolvedValue(100);

      await service.findAllPayments(USER_ID, 5, 10);

      const findManyArgs = prisma.invoice.findMany.mock.calls[0]![0];
      expect(findManyArgs.skip).toBe(40); // (5-1) * 10
      expect(findManyArgs.take).toBe(10);
    });

    it('should scope query by booking.clientId', async () => {
      prisma.invoice.findMany.mockResolvedValue([]);
      prisma.invoice.count.mockResolvedValue(0);

      await service.findAllPayments(USER_ID);

      const findManyArgs = prisma.invoice.findMany.mock.calls[0]![0];
      expect(findManyArgs.where.booking.clientId).toBe(USER_ID);
    });
  });

  // -----------------------------------------------------------------------
  // getProfile
  // -----------------------------------------------------------------------

  describe('getProfile', () => {
    it('should return user profile', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser());

      const result = await service.getProfile(USER_ID);

      expect(result.id).toBe(USER_ID);
      expect(result.name).toBe('Jane Doe');
      expect(result.email).toBe('jane@test.com');
      expect(result.phone).toBe('+15551234567');
    });

    it('should throw NotFoundException when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('nonexistent-id'))
        .rejects.toThrow(NotFoundException);
    });

    it('should select only profile-safe fields', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser());

      await service.getProfile(USER_ID);

      const selectFields = prisma.user.findUnique.mock.calls[0]![0].select;
      expect(selectFields).toEqual({
        id: true,
        name: true,
        email: true,
        phone: true,
        avatarUrl: true,
        createdAt: true,
      });
    });
  });

  // -----------------------------------------------------------------------
  // updateProfile
  // -----------------------------------------------------------------------

  describe('updateProfile', () => {
    it('should update name successfully', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser());
      prisma.user.update.mockResolvedValue(mockUser({ name: 'Jane Smith' }));

      const result = await service.updateProfile(USER_ID, { firstName: 'Jane', lastName: 'Smith' });

      expect(result.name).toBe('Jane Smith');
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: USER_ID },
          data: { name: 'Jane Smith' },
        }),
      );
    });

    it('should update email when new email is unique', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(mockUser()) // first call: verify user exists
        .mockResolvedValueOnce(null); // second call: check email uniqueness
      prisma.user.update.mockResolvedValue(mockUser({ email: 'newemail@test.com' }));

      const result = await service.updateProfile(USER_ID, { email: 'newemail@test.com' });

      expect(result.email).toBe('newemail@test.com');
    });

    it('should throw BadRequestException when changing to existing email', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(mockUser()) // first call: verify user exists
        .mockResolvedValueOnce(mockUser({ id: 'other-user', email: 'taken@test.com' })); // second call: email taken

      await expect(service.updateProfile(USER_ID, { email: 'taken@test.com' }))
        .rejects.toThrow(BadRequestException);
    });

    it('should not check email uniqueness when email is unchanged', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser());
      prisma.user.update.mockResolvedValue(mockUser());

      await service.updateProfile(USER_ID, { email: 'jane@test.com' });

      // findUnique should only be called once (to verify user exists)
      expect(prisma.user.findUnique).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.updateProfile(USER_ID, { firstName: 'New', lastName: 'Name' }))
        .rejects.toThrow(NotFoundException);
    });

    it('should update phone number', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser());
      prisma.user.update.mockResolvedValue(mockUser({ phone: '+15559876543' }));

      const result = await service.updateProfile(USER_ID, { phone: '+15559876543' });

      expect(result.phone).toBe('+15559876543');
    });

    it('should update multiple fields at once', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(mockUser())
        .mockResolvedValueOnce(null); // email uniqueness check
      prisma.user.update.mockResolvedValue(
        mockUser({ name: 'Updated Name', email: 'new@test.com', phone: '+15550000000' }),
      );

      await service.updateProfile(USER_ID, {
        firstName: 'Updated',
        lastName: 'Name',
        email: 'new@test.com',
        phone: '+15550000000',
      });

      const updateData = prisma.user.update.mock.calls[0]![0].data;
      expect(updateData.name).toBe('Updated Name');
      expect(updateData.email).toBe('new@test.com');
      expect(updateData.phone).toBe('+15550000000');
    });
  });

  // -----------------------------------------------------------------------
  // requestDataExport
  // -----------------------------------------------------------------------

  describe('requestDataExport', () => {
    it('should create DataRequest with correct fields', async () => {
      const createdRequest = {
        id: 'datareq-001',
        userId: USER_ID,
        requestType: 'EXPORT',
        status: 'PENDING',
        requestedAt: new Date(),
        deadlineAt: new Date(),
        notes: 'Requested via client portal',
      };
      prisma.dataRequest.create.mockResolvedValue(createdRequest);

      const result = await service.requestDataExport(USER_ID);

      expect(result.requestType).toBe('EXPORT');
      expect(result.status).toBe('PENDING');
      expect(result.userId).toBe(USER_ID);

      const createArgs = prisma.dataRequest.create.mock.calls[0]![0].data;
      expect(createArgs.userId).toBe(USER_ID);
      expect(createArgs.requestType).toBe('EXPORT');
      expect(createArgs.status).toBe('PENDING');
      expect(createArgs.notes).toBe('Requested via client portal');
      expect(createArgs.requestedAt).toBeInstanceOf(Date);
      expect(createArgs.deadlineAt).toBeInstanceOf(Date);
    });

    it('should set a 30-day deadline from now', async () => {
      prisma.dataRequest.create.mockResolvedValue({ id: 'datareq-001' });

      await service.requestDataExport(USER_ID);

      const createArgs = prisma.dataRequest.create.mock.calls[0]![0].data;
      const requestedAt = createArgs.requestedAt as Date;
      const deadlineAt = createArgs.deadlineAt as Date;

      const diffMs = deadlineAt.getTime() - requestedAt.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeCloseTo(30, 0);
    });
  });

  // -----------------------------------------------------------------------
  // requestAccountDeletion
  // -----------------------------------------------------------------------

  describe('requestAccountDeletion', () => {
    it('should create deletion request when no active bookings', async () => {
      prisma.booking.count.mockResolvedValue(0);
      const createdRequest = {
        id: 'datareq-002',
        userId: USER_ID,
        requestType: 'DELETION',
        status: 'PENDING',
        requestedAt: new Date(),
        deadlineAt: new Date(),
        notes: 'Requested via client portal',
      };
      prisma.dataRequest.create.mockResolvedValue(createdRequest);

      const result = await service.requestAccountDeletion(USER_ID);

      expect(result.requestType).toBe('DELETION');
      expect(result.status).toBe('PENDING');

      const createArgs = prisma.dataRequest.create.mock.calls[0]![0].data;
      expect(createArgs.requestType).toBe('DELETION');
    });

    it('should throw BadRequestException when active bookings exist', async () => {
      prisma.booking.count.mockResolvedValue(3);

      await expect(service.requestAccountDeletion(USER_ID))
        .rejects.toThrow(BadRequestException);
    });

    it('should include count of active bookings in error message', async () => {
      prisma.booking.count.mockResolvedValue(2);

      await expect(service.requestAccountDeletion(USER_ID))
        .rejects.toThrow('Cannot request account deletion with 2 active booking(s)');
    });

    it('should check for PENDING, CONFIRMED, and IN_PROGRESS bookings', async () => {
      prisma.booking.count.mockResolvedValue(0);
      prisma.dataRequest.create.mockResolvedValue({ id: 'datareq-002' });

      await service.requestAccountDeletion(USER_ID);

      const countWhere = prisma.booking.count.mock.calls[0]![0].where;
      expect(countWhere.clientId).toBe(USER_ID);
      expect(countWhere.status.in).toEqual(['PENDING', 'CONFIRMED', 'IN_PROGRESS']);
    });

    it('should set a 30-day deadline from now', async () => {
      prisma.booking.count.mockResolvedValue(0);
      prisma.dataRequest.create.mockResolvedValue({ id: 'datareq-002' });

      await service.requestAccountDeletion(USER_ID);

      const createArgs = prisma.dataRequest.create.mock.calls[0]![0].data;
      const requestedAt = createArgs.requestedAt as Date;
      const deadlineAt = createArgs.deadlineAt as Date;

      const diffMs = deadlineAt.getTime() - requestedAt.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeCloseTo(30, 0);
    });
  });
});
