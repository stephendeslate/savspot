import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { BookingSessionsService } from '@/booking-sessions/booking-sessions.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const SERVICE_ID = 'service-001';
const SESSION_ID = 'session-001';

function mockSession(overrides: Record<string, unknown> = {}) {
  return {
    id: SESSION_ID,
    tenantId: TENANT_ID,
    serviceId: SERVICE_ID,
    currentStep: 0,
    status: 'IN_PROGRESS',
    source: 'DIRECT',
    resolvedSteps: [],
    data: null,
    clientId: null,
    bookingFlowId: null,
    reservationToken: null,
    service: {
      id: SERVICE_ID,
      name: 'Haircut',
      durationMinutes: 60,
      basePrice: { toNumber: () => 50 },
      currency: 'USD',
    },
    dateReservations: [],
    ...overrides,
  };
}

function makePrisma() {
  return {
    bookingSession: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    service: {
      count: vi.fn().mockResolvedValue(1),
      findFirst: vi.fn(),
    },
    venue: {
      count: vi.fn().mockResolvedValue(0),
    },
    serviceAddon: {
      count: vi.fn().mockResolvedValue(0),
    },
    tenant: {
      findUnique: vi.fn().mockResolvedValue({ paymentProviderOnboarded: false }),
    },
    booking: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    dateReservation: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  };
}

function makeReservation() {
  return { releaseAllForSession: vi.fn() };
}

function makePayments() {
  return { processPaymentIntent: vi.fn() };
}

function makeEvents() {
  return {
    emitBookingCreated: vi.fn(),
    emitBookingConfirmed: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('BookingSessionsService', () => {
  let service: BookingSessionsService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    const reservation = makeReservation();
    const payments = makePayments();
    const events = makeEvents();
    service = new BookingSessionsService(
      prisma as never,
      reservation as never,
      payments as never,
      events as never,
    );
  });

  // -----------------------------------------------------------------------
  // resolveSteps (tested via create)
  // -----------------------------------------------------------------------

  describe('resolveSteps (via create)', () => {
    it('should include minimum steps when no service provided', async () => {
      prisma.service.count.mockResolvedValue(1);
      prisma.venue.count.mockResolvedValue(0);
      prisma.serviceAddon.count.mockResolvedValue(0);

      prisma.bookingSession.create.mockImplementation(async (args: { data: { resolvedSteps: unknown } }) => ({
        ...mockSession(),
        resolvedSteps: args.data.resolvedSteps,
      }));

      const result = await service.create(TENANT_ID, {
        tenantId: TENANT_ID,
      });

      const steps = result.resolvedSteps as Array<{ type: string }>;
      const stepTypes = steps.map((s) => s.type);

      expect(stepTypes).toContain('DATE_TIME_PICKER');
      expect(stepTypes).toContain('PRICING_SUMMARY');
      expect(stepTypes).toContain('CLIENT_INFO');
      expect(stepTypes).toContain('CONFIRMATION');
      expect(stepTypes).not.toContain('QUESTIONNAIRE');
      expect(stepTypes).not.toContain('ADD_ONS');
    });

    it('should include QUESTIONNAIRE step when service has intakeFormConfig', async () => {
      const intakeFormConfig = {
        fields: [
          { id: 'allergies', label: 'Allergies?', type: 'TEXT', required: true },
        ],
      };

      prisma.service.findFirst.mockResolvedValue({
        venueId: null,
        guestConfig: null,
        basePrice: 50,
        intakeFormConfig,
      });
      prisma.venue.count.mockResolvedValue(0);
      prisma.serviceAddon.count.mockResolvedValue(0);

      prisma.bookingSession.create.mockImplementation(async (args: { data: { resolvedSteps: unknown } }) => ({
        ...mockSession(),
        resolvedSteps: args.data.resolvedSteps,
      }));

      const result = await service.create(TENANT_ID, {
        tenantId: TENANT_ID,
        serviceId: SERVICE_ID,
      });

      const steps = result.resolvedSteps as Array<{ type: string; label: string; config?: Record<string, unknown>; description?: string }>;
      const questionnaireStep = steps.find((s) => s.type === 'QUESTIONNAIRE');

      expect(questionnaireStep).toBeDefined();
      expect(questionnaireStep!.label).toBe('Questionnaire');
      expect(questionnaireStep!.description).toBe('Please answer the following questions');
      expect(questionnaireStep!.config).toEqual({ formConfig: intakeFormConfig });
    });

    it('should NOT include QUESTIONNAIRE step when intakeFormConfig is null', async () => {
      prisma.service.findFirst.mockResolvedValue({
        venueId: null,
        guestConfig: null,
        basePrice: 50,
        intakeFormConfig: null,
      });
      prisma.venue.count.mockResolvedValue(0);
      prisma.serviceAddon.count.mockResolvedValue(0);

      prisma.bookingSession.create.mockImplementation(async (args: { data: { resolvedSteps: unknown } }) => ({
        ...mockSession(),
        resolvedSteps: args.data.resolvedSteps,
      }));

      const result = await service.create(TENANT_ID, {
        tenantId: TENANT_ID,
        serviceId: SERVICE_ID,
      });

      const steps = result.resolvedSteps as Array<{ type: string }>;
      const stepTypes = steps.map((s) => s.type);
      expect(stepTypes).not.toContain('QUESTIONNAIRE');
    });

    it('should include ADD_ONS step when service has active addons', async () => {
      prisma.service.findFirst.mockResolvedValue({
        venueId: null,
        guestConfig: null,
        basePrice: 50,
        intakeFormConfig: null,
      });
      prisma.venue.count.mockResolvedValue(0);
      prisma.serviceAddon.count.mockResolvedValue(3);

      prisma.bookingSession.create.mockImplementation(async (args: { data: { resolvedSteps: unknown } }) => ({
        ...mockSession(),
        resolvedSteps: args.data.resolvedSteps,
      }));

      const result = await service.create(TENANT_ID, {
        tenantId: TENANT_ID,
        serviceId: SERVICE_ID,
      });

      const steps = result.resolvedSteps as Array<{ type: string; label: string; description?: string; config?: Record<string, unknown> }>;
      const addOnsStep = steps.find((s) => s.type === 'ADD_ONS');

      expect(addOnsStep).toBeDefined();
      expect(addOnsStep!.label).toBe('Add-ons');
      expect(addOnsStep!.description).toBe('Select optional add-ons');
      expect(addOnsStep!.config).toEqual({});
    });

    it('should NOT include ADD_ONS step when no active addons exist', async () => {
      prisma.service.findFirst.mockResolvedValue({
        venueId: null,
        guestConfig: null,
        basePrice: 50,
        intakeFormConfig: null,
      });
      prisma.venue.count.mockResolvedValue(0);
      prisma.serviceAddon.count.mockResolvedValue(0);

      prisma.bookingSession.create.mockImplementation(async (args: { data: { resolvedSteps: unknown } }) => ({
        ...mockSession(),
        resolvedSteps: args.data.resolvedSteps,
      }));

      const result = await service.create(TENANT_ID, {
        tenantId: TENANT_ID,
        serviceId: SERVICE_ID,
      });

      const steps = result.resolvedSteps as Array<{ type: string }>;
      const stepTypes = steps.map((s) => s.type);
      expect(stepTypes).not.toContain('ADD_ONS');
    });

    it('should include both QUESTIONNAIRE and ADD_ONS when both configured', async () => {
      const intakeFormConfig = {
        fields: [{ id: 'q1', label: 'Question', type: 'TEXT', required: false }],
      };

      prisma.service.findFirst.mockResolvedValue({
        venueId: null,
        guestConfig: null,
        basePrice: 50,
        intakeFormConfig,
      });
      prisma.venue.count.mockResolvedValue(0);
      prisma.serviceAddon.count.mockResolvedValue(2);

      prisma.bookingSession.create.mockImplementation(async (args: { data: { resolvedSteps: unknown } }) => ({
        ...mockSession(),
        resolvedSteps: args.data.resolvedSteps,
      }));

      const result = await service.create(TENANT_ID, {
        tenantId: TENANT_ID,
        serviceId: SERVICE_ID,
      });

      const steps = result.resolvedSteps as Array<{ type: string }>;
      const stepTypes = steps.map((s) => s.type);

      expect(stepTypes).toContain('QUESTIONNAIRE');
      expect(stepTypes).toContain('ADD_ONS');

      // QUESTIONNAIRE should come before ADD_ONS
      const qIdx = stepTypes.indexOf('QUESTIONNAIRE');
      const aIdx = stepTypes.indexOf('ADD_ONS');
      expect(qIdx).toBeLessThan(aIdx);
    });

    it('should place QUESTIONNAIRE and ADD_ONS before DATE_TIME_PICKER', async () => {
      const intakeFormConfig = {
        fields: [{ id: 'q1', label: 'Question', type: 'TEXT', required: false }],
      };

      prisma.service.findFirst.mockResolvedValue({
        venueId: null,
        guestConfig: { minGuests: 1, maxGuests: 10 },
        basePrice: 50,
        intakeFormConfig,
      });
      prisma.venue.count.mockResolvedValue(0);
      prisma.serviceAddon.count.mockResolvedValue(1);

      prisma.bookingSession.create.mockImplementation(async (args: { data: { resolvedSteps: unknown } }) => ({
        ...mockSession(),
        resolvedSteps: args.data.resolvedSteps,
      }));

      const result = await service.create(TENANT_ID, {
        tenantId: TENANT_ID,
        serviceId: SERVICE_ID,
      });

      const steps = result.resolvedSteps as Array<{ type: string }>;
      const stepTypes = steps.map((s) => s.type);

      const dtIdx = stepTypes.indexOf('DATE_TIME_PICKER');
      const qIdx = stepTypes.indexOf('QUESTIONNAIRE');
      const aIdx = stepTypes.indexOf('ADD_ONS');
      const gcIdx = stepTypes.indexOf('GUEST_COUNT');

      // GUEST_COUNT < QUESTIONNAIRE < ADD_ONS < DATE_TIME_PICKER
      expect(gcIdx).toBeLessThan(qIdx);
      expect(qIdx).toBeLessThan(aIdx);
      expect(aIdx).toBeLessThan(dtIdx);
    });

    it('should not query addon count when no serviceId', async () => {
      prisma.service.count.mockResolvedValue(1);
      prisma.venue.count.mockResolvedValue(0);

      prisma.bookingSession.create.mockImplementation(async (args: { data: { resolvedSteps: unknown } }) => ({
        ...mockSession(),
        resolvedSteps: args.data.resolvedSteps,
      }));

      await service.create(TENANT_ID, { tenantId: TENANT_ID });

      expect(prisma.serviceAddon.count).not.toHaveBeenCalled();
    });

    it('should have sequential order values across all steps', async () => {
      prisma.service.findFirst.mockResolvedValue({
        venueId: 'venue-001',
        guestConfig: { minGuests: 1, maxGuests: 10 },
        basePrice: 100,
        intakeFormConfig: { fields: [{ id: 'q1', label: 'Q', type: 'TEXT', required: false }] },
      });
      prisma.venue.count.mockResolvedValue(0);
      prisma.serviceAddon.count.mockResolvedValue(2);
      prisma.tenant.findUnique.mockResolvedValue({ paymentProviderOnboarded: true });

      prisma.bookingSession.create.mockImplementation(async (args: { data: { resolvedSteps: unknown } }) => ({
        ...mockSession(),
        resolvedSteps: args.data.resolvedSteps,
      }));

      const result = await service.create(TENANT_ID, {
        tenantId: TENANT_ID,
        serviceId: SERVICE_ID,
      });

      const steps = result.resolvedSteps as Array<{ type: string; order: number }>;

      // Orders should be sequential: 0, 1, 2, 3, ...
      for (let i = 0; i < steps.length; i++) {
        expect(steps[i]!.order).toBe(i);
      }
    });
  });

  // -----------------------------------------------------------------------
  // update - step data storage
  // -----------------------------------------------------------------------

  describe('update (step data storage)', () => {
    it('should merge questionnaire responses into session data', async () => {
      prisma.bookingSession.findFirst.mockResolvedValue(
        mockSession({ data: { selectedDate: '2026-03-15' } }),
      );

      prisma.bookingSession.update.mockImplementation(async (args: { data: { data?: unknown } }) => ({
        ...mockSession(),
        data: args.data.data,
      }));

      const result = await service.update(TENANT_ID, SESSION_ID, {
        data: {
          questionnaireResponses: { allergies: 'None', notes: 'First visit' },
        },
      });

      const data = result.data as Record<string, unknown>;
      expect(data['selectedDate']).toBe('2026-03-15');
      expect(data['questionnaireResponses']).toEqual({
        allergies: 'None',
        notes: 'First visit',
      });
    });

    it('should merge selectedAddons into session data', async () => {
      prisma.bookingSession.findFirst.mockResolvedValue(
        mockSession({ data: { selectedDate: '2026-03-15' } }),
      );

      prisma.bookingSession.update.mockImplementation(async (args: { data: { data?: unknown } }) => ({
        ...mockSession(),
        data: args.data.data,
      }));

      const result = await service.update(TENANT_ID, SESSION_ID, {
        data: {
          selectedAddons: ['addon-001', 'addon-002'],
        },
      });

      const data = result.data as Record<string, unknown>;
      expect(data['selectedDate']).toBe('2026-03-15');
      expect(data['selectedAddons']).toEqual(['addon-001', 'addon-002']);
    });
  });

  // -----------------------------------------------------------------------
  // findById
  // -----------------------------------------------------------------------

  describe('findById', () => {
    it('should return session when found', async () => {
      prisma.bookingSession.findFirst.mockResolvedValue(mockSession());
      const result = await service.findById(TENANT_ID, SESSION_ID);
      expect(result.id).toBe(SESSION_ID);
    });

    it('should throw NotFoundException when not found', async () => {
      prisma.bookingSession.findFirst.mockResolvedValue(null);
      await expect(service.findById(TENANT_ID, 'bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // -----------------------------------------------------------------------
  // abandon
  // -----------------------------------------------------------------------

  describe('abandon', () => {
    it('should reject non-in-progress sessions', async () => {
      prisma.bookingSession.findFirst.mockResolvedValue(
        mockSession({ status: 'COMPLETED' }),
      );
      await expect(service.abandon(TENANT_ID, SESSION_ID)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
