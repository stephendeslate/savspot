import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '../../../../prisma/generated/prisma';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Cancellation policy shape stored in service.cancellationPolicy JSONB.
 */
interface CancellationPolicy {
  free_cancellation_hours: number;
  late_cancellation_fee_percent?: number;
  late_cancellation_flat_fee?: number;
}

@Injectable()
export class ClientPortalService {
  private readonly logger = new Logger(ClientPortalService.name);

  constructor(private readonly prisma: PrismaService) {}

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
    let cancellationType: 'FREE' | 'LATE' | 'NO_POLICY' = 'NO_POLICY';
    let lateFeePercent: number | undefined;
    let lateFlatFee: number | undefined;

    const policy = booking.service
      .cancellationPolicy as CancellationPolicy | null;

    if (policy && policy.free_cancellation_hours !== undefined) {
      const hoursUntilBooking =
        (booking.startTime.getTime() - Date.now()) / (1000 * 60 * 60);

      if (hoursUntilBooking >= policy.free_cancellation_hours) {
        cancellationType = 'FREE';
      } else if (hoursUntilBooking > 0) {
        cancellationType = 'LATE';
        lateFeePercent = policy.late_cancellation_fee_percent;
        lateFlatFee = policy.late_cancellation_flat_fee;
      } else {
        // Booking start time has passed
        cancellationType = 'LATE';
        lateFeePercent = policy.late_cancellation_fee_percent;
        lateFlatFee = policy.late_cancellation_flat_fee;
      }
    }

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
            cancellationType,
            lateFeePercent: lateFeePercent ?? null,
            lateFlatFee: lateFlatFee ?? null,
          } as Prisma.InputJsonValue,
        },
      }),
    ]);

    // Flag refund info if a succeeded payment exists
    const succeededPayment = booking.payments[0] ?? null;
    let refundInfo: {
      paymentId: string;
      amount: string;
      cancellationType: string;
    } | null = null;

    if (succeededPayment) {
      refundInfo = {
        paymentId: succeededPayment.id,
        amount: succeededPayment.amount.toString(),
        cancellationType,
      };

      this.logger.log(
        `Booking ${bookingId} cancelled by client ${userId} — refund should be processed for payment ${succeededPayment.id}`,
      );
    }

    this.logger.log(
      `Booking ${bookingId} cancelled by client ${userId} (type: ${cancellationType})`,
    );

    return {
      booking: updatedBooking,
      cancellation: {
        type: cancellationType,
        lateFeePercent: lateFeePercent ?? null,
        lateFlatFee: lateFlatFee ?? null,
        refundInfo,
      },
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

    return user;
  }

  /**
   * Update the authenticated user's profile (name, email, phone).
   */
  async updateProfile(
    userId: string,
    data: { name?: string; email?: string; phone?: string },
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

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
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
}
