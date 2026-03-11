import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { Prisma } from '../../../../prisma/generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { ReservationService } from './reservation.service';
import { PaymentsService } from '../payments/payments.service';
import { ReferralsService } from '../referrals/referrals.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { EventsService } from '../events/events.service';
import { ConsentService } from '../consent/consent.service';
import { calculatePrice } from '../common/utils/pricing';

/**
 * Booking flow step types.
 * Dynamically resolved based on service configuration.
 */
type BookingStepType =
  | 'SERVICE_SELECTION'
  | 'VENUE_SELECTION'
  | 'GUEST_COUNT'
  | 'QUESTIONNAIRE'
  | 'ADD_ONS'
  | 'DATE_TIME_PICKER'
  | 'PRICING_SUMMARY'
  | 'CLIENT_INFO'
  | 'PAYMENT'
  | 'CONFIRMATION';

interface ResolvedStep {
  type: BookingStepType;
  label: string;
  order: number;
  description?: string;
  config?: Record<string, unknown>;
}

@Injectable()
export class BookingSessionsService {
  private readonly logger = new Logger(BookingSessionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reservationService: ReservationService,
    private readonly paymentsService: PaymentsService,
    private readonly eventsService: EventsService,
    private readonly consentService: ConsentService,
    private readonly referralsService: ReferralsService,
  ) {}

  /**
   * Create a new booking session with IN_PROGRESS status.
   * Resolves the booking steps based on service configuration.
   */
  async create(tenantId: string, dto: CreateSessionDto) {
    // Validate referral code if provided
    let referralLinkId: string | null = null;
    if (dto.referralCode) {
      referralLinkId = await this.referralsService.validateAndResolveReferralCode(
        tenantId,
        dto.referralCode,
      );
      if (!referralLinkId) {
        throw new BadRequestException('Invalid or expired referral code');
      }
    }

    const resolvedSteps = await this.resolveSteps(tenantId, dto.serviceId);

    // Pre-populate session data with service info when serviceId is provided
    let initialData: Record<string, unknown> = {};
    if (dto.serviceId) {
      const service = await this.prisma.service.findUnique({
        where: { id: dto.serviceId },
        select: { id: true, name: true, durationMinutes: true, basePrice: true, currency: true, pricingModel: true, guestConfig: true, depositConfig: true },
      });
      if (service) {
        initialData = {
          serviceId: service.id,
          serviceName: service.name,
          serviceDuration: service.durationMinutes,
          servicePrice: Number(service.basePrice),
          serviceCurrency: service.currency,
          servicePricingModel: service.pricingModel,
          guestConfig: service.guestConfig ?? null,
          depositConfig: service.depositConfig ?? null,
        };
      }
    }

    if (referralLinkId) {
      initialData['referralLinkId'] = referralLinkId;
    }

    return this.prisma.bookingSession.create({
      data: {
        tenantId,
        serviceId: dto.serviceId ?? null,
        source: (dto.source as 'DIRECT' | 'DIRECTORY' | 'API' | 'WIDGET' | 'REFERRAL' | 'WALK_IN') ?? 'DIRECT',
        currentStep: 0,
        resolvedSteps: resolvedSteps as unknown as Prisma.InputJsonValue,
        data: Object.keys(initialData).length > 0 ? initialData as unknown as Prisma.InputJsonValue : undefined,
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

    const updated = await this.prisma.bookingSession.update({
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

    // Record step progression analytics (fire-and-forget)
    if (dto.currentStep !== undefined && session.bookingFlowId) {
      this.recordStepAnalytics(tenantId, session.bookingFlowId, dto.currentStep).catch((err) =>
        this.logger.warn(`Failed to record step analytics: ${err.message}`),
      );
    }

    return updated;
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

    const result = await this.prisma.bookingSession.update({
      where: { id },
      data: { status: 'ABANDONED' },
    });

    // Record drop-off analytics (fire-and-forget)
    if (session.bookingFlowId) {
      this.recordDropOffAnalytics(tenantId, session.bookingFlowId).catch((err) =>
        this.logger.warn(`Failed to record drop-off analytics: ${err.message}`),
      );
    }

    return result;
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
    let clientId = session.clientId ?? (sessionData['clientId'] as string | undefined);

    // Guest checkout: create a passwordless user if no clientId
    if (!clientId) {
      const guestEmail = sessionData['guestEmail'] as string | undefined;
      const guestName = sessionData['guestName'] as string | undefined;

      if (!guestEmail || !guestName) {
        throw new BadRequestException(
          'Guest checkout requires email and name. Complete the contact information step first.',
        );
      }

      const guestPhone = (sessionData['guestPhone'] as string | undefined) ?? null;

      // Find existing user by email or create a passwordless one
      let user = await this.prisma.user.findUnique({
        where: { email: guestEmail.toLowerCase().trim() },
      });

      if (!user) {
        user = await this.prisma.user.create({
          data: {
            email: guestEmail.toLowerCase().trim(),
            name: guestName.trim(),
            phone: guestPhone,
            passwordHash: null,
            emailVerified: false,
            role: 'USER',
          },
        });
        this.logger.log(`Guest checkout: created passwordless user ${user.id} for ${user.email}`);
      }

      clientId = user.id;

      // Update session with the resolved clientId
      await this.prisma.bookingSession.update({
        where: { id },
        data: { clientId },
      });
    }

    const guestCount = (sessionData['guestCount'] as number | undefined) ?? null;
    const notes = (sessionData['notes'] as string | undefined) ?? null;
    const referralLinkId = (sessionData['referralLinkId'] as string | undefined) ?? null;

    // Calculate price based on pricing model
    const durationMinutes = (heldReservation.endTime.getTime() - heldReservation.startTime.getTime()) / 60000;
    const totalAmount = calculatePrice(service, {
      durationMinutes,
      guestCount: guestCount ?? undefined,
    });

    // Load client info for event payload
    const client = await this.prisma.user.findUnique({
      where: { id: clientId },
      select: { name: true, email: true },
    });

    const bookingStatus = service.confirmationMode === 'AUTO_CONFIRM' ? 'CONFIRMED' : 'PENDING';

    // Create the booking and convert the reservation in a transaction
    const [booking] = await this.prisma.$transaction([
      this.prisma.booking.create({
        data: {
          tenantId,
          clientId,
          serviceId: session.serviceId,
          venueId: heldReservation.venueId,
          bookingFlowId: session.bookingFlowId,
          status: bookingStatus,
          startTime: heldReservation.startTime,
          endTime: heldReservation.endTime,
          totalAmount,
          currency: service.currency,
          guestCount,
          notes,
          source: session.source,
          referralLinkId,
          guestDetails: sessionData['guestEmail'] ? {
            email: sessionData['guestEmail'],
            name: sessionData['guestName'],
            phone: sessionData['guestPhone'] ?? null,
          } as unknown as Prisma.InputJsonValue : Prisma.JsonNull,
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

    // Emit domain event after transaction commits
    const eventPayload = {
      tenantId,
      bookingId: booking.id,
      serviceId: session.serviceId,
      clientId,
      clientEmail: client?.email ?? '',
      clientName: client?.name ?? '',
      serviceName: service.name,
      startTime: heldReservation.startTime,
      endTime: heldReservation.endTime,
      source: session.source as string,
    };

    this.eventsService.emitBookingCreated(eventPayload);
    if (bookingStatus === 'CONFIRMED') {
      this.eventsService.emitBookingConfirmed(eventPayload);
    }

    // Increment referral link usage count (fire-and-forget)
    if (referralLinkId) {
      this.referralsService.incrementUsageCount(referralLinkId).catch((err) => {
        const message = err instanceof Error ? err.message : 'Unknown error';
        this.logger.warn(`Failed to increment referral usage count for ${referralLinkId}: ${message}`);
      });
    }

    // Create DATA_PROCESSING consent record (GDPR requirement)
    this.consentService
      .createBookingConsent(clientId)
      .catch((err) =>
        this.logger.warn(`Failed to create booking consent for user ${clientId}: ${err.message}`),
      );

    // Record completion analytics (fire-and-forget)
    if (session.bookingFlowId) {
      this.recordCompletionAnalytics(tenantId, session.bookingFlowId).catch((err) =>
        this.logger.warn(`Failed to record completion analytics: ${err.message}`),
      );
    }

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
      intakeFormConfig: unknown;
    } | null = null;

    if (serviceId) {
      service = await this.prisma.service.findFirst({
        where: { id: serviceId, tenantId, isActive: true },
        select: { venueId: true, guestConfig: true, basePrice: true, intakeFormConfig: true },
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

    // QUESTIONNAIRE: when service has intake form config
    if (service?.intakeFormConfig) {
      steps.push({
        type: 'QUESTIONNAIRE',
        order: order++,
        label: 'Questionnaire',
        description: 'Please answer the following questions',
        config: { formConfig: service.intakeFormConfig },
      });
    }

    // ADD_ONS: when service has active add-ons
    const addonCount = serviceId
      ? await this.prisma.serviceAddon.count({
          where: { serviceId, tenantId, isActive: true },
        })
      : 0;

    if (addonCount > 0) {
      steps.push({
        type: 'ADD_ONS',
        order: order++,
        label: 'Add-ons',
        description: 'Select optional add-ons',
        config: {},
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

    // CLIENT_INFO: always included for public booking sessions to collect guest details
    steps.push({
      type: 'CLIENT_INFO',
      label: 'Your Details',
      order: order++,
    });

    // PAYMENT: if tenant has payment provider onboarded and service price > 0
    if (service) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { paymentProviderOnboarded: true },
      });

      const basePrice =
        typeof service.basePrice === 'number'
          ? service.basePrice
          : (service.basePrice as { toNumber: () => number }).toNumber();

      if (tenant?.paymentProviderOnboarded && basePrice > 0) {
        steps.push({
          type: 'PAYMENT',
          label: 'Payment',
          order: order++,
        });
      }
    }

    // CONFIRMATION: always included
    steps.push({
      type: 'CONFIRMATION',
      label: 'Confirmation',
      order,
    });

    return steps;
  }

  /**
   * Process payment for a booking session.
   * Creates a Stripe PaymentIntent and returns the client_secret.
   *
   * Prerequisites:
   *   - Session must be IN_PROGRESS
   *   - Session must have a held reservation
   *   - A booking must already be created (via complete)
   *
   * For the payment flow, the booking is created first with PENDING status,
   * then the payment is processed. On success, the webhook confirms the booking.
   */
  async processPayment(sessionId: string) {
    const session = await this.prisma.bookingSession.findFirst({
      where: { id: sessionId },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            basePrice: true,
            currency: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Booking session not found');
    }

    if (session.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Session is not in progress');
    }

    // Check for an active held reservation
    const heldReservation = await this.prisma.dateReservation.findFirst({
      where: {
        tenantId: session.tenantId,
        sessionId,
        status: 'HELD',
        expiresAt: { gt: new Date() },
      },
    });

    if (!heldReservation) {
      throw new BadRequestException(
        'No active reservation found — reserve a slot first',
      );
    }

    if (!session.serviceId || !session.service) {
      throw new BadRequestException('Session must have a service selected');
    }

    // Find or create the booking for this session
    // The booking may have been created by complete() or we create it here with PENDING status
    let booking = await this.prisma.booking.findFirst({
      where: {
        tenantId: session.tenantId,
        serviceId: session.serviceId,
        startTime: heldReservation.startTime,
        endTime: heldReservation.endTime,
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
    });

    const sessionData = (session.data ?? {}) as Record<string, unknown>;
    let clientId =
      session.clientId ?? (sessionData['clientId'] as string | undefined);

    // Guest checkout: create a passwordless user if no clientId
    if (!clientId) {
      const guestEmail = sessionData['guestEmail'] as string | undefined;
      const guestName = sessionData['guestName'] as string | undefined;

      if (!guestEmail || !guestName) {
        throw new BadRequestException(
          'Guest checkout requires email and name. Complete the contact information step first.',
        );
      }

      const guestPhone = (sessionData['guestPhone'] as string | undefined) ?? null;

      // Find existing user by email or create a passwordless one
      let user = await this.prisma.user.findUnique({
        where: { email: guestEmail.toLowerCase().trim() },
      });

      if (!user) {
        user = await this.prisma.user.create({
          data: {
            email: guestEmail.toLowerCase().trim(),
            name: guestName.trim(),
            phone: guestPhone,
            passwordHash: null,
            emailVerified: false,
            role: 'USER',
          },
        });
        this.logger.log(`Guest checkout: created passwordless user ${user.id} for ${user.email}`);
      }

      clientId = user.id;

      // Update session with the resolved clientId
      await this.prisma.bookingSession.update({
        where: { id: sessionId },
        data: { clientId },
      });
    }

    if (!booking) {
      if (!clientId) {
        throw new BadRequestException('Session must have a client associated');
      }

      // Calculate price based on pricing model
      const fullService = await this.prisma.service.findFirst({
        where: { id: session.serviceId, tenantId: session.tenantId },
        select: { pricingModel: true, basePrice: true, tierConfig: true },
      });
      const paymentDurationMinutes = (heldReservation.endTime.getTime() - heldReservation.startTime.getTime()) / 60000;
      const paymentSessionData = (session.data ?? {}) as Record<string, unknown>;
      const paymentTotalAmount = fullService
        ? calculatePrice(fullService, {
            durationMinutes: paymentDurationMinutes,
            guestCount: (paymentSessionData['guestCount'] as number | undefined) ?? undefined,
          })
        : Number(session.service.basePrice);

      const paymentReferralLinkId = (paymentSessionData['referralLinkId'] as string | undefined) ?? null;

      booking = await this.prisma.booking.create({
        data: {
          tenantId: session.tenantId,
          clientId,
          serviceId: session.serviceId,
          venueId: heldReservation.venueId,
          bookingFlowId: session.bookingFlowId,
          status: 'PENDING',
          startTime: heldReservation.startTime,
          endTime: heldReservation.endTime,
          totalAmount: paymentTotalAmount,
          currency: session.service.currency,
          guestCount:
            (sessionData['guestCount'] as number | undefined) ?? null,
          notes: (sessionData['notes'] as string | undefined) ?? null,
          source: session.source,
          referralLinkId: paymentReferralLinkId,
        },
      });

      this.logger.log(
        `Booking ${booking.id} created in PENDING for payment processing`,
      );

      // Increment referral link usage count (fire-and-forget)
      if (paymentReferralLinkId) {
        this.referralsService.incrementUsageCount(paymentReferralLinkId).catch((err) => {
          const message = err instanceof Error ? err.message : 'Unknown error';
          this.logger.warn(`Failed to increment referral usage count for ${paymentReferralLinkId}: ${message}`);
        });
      }
    }

    // Create the Stripe PaymentIntent
    const result = await this.paymentsService.processPaymentIntent(
      session.tenantId,
      booking.id,
      sessionId,
    );

    return {
      clientSecret: result.clientSecret,
      paymentId: result.paymentId,
      bookingId: booking.id,
      amount: result.amount,
      currency: result.currency,
    };
  }

  // ---------------------------------------------------------------------------
  // Analytics helpers (fire-and-forget — errors are caught by callers)
  // ---------------------------------------------------------------------------

  private async recordStepAnalytics(tenantId: string, flowId: string, step: number) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    await this.prisma.bookingFlowAnalytics.upsert({
      where: { tenantId_flowId_date: { tenantId, flowId, date: today } },
      create: {
        tenantId,
        flowId,
        date: today,
        stepMetrics: { [`step_${step}`]: 1 },
        totalSessions: step === 0 ? 1 : 0,
      },
      update: {
        totalSessions: step === 0 ? { increment: 1 } : undefined,
      },
    });
  }

  private async recordCompletionAnalytics(tenantId: string, flowId: string) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    await this.prisma.bookingFlowAnalytics.upsert({
      where: { tenantId_flowId_date: { tenantId, flowId, date: today } },
      create: {
        tenantId,
        flowId,
        date: today,
        stepMetrics: {},
        completedSessions: 1,
      },
      update: {
        completedSessions: { increment: 1 },
      },
    });
  }

  private async recordDropOffAnalytics(tenantId: string, flowId: string) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    await this.prisma.bookingFlowAnalytics.upsert({
      where: { tenantId_flowId_date: { tenantId, flowId, date: today } },
      create: {
        tenantId,
        flowId,
        date: today,
        stepMetrics: {},
        bounceRate: 1,
      },
      update: {
        bounceRate: { increment: 1 },
      },
    });
  }
}
