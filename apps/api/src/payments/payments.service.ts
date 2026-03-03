import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '../../../../prisma/generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { StripeProvider } from './providers/stripe.provider';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly stripeProvider: StripeProvider,
  ) {}

  /**
   * Create a Payment record for a booking.
   */
  async createPaymentForBooking(
    tenantId: string,
    bookingId: string,
    amount: number,
    currency: string,
    paymentType: 'DEPOSIT' | 'FULL_PAYMENT' | 'INSTALLMENT' | 'REFUND',
    provider: 'STRIPE' | 'ADYEN' | 'PAYPAL' | 'OFFLINE',
  ) {
    const payment = await this.prisma.payment.create({
      data: {
        tenantId,
        bookingId,
        amount,
        currency,
        type: paymentType,
        status: 'CREATED',
        metadata: Prisma.JsonNull,
      },
    });

    // Create initial state history
    await this.prisma.paymentStateHistory.create({
      data: {
        paymentId: payment.id,
        tenantId,
        fromState: 'CREATED',
        toState: 'CREATED',
        triggeredBy: 'SYSTEM',
        reason: `Payment created for booking ${bookingId} via ${provider}`,
      },
    });

    return payment;
  }

  /**
   * Process a PaymentIntent for a booking session.
   * Creates Stripe PaymentIntent, creates Payment record with PENDING status.
   * Returns the client_secret for frontend confirmation.
   */
  async processPaymentIntent(
    tenantId: string,
    bookingId: string,
    sessionId: string,
  ) {
    // Load the booking with service and tenant info
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, tenantId },
      include: {
        service: true,
        tenant: {
          select: {
            paymentProvider: true,
            paymentProviderAccountId: true,
            paymentProviderOnboarded: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (!booking.tenant.paymentProviderOnboarded) {
      throw new BadRequestException('Tenant payment provider not onboarded');
    }

    if (!booking.tenant.paymentProviderAccountId) {
      throw new BadRequestException('Tenant has no connected payment account');
    }

    const amount = booking.totalAmount.toNumber();
    const amountInCents = Math.round(amount * 100);

    if (amountInCents <= 0) {
      throw new BadRequestException('Payment amount must be greater than zero');
    }

    // Calculate platform fee
    const platformFeePercent = this.configService.get<number>(
      'stripe.platformFeePercent',
      1,
    );
    const platformFeeAmount = Math.round(
      (amountInCents * platformFeePercent) / 100,
    );

    // Create Stripe PaymentIntent
    const intentResult = await this.stripeProvider.createPaymentIntent({
      amount: amountInCents,
      currency: booking.currency.toLowerCase(),
      connectedAccountId: booking.tenant.paymentProviderAccountId,
      platformFeeAmount,
      metadata: {
        tenantId,
        bookingId,
        sessionId,
        serviceId: booking.serviceId,
      },
    });

    // Create Payment record
    const payment = await this.prisma.payment.create({
      data: {
        tenantId,
        bookingId,
        amount: amountInCents,
        platformFee: platformFeeAmount,
        currency: booking.currency,
        type: 'FULL_PAYMENT',
        status: 'PENDING',
        providerTransactionId: intentResult.id,
        metadata: {
          stripePaymentIntentId: intentResult.id,
          sessionId,
        } as Prisma.InputJsonValue,
      },
    });

    // Create state history
    await this.prisma.paymentStateHistory.create({
      data: {
        paymentId: payment.id,
        tenantId,
        fromState: 'CREATED',
        toState: 'PENDING',
        triggeredBy: 'SYSTEM',
        reason: 'Stripe PaymentIntent created',
        metadata: {
          stripePaymentIntentId: intentResult.id,
        } as Prisma.InputJsonValue,
      },
    });

    this.logger.log(
      `PaymentIntent created: ${intentResult.id} for booking ${bookingId}`,
    );

    return {
      clientSecret: intentResult.clientSecret,
      paymentId: payment.id,
      amount: amountInCents,
      currency: booking.currency,
    };
  }

  /**
   * Handle a successful payment from Stripe webhook.
   * Updates Payment to SUCCEEDED, confirms the booking.
   */
  async handlePaymentSuccess(providerPaymentId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { providerTransactionId: providerPaymentId },
      include: { booking: true },
    });

    if (!payment) {
      this.logger.warn(
        `Payment not found for provider ID: ${providerPaymentId}`,
      );
      return;
    }

    if (payment.status === 'SUCCEEDED') {
      this.logger.log(
        `Payment ${payment.id} already succeeded — skipping duplicate`,
      );
      return;
    }

    const previousStatus = payment.status;

    // Update payment status
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'SUCCEEDED' },
    });

    // Create state history
    await this.prisma.paymentStateHistory.create({
      data: {
        paymentId: payment.id,
        tenantId: payment.tenantId,
        fromState: previousStatus,
        toState: 'SUCCEEDED',
        triggeredBy: 'WEBHOOK',
        reason: 'Payment succeeded via Stripe webhook',
      },
    });

    // Confirm the booking if it is PENDING
    if (payment.booking.status === 'PENDING') {
      await this.prisma.booking.update({
        where: { id: payment.bookingId },
        data: { status: 'CONFIRMED' },
      });

      await this.prisma.bookingStateHistory.create({
        data: {
          bookingId: payment.bookingId,
          tenantId: payment.tenantId,
          fromState: 'PENDING',
          toState: 'CONFIRMED',
          triggeredBy: 'WEBHOOK',
          reason: 'Payment succeeded — booking auto-confirmed',
        },
      });
    }

    this.logger.log(
      `Payment ${payment.id} succeeded for booking ${payment.bookingId}`,
    );
  }

  /**
   * Handle a failed payment from Stripe webhook.
   */
  async handlePaymentFailure(providerPaymentId: string, reason?: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { providerTransactionId: providerPaymentId },
    });

    if (!payment) {
      this.logger.warn(
        `Payment not found for provider ID: ${providerPaymentId}`,
      );
      return;
    }

    const previousStatus = payment.status;

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'FAILED' },
    });

    await this.prisma.paymentStateHistory.create({
      data: {
        paymentId: payment.id,
        tenantId: payment.tenantId,
        fromState: previousStatus,
        toState: 'FAILED',
        triggeredBy: 'WEBHOOK',
        reason: reason ?? 'Payment failed via Stripe webhook',
      },
    });

    this.logger.log(`Payment ${payment.id} failed: ${reason ?? 'unknown'}`);
  }

  /**
   * Process a refund for a payment.
   */
  async processRefund(tenantId: string, paymentId: string, amount?: number) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, tenantId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== 'SUCCEEDED') {
      throw new BadRequestException('Can only refund succeeded payments');
    }

    if (!payment.providerTransactionId) {
      throw new BadRequestException(
        'Payment has no provider transaction ID — cannot refund',
      );
    }

    const refundResult = await this.stripeProvider.createRefund({
      paymentIntentId: payment.providerTransactionId,
      amount,
      reason: 'requested_by_customer',
    });

    const isFullRefund = !amount || amount >= payment.amount.toNumber();
    const newStatus = isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED';

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: newStatus },
    });

    await this.prisma.paymentStateHistory.create({
      data: {
        paymentId: payment.id,
        tenantId,
        fromState: 'SUCCEEDED',
        toState: newStatus,
        triggeredBy: 'ADMIN',
        reason: `Refund processed: ${refundResult.id}`,
        metadata: {
          refundId: refundResult.id,
          refundAmount: refundResult.amount,
        } as Prisma.InputJsonValue,
      },
    });

    this.logger.log(
      `Refund ${refundResult.id} processed for payment ${paymentId}`,
    );

    return {
      refundId: refundResult.id,
      amount: refundResult.amount,
      status: refundResult.status,
    };
  }

  /**
   * Mark a booking as paid offline (cash, check, etc.).
   */
  async markPaid(
    tenantId: string,
    bookingId: string,
    amount: number,
    currency: string,
    paymentMethod: string = 'CASH',
  ) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, tenantId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const payment = await this.prisma.payment.create({
      data: {
        tenantId,
        bookingId,
        amount,
        currency,
        type: 'FULL_PAYMENT',
        status: 'SUCCEEDED',
        metadata: {
          paymentMethod,
          markedPaidManually: true,
        } as Prisma.InputJsonValue,
      },
    });

    // Create state history (directly to SUCCEEDED)
    await this.prisma.paymentStateHistory.create({
      data: {
        paymentId: payment.id,
        tenantId,
        fromState: 'CREATED',
        toState: 'SUCCEEDED',
        triggeredBy: 'ADMIN',
        reason: `Marked paid offline via ${paymentMethod}`,
      },
    });

    this.logger.log(
      `Booking ${bookingId} marked as paid offline: ${amount} ${currency}`,
    );

    return payment;
  }

  /**
   * List payments for a tenant with optional filters.
   */
  async findAll(
    tenantId: string,
    filters: {
      bookingId?: string;
      status?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const { bookingId, status, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.PaymentWhereInput = { tenantId };
    if (bookingId) where.bookingId = bookingId;
    if (status) where.status = status as Prisma.PaymentWhereInput['status'];

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: {
          booking: {
            select: {
              id: true,
              status: true,
              startTime: true,
              service: { select: { id: true, name: true } },
              client: { select: { id: true, name: true, email: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      data: payments,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single payment by ID.
   */
  async findById(tenantId: string, id: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, tenantId },
      include: {
        booking: {
          select: {
            id: true,
            status: true,
            startTime: true,
            endTime: true,
            totalAmount: true,
            currency: true,
            service: { select: { id: true, name: true } },
            client: { select: { id: true, name: true, email: true } },
          },
        },
        paymentStateHistory: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }
}
