import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { BookingsService } from '@/bookings/bookings.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const BOOKING_ID = 'booking-001';
const STAFF_ID = 'staff-001';

function makePrisma() {
  return {
    booking: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    bookingStateHistory: { create: vi.fn() },
    service: { findFirst: vi.fn() },
    user: { findFirst: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(),
    $executeRaw: vi.fn(),
  };
}

function makePayments() {
  return { processRefund: vi.fn() };
}

function makeEvents() {
  return {
    emitBookingCreated: vi.fn(),
    emitBookingConfirmed: vi.fn(),
    emitBookingCancelled: vi.fn(),
    emitBookingRescheduled: vi.fn(),
    emitBookingCompleted: vi.fn(),
    emitBookingNoShow: vi.fn(),
    emitBookingWalkIn: vi.fn(),
    emitPaymentReceived: vi.fn(),
    emitPaymentFailed: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('BookingsService check-in/check-out', () => {
  let service: BookingsService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    const payments = makePayments();
    const events = makeEvents();
    service = new BookingsService(prisma as never, payments as never, events as never);
  });

  // -----------------------------------------------------------------------
  // checkIn
  // -----------------------------------------------------------------------

  describe('checkIn', () => {
    it('should check in a CONFIRMED booking with PENDING checkInStatus', async () => {
      const updatedBooking = {
        id: BOOKING_ID,
        checkInStatus: 'CHECKED_IN',
        checkedInAt: new Date(),
        checkedInBy: STAFF_ID,
      };

      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          $executeRaw: vi.fn(),
          booking: {
            findUnique: vi.fn().mockResolvedValue({
              id: BOOKING_ID,
              status: 'CONFIRMED',
              checkInStatus: 'PENDING',
            }),
            update: vi.fn().mockResolvedValue(updatedBooking),
          },
        }),
      );

      const result = await service.checkIn(TENANT_ID, BOOKING_ID, STAFF_ID);
      expect(result.checkInStatus).toBe('CHECKED_IN');
      expect(result.checkedInBy).toBe(STAFF_ID);
    });

    it('should reject check-in if booking is not CONFIRMED', async () => {
      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          $executeRaw: vi.fn(),
          booking: {
            findUnique: vi.fn().mockResolvedValue({
              id: BOOKING_ID,
              status: 'PENDING',
              checkInStatus: 'PENDING',
            }),
          },
        }),
      );

      await expect(service.checkIn(TENANT_ID, BOOKING_ID, STAFF_ID))
        .rejects.toThrow(BadRequestException);
      await expect(service.checkIn(TENANT_ID, BOOKING_ID, STAFF_ID))
        .rejects.toThrow('Booking must be CONFIRMED for check-in');
    });

    it('should reject check-in if checkInStatus is not PENDING', async () => {
      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          $executeRaw: vi.fn(),
          booking: {
            findUnique: vi.fn().mockResolvedValue({
              id: BOOKING_ID,
              status: 'CONFIRMED',
              checkInStatus: 'CHECKED_IN',
            }),
          },
        }),
      );

      await expect(service.checkIn(TENANT_ID, BOOKING_ID, STAFF_ID))
        .rejects.toThrow(BadRequestException);
      await expect(service.checkIn(TENANT_ID, BOOKING_ID, STAFF_ID))
        .rejects.toThrow('Booking is not in PENDING check-in status');
    });

    it('should throw NotFoundException when booking does not exist', async () => {
      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          $executeRaw: vi.fn(),
          booking: {
            findUnique: vi.fn().mockResolvedValue(null),
          },
        }),
      );

      await expect(service.checkIn(TENANT_ID, 'bad-id', STAFF_ID))
        .rejects.toThrow(NotFoundException);
    });
  });

  // -----------------------------------------------------------------------
  // checkOut
  // -----------------------------------------------------------------------

  describe('checkOut', () => {
    it('should check out a CHECKED_IN booking', async () => {
      const updatedBooking = {
        id: BOOKING_ID,
        checkInStatus: 'CHECKED_OUT',
        checkedOutAt: new Date(),
        checkedOutBy: STAFF_ID,
      };

      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          $executeRaw: vi.fn(),
          booking: {
            findUnique: vi.fn().mockResolvedValue({
              id: BOOKING_ID,
              checkInStatus: 'CHECKED_IN',
            }),
            update: vi.fn().mockResolvedValue(updatedBooking),
          },
        }),
      );

      const result = await service.checkOut(TENANT_ID, BOOKING_ID, STAFF_ID);
      expect(result.checkInStatus).toBe('CHECKED_OUT');
      expect(result.checkedOutBy).toBe(STAFF_ID);
    });

    it('should reject check-out if checkInStatus is not CHECKED_IN', async () => {
      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          $executeRaw: vi.fn(),
          booking: {
            findUnique: vi.fn().mockResolvedValue({
              id: BOOKING_ID,
              checkInStatus: 'PENDING',
            }),
          },
        }),
      );

      await expect(service.checkOut(TENANT_ID, BOOKING_ID, STAFF_ID))
        .rejects.toThrow(BadRequestException);
      await expect(service.checkOut(TENANT_ID, BOOKING_ID, STAFF_ID))
        .rejects.toThrow('Booking must be CHECKED_IN for check-out');
    });

    it('should throw NotFoundException when booking does not exist', async () => {
      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          $executeRaw: vi.fn(),
          booking: {
            findUnique: vi.fn().mockResolvedValue(null),
          },
        }),
      );

      await expect(service.checkOut(TENANT_ID, 'bad-id', STAFF_ID))
        .rejects.toThrow(NotFoundException);
    });

    it('should pass notes when provided', async () => {
      const mockUpdate = vi.fn().mockResolvedValue({
        id: BOOKING_ID,
        checkInStatus: 'CHECKED_OUT',
        notes: 'Extra time used',
      });

      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          $executeRaw: vi.fn(),
          booking: {
            findUnique: vi.fn().mockResolvedValue({
              id: BOOKING_ID,
              checkInStatus: 'CHECKED_IN',
            }),
            update: mockUpdate,
          },
        }),
      );

      await service.checkOut(TENANT_ID, BOOKING_ID, STAFF_ID, 'Extra time used');
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: BOOKING_ID },
        data: expect.objectContaining({
          checkInStatus: 'CHECKED_OUT',
          checkedOutBy: STAFF_ID,
          notes: 'Extra time used',
        }),
      });
    });
  });
});
