import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { BookingsController } from '@/public-api/v1/controllers/bookings.controller';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePrisma() {
  return {
    booking: {
      findFirst: vi.fn(),
    },
  };
}

function makeBookingsService() {
  return {
    cancel: vi.fn(),
  };
}

const API_KEY = {
  id: 'key-1',
  tenantId: 'tenant-001',
  scopes: ['bookings:read', 'bookings:write'],
  rateLimit: 100,
  createdBy: 'user-001',
  allowedIps: [],
};

function makeReq(apiKey: Record<string, unknown> | undefined = undefined) {
  return { apiKey } as never;
}

function makeBooking(overrides: Record<string, unknown> = {}) {
  return {
    id: 'booking-001',
    status: 'CONFIRMED',
    startTime: new Date('2026-04-01T10:00:00Z'),
    endTime: new Date('2026-04-01T11:00:00Z'),
    totalAmount: 50,
    currency: 'USD',
    guestCount: 1,
    service: { name: 'Haircut' },
    ...overrides,
  };
}

describe('BookingsController (Public API)', () => {
  let controller: BookingsController;
  let prisma: ReturnType<typeof makePrisma>;
  let bookingsService: ReturnType<typeof makeBookingsService>;

  beforeEach(() => {
    prisma = makePrisma();
    bookingsService = makeBookingsService();
    controller = new BookingsController(prisma as never, bookingsService as never);
  });

  // ---------- getBooking ----------

  describe('getBooking', () => {
    it('returns transformed booking', async () => {
      prisma.booking.findFirst.mockResolvedValue(makeBooking());

      const result = await controller.getBooking('booking-001', makeReq(API_KEY));

      expect(result.data.id).toBe('booking-001');
      expect(result.data.serviceName).toBe('Haircut');
      expect(result.data.startTime).toContain('2026-04-01');
    });

    it('throws NotFoundException when booking not found', async () => {
      prisma.booking.findFirst.mockResolvedValue(null);

      await expect(
        controller.getBooking('nope', makeReq(API_KEY)),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when no API key', async () => {
      await expect(
        controller.getBooking('booking-001', makeReq(undefined)),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ---------- cancelBooking ----------

  describe('cancelBooking', () => {
    it('cancels a booking and returns status', async () => {
      bookingsService.cancel.mockResolvedValue({
        id: 'booking-001',
        status: 'CANCELLED',
        cancelledAt: new Date('2026-04-01T12:00:00Z'),
      });

      const result = await controller.cancelBooking('booking-001', makeReq(API_KEY));

      expect(result.data.status).toBe('CANCELLED');
      expect(result.data.cancelled_at).toBe('2026-04-01T12:00:00.000Z');
    });

    it('handles null cancelledAt', async () => {
      bookingsService.cancel.mockResolvedValue({
        id: 'booking-001',
        status: 'CANCELLED',
        cancelledAt: null,
      });

      const result = await controller.cancelBooking('booking-001', makeReq(API_KEY));

      expect(result.data.cancelled_at).toBeNull();
    });

    it('throws BadRequestException when no API key', async () => {
      await expect(
        controller.cancelBooking('booking-001', makeReq(undefined)),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
