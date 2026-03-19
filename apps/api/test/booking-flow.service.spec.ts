import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { BookingFlowService } from '@/booking-flow/booking-flow.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const FLOW_ID = 'flow-001';

function makePrisma() {
  return {
    bookingFlow: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    service: {
      findMany: vi.fn(),
    },
    venue: {
      count: vi.fn(),
    },
  };
}

function makeRedis() {
  return {
    get: vi.fn().mockResolvedValue(null),
    setex: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    getClient: vi.fn(),
  };
}

function makeFlow(overrides: Record<string, unknown> = {}) {
  return {
    id: FLOW_ID,
    tenantId: TENANT_ID,
    name: 'Default Flow',
    isDefault: true,
    stepOverrides: null,
    settings: null,
    minBookingAdvanceDays: 0,
    maxBookingAdvanceDays: 365,
    createdAt: new Date('2026-03-01T00:00:00Z'),
    ...overrides,
  };
}

function makeService(overrides: Record<string, unknown> = {}) {
  return {
    id: 'service-001',
    name: 'Haircut',
    venueId: null,
    guestConfig: null,
    intakeFormConfig: null,
    basePrice: 50,
    _count: { serviceAddons: 0 },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('BookingFlowService', () => {
  let service: BookingFlowService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new BookingFlowService(prisma as never, makeRedis() as never);
  });

  // -----------------------------------------------------------------------
  // getBookingFlow
  // -----------------------------------------------------------------------

  describe('getBookingFlow', () => {
    it('should return flow with resolved steps for a single service', async () => {
      prisma.bookingFlow.findFirst.mockResolvedValue(makeFlow());
      prisma.service.findMany.mockResolvedValue([makeService()]);
      prisma.venue.count.mockResolvedValue(0);

      const result = await service.getBookingFlow(TENANT_ID);

      expect(result.id).toBe(FLOW_ID);
      expect(result.globalSteps).toBeDefined();
      expect(result.serviceSteps).toHaveLength(1);
      // Single service → SERVICE_SELECTION should be inactive
      const serviceStep = result.globalSteps.find(
        (s: { type: string }) => s.type === 'SERVICE_SELECTION',
      );
      expect(serviceStep?.active).toBe(false);
    });

    it('should activate SERVICE_SELECTION when multiple services exist', async () => {
      prisma.bookingFlow.findFirst.mockResolvedValue(makeFlow());
      prisma.service.findMany.mockResolvedValue([
        makeService(),
        makeService({ id: 'service-002', name: 'Beard Trim' }),
      ]);
      prisma.venue.count.mockResolvedValue(0);

      const result = await service.getBookingFlow(TENANT_ID);

      const serviceStep = result.globalSteps.find(
        (s: { type: string }) => s.type === 'SERVICE_SELECTION',
      );
      expect(serviceStep?.active).toBe(true);
    });

    it('should activate VENUE_SELECTION when venues exist', async () => {
      prisma.bookingFlow.findFirst.mockResolvedValue(makeFlow());
      prisma.service.findMany.mockResolvedValue([makeService()]);
      prisma.venue.count.mockResolvedValue(2);

      const result = await service.getBookingFlow(TENANT_ID);

      const venueStep = result.globalSteps.find(
        (s: { type: string }) => s.type === 'VENUE_SELECTION',
      );
      expect(venueStep?.active).toBe(true);
    });

    it('should activate GUEST_COUNT when a service has guestConfig', async () => {
      prisma.bookingFlow.findFirst.mockResolvedValue(makeFlow());
      prisma.service.findMany.mockResolvedValue([
        makeService({ guestConfig: { min: 1, max: 10 } }),
      ]);
      prisma.venue.count.mockResolvedValue(0);

      const result = await service.getBookingFlow(TENANT_ID);

      const guestStep = result.globalSteps.find(
        (s: { type: string }) => s.type === 'GUEST_COUNT',
      );
      expect(guestStep?.active).toBe(true);
    });

    it('should activate QUESTIONNAIRE when a service has intakeFormConfig', async () => {
      prisma.bookingFlow.findFirst.mockResolvedValue(makeFlow());
      prisma.service.findMany.mockResolvedValue([
        makeService({ intakeFormConfig: { fields: [] } }),
      ]);
      prisma.venue.count.mockResolvedValue(0);

      const result = await service.getBookingFlow(TENANT_ID);

      const questionnaireStep = result.globalSteps.find(
        (s: { type: string }) => s.type === 'QUESTIONNAIRE',
      );
      expect(questionnaireStep?.active).toBe(true);
    });

    it('should activate ADD_ONS when a service has active add-ons', async () => {
      prisma.bookingFlow.findFirst.mockResolvedValue(makeFlow());
      prisma.service.findMany.mockResolvedValue([
        makeService({ _count: { serviceAddons: 3 } }),
      ]);
      prisma.venue.count.mockResolvedValue(0);

      const result = await service.getBookingFlow(TENANT_ID);

      const addonsStep = result.globalSteps.find(
        (s: { type: string }) => s.type === 'ADD_ONS',
      );
      expect(addonsStep?.active).toBe(true);
    });

    it('should always include DATE_TIME_PICKER, CLIENT_INFO, PRICING_SUMMARY, PAYMENT, CONFIRMATION', async () => {
      prisma.bookingFlow.findFirst.mockResolvedValue(makeFlow());
      prisma.service.findMany.mockResolvedValue([makeService()]);
      prisma.venue.count.mockResolvedValue(0);

      const result = await service.getBookingFlow(TENANT_ID);

      const alwaysActive = [
        'DATE_TIME_PICKER',
        'CLIENT_INFO',
        'PRICING_SUMMARY',
        'PAYMENT',
        'CONFIRMATION',
      ];
      for (const type of alwaysActive) {
        const step = result.globalSteps.find(
          (s: { type: string }) => s.type === type,
        );
        expect(step?.active).toBe(true);
      }
    });

    it('should throw NotFoundException when no flow exists', async () => {
      prisma.bookingFlow.findFirst.mockResolvedValue(null);

      await expect(
        service.getBookingFlow(TENANT_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('should fall back to non-default flow when no default exists', async () => {
      // First call returns null (no default), second returns a non-default flow
      prisma.bookingFlow.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(makeFlow({ isDefault: false }));
      prisma.service.findMany.mockResolvedValue([makeService()]);
      prisma.venue.count.mockResolvedValue(0);

      const result = await service.getBookingFlow(TENANT_ID);

      expect(result.id).toBe(FLOW_ID);
    });
  });

  // -----------------------------------------------------------------------
  // updateBookingFlow
  // -----------------------------------------------------------------------

  describe('updateBookingFlow', () => {
    it('should update flow settings', async () => {
      prisma.bookingFlow.findFirst.mockResolvedValue(makeFlow());
      const updated = makeFlow({ maxBookingAdvanceDays: 180 });
      prisma.bookingFlow.update.mockResolvedValue(updated);

      const result = await service.updateBookingFlow(TENANT_ID, {
        maxBookingAdvanceDays: 180,
      });

      expect(result.maxBookingAdvanceDays).toBe(180);
      expect(prisma.bookingFlow.update).toHaveBeenCalledWith({
        where: { id: FLOW_ID },
        data: { maxBookingAdvanceDays: 180 },
      });
    });

    it('should throw NotFoundException when no default flow exists', async () => {
      prisma.bookingFlow.findFirst.mockResolvedValue(null);

      await expect(
        service.updateBookingFlow(TENANT_ID, { maxBookingAdvanceDays: 30 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update stepOverrides and settings', async () => {
      prisma.bookingFlow.findFirst.mockResolvedValue(makeFlow());
      prisma.bookingFlow.update.mockResolvedValue(makeFlow());

      await service.updateBookingFlow(TENANT_ID, {
        stepOverrides: { GUEST_COUNT: { hidden: true } },
        settings: { theme: 'dark' },
      });

      expect(prisma.bookingFlow.update).toHaveBeenCalledWith({
        where: { id: FLOW_ID },
        data: {
          stepOverrides: { GUEST_COUNT: { hidden: true } },
          settings: { theme: 'dark' },
        },
      });
    });
  });
});
