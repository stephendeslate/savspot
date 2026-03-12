import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { BookingSessionsController } from '@/public-api/v1/controllers/booking-sessions.controller';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBookingSessionsService() {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    complete: vi.fn(),
  };
}

const API_KEY = {
  id: 'key-1',
  tenantId: 'tenant-001',
  scopes: ['bookings:write'],
  rateLimit: 100,
  createdBy: 'user-001',
  allowedIps: [],
};

function makeReq(apiKey: Record<string, unknown> | undefined = undefined) {
  return { apiKey } as never;
}

function makeSession(overrides: Record<string, unknown> = {}) {
  return {
    id: 'session-001',
    status: 'IN_PROGRESS',
    currentStep: 'SELECT_SERVICE',
    resolvedSteps: ['SELECT_SERVICE'],
    data: {},
    service: { id: 'svc-1', name: 'Haircut' },
    createdAt: new Date('2026-04-01T10:00:00Z'),
    updatedAt: new Date('2026-04-01T10:05:00Z'),
    ...overrides,
  };
}

describe('BookingSessionsController (Public API)', () => {
  let controller: BookingSessionsController;
  let bookingSessionsService: ReturnType<typeof makeBookingSessionsService>;

  beforeEach(() => {
    bookingSessionsService = makeBookingSessionsService();
    controller = new BookingSessionsController(bookingSessionsService as never);
  });

  // ---------- createSession ----------

  describe('createSession', () => {
    it('creates a booking session and returns formatted response', async () => {
      bookingSessionsService.create.mockResolvedValue(makeSession());

      const result = await controller.createSession(
        { service_id: 'svc-1' } as never,
        makeReq(API_KEY),
      );

      expect(result.data.id).toBe('session-001');
      expect(result.data.service?.name).toBe('Haircut');
      expect(result.data.created_at).toContain('2026-04-01');
    });

    it('throws BadRequestException when no API key', async () => {
      await expect(
        controller.createSession({ service_id: 'svc-1' } as never, makeReq(undefined)),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ---------- getSession ----------

  describe('getSession', () => {
    it('returns session details', async () => {
      bookingSessionsService.findById.mockResolvedValue(makeSession());

      const result = await controller.getSession('session-001', makeReq(API_KEY));

      expect(result.data.id).toBe('session-001');
      expect(result.data.updated_at).toContain('2026-04-01');
    });
  });

  // ---------- updateSession ----------

  describe('updateSession', () => {
    it('updates session and returns updated state', async () => {
      bookingSessionsService.update.mockResolvedValue(
        makeSession({ currentStep: 'SELECT_TIME' }),
      );

      const result = await controller.updateSession(
        'session-001',
        { fields: { date: '2026-04-15' } } as never,
        makeReq(API_KEY),
      );

      expect(result.data.current_step).toBe('SELECT_TIME');
    });
  });

  // ---------- completeSession ----------

  describe('completeSession', () => {
    it('completes session and returns booking data', async () => {
      bookingSessionsService.complete.mockResolvedValue({
        id: 'booking-001',
        status: 'CONFIRMED',
        startTime: new Date('2026-04-15T10:00:00Z'),
        endTime: new Date('2026-04-15T11:00:00Z'),
      });

      const result = await controller.completeSession('session-001', makeReq(API_KEY));

      expect(result.data.booking_id).toBe('booking-001');
      expect(result.data.status).toBe('CONFIRMED');
    });

    it('throws BadRequestException when no API key', async () => {
      await expect(
        controller.completeSession('session-001', makeReq(undefined)),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
