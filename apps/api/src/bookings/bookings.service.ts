import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '../../../../prisma/generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { ListBookingsDto } from './dto/list-bookings.dto';
import { WalkInBookingDto } from './dto/walk-in-booking.dto';
import { EventsService } from '../events/events.service';

/**
 * Valid booking state transitions.
 * Key = current state, value = set of allowed target states.
 */
const VALID_TRANSITIONS: Record<string, Set<string>> = {
  PENDING: new Set(['CONFIRMED', 'CANCELLED']),
  CONFIRMED: new Set(['IN_PROGRESS', 'CANCELLED', 'NO_SHOW']),
  IN_PROGRESS: new Set(['COMPLETED', 'CANCELLED']),
};

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
    private readonly eventsService: EventsService,
  ) {}

  /**
   * List bookings for a tenant with filters and pagination.
   */
  async findAll(tenantId: string, filters: ListBookingsDto) {
    const {
      startDate,
      endDate,
      status,
      serviceId,
      search,
      page = 1,
      limit = 20,
    } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.BookingWhereInput = { tenantId };

    if (startDate) {
      where.startTime = {
        ...(where.startTime as Prisma.DateTimeFilter ?? {}),
        gte: new Date(startDate),
      };
    }

    if (endDate) {
      where.endTime = {
        ...(where.endTime as Prisma.DateTimeFilter ?? {}),
        lte: new Date(endDate + 'T23:59:59.999Z'),
      };
    }

    if (status) {
      where.status = status as Prisma.BookingWhereInput['status'];
    }

    if (serviceId) {
      where.serviceId = serviceId;
    }

    if (search) {
      where.client = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: {
          service: {
            select: { id: true, name: true, durationMinutes: true },
          },
          client: {
            select: { id: true, name: true, email: true },
          },
          payments: {
            select: { id: true, amount: true, status: true, type: true },
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
   */
  async findById(tenantId: string, id: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id, tenantId },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            durationMinutes: true,
            basePrice: true,
            currency: true,
            cancellationPolicy: true,
            maxRescheduleCount: true,
          },
        },
        client: {
          select: { id: true, name: true, email: true, phone: true },
        },
        venue: {
          select: { id: true, name: true },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
        },
        invoices: {
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
   * Confirm a pending booking.
   * PENDING -> CONFIRMED
   */
  async confirm(tenantId: string, id: string, userId: string) {
    const booking = await this.findById(tenantId, id);
    this.validateTransition(booking.status, 'CONFIRMED');

    const [updatedBooking] = await this.prisma.$transaction([
      this.prisma.booking.update({
        where: { id },
        data: { status: 'CONFIRMED' },
      }),
      this.prisma.bookingStateHistory.create({
        data: {
          bookingId: id,
          tenantId,
          fromState: booking.status as 'PENDING',
          toState: 'CONFIRMED',
          triggeredBy: 'ADMIN',
          reason: `Confirmed by user ${userId}`,
        },
      }),
    ]);

    this.logger.log(`Booking ${id} confirmed by ${userId}`);

    this.eventsService.emitBookingConfirmed({
      tenantId,
      bookingId: id,
      serviceId: booking.serviceId,
      clientId: booking.clientId,
      clientEmail: booking.client.email,
      clientName: booking.client.name ?? '',
      serviceName: booking.service.name,
      startTime: booking.startTime,
      endTime: booking.endTime,
      source: booking.source as string,
    });

    return updatedBooking;
  }

  /**
   * Cancel a booking.
   * PENDING/CONFIRMED -> CANCELLED
   * If a succeeded payment exists, initiates a refund.
   */
  async cancel(
    tenantId: string,
    id: string,
    userId: string,
    reason: string,
  ) {
    const booking = await this.findById(tenantId, id);
    this.validateTransition(booking.status, 'CANCELLED');

    const [updatedBooking] = await this.prisma.$transaction([
      this.prisma.booking.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancellationReason: reason as Prisma.BookingUpdateInput['cancellationReason'],
          cancelledAt: new Date(),
        },
      }),
      this.prisma.bookingStateHistory.create({
        data: {
          bookingId: id,
          tenantId,
          fromState: booking.status as 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS',
          toState: 'CANCELLED',
          triggeredBy: 'ADMIN',
          reason: `Cancelled by user ${userId}: ${reason}`,
        },
      }),
    ]);

    // Check if there's a succeeded payment that needs refunding
    const succeededPayment = booking.payments.find(
      (p) => p.status === 'SUCCEEDED',
    );

    if (succeededPayment) {
      try {
        await this.paymentsService.processRefund(tenantId, succeededPayment.id);
        this.logger.log(
          `Refund initiated for payment ${succeededPayment.id} on cancelled booking ${id}`,
        );
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        this.logger.error(
          `Failed to auto-refund payment ${succeededPayment.id}: ${errorMessage}`,
        );
        // Don't fail the cancellation if the refund fails
      }
    }

    this.logger.log(`Booking ${id} cancelled by ${userId}: ${reason}`);

    this.eventsService.emitBookingCancelled({
      tenantId,
      bookingId: id,
      serviceId: booking.serviceId,
      clientId: booking.clientId,
      clientEmail: booking.client.email,
      clientName: booking.client.name ?? '',
      serviceName: booking.service.name,
      startTime: booking.startTime,
      endTime: booking.endTime,
      source: booking.source as string,
      cancellationReason: reason,
    });

    return updatedBooking;
  }

  /**
   * Reschedule a booking to new times.
   * Checks availability via pessimistic locking.
   */
  async reschedule(
    tenantId: string,
    id: string,
    userId: string,
    newStartTime: string,
    newEndTime: string,
  ) {
    const booking = await this.findById(tenantId, id);

    // Reschedule is allowed for CONFIRMED or PENDING bookings
    if (!['CONFIRMED', 'PENDING'].includes(booking.status)) {
      throw new BadRequestException(
        `Cannot reschedule a booking with status ${booking.status}`,
      );
    }

    // Check max reschedule count if configured
    if (
      booking.service.maxRescheduleCount !== null &&
      booking.service.maxRescheduleCount !== undefined &&
      booking.rescheduleCount >= booking.service.maxRescheduleCount
    ) {
      throw new BadRequestException('Maximum reschedule count reached');
    }

    const startTime = new Date(newStartTime);
    const endTime = new Date(newEndTime);

    // Check availability with pessimistic locking
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant', ${tenantId}, TRUE)`;

      // Check for conflicting bookings (excluding current booking)
      const conflicts = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM bookings
        WHERE tenant_id = ${tenantId}
          AND service_id = ${booking.serviceId}
          AND id != ${id}
          AND status IN ('CONFIRMED', 'IN_PROGRESS', 'PENDING')
          AND start_time < ${endTime}
          AND end_time > ${startTime}
        FOR UPDATE`;

      if (Array.isArray(conflicts) && conflicts.length > 0) {
        throw new ConflictException('Time slot is not available');
      }

      // Check for conflicting held reservations
      const reservationConflicts = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM date_reservations
        WHERE tenant_id = ${tenantId}
          AND service_id = ${booking.serviceId}
          AND status = 'HELD'
          AND expires_at > NOW()
          AND start_time < ${endTime}
          AND end_time > ${startTime}
        FOR UPDATE`;

      if (
        Array.isArray(reservationConflicts) &&
        reservationConflicts.length > 0
      ) {
        throw new ConflictException('Time slot is currently held by another session');
      }
    });

    // Perform the reschedule
    const [updatedBooking] = await this.prisma.$transaction([
      this.prisma.booking.update({
        where: { id },
        data: {
          startTime,
          endTime,
          originalStartDate: booking.originalStartDate ?? booking.startTime,
          rescheduleCount: { increment: 1 },
        },
      }),
      this.prisma.bookingStateHistory.create({
        data: {
          bookingId: id,
          tenantId,
          fromState: booking.status as 'PENDING' | 'CONFIRMED',
          toState: booking.status as 'PENDING' | 'CONFIRMED',
          triggeredBy: 'ADMIN',
          reason: `Rescheduled by ${userId} from ${booking.startTime.toISOString()} to ${newStartTime}`,
          metadata: {
            previousStartTime: booking.startTime.toISOString(),
            previousEndTime: booking.endTime.toISOString(),
            newStartTime,
            newEndTime,
          } as Prisma.InputJsonValue,
        },
      }),
    ]);

    this.logger.log(`Booking ${id} rescheduled by ${userId}`);

    this.eventsService.emitBookingRescheduled({
      tenantId,
      bookingId: id,
      serviceId: booking.serviceId,
      clientId: booking.clientId,
      clientEmail: booking.client.email,
      clientName: booking.client.name ?? '',
      serviceName: booking.service.name,
      startTime: booking.startTime,
      endTime: booking.endTime,
      source: booking.source as string,
      previousStartTime: booking.startTime,
      previousEndTime: booking.endTime,
      newStartTime: startTime,
      newEndTime: endTime,
    });

    return updatedBooking;
  }

  /**
   * Mark a booking as no-show.
   * CONFIRMED -> NO_SHOW
   */
  async markNoShow(tenantId: string, id: string, userId: string) {
    const booking = await this.findById(tenantId, id);
    this.validateTransition(booking.status, 'NO_SHOW');

    const [updatedBooking] = await this.prisma.$transaction([
      this.prisma.booking.update({
        where: { id },
        data: {
          status: 'NO_SHOW',
          checkInStatus: 'NO_SHOW',
        },
      }),
      this.prisma.bookingStateHistory.create({
        data: {
          bookingId: id,
          tenantId,
          fromState: booking.status as 'CONFIRMED',
          toState: 'NO_SHOW',
          triggeredBy: 'ADMIN',
          reason: `Marked no-show by ${userId}`,
        },
      }),
    ]);

    this.logger.log(`Booking ${id} marked as no-show by ${userId}`);

    this.eventsService.emitBookingNoShow({
      tenantId,
      bookingId: id,
      serviceId: booking.serviceId,
      clientId: booking.clientId,
      clientEmail: booking.client.email,
      clientName: booking.client.name ?? '',
      serviceName: booking.service.name,
      startTime: booking.startTime,
      endTime: booking.endTime,
      source: booking.source as string,
    });

    return updatedBooking;
  }

  /**
   * Mark a booking as arrived (in-progress).
   * CONFIRMED -> IN_PROGRESS
   */
  async markArrived(tenantId: string, id: string, userId: string) {
    const booking = await this.findById(tenantId, id);
    this.validateTransition(booking.status, 'IN_PROGRESS');

    const [updatedBooking] = await this.prisma.$transaction([
      this.prisma.booking.update({
        where: { id },
        data: {
          status: 'IN_PROGRESS',
          checkInStatus: 'CHECKED_IN',
        },
      }),
      this.prisma.bookingStateHistory.create({
        data: {
          bookingId: id,
          tenantId,
          fromState: booking.status as 'CONFIRMED',
          toState: 'IN_PROGRESS',
          triggeredBy: 'ADMIN',
          reason: `Marked arrived by user ${userId}`,
        },
      }),
    ]);

    this.logger.log(`Booking ${id} marked arrived by ${userId}`);

    return updatedBooking;
  }

  /**
   * Mark a booking as completed.
   * IN_PROGRESS -> COMPLETED (or CONFIRMED -> COMPLETED via auto-complete path)
   */
  async markCompleted(tenantId: string, id: string, userId: string) {
    const booking = await this.findById(tenantId, id);

    // Allow both IN_PROGRESS -> COMPLETED and CONFIRMED -> COMPLETED
    if (!['IN_PROGRESS', 'CONFIRMED'].includes(booking.status)) {
      throw new BadRequestException(
        `Invalid state transition: ${booking.status} -> COMPLETED`,
      );
    }

    const [updatedBooking] = await this.prisma.$transaction([
      this.prisma.booking.update({
        where: { id },
        data: { status: 'COMPLETED' },
      }),
      this.prisma.bookingStateHistory.create({
        data: {
          bookingId: id,
          tenantId,
          fromState: booking.status as 'CONFIRMED' | 'IN_PROGRESS',
          toState: 'COMPLETED',
          triggeredBy: 'ADMIN',
          reason: `Marked completed by user ${userId}`,
        },
      }),
    ]);

    this.logger.log(`Booking ${id} marked completed by ${userId}`);

    this.eventsService.emitBookingCompleted({
      tenantId,
      bookingId: id,
      serviceId: booking.serviceId,
      clientId: booking.clientId,
      clientEmail: booking.client.email,
      clientName: booking.client.name ?? '',
      serviceName: booking.service.name,
      startTime: booking.startTime,
      endTime: booking.endTime,
      source: booking.source as string,
    });

    return updatedBooking;
  }

  /**
   * Create a walk-in booking.
   * Bypasses PENDING state — created as CONFIRMED.
   * Performs availability check with pessimistic locking.
   */
  async createWalkIn(
    tenantId: string,
    dto: WalkInBookingDto,
    userId: string,
  ) {
    // Load the service
    const service = await this.prisma.service.findFirst({
      where: { id: dto.serviceId, tenantId, isActive: true },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    // Find or create the client if email is provided
    let clientId: string;
    if (dto.clientEmail) {
      let client = await this.prisma.user.findFirst({
        where: { email: dto.clientEmail },
      });

      if (!client) {
        client = await this.prisma.user.create({
          data: {
            email: dto.clientEmail,
            name: dto.clientName ?? dto.clientEmail,
          },
        });
      }
      clientId = client.id;
    } else {
      // For anonymous walk-ins, use a walk-in placeholder user
      // In practice, we still need a clientId because it's required
      let walkInUser = await this.prisma.user.findFirst({
        where: { email: `walkin+${tenantId}@savspot.co` },
      });

      if (!walkInUser) {
        walkInUser = await this.prisma.user.create({
          data: {
            email: `walkin+${tenantId}@savspot.co`,
            name: 'Walk-in Client',
          },
        });
      }
      clientId = walkInUser.id;
    }

    // Check availability with pessimistic locking
    const booking = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant', ${tenantId}, TRUE)`;

      // Check for conflicting bookings
      const bookingConflicts = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM bookings
        WHERE tenant_id = ${tenantId}
          AND service_id = ${dto.serviceId}
          AND status IN ('CONFIRMED', 'IN_PROGRESS', 'PENDING')
          AND start_time < ${endTime}
          AND end_time > ${startTime}
        FOR UPDATE`;

      if (Array.isArray(bookingConflicts) && bookingConflicts.length > 0) {
        throw new ConflictException('Time slot already booked');
      }

      // Check for conflicting held reservations
      const reservationConflicts = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM date_reservations
        WHERE tenant_id = ${tenantId}
          AND service_id = ${dto.serviceId}
          AND status = 'HELD'
          AND expires_at > NOW()
          AND start_time < ${endTime}
          AND end_time > ${startTime}
        FOR UPDATE`;

      if (
        Array.isArray(reservationConflicts) &&
        reservationConflicts.length > 0
      ) {
        throw new ConflictException('Time slot is currently held');
      }

      // Create the booking as CONFIRMED (walk-in bypasses PENDING)
      const booking = await tx.booking.create({
        data: {
          tenantId,
          clientId,
          serviceId: dto.serviceId,
          venueId: service.venueId,
          status: 'CONFIRMED',
          startTime,
          endTime,
          totalAmount: service.basePrice,
          currency: service.currency,
          notes: dto.notes ?? null,
          source: 'WALK_IN',
        },
        include: {
          service: {
            select: { id: true, name: true, durationMinutes: true },
          },
          client: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      // Note: Walk-in bookings do not create a DateReservation because
      // DateReservation.sessionId is required and walk-ins have no session.
      // The booking record itself prevents scheduling conflicts.

      // Create state history (directly to CONFIRMED for walk-in)
      await tx.bookingStateHistory.create({
        data: {
          bookingId: booking.id,
          tenantId,
          fromState: 'PENDING',
          toState: 'CONFIRMED',
          triggeredBy: 'ADMIN',
          reason: `Walk-in booking created by ${userId}`,
        },
      });

      this.logger.log(
        `Walk-in booking ${booking.id} created by ${userId}`,
      );

      return booking;
    });

    this.eventsService.emitBookingWalkIn({
      tenantId,
      bookingId: booking.id,
      serviceId: dto.serviceId,
      clientId,
      clientEmail: booking.client?.email ?? '',
      clientName: booking.client?.name ?? '',
      serviceName: booking.service?.name ?? '',
      startTime,
      endTime,
      source: 'WALK_IN',
    });

    return booking;
  }

  /**
   * Update booking notes.
   */
  async update(tenantId: string, id: string, notes?: string) {
    await this.findById(tenantId, id);

    return this.prisma.booking.update({
      where: { id },
      data: { notes: notes ?? null },
      include: {
        service: {
          select: { id: true, name: true },
        },
        client: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  /**
   * Validate that a state transition is allowed.
   */
  private validateTransition(
    currentStatus: string,
    targetStatus: string,
  ): void {
    const allowed = VALID_TRANSITIONS[currentStatus];

    if (!allowed || !allowed.has(targetStatus)) {
      throw new BadRequestException(
        `Invalid state transition: ${currentStatus} -> ${targetStatus}`,
      );
    }
  }
}
