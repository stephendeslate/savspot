import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BookingSource, BookingStatus, Prisma } from '../../../../prisma/generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { StripeProvider } from './providers/stripe.provider';
import { EventsService } from '../events/events.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly stripeProvider: StripeProvider,
    private readonly eventsService: EventsService,
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
   * Resolve the payment amount based on service deposit configuration.
   * Returns the payment type and amount to charge.
   */
  resolvePaymentAmount(
    totalAmount: number,
    depositConfig: { type: 'PERCENTAGE' | 'FIXED'; amount: number } | null,
  ): { paymentType: 'DEPOSIT' | 'FULL_PAYMENT'; amount: number } {
    if (!depositConfig) {
      return { paymentType: 'FULL_PAYMENT', amount: totalAmount };
    }

    let depositAmount: number;
    if (depositConfig.type === 'PERCENTAGE') {
      depositAmount =
        Math.round(((totalAmount * depositConfig.amount) / 100) * 100) / 100;
    } else {
      depositAmount = Math.min(depositConfig.amount, totalAmount);
    }

    // If deposit >= total or deposit is 0, just charge full amount
    if (depositAmount >= totalAmount || depositAmount <= 0) {
      return { paymentType: 'FULL_PAYMENT', amount: totalAmount };
    }

    return { paymentType: 'DEPOSIT', amount: depositAmount };
  }

  /**
   * Calculate referral commission for a platform-sourced booking.
   * Commission is collected on the first booking per client per tenant
   * from platform channels (DIRECTORY, API, REFERRAL).
   * Returns commission in cents, or null if not applicable.
   */
  async calculateReferralCommission(
    tenantId: string,
    clientId: string,
    bookingSource: string,
    bookingTotalCents: number,
  ): Promise<number | null> {
    const COMMISSION_SOURCES: BookingSource[] = [
      BookingSource.DIRECTORY,
      BookingSource.API,
      BookingSource.REFERRAL,
    ];
    if (!COMMISSION_SOURCES.includes(bookingSource as BookingSource)) return null;

    // Check if client has any prior platform-sourced, non-cancelled booking at this tenant
    const priorBooking = await this.prisma.booking.findFirst({
      where: {
        tenantId,
        clientId,
        source: { in: COMMISSION_SOURCES },
        status: { notIn: [BookingStatus.CANCELLED] },
      },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
      take: 1,
    });

    // Not first platform booking — no commission
    if (priorBooking) return null;

    const commissionPercent = this.configService.get<number>(
      'referral_commission_percent',
      20,
    );
    const commissionCapCents = this.configService.get<number>(
      'referral_commission_cap_cents',
      50000,
    );

    const commissionCents = Math.min(
      Math.round((bookingTotalCents * commissionPercent) / 100),
      commissionCapCents,
    );

    return commissionCents > 0 ? commissionCents : null;
  }

  /**
   * Process a PaymentIntent for a booking session.
   * Creates Stripe PaymentIntent, creates Payment record with PENDING status.
   * Applies deposit config and referral commission where applicable.
   * Returns the client_secret for frontend confirmation.
   */
  async processPaymentIntent(
    tenantId: string,
    bookingId: string,
    sessionId: string,
  ) {
    // Load the booking with service (including depositConfig) and tenant info
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, tenantId },
      include: {
        service: {
          select: {
            id: true,
            depositConfig: true,
          },
        },
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

    const totalAmount = booking.totalAmount.toNumber();
    const totalAmountCents = Math.round(totalAmount * 100);

    if (totalAmountCents <= 0) {
      throw new BadRequestException('Payment amount must be greater than zero');
    }

    // Resolve deposit vs full payment
    const depositConfig = booking.service?.depositConfig as {
      type: 'PERCENTAGE' | 'FIXED';
      amount: number;
    } | null;
    const { paymentType, amount: chargeAmount } = this.resolvePaymentAmount(
      totalAmount,
      depositConfig,
    );
    const chargeAmountCents = Math.round(chargeAmount * 100);

    // Calculate platform processing fee on the charge amount
    const platformFeePercent = this.configService.get<number>(
      'stripe.platformFeePercent',
      1,
    );
    const processingFeeCents = Math.round(
      (chargeAmountCents * platformFeePercent) / 100,
    );
    const platformFeeDollars = processingFeeCents / 100;

    // Calculate referral commission (on total booking amount, not deposit)
    const referralCommissionCents = await this.calculateReferralCommission(
      tenantId,
      booking.clientId,
      booking.source,
      totalAmountCents,
    );
    const referralCommissionDollars = referralCommissionCents
      ? referralCommissionCents / 100
      : null;

    // Total platform fee = processing fee + referral commission
    const totalPlatformFee =
      processingFeeCents + (referralCommissionCents ?? 0);

    // Create Stripe PaymentIntent
    const intentResult = await this.stripeProvider.createPaymentIntent({
      amount: chargeAmountCents,
      currency: booking.currency.toLowerCase(),
      connectedAccountId: booking.tenant.paymentProviderAccountId,
      platformFeeAmount: totalPlatformFee,
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
        amount: chargeAmount,
        platformFee: platformFeeDollars,
        processingFee: platformFeeDollars,
        referralCommission: referralCommissionDollars,
        currency: booking.currency,
        type: paymentType,
        status: 'PENDING',
        providerTransactionId: intentResult.id,
        metadata: {
          stripePaymentIntentId: intentResult.id,
          sessionId,
          totalBookingAmount: totalAmountCents,
          depositConfig: depositConfig ?? undefined,
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
        reason: `Stripe PaymentIntent created (${paymentType})`,
        metadata: {
          stripePaymentIntentId: intentResult.id,
        } as Prisma.InputJsonValue,
      },
    });

    this.logger.log(
      `PaymentIntent created: ${intentResult.id} for booking ${bookingId} (${paymentType}, ${chargeAmountCents} cents)`,
    );

    return {
      clientSecret: intentResult.clientSecret,
      paymentId: payment.id,
      amount: chargeAmountCents,
      currency: booking.currency,
      paymentType,
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

    // Load booking details for event payload
    const fullBooking = await this.prisma.booking.findFirst({
      where: { id: payment.bookingId },
      include: {
        client: { select: { id: true, name: true, email: true } },
        service: { select: { id: true, name: true } },
      },
    });

    if (fullBooking) {
      this.eventsService.emitPaymentReceived({
        tenantId: payment.tenantId,
        bookingId: payment.bookingId,
        paymentId: payment.id,
        amount: payment.amount.toNumber(),
        currency: payment.currency,
        clientId: fullBooking.clientId,
        clientName: fullBooking.client?.name ?? '',
        clientEmail: fullBooking.client?.email ?? '',
        serviceName: fullBooking.service?.name ?? '',
      });

      if (payment.booking.status === 'PENDING') {
        this.eventsService.emitBookingConfirmed({
          tenantId: payment.tenantId,
          bookingId: payment.bookingId,
          serviceId: fullBooking.serviceId,
          clientId: fullBooking.clientId,
          clientEmail: fullBooking.client?.email ?? '',
          clientName: fullBooking.client?.name ?? '',
          serviceName: fullBooking.service?.name ?? '',
          startTime: fullBooking.startTime,
          endTime: fullBooking.endTime,
          source: fullBooking.source as string,
        });
      }
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

    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED' },
      }),
      this.prisma.paymentStateHistory.create({
        data: {
          paymentId: payment.id,
          tenantId: payment.tenantId,
          fromState: previousStatus,
          toState: 'FAILED',
          triggeredBy: 'WEBHOOK',
          reason: reason ?? 'Payment failed via Stripe webhook',
        },
      }),
    ]);

    // Load booking details for event payload
    const failedBooking = await this.prisma.booking.findFirst({
      where: { id: payment.bookingId },
      include: {
        client: { select: { id: true, name: true, email: true } },
        service: { select: { id: true, name: true } },
      },
    });

    if (failedBooking) {
      this.eventsService.emitPaymentFailed({
        tenantId: payment.tenantId,
        bookingId: payment.bookingId,
        paymentId: payment.id,
        amount: payment.amount.toNumber(),
        currency: payment.currency,
        clientId: failedBooking.clientId,
        clientName: failedBooking.client?.name ?? '',
        clientEmail: failedBooking.client?.email ?? '',
        serviceName: failedBooking.service?.name ?? '',
      });
    }

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
      amount: amount ? Math.round(amount * 100) : undefined,
      reason: 'requested_by_customer',
      tenantId,
    });

    const isFullRefund = !amount || amount >= payment.amount.toNumber();
    const newStatus = isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED';

    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: newStatus },
      }),
      this.prisma.paymentStateHistory.create({
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
      }),
    ]);

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

    // Load booking details for event payload
    const paidBooking = await this.prisma.booking.findFirst({
      where: { id: bookingId, tenantId },
      include: {
        client: { select: { id: true, name: true, email: true } },
        service: { select: { id: true, name: true } },
      },
    });

    if (paidBooking) {
      this.eventsService.emitPaymentReceived({
        tenantId,
        bookingId,
        paymentId: payment.id,
        amount,
        currency,
        clientId: paidBooking.clientId,
        clientName: paidBooking.client?.name ?? '',
        clientEmail: paidBooking.client?.email ?? '',
        serviceName: paidBooking.service?.name ?? '',
      });
    }

    this.logger.log(
      `Booking ${bookingId} marked as paid offline: ${amount} ${currency}`,
    );

    return payment;
  }

  /**
   * Get aggregated payment stats for a tenant.
   */
  async getStats(tenantId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalRevenue, thisMonth, pendingPayments, refunded] =
      await Promise.all([
        this.prisma.payment.aggregate({
          where: { tenantId, status: 'SUCCEEDED' },
          _sum: { amount: true },
        }),
        this.prisma.payment.aggregate({
          where: {
            tenantId,
            status: 'SUCCEEDED',
            createdAt: { gte: startOfMonth },
          },
          _sum: { amount: true },
        }),
        this.prisma.payment.aggregate({
          where: { tenantId, status: { in: ['CREATED', 'PENDING'] } },
          _sum: { amount: true },
        }),
        this.prisma.payment.aggregate({
          where: { tenantId, status: 'REFUNDED' },
          _sum: { amount: true },
        }),
      ]);

    return {
      totalRevenue: String(totalRevenue._sum.amount ?? 0),
      thisMonth: String(thisMonth._sum.amount ?? 0),
      pendingPayments: String(pendingPayments._sum.amount ?? 0),
      refunded: String(refunded._sum.amount ?? 0),
    };
  }

  /**
   * List payments for a tenant with optional filters.
   */
  async findAll(
    tenantId: string,
    filters: {
      bookingId?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
      search?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const { bookingId, status, startDate, endDate, search, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.PaymentWhereInput = { tenantId };
    if (bookingId) where.bookingId = bookingId;
    if (status) where.status = status as Prisma.PaymentWhereInput['status'];
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) (where.createdAt as Record<string, Date>)['gte'] = new Date(startDate);
      if (endDate) (where.createdAt as Record<string, Date>)['lte'] = new Date(endDate);
    }
    if (search) {
      where.booking = {
        client: {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        },
      };
    }

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
