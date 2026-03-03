import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PaymentsService } from '@/payments/payments.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const decimal = (v: number) => ({ toNumber: () => v });

const TENANT_ID = 'tenant-001';
const BOOKING_ID = 'booking-001';
const PAYMENT_ID = 'payment-001';
const SESSION_ID = 'session-001';
const STRIPE_PI_ID = 'pi_abc123';
const CONNECTED_ACCOUNT = 'acct_001';

function makePrisma() {
  return {
    payment: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    paymentStateHistory: { create: vi.fn() },
    booking: { findFirst: vi.fn(), update: vi.fn() },
    bookingStateHistory: { create: vi.fn() },
  };
}

function makeConfig() {
  return {
    get: vi.fn((_key: string, fallback?: unknown) => fallback ?? 1),
  };
}

function makeStripe() {
  return {
    createPaymentIntent: vi.fn(),
    createRefund: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: ReturnType<typeof makePrisma>;
  let stripe: ReturnType<typeof makeStripe>;

  beforeEach(() => {
    prisma = makePrisma();
    const config = makeConfig();
    stripe = makeStripe();

    // Direct instantiation — avoids PrismaClient super() constructor
    service = new PaymentsService(prisma as never, config as never, stripe as never);
  });

  // -----------------------------------------------------------------------
  // createPaymentForBooking
  // -----------------------------------------------------------------------

  describe('createPaymentForBooking', () => {
    it('should create a payment record with CREATED status', async () => {
      prisma.payment.create.mockResolvedValue({ id: PAYMENT_ID });
      prisma.paymentStateHistory.create.mockResolvedValue({});

      const result = await service.createPaymentForBooking(
        TENANT_ID, BOOKING_ID, 5000, 'USD', 'FULL_PAYMENT', 'STRIPE',
      );

      expect(result.id).toBe(PAYMENT_ID);
      expect(prisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_ID,
            bookingId: BOOKING_ID,
            amount: 5000,
            currency: 'USD',
            status: 'CREATED',
            type: 'FULL_PAYMENT',
          }),
        }),
      );
    });

    it('should create initial state history entry', async () => {
      prisma.payment.create.mockResolvedValue({ id: PAYMENT_ID });
      prisma.paymentStateHistory.create.mockResolvedValue({});

      await service.createPaymentForBooking(
        TENANT_ID, BOOKING_ID, 5000, 'USD', 'DEPOSIT', 'OFFLINE',
      );

      expect(prisma.paymentStateHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            paymentId: PAYMENT_ID,
            fromState: 'CREATED',
            toState: 'CREATED',
            triggeredBy: 'SYSTEM',
          }),
        }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // processPaymentIntent
  // -----------------------------------------------------------------------

  describe('processPaymentIntent', () => {
    const mockBooking = {
      id: BOOKING_ID,
      tenantId: TENANT_ID,
      serviceId: 'svc-1',
      totalAmount: decimal(50),
      currency: 'USD',
      tenant: {
        paymentProvider: 'STRIPE',
        paymentProviderAccountId: CONNECTED_ACCOUNT,
        paymentProviderOnboarded: true,
      },
    };

    it('should throw NotFoundException when booking not found', async () => {
      prisma.booking.findFirst.mockResolvedValue(null);
      await expect(
        service.processPaymentIntent(TENANT_ID, 'bad-id', SESSION_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when tenant not onboarded', async () => {
      prisma.booking.findFirst.mockResolvedValue({
        ...mockBooking,
        tenant: { ...mockBooking.tenant, paymentProviderOnboarded: false },
      });
      await expect(
        service.processPaymentIntent(TENANT_ID, BOOKING_ID, SESSION_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when no connected account', async () => {
      prisma.booking.findFirst.mockResolvedValue({
        ...mockBooking,
        tenant: { ...mockBooking.tenant, paymentProviderAccountId: null },
      });
      await expect(
        service.processPaymentIntent(TENANT_ID, BOOKING_ID, SESSION_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when amount is zero', async () => {
      prisma.booking.findFirst.mockResolvedValue({
        ...mockBooking,
        totalAmount: decimal(0),
      });
      await expect(
        service.processPaymentIntent(TENANT_ID, BOOKING_ID, SESSION_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create PaymentIntent with platform fee and return clientSecret', async () => {
      prisma.booking.findFirst.mockResolvedValue(mockBooking);
      stripe.createPaymentIntent.mockResolvedValue({
        id: STRIPE_PI_ID,
        clientSecret: 'secret_123',
      });
      prisma.payment.create.mockResolvedValue({ id: PAYMENT_ID });
      prisma.paymentStateHistory.create.mockResolvedValue({});

      const result = await service.processPaymentIntent(TENANT_ID, BOOKING_ID, SESSION_ID);

      expect(result.clientSecret).toBe('secret_123');
      expect(result.paymentId).toBe(PAYMENT_ID);
      expect(result.amount).toBe(5000);
      expect(stripe.createPaymentIntent).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 5000,
          currency: 'usd',
          connectedAccountId: CONNECTED_ACCOUNT,
          platformFeeAmount: 50,
        }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // handlePaymentSuccess
  // -----------------------------------------------------------------------

  describe('handlePaymentSuccess', () => {
    it('should return early when payment not found', async () => {
      prisma.payment.findFirst.mockResolvedValue(null);
      await service.handlePaymentSuccess('pi_unknown');
      expect(prisma.payment.update).not.toHaveBeenCalled();
    });

    it('should skip if already SUCCEEDED (idempotency)', async () => {
      prisma.payment.findFirst.mockResolvedValue({
        id: PAYMENT_ID, status: 'SUCCEEDED', booking: { status: 'CONFIRMED' },
      });
      await service.handlePaymentSuccess(STRIPE_PI_ID);
      expect(prisma.payment.update).not.toHaveBeenCalled();
    });

    it('should update to SUCCEEDED and auto-confirm PENDING booking', async () => {
      prisma.payment.findFirst.mockResolvedValue({
        id: PAYMENT_ID, tenantId: TENANT_ID, bookingId: BOOKING_ID,
        status: 'PENDING', booking: { status: 'PENDING' },
      });
      prisma.payment.update.mockResolvedValue({});
      prisma.paymentStateHistory.create.mockResolvedValue({});
      prisma.booking.update.mockResolvedValue({});
      prisma.bookingStateHistory.create.mockResolvedValue({});

      await service.handlePaymentSuccess(STRIPE_PI_ID);

      expect(prisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'SUCCEEDED' } }),
      );
      expect(prisma.booking.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'CONFIRMED' } }),
      );
    });

    it('should NOT auto-confirm when booking is not PENDING', async () => {
      prisma.payment.findFirst.mockResolvedValue({
        id: PAYMENT_ID, tenantId: TENANT_ID, bookingId: BOOKING_ID,
        status: 'PENDING', booking: { status: 'CONFIRMED' },
      });
      prisma.payment.update.mockResolvedValue({});
      prisma.paymentStateHistory.create.mockResolvedValue({});

      await service.handlePaymentSuccess(STRIPE_PI_ID);
      expect(prisma.booking.update).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // handlePaymentFailure
  // -----------------------------------------------------------------------

  describe('handlePaymentFailure', () => {
    it('should return early when payment not found', async () => {
      prisma.payment.findFirst.mockResolvedValue(null);
      await service.handlePaymentFailure('pi_unknown');
      expect(prisma.payment.update).not.toHaveBeenCalled();
    });

    it('should update status to FAILED and record reason', async () => {
      prisma.payment.findFirst.mockResolvedValue({
        id: PAYMENT_ID, tenantId: TENANT_ID, status: 'PENDING',
      });
      prisma.payment.update.mockResolvedValue({});
      prisma.paymentStateHistory.create.mockResolvedValue({});

      await service.handlePaymentFailure(STRIPE_PI_ID, 'Card declined');

      expect(prisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'FAILED' } }),
      );
      expect(prisma.paymentStateHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fromState: 'PENDING',
            toState: 'FAILED',
            reason: 'Card declined',
          }),
        }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // processRefund
  // -----------------------------------------------------------------------

  describe('processRefund', () => {
    it('should throw NotFoundException when payment not found', async () => {
      prisma.payment.findFirst.mockResolvedValue(null);
      await expect(service.processRefund(TENANT_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for non-SUCCEEDED payment', async () => {
      prisma.payment.findFirst.mockResolvedValue({ id: PAYMENT_ID, status: 'PENDING' });
      await expect(service.processRefund(TENANT_ID, PAYMENT_ID)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when no provider transaction ID', async () => {
      prisma.payment.findFirst.mockResolvedValue({
        id: PAYMENT_ID, status: 'SUCCEEDED', providerTransactionId: null,
      });
      await expect(service.processRefund(TENANT_ID, PAYMENT_ID)).rejects.toThrow(BadRequestException);
    });

    it('should set REFUNDED for full refund', async () => {
      prisma.payment.findFirst.mockResolvedValue({
        id: PAYMENT_ID, tenantId: TENANT_ID, status: 'SUCCEEDED',
        providerTransactionId: STRIPE_PI_ID, amount: decimal(5000),
      });
      stripe.createRefund.mockResolvedValue({ id: 're_1', amount: 5000, status: 'succeeded' });
      prisma.payment.update.mockResolvedValue({});
      prisma.paymentStateHistory.create.mockResolvedValue({});

      const result = await service.processRefund(TENANT_ID, PAYMENT_ID);
      expect(result.refundId).toBe('re_1');
      expect(prisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'REFUNDED' } }),
      );
    });

    it('should set PARTIALLY_REFUNDED for partial refund', async () => {
      prisma.payment.findFirst.mockResolvedValue({
        id: PAYMENT_ID, tenantId: TENANT_ID, status: 'SUCCEEDED',
        providerTransactionId: STRIPE_PI_ID, amount: decimal(5000),
      });
      stripe.createRefund.mockResolvedValue({ id: 're_2', amount: 2000, status: 'succeeded' });
      prisma.payment.update.mockResolvedValue({});
      prisma.paymentStateHistory.create.mockResolvedValue({});

      await service.processRefund(TENANT_ID, PAYMENT_ID, 2000);
      expect(prisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'PARTIALLY_REFUNDED' } }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // markPaid
  // -----------------------------------------------------------------------

  describe('markPaid', () => {
    it('should throw NotFoundException when booking not found', async () => {
      prisma.booking.findFirst.mockResolvedValue(null);
      await expect(service.markPaid(TENANT_ID, 'bad-id', 5000, 'USD')).rejects.toThrow(NotFoundException);
    });

    it('should create offline payment with SUCCEEDED status', async () => {
      prisma.booking.findFirst.mockResolvedValue({ id: BOOKING_ID });
      prisma.payment.create.mockResolvedValue({ id: PAYMENT_ID, status: 'SUCCEEDED' });
      prisma.paymentStateHistory.create.mockResolvedValue({});

      const result = await service.markPaid(TENANT_ID, BOOKING_ID, 5000, 'USD', 'CASH');
      expect(result.status).toBe('SUCCEEDED');
      expect(prisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'SUCCEEDED', type: 'FULL_PAYMENT' }),
        }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // findAll
  // -----------------------------------------------------------------------

  describe('findAll', () => {
    it('should return paginated results', async () => {
      prisma.payment.findMany.mockResolvedValue([{ id: PAYMENT_ID }]);
      prisma.payment.count.mockResolvedValue(1);

      const result = await service.findAll(TENANT_ID, { page: 1, limit: 20 });
      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({ total: 1, page: 1, limit: 20, totalPages: 1 });
    });

    it('should apply filters', async () => {
      prisma.payment.findMany.mockResolvedValue([]);
      prisma.payment.count.mockResolvedValue(0);

      await service.findAll(TENANT_ID, { bookingId: BOOKING_ID, status: 'SUCCEEDED' });
      expect(prisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ bookingId: BOOKING_ID, status: 'SUCCEEDED' }),
        }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // findById
  // -----------------------------------------------------------------------

  describe('findById', () => {
    it('should return payment when found', async () => {
      prisma.payment.findFirst.mockResolvedValue({ id: PAYMENT_ID });
      const result = await service.findById(TENANT_ID, PAYMENT_ID);
      expect(result.id).toBe(PAYMENT_ID);
    });

    it('should throw NotFoundException when not found', async () => {
      prisma.payment.findFirst.mockResolvedValue(null);
      await expect(service.findById(TENANT_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });
  });
});
