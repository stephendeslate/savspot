import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '../../../../prisma/generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { ReservationService } from './reservation.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';

/**
 * Booking flow step types.
 * Dynamically resolved based on service configuration.
 */
type BookingStepType =
  | 'SERVICE_SELECTION'
  | 'VENUE_SELECTION'
  | 'GUEST_COUNT'
  | 'DATE_TIME_PICKER'
  | 'PRICING_SUMMARY'
  | 'PAYMENT'
  | 'CONFIRMATION';

interface ResolvedStep {
  type: BookingStepType;
  label: string;
  order: number;
}

@Injectable()
export class BookingSessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reservationService: ReservationService,
  ) {}

  /**
   * Create a new booking session with IN_PROGRESS status.
   * Resolves the booking steps based on service configuration.
   */
  async create(tenantId: string, dto: CreateSessionDto) {
    const resolvedSteps = await this.resolveSteps(tenantId, dto.serviceId);

    return this.prisma.bookingSession.create({
      data: {
        tenantId,
        serviceId: dto.serviceId ?? null,
        source: (dto.source as 'DIRECT' | 'DIRECTORY' | 'API' | 'WIDGET' | 'REFERRAL' | 'WALK_IN') ?? 'DIRECT',
        currentStep: 0,
        resolvedSteps: resolvedSteps as unknown as Prisma.InputJsonValue,
        status: 'IN_PROGRESS',
      },
      include: {
        service: {
          select: { id: true, name: true, durationMinutes: true, basePrice: true, currency: true },
        },
        dateReservations: true,
      },
    });
  }

  /**
   * Find a booking session by ID within a tenant.
   */
  async findById(tenantId: string, id: string) {
    const session = await this.prisma.bookingSession.findFirst({
      where: { id, tenantId },
      include: {
        service: {
          select: { id: true, name: true, durationMinutes: true, basePrice: true, currency: true },
        },
        dateReservations: {
          where: { status: 'HELD' },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Booking session not found');
    }

    return session;
  }

  /**
   * Find a booking session by ID without tenant scoping.
   * Used by public booking widget endpoints where the session ID acts as a token.
   */
  async findByIdPublic(id: string) {
    const session = await this.prisma.bookingSession.findFirst({
      where: { id },
      include: {
        service: {
          select: { id: true, name: true, durationMinutes: true, basePrice: true, currency: true },
        },
        dateReservations: {
          where: { status: 'HELD' },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Booking session not found');
    }

    return session;
  }

  /**
   * Update a booking session (step, data, service).
   * If the serviceId changes, re-resolve the steps.
   */
  async update(tenantId: string, id: string, dto: UpdateSessionDto) {
    const session = await this.findById(tenantId, id);

    if (session.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Cannot update a session that is not in progress');
    }

    // Build the update payload using spread to avoid index signature access issues
    let updateData: Prisma.BookingSessionUpdateInput = {};

    if (dto.currentStep !== undefined) {
      updateData = { ...updateData, currentStep: dto.currentStep };
    }

    if (dto.data !== undefined) {
      // Merge new data with existing data
      const existingData = (session.data as Record<string, unknown>) ?? {};
      const mergedData = { ...existingData, ...dto.data };
      updateData = { ...updateData, data: mergedData as unknown as Prisma.InputJsonValue };
    }

    if (dto.serviceId !== undefined) {
      // Re-resolve steps when service changes
      const resolvedSteps = await this.resolveSteps(tenantId, dto.serviceId);
      updateData = {
        ...updateData,
        service: { connect: { id: dto.serviceId } },
        resolvedSteps: resolvedSteps as unknown as Prisma.InputJsonValue,
        currentStep: 0,
      };
    }

    return this.prisma.bookingSession.update({
      where: { id },
      data: updateData,
      include: {
        service: {
          select: { id: true, name: true, durationMinutes: true, basePrice: true, currency: true },
        },
        dateReservations: {
          where: { status: 'HELD' },
        },
      },
    });
  }

  /**
   * Abandon a booking session.
   * Sets status to ABANDONED and releases any held reservations.
   */
  async abandon(tenantId: string, id: string) {
    const session = await this.findById(tenantId, id);

    if (session.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Only in-progress sessions can be abandoned');
    }

    // Release any held reservations
    await this.reservationService.releaseAllForSession(tenantId, id);

    return this.prisma.bookingSession.update({
      where: { id },
      data: { status: 'ABANDONED' },
    });
  }

  /**
   * Complete a booking session and create a booking.
   * Converts held reservations to CONFIRMED.
   */
  async complete(tenantId: string, id: string) {
    const session = await this.findById(tenantId, id);

    if (session.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Only in-progress sessions can be completed');
    }

    if (!session.serviceId) {
      throw new BadRequestException('Session must have a service selected');
    }

    // Get the held reservation for this session
    const heldReservation = await this.prisma.dateReservation.findFirst({
      where: {
        tenantId,
        sessionId: id,
        status: 'HELD',
        expiresAt: { gt: new Date() },
      },
    });

    if (!heldReservation) {
      throw new BadRequestException('No active reservation found for this session');
    }

    // Load service for booking details
    const service = await this.prisma.service.findFirst({
      where: { id: session.serviceId, tenantId },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    const sessionData = (session.data ?? {}) as Record<string, unknown>;
    const clientId = session.clientId ?? (sessionData['clientId'] as string | undefined);

    if (!clientId) {
      throw new BadRequestException('Session must have a client associated');
    }

    const guestCount = (sessionData['guestCount'] as number | undefined) ?? null;
    const notes = (sessionData['notes'] as string | undefined) ?? null;

    // Create the booking and convert the reservation in a transaction
    const [booking] = await this.prisma.$transaction([
      this.prisma.booking.create({
        data: {
          tenantId,
          clientId,
          serviceId: session.serviceId,
          venueId: heldReservation.venueId,
          bookingFlowId: session.bookingFlowId,
          status: service.confirmationMode === 'AUTO_CONFIRM' ? 'CONFIRMED' : 'PENDING',
          startTime: heldReservation.startTime,
          endTime: heldReservation.endTime,
          totalAmount: service.basePrice,
          currency: service.currency,
          guestCount,
          notes,
          source: session.source,
        },
      }),
      this.prisma.dateReservation.update({
        where: { id: heldReservation.id },
        data: { status: 'CONFIRMED' },
      }),
      this.prisma.bookingSession.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          reservationToken: heldReservation.token,
        },
      }),
    ]);

    return booking;
  }

  /**
   * Resolve which booking steps are needed based on service configuration.
   *
   * Always included: DATE_TIME_PICKER, PRICING_SUMMARY, CONFIRMATION
   * Conditional:
   *   - SERVICE_SELECTION: if tenant has multiple active services and no serviceId pre-selected
   *   - VENUE_SELECTION: if service has a venueId or tenant has venues
   *   - GUEST_COUNT: if service has guestConfig
   *   - PAYMENT: if payment provider connected and price > 0 (future - skipped for now)
   */
  private async resolveSteps(
    tenantId: string,
    serviceId?: string,
  ): Promise<ResolvedStep[]> {
    const steps: ResolvedStep[] = [];
    let order = 0;

    // Check if tenant has multiple active services (for SERVICE_SELECTION step)
    if (!serviceId) {
      const serviceCount = await this.prisma.service.count({
        where: { tenantId, isActive: true },
      });

      if (serviceCount > 1) {
        steps.push({
          type: 'SERVICE_SELECTION',
          label: 'Select Service',
          order: order++,
        });
      }
    }

    // Load service if provided, to check its config
    let service: {
      venueId: string | null;
      guestConfig: unknown;
      basePrice: { toNumber: () => number } | number;
    } | null = null;

    if (serviceId) {
      service = await this.prisma.service.findFirst({
        where: { id: serviceId, tenantId, isActive: true },
        select: { venueId: true, guestConfig: true, basePrice: true },
      });
    }

    // VENUE_SELECTION: if service has a venue or tenant has venues
    if (service?.venueId) {
      steps.push({
        type: 'VENUE_SELECTION',
        label: 'Select Venue',
        order: order++,
      });
    } else {
      // Check if tenant has any venues
      const venueCount = await this.prisma.venue.count({
        where: { tenantId, isActive: true },
      });

      if (venueCount > 0) {
        steps.push({
          type: 'VENUE_SELECTION',
          label: 'Select Venue',
          order: order++,
        });
      }
    }

    // GUEST_COUNT: if service has guest config
    if (service?.guestConfig) {
      steps.push({
        type: 'GUEST_COUNT',
        label: 'Guest Count',
        order: order++,
      });
    }

    // DATE_TIME_PICKER: always included
    steps.push({
      type: 'DATE_TIME_PICKER',
      label: 'Select Date & Time',
      order: order++,
    });

    // PRICING_SUMMARY: always included
    steps.push({
      type: 'PRICING_SUMMARY',
      label: 'Pricing Summary',
      order: order++,
    });

    // PAYMENT: future — skip for now

    // CONFIRMATION: always included
    steps.push({
      type: 'CONFIRMATION',
      label: 'Confirmation',
      order,
    });

    return steps;
  }
}
