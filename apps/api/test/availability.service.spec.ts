import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { AvailabilityService } from '@/availability/availability.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const SERVICE_ID = 'service-001';

function makeService(overrides: Record<string, unknown> = {}) {
  return {
    id: SERVICE_ID,
    tenantId: TENANT_ID,
    isActive: true,
    durationMinutes: 60,
    bufferBeforeMinutes: 0,
    bufferAfterMinutes: 0,
    venueId: null,
    ...overrides,
  };
}

/**
 * Create a "Time" field (Date on 1970-01-01) from hours and minutes.
 * Uses local time because the service extracts hours via getHours()/getMinutes()
 * which return local time values.
 */
function timeField(hours: number, minutes = 0): Date {
  const d = new Date(1970, 0, 1, hours, minutes, 0, 0);
  return d;
}

function makePrisma() {
  return {
    service: { findFirst: vi.fn() },
    bookingFlow: { findFirst: vi.fn() },
    availabilityRule: { findMany: vi.fn() },
    blockedDate: { findMany: vi.fn() },
    booking: { findMany: vi.fn() },
    dateReservation: { findMany: vi.fn() },
    calendarEvent: { findMany: vi.fn() },
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('AvailabilityService', () => {
  let service: AvailabilityService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new AvailabilityService(prisma as never);
  });

  // -----------------------------------------------------------------------
  // Basic slot generation
  // -----------------------------------------------------------------------

  describe('getAvailableSlots', () => {
    it('throws NotFoundException for inactive/missing service', async () => {
      prisma.service.findFirst.mockResolvedValue(null);

      await expect(
        service.getAvailableSlots({
          tenantId: TENANT_ID,
          serviceId: SERVICE_ID,
          startDate: '2026-04-01',
          endDate: '2026-04-01',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns slots when no booking flow exists (no advance window filtering)', async () => {
      prisma.service.findFirst.mockResolvedValue(makeService());
      prisma.bookingFlow.findFirst.mockResolvedValue(null);

      // Tuesday 2026-04-07
      const dayOfWeek = new Date('2026-04-07').getDay(); // 2 = Tuesday

      prisma.availabilityRule.findMany
        .mockResolvedValueOnce([
          { dayOfWeek, startTime: timeField(9), endTime: timeField(12) },
        ])
        .mockResolvedValueOnce([]); // tenant-wide (none)

      prisma.blockedDate.findMany.mockResolvedValue([]);
      prisma.booking.findMany.mockResolvedValue([]);
      prisma.dateReservation.findMany.mockResolvedValue([]);
      prisma.calendarEvent.findMany.mockResolvedValue([]);

      const slots = await service.getAvailableSlots({
        tenantId: TENANT_ID,
        serviceId: SERVICE_ID,
        startDate: '2026-04-07',
        endDate: '2026-04-07',
      });

      // 9-10, 10-11, 11-12 = 3 slots for 60min duration
      expect(slots).toHaveLength(3);
      expect(slots[0]).toEqual({ date: '2026-04-07', startTime: '09:00', endTime: '10:00' });
    });
  });

  // -----------------------------------------------------------------------
  // Advance booking window filtering
  // -----------------------------------------------------------------------

  describe('advance booking window', () => {
    it('filters out slots that are too soon (minBookingAdvanceDays)', async () => {
      prisma.service.findFirst.mockResolvedValue(makeService());
      prisma.bookingFlow.findFirst.mockResolvedValue({
        minBookingAdvanceDays: 3,
        maxBookingAdvanceDays: 365,
      });

      // Query for tomorrow — should be filtered out with 3-day min advance
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0] as string;
      // Match service: new Date(dateStr) is UTC midnight, .getDay() returns local day
      const dayOfWeek = new Date(tomorrowStr).getDay();

      prisma.availabilityRule.findMany
        .mockResolvedValueOnce([
          { dayOfWeek, startTime: timeField(9), endTime: timeField(12) },
        ])
        .mockResolvedValueOnce([]);

      prisma.blockedDate.findMany.mockResolvedValue([]);
      prisma.booking.findMany.mockResolvedValue([]);
      prisma.dateReservation.findMany.mockResolvedValue([]);
      prisma.calendarEvent.findMany.mockResolvedValue([]);

      const slots = await service.getAvailableSlots({
        tenantId: TENANT_ID,
        serviceId: SERVICE_ID,
        startDate: tomorrowStr,
        endDate: tomorrowStr,
      });

      // All slots for tomorrow should be filtered out (1 day < 3 day minimum)
      expect(slots).toHaveLength(0);
    });

    it('filters out slots that are too far ahead (maxBookingAdvanceDays)', async () => {
      prisma.service.findFirst.mockResolvedValue(makeService());
      prisma.bookingFlow.findFirst.mockResolvedValue({
        minBookingAdvanceDays: 0,
        maxBookingAdvanceDays: 7,
      });

      // Query for 30 days out — should be filtered out with 7-day max
      const farOut = new Date();
      farOut.setDate(farOut.getDate() + 30);
      const farOutStr = farOut.toISOString().split('T')[0] as string;
      const dayOfWeek = new Date(farOutStr).getDay();

      prisma.availabilityRule.findMany
        .mockResolvedValueOnce([
          { dayOfWeek, startTime: timeField(9), endTime: timeField(12) },
        ])
        .mockResolvedValueOnce([]);

      prisma.blockedDate.findMany.mockResolvedValue([]);
      prisma.booking.findMany.mockResolvedValue([]);
      prisma.dateReservation.findMany.mockResolvedValue([]);
      prisma.calendarEvent.findMany.mockResolvedValue([]);

      const slots = await service.getAvailableSlots({
        tenantId: TENANT_ID,
        serviceId: SERVICE_ID,
        startDate: farOutStr,
        endDate: farOutStr,
      });

      // All slots 30 days out should be filtered out (30 > 7 max)
      expect(slots).toHaveLength(0);
    });

    it('keeps slots within the advance booking window', async () => {
      prisma.service.findFirst.mockResolvedValue(makeService());
      prisma.bookingFlow.findFirst.mockResolvedValue({
        minBookingAdvanceDays: 1,
        maxBookingAdvanceDays: 30,
      });

      // Query for 10 days out — should be within window
      const target = new Date();
      target.setDate(target.getDate() + 10);
      const targetStr = target.toISOString().split('T')[0] as string;
      // Match service behavior: new Date(dateStr) parses as UTC, .getDay() returns local day
      const dayOfWeek = new Date(targetStr).getDay();

      prisma.availabilityRule.findMany
        .mockResolvedValueOnce([
          { dayOfWeek, startTime: timeField(9), endTime: timeField(12) },
        ])
        .mockResolvedValueOnce([]);

      prisma.blockedDate.findMany.mockResolvedValue([]);
      prisma.booking.findMany.mockResolvedValue([]);
      prisma.dateReservation.findMany.mockResolvedValue([]);
      prisma.calendarEvent.findMany.mockResolvedValue([]);

      const slots = await service.getAvailableSlots({
        tenantId: TENANT_ID,
        serviceId: SERVICE_ID,
        startDate: targetStr,
        endDate: targetStr,
      });

      // 10 days is within [1, 30] range — slots should be returned
      expect(slots.length).toBeGreaterThan(0);
    });

    it('skips filtering when booking flow has null advance values', async () => {
      prisma.service.findFirst.mockResolvedValue(makeService());
      prisma.bookingFlow.findFirst.mockResolvedValue({
        minBookingAdvanceDays: null,
        maxBookingAdvanceDays: null,
      });

      // Query for far future — should still return slots since no restriction
      const farOut = new Date();
      farOut.setDate(farOut.getDate() + 500);
      const farOutStr = farOut.toISOString().split('T')[0] as string;
      const dayOfWeek = new Date(farOutStr).getDay();

      prisma.availabilityRule.findMany
        .mockResolvedValueOnce([
          { dayOfWeek, startTime: timeField(9), endTime: timeField(12) },
        ])
        .mockResolvedValueOnce([]);

      prisma.blockedDate.findMany.mockResolvedValue([]);
      prisma.booking.findMany.mockResolvedValue([]);
      prisma.dateReservation.findMany.mockResolvedValue([]);
      prisma.calendarEvent.findMany.mockResolvedValue([]);

      const slots = await service.getAvailableSlots({
        tenantId: TENANT_ID,
        serviceId: SERVICE_ID,
        startDate: farOutStr,
        endDate: farOutStr,
      });

      expect(slots.length).toBeGreaterThan(0);
    });
  });
});
