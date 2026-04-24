import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BookingSource, BookingStatus, PaymentStatus, Prisma } from '../../../../prisma/generated/prisma';
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

    // Total platform fee = processing fee + referral commission.
    // Cap at chargeAmountCents - 1 so the connected account always receives
    // at least 1 cent. Stripe permits application_fee == charge (0 to the
    // connected account), but we enforce a minimum payout as a business
    // invariant. Capping also prevents Stripe from outright rejecting the
    // intent when the uncapped fee would exceed the charge (can happen on
    // deposit payments where referral commission is calculated on the full
    // booking total but deducted from a smaller deposit charge).
    const uncappedPlatformFee =
      processingFeeCents + (referralCommissionCents ?? 0);
    const maxAllowedFee = Math.max(0, chargeAmountCents - 1);
    const totalPlatformFee = Math.min(uncappedPlatformFee, maxAllowedFee);

    if (uncappedPlatformFee > maxAllowedFee) {
      this.logger.warn(
        `Platform fee capped for booking ${bookingId}: ` +
          `uncapped=${uncappedPlatformFee} cents, capped=${totalPlatformFee} cents ` +
          `(charge=${chargeAmountCents}, processing=${processingFeeCents}, referral=${referralCommissionCents ?? 0})`,
      );
    }

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

    // Create Payment record and state history atomically
    const payment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.payment.create({
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

      await tx.paymentStateHistory.create({
        data: {
          paymentId: created.id,
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

      return created;
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
    const result = await this.prisma.$transaction(async (tx) => {
      // Lock the payment row to prevent TOCTOU race from duplicate webhooks
      const payments = await tx.$queryRaw<
        Array<{ id: string; status: string; booking_id: string }>
      >`
        SELECT id, status, booking_id FROM "payments"
        WHERE "provider_transaction_id" = ${providerPaymentId}
        FOR UPDATE
      `;

      const lockedPayment = payments[0];

      if (!lockedPayment) {
        this.logger.warn(
          `Payment not found for provider ID: ${providerPaymentId}`,
        );
        return null;
      }

      // Idempotency: already succeeded
      if (lockedPayment.status === 'SUCCEEDED') {
        this.logger.log(
          `Payment ${lockedPayment.id} already succeeded — skipping duplicate`,
        );
        return null;
      }

      // Full read with relations (still inside tx, row is locked)
      const payment = await tx.payment.findFirst({
        where: { id: lockedPayment.id },
        include: { booking: true },
      });

      if (!payment) return null;

      const previousStatus = payment.status;
      const shouldConfirmBooking = payment.booking.status === 'PENDING';

      // Update payment status
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: 'SUCCEEDED' },
      });

      // Create state history
      await tx.paymentStateHistory.create({
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
      if (shouldConfirmBooking) {
        await tx.booking.update({
          where: { id: payment.bookingId },
          data: { status: 'CONFIRMED' },
        });

        await tx.bookingStateHistory.create({
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

      return { payment, previousStatus, shouldConfirmBooking };
    });

    if (!result) return;

    const { payment, shouldConfirmBooking } = result;

    // Event emission OUTSIDE the transaction (after commit)
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

      if (shouldConfirmBooking) {
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
    // Row-lock + terminal-state guard, mirroring handlePaymentSuccess.
    // Stripe does NOT guarantee event ordering — payment_intent.succeeded and
    // payment_intent.payment_failed can arrive near-simultaneously. Without
    // this guard, a failure event arriving after a success would silently
    // overwrite SUCCEEDED with FAILED, losing the booking confirmation.
    const payment = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        Array<{
          id: string;
          status: string;
          tenant_id: string;
          booking_id: string;
          amount: string;
          currency: string;
        }>
      >`
        SELECT id, status, tenant_id, booking_id, amount, currency FROM "payments"
        WHERE "provider_transaction_id" = ${providerPaymentId}
        FOR UPDATE
      `;

      const locked = rows[0];
      if (!locked) {
        this.logger.warn(
          `Payment not found for provider ID: ${providerPaymentId}`,
        );
        return null;
      }

      // Terminal-state guard: never overwrite a payment already in a final
      // state. Prevents out-of-order webhook delivery from inverting status.
      // DISPUTED is included because disputes are managed by the dispute
      // lifecycle handlers — a late payment_failed event should not stomp it.
      if (
        locked.status === 'SUCCEEDED' ||
        locked.status === 'REFUNDED' ||
        locked.status === 'PARTIALLY_REFUNDED' ||
        locked.status === 'FAILED' ||
        locked.status === 'DISPUTED'
      ) {
        this.logger.log(
          `Payment ${locked.id} already in terminal state ${locked.status} — ignoring failure event`,
        );
        return null;
      }

      const previousStatus = locked.status as PaymentStatus;

      await tx.payment.update({
        where: { id: locked.id },
        data: { status: 'FAILED' },
      });

      await tx.paymentStateHistory.create({
        data: {
          paymentId: locked.id,
          tenantId: locked.tenant_id,
          fromState: previousStatus,
          toState: 'FAILED',
          triggeredBy: 'WEBHOOK',
          reason: reason ?? 'Payment failed via Stripe webhook',
        },
      });

      return {
        id: locked.id,
        tenantId: locked.tenant_id,
        bookingId: locked.booking_id,
        amount: Number(locked.amount),
        currency: locked.currency,
      };
    });

    if (!payment) return;

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
        amount: payment.amount,
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
   *
   * Stripe API calls (listRefunds, createRefund) are made OUTSIDE the
   * Prisma interactive transaction. Holding a FOR UPDATE lock while making
   * HTTP calls risks: (1) hitting Prisma's 5s transaction timeout mid-Stripe
   * call, rolling back local state while Stripe's refund has already landed,
   * leaving an orphaned Stripe refund with no corresponding DB record;
   * (2) blocking other refund attempts on the same payment for the full
   * Stripe round-trip. We trade that correctness cost for an optimistic
   * pre-check — Stripe itself is the final safety net for over-refund.
   */
  async processRefund(tenantId: string, paymentId: string, amount?: number) {
    // Phase 1: short read (no lock) to validate state and fetch identifiers.
    // Rejecting here lets us fail fast without ever calling Stripe.
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, tenantId },
      select: {
        id: true,
        status: true,
        providerTransactionId: true,
        amount: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    if (
      payment.status !== 'SUCCEEDED' &&
      payment.status !== 'PARTIALLY_REFUNDED'
    ) {
      throw new BadRequestException(
        `Cannot refund payment in status ${payment.status}`,
      );
    }
    if (!payment.providerTransactionId) {
      throw new BadRequestException(
        'Payment has no provider transaction ID — cannot refund',
      );
    }

    const paymentAmountCents = Math.round(Number(payment.amount) * 100);
    const requestedAmountCents = amount ? Math.round(amount * 100) : undefined;

    // Phase 2: query Stripe for cumulative refunded amount (source of truth).
    // OUTSIDE the transaction — see method-level comment.
    // Pending refunds are included in the sum: a pending refund that later
    // fails would overstate cumulative and block a follow-up refund, but
    // the reverse (excluding pending that later succeed) would ALLOW
    // over-refund. Blocking is the safer failure mode.
    const priorRefunds = await this.stripeProvider.listRefunds(
      payment.providerTransactionId,
    );
    const priorRefundedCents = priorRefunds
      .filter((r) => r.status !== 'failed' && r.status !== 'canceled')
      .reduce((sum, r) => sum + r.amount, 0);

    const newRefundCents =
      requestedAmountCents ?? paymentAmountCents - priorRefundedCents;

    if (newRefundCents <= 0) {
      throw new BadRequestException('Payment already fully refunded');
    }

    if (priorRefundedCents + newRefundCents > paymentAmountCents) {
      throw new BadRequestException(
        `Refund would exceed original amount (requested ${newRefundCents} cents, ` +
          `${priorRefundedCents} cents already refunded, original ${paymentAmountCents} cents)`,
      );
    }

    // Phase 3: create the refund on Stripe. OUTSIDE the transaction.
    // If two concurrent refund attempts slip through the optimistic check,
    // Stripe's own validation rejects any that would over-refund.
    const willBeFullRefund =
      priorRefundedCents + newRefundCents >= paymentAmountCents;
    const refundResult = await this.stripeProvider.createRefund({
      paymentIntentId: payment.providerTransactionId,
      amount: newRefundCents,
      reason: 'requested_by_customer',
      tenantId,
      refundApplicationFee: willBeFullRefund,
    });

    // Phase 4: short transaction to update local status. Lock + re-check
    // serializes concurrent completions; if another refund raced ahead and
    // already flipped to REFUNDED, we log and skip the redundant update.
    const totalRefundedCents = priorRefundedCents + refundResult.amount;
    const isFullRefund = totalRefundedCents >= paymentAmountCents;
    const newStatus = isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED';

    await this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        Array<{ status: string }>
      >`SELECT status FROM "payments" WHERE id = ${paymentId}::uuid FOR UPDATE`;
      const currentStatus = rows[0]?.status as PaymentStatus | undefined;
      if (!currentStatus) return;

      // If the current state is already terminal in a way the new refund
      // wouldn't change (e.g. REFUNDED and we're PARTIALLY_REFUNDED), skip.
      if (currentStatus === 'REFUNDED') {
        this.logger.log(
          `Payment ${paymentId} already REFUNDED — refund ${refundResult.id} recorded in state history only`,
        );
      } else {
        await tx.payment.update({
          where: { id: paymentId },
          data: { status: newStatus },
        });
      }

      await tx.paymentStateHistory.create({
        data: {
          paymentId,
          tenantId,
          fromState: currentStatus,
          toState: newStatus,
          triggeredBy: 'ADMIN',
          reason: `Refund processed: ${refundResult.id}`,
          metadata: {
            refundId: refundResult.id,
            refundAmount: refundResult.amount,
            priorRefundedCents,
            totalRefundedCents,
          } as Prisma.InputJsonValue,
        },
      });
    });

    const result = refundResult;

    this.logger.log(
      `Refund ${result.id} processed for payment ${paymentId}`,
    );

    return {
      refundId: result.id,
      amount: result.amount,
      status: result.status,
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

    const payment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.payment.create({
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

      await tx.paymentStateHistory.create({
        data: {
          paymentId: created.id,
          tenantId,
          fromState: 'CREATED',
          toState: 'SUCCEEDED',
          triggeredBy: 'ADMIN',
          reason: `Marked paid offline via ${paymentMethod}`,
        },
      });

      return created;
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
    if (startDate) where.createdAt = { ...((where.createdAt as object) || {}), gte: new Date(startDate) };
    if (endDate) where.createdAt = { ...((where.createdAt as object) || {}), lte: new Date(endDate) };
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
