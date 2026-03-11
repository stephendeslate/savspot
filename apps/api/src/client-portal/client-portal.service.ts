import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Prisma } from '../../../../prisma/generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { AvailabilityService } from '../availability/availability.service';
import {
  QUEUE_GDPR,
  JOB_PROCESS_DATA_EXPORT,
} from '../bullmq/queue.constants';
import {
  evaluateCancellationPolicy,
  CancellationPolicy,
} from '../bookings/cancellation-policy.evaluator';
import { PortalSignContractDto } from './dto/portal-sign-contract.dto';
import { PortalAcceptQuoteDto } from './dto/portal-accept-quote.dto';
import { PortalSubmitReviewDto } from './dto/portal-submit-review.dto';

/**
 * Architectural decision: When migrating off superuser DB role, use a service-role
 * connection that bypasses RLS for cross-tenant client portal queries. The client
 * portal intentionally queries by clientId across all tenants (e.g., dashboard,
 * booking list, payment history). Per-tenant iteration would be prohibitively slow
 * and a client-scoped RLS policy would add complexity without clear benefit.
 * A dedicated service-role Prisma client with bypassed RLS is the correct approach
 * for these trusted server-side, user-authenticated queries.
 */
@Injectable()
export class ClientPortalService {
  private readonly logger = new Logger(ClientPortalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
    private readonly availabilityService: AvailabilityService,
    @InjectQueue(QUEUE_GDPR) private readonly gdprQueue: Queue,
  ) {}

  /**
   * Dashboard: upcoming bookings (next 7 days), recent payments, aggregate stats.
   * Queries by clientId across ALL tenants (no tenant scoping).
   */
  async getDashboard(userId: string) {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [upcomingBookings, recentPayments, totalBookings, upcomingCount] =
      await Promise.all([
        // Upcoming bookings in the next 7 days
        this.prisma.booking.findMany({
          where: {
            clientId: userId,
            startTime: { gte: now, lte: sevenDaysFromNow },
            status: { in: ['PENDING', 'CONFIRMED'] },
          },
          include: {
            service: {
              select: { id: true, name: true, durationMinutes: true },
            },
            tenant: {
              select: { id: true, name: true, slug: true },
            },
          },
          orderBy: { startTime: 'asc' },
          take: 10,
        }),

        // Recent payments (last 5)
        this.prisma.payment.findMany({
          where: {
            booking: { clientId: userId },
          },
          include: {
            booking: {
              select: {
                id: true,
                startTime: true,
                service: { select: { id: true, name: true } },
              },
            },
            tenant: {
              select: { id: true, name: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),

        // Total bookings count
        this.prisma.booking.count({
          where: { clientId: userId },
        }),

        // Upcoming bookings count (all future PENDING/CONFIRMED)
        this.prisma.booking.count({
          where: {
            clientId: userId,
            startTime: { gte: now },
            status: { in: ['PENDING', 'CONFIRMED'] },
          },
        }),
      ]);

    return {
      upcomingBookings,
      recentPayments,
      stats: {
        totalBookings,
        upcomingCount,
      },
    };
  }

  /**
   * List all bookings for a client with pagination and optional filters.
   * Cross-tenant: queries by clientId without tenant scoping.
   */
  async findAllBookings(
    userId: string,
    filters: {
      status?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const { status, search, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.BookingWhereInput = { clientId: userId };

    if (status) {
      where.status = status as Prisma.BookingWhereInput['status'];
    }

    if (search) {
      where.OR = [
        { service: { name: { contains: search, mode: 'insensitive' } } },
        { tenant: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: {
          service: {
            select: {
              id: true,
              name: true,
              durationMinutes: true,
              basePrice: true,
              currency: true,
            },
          },
          tenant: {
            select: { id: true, name: true, slug: true },
          },
        },
        orderBy: { startTime: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      data: bookings,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single booking with full details.
   * Verifies the booking belongs to the authenticated client.
   */
  async findBookingById(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, clientId: userId },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            durationMinutes: true,
            basePrice: true,
            currency: true,
            cancellationPolicy: true,
          },
        },
        tenant: {
          select: { id: true, name: true, slug: true },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
        },
        bookingStateHistory: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return booking;
  }

  /**
   * Cancel a booking from the client portal.
   *
   * 1. Verify ownership (clientId === userId)
   * 2. Validate state is PENDING or CONFIRMED
   * 3. Evaluate cancellation policy from service.cancellationPolicy JSONB
   * 4. Transition to CANCELLED, create BookingStateHistory
   * 5. If a succeeded payment exists, flag for refund processing
   */
  async cancelBooking(userId: string, bookingId: string, reason?: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, clientId: userId },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            cancellationPolicy: true,
          },
        },
        payments: {
          where: { status: 'SUCCEEDED' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Validate state — only PENDING or CONFIRMED can be cancelled by client
    if (!['PENDING', 'CONFIRMED'].includes(booking.status)) {
      throw new BadRequestException(
        `Cannot cancel a booking with status ${booking.status}`,
      );
    }

    // Evaluate cancellation policy
    const succeededPayment = booking.payments[0] ?? null;
    const totalAmount = succeededPayment
      ? succeededPayment.amount.toNumber()
      : 0;

    const policyResult = evaluateCancellationPolicy(
      booking.service.cancellationPolicy as CancellationPolicy | null,
      booking.startTime,
      totalAmount,
    );

    // Build the cancellation reason string
    const cancellationNote = reason
      ? `Client cancellation: ${reason}`
      : 'Client cancellation';

    // Perform the cancellation in a transaction
    const [updatedBooking] = await this.prisma.$transaction([
      this.prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: 'CANCELLED',
          cancellationReason:
            'CLIENT_REQUEST' as Prisma.BookingUpdateInput['cancellationReason'],
          cancelledAt: new Date(),
        },
        include: {
          service: {
            select: { id: true, name: true, durationMinutes: true },
          },
          tenant: {
            select: { id: true, name: true, slug: true },
          },
        },
      }),
      this.prisma.bookingStateHistory.create({
        data: {
          bookingId,
          tenantId: booking.tenantId,
          fromState: booking.status as 'PENDING' | 'CONFIRMED',
          toState: 'CANCELLED',
          triggeredBy: 'CLIENT',
          reason: cancellationNote,
          metadata: {
            refundType: policyResult.refundType,
            refundAmount: policyResult.refundAmount,
            fee: policyResult.fee,
          } as Prisma.InputJsonValue,
        },
      }),
    ]);

    // Process refund if a succeeded payment exists and refund amount > 0
    let refundInfo: {
      paymentId: string;
      amount: string;
      refundType: string;
    } | null = null;

    if (succeededPayment && policyResult.refundAmount > 0) {
      try {
        await this.paymentsService.processRefund(
          booking.tenantId,
          succeededPayment.id,
          policyResult.refundAmount,
        );
        refundInfo = {
          paymentId: succeededPayment.id,
          amount: policyResult.refundAmount.toString(),
          refundType: policyResult.refundType,
        };
        this.logger.log(
          `Refund of ${policyResult.refundAmount} initiated for payment ${succeededPayment.id} on cancelled booking ${bookingId}`,
        );
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        this.logger.error(
          `Failed to process refund for payment ${succeededPayment.id}: ${errorMessage}`,
        );
        // Don't fail the cancellation if the refund fails
        refundInfo = {
          paymentId: succeededPayment.id,
          amount: policyResult.refundAmount.toString(),
          refundType: policyResult.refundType,
        };
      }
    } else if (succeededPayment) {
      refundInfo = {
        paymentId: succeededPayment.id,
        amount: '0',
        refundType: policyResult.refundType,
      };
    }

    this.logger.log(
      `Booking ${bookingId} cancelled by client ${userId} (refundType: ${policyResult.refundType})`,
    );

    return {
      booking: updatedBooking,
      cancellation: {
        refundType: policyResult.refundType,
        refundAmount: policyResult.refundAmount,
        fee: policyResult.fee,
        refundInfo,
      },
    };
  }

  /**
   * Request a reschedule for a booking from the client portal.
   * Creates a reschedule request that the business can approve/deny.
   * For bookings with AUTO_CONFIRM, the reschedule is applied immediately.
   */
  async requestReschedule(
    userId: string,
    bookingId: string,
    newStartTime: string,
    newEndTime: string,
    reason?: string,
  ) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, clientId: userId },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            confirmationMode: true,
            maxRescheduleCount: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (!['PENDING', 'CONFIRMED'].includes(booking.status)) {
      throw new BadRequestException(
        `Cannot reschedule a booking with status ${booking.status}`,
      );
    }

    // Check max reschedule count
    const rescheduleCount = await this.prisma.bookingStateHistory.count({
      where: { bookingId, toState: 'CONFIRMED', reason: { contains: 'Rescheduled' } },
    });

    const maxReschedules = booking.service.maxRescheduleCount ?? 3;
    if (rescheduleCount >= maxReschedules) {
      throw new BadRequestException(
        `Maximum reschedule limit (${maxReschedules}) reached for this booking`,
      );
    }

    // Verify the new time is in the future
    const newStart = new Date(newStartTime);
    const newEnd = new Date(newEndTime);
    if (newStart <= new Date()) {
      throw new BadRequestException('New start time must be in the future');
    }

    // Validate the new slot is available (exclude the current booking from conflict check)
    const conflicts = await this.prisma.booking.findFirst({
      where: {
        tenantId: booking.tenantId,
        serviceId: booking.serviceId,
        id: { not: bookingId },
        status: { in: ['CONFIRMED', 'PENDING', 'IN_PROGRESS'] },
        startTime: { lt: newEnd },
        endTime: { gt: newStart },
      },
    });

    if (conflicts) {
      throw new BadRequestException('The requested time slot is not available');
    }

    // Store the reschedule request in booking state history
    const previousStartTime = booking.startTime;
    const previousEndTime = booking.endTime;

    await this.prisma.bookingStateHistory.create({
      data: {
        bookingId,
        tenantId: booking.tenantId,
        fromState: booking.status as 'PENDING' | 'CONFIRMED',
        toState: booking.status as 'PENDING' | 'CONFIRMED',
        triggeredBy: 'CLIENT',
        reason: `Rescheduled by client: ${reason ?? 'No reason provided'}`,
        metadata: {
          type: 'RESCHEDULE_REQUEST',
          previousStartTime: previousStartTime.toISOString(),
          previousEndTime: previousEndTime.toISOString(),
          newStartTime,
          newEndTime,
        } as unknown as Record<string, string>,
      },
    });

    // Update the booking times
    const updatedBooking = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        startTime: new Date(newStartTime),
        endTime: new Date(newEndTime),
      },
      include: {
        service: {
          select: { id: true, name: true, durationMinutes: true },
        },
        tenant: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    this.logger.log(
      `Booking ${bookingId} rescheduled by client ${userId}: ${previousStartTime.toISOString()} -> ${newStartTime}`,
    );

    return {
      booking: updatedBooking,
      previousStartTime,
      previousEndTime,
    };
  }

  /**
   * List invoices with payments for a client across all tenants.
   */
  async findAllPayments(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;

    const where: Prisma.InvoiceWhereInput = {
      booking: { clientId: userId },
    };

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: {
          payments: {
            orderBy: { createdAt: 'desc' },
          },
          booking: {
            select: {
              id: true,
              startTime: true,
              endTime: true,
              service: { select: { id: true, name: true } },
            },
          },
          tenant: {
            select: { id: true, name: true, slug: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      data: invoices,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get the authenticated user's profile.
   */
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [firstName, ...lastParts] = user.name.split(' ');
    const lastName = lastParts.join(' ');

    return {
      ...user,
      firstName: firstName ?? '',
      lastName: lastName ?? '',
    };
  }

  /**
   * Update the authenticated user's profile (name, email, phone).
   */
  async updateProfile(
    userId: string,
    data: { firstName?: string; lastName?: string; email?: string; phone?: string },
  ) {
    // Verify user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // If changing email, check for uniqueness
    if (data.email && data.email !== user.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        throw new BadRequestException('Email is already in use');
      }
    }

    // Combine firstName/lastName into name if either is provided
    let name: string | undefined;
    if (data.firstName !== undefined || data.lastName !== undefined) {
      const [currentFirst, ...currentLastParts] = user.name.split(' ');
      const currentLast = currentLastParts.join(' ');
      const first = data.firstName ?? currentFirst;
      const last = data.lastName ?? currentLast;
      name = `${first} ${last}`.trim();
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(name !== undefined && { name }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.phone !== undefined && { phone: data.phone }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    this.logger.log(`Profile updated for user ${userId}`);

    return updatedUser;
  }

  /**
   * Create a GDPR data export request.
   */
  async requestDataExport(userId: string) {
    const now = new Date();
    const deadline = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30-day deadline

    const dataRequest = await this.prisma.dataRequest.create({
      data: {
        userId,
        requestType: 'EXPORT',
        status: 'PENDING',
        requestedAt: now,
        deadlineAt: deadline,
        notes: 'Requested via client portal',
      },
    });

    this.logger.log(`Data export requested by user ${userId}: ${dataRequest.id}`);

    // Enqueue background job to process the export
    await this.gdprQueue.add(
      JOB_PROCESS_DATA_EXPORT,
      { dataRequestId: dataRequest.id, userId },
      { removeOnComplete: { count: 10 }, removeOnFail: { count: 50 } },
    );

    return dataRequest;
  }

  /**
   * Create a GDPR account deletion request.
   */
  async requestAccountDeletion(userId: string) {
    const now = new Date();
    const deadline = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30-day deadline

    // Check for active/upcoming bookings
    const activeBookings = await this.prisma.booking.count({
      where: {
        clientId: userId,
        status: { in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'] },
      },
    });

    if (activeBookings > 0) {
      throw new BadRequestException(
        `Cannot request account deletion with ${activeBookings} active booking(s). Please cancel or complete them first.`,
      );
    }

    const dataRequest = await this.prisma.dataRequest.create({
      data: {
        userId,
        requestType: 'DELETION',
        status: 'PENDING',
        requestedAt: now,
        deadlineAt: deadline,
        notes: 'Requested via client portal',
      },
    });

    this.logger.log(
      `Account deletion requested by user ${userId}: ${dataRequest.id}`,
    );

    return dataRequest;
  }

  // ──────────────────────────────────────────────
  //  Contracts
  // ──────────────────────────────────────────────

  async getContracts(userId: string) {
    return this.prisma.contract.findMany({
      where: {
        booking: { clientId: userId },
      },
      include: {
        booking: {
          select: {
            id: true,
            startTime: true,
            service: { select: { id: true, name: true } },
          },
        },
        tenant: {
          select: { id: true, name: true, slug: true },
        },
        signatures: {
          where: { signerId: userId },
          select: { id: true, signedAt: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async signContract(
    userId: string,
    contractId: string,
    dto: PortalSignContractDto,
  ) {
    const contract = await this.prisma.contract.findFirst({
      where: {
        id: contractId,
        booking: { clientId: userId },
      },
      include: {
        signatures: { where: { signerId: userId } },
      },
    });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    if (!['SENT', 'PARTIALLY_SIGNED'].includes(contract.status)) {
      throw new BadRequestException(
        `Cannot sign a contract with status ${contract.status}`,
      );
    }

    if (contract.signatures.length > 0 && contract.signatures[0]?.signedAt) {
      throw new BadRequestException('You have already signed this contract');
    }

    const now = new Date();

    const signature = await this.prisma.contractSignature.create({
      data: {
        contractId,
        signerId: userId,
        role: 'CLIENT',
        signatureData: dto.signatureData,
        signatureType: dto.signatureType,
        signedAt: now,
        ipAddress: dto.ipAddress ?? null,
        userAgent: dto.userAgent ?? null,
        legalDisclosureAccepted: dto.legalDisclosureAccepted,
        electronicConsentAt: now,
      },
    });

    const allSignatures = await this.prisma.contractSignature.findMany({
      where: { contractId },
    });

    const allSigned = allSignatures.every((sig) => sig.signedAt !== null);
    const newStatus = allSigned ? 'SIGNED' : 'PARTIALLY_SIGNED';

    await this.prisma.contract.update({
      where: { id: contractId },
      data: {
        status: newStatus,
        ...(allSigned ? { signedAt: now } : {}),
      },
    });

    this.logger.log(
      `Contract ${contractId} signed by client ${userId} (new status: ${newStatus})`,
    );

    return signature;
  }

  // ──────────────────────────────────────────────
  //  Quotes
  // ──────────────────────────────────────────────

  async getQuotes(userId: string) {
    return this.prisma.quote.findMany({
      where: {
        booking: { clientId: userId },
      },
      include: {
        booking: {
          select: {
            id: true,
            startTime: true,
            service: { select: { id: true, name: true } },
          },
        },
        tenant: {
          select: { id: true, name: true, slug: true },
        },
        lineItems: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async acceptQuote(
    userId: string,
    quoteId: string,
    dto: PortalAcceptQuoteDto,
  ) {
    const quote = await this.prisma.quote.findFirst({
      where: {
        id: quoteId,
        booking: { clientId: userId },
      },
    });

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    if (quote.status !== 'SENT') {
      throw new BadRequestException(
        `Cannot accept a quote with status ${quote.status}`,
      );
    }

    if (quote.validUntil && quote.validUntil < new Date()) {
      throw new BadRequestException('This quote has expired');
    }

    const updated = await this.prisma.quote.update({
      where: { id: quoteId },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
        acceptedSignature: dto.signatureData ?? null,
        notes: dto.notes
          ? `${quote.notes ? quote.notes + '\n' : ''}Client: ${dto.notes}`
          : quote.notes,
      },
      include: {
        booking: {
          select: {
            id: true,
            startTime: true,
            service: { select: { id: true, name: true } },
          },
        },
        lineItems: true,
      },
    });

    this.logger.log(`Quote ${quoteId} accepted by client ${userId}`);

    return updated;
  }

  // ──────────────────────────────────────────────
  //  Reviews
  // ──────────────────────────────────────────────

  async submitReview(userId: string, dto: PortalSubmitReviewDto) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: dto.bookingId, clientId: userId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status !== 'COMPLETED') {
      throw new BadRequestException(
        'Reviews can only be submitted for completed bookings',
      );
    }

    const existing = await this.prisma.review.findUnique({
      where: { bookingId: dto.bookingId },
    });

    if (existing) {
      throw new ConflictException('A review already exists for this booking');
    }

    const review = await this.prisma.review.create({
      data: {
        tenantId: booking.tenantId,
        bookingId: dto.bookingId,
        clientId: userId,
        rating: dto.rating,
        body: dto.comment ?? null,
      },
    });

    this.logger.log(
      `Review ${review.id} submitted via portal for booking ${dto.bookingId}`,
    );

    return review;
  }
}
