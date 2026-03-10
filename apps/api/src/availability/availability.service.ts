import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AvailableSlot {
  date: string;
  startTime: string;
  endTime: string;
}

interface QueryParams {
  tenantId: string;
  serviceId: string;
  startDate: string;
  endDate: string;
  venueId?: string;
}

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolve available time slots for a service within a date range.
   *
   * Algorithm:
   * 1. Load service (duration, buffers, venueId)
   * 2. Load availability rules (service-specific first, tenant-wide fallback)
   * 3. Load blocked dates in range
   * 4. Load existing bookings (CONFIRMED, IN_PROGRESS, PENDING) in range
   * 5. Load HELD date reservations (not expired) in range
   * 6. For each day: skip if blocked, get rules for day_of_week, generate slots, filter conflicts
   * 7. Return available slots
   */
  async getAvailableSlots(params: QueryParams): Promise<AvailableSlot[]> {
    const { tenantId, serviceId, startDate, endDate, venueId } = params;

    // 1. Load service
    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, tenantId, isActive: true },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    const durationMinutes = service.durationMinutes;
    const bufferBefore = service.bufferBeforeMinutes;
    const bufferAfter = service.bufferAfterMinutes;
    const effectiveVenueId = venueId ?? service.venueId;

    // 1b. Load booking flow for advance booking window enforcement
    const bookingFlow = await this.prisma.bookingFlow.findFirst({
      where: { tenantId, isDefault: true },
      select: { minBookingAdvanceDays: true, maxBookingAdvanceDays: true },
    });

    const now = new Date();
    const minAdvanceMs = bookingFlow?.minBookingAdvanceDays
      ? bookingFlow.minBookingAdvanceDays * 24 * 60 * 60 * 1000
      : null;
    const maxAdvanceMs = bookingFlow?.maxBookingAdvanceDays
      ? bookingFlow.maxBookingAdvanceDays * 24 * 60 * 60 * 1000
      : null;
    const earliestAllowed = minAdvanceMs ? new Date(now.getTime() + minAdvanceMs) : null;
    const latestAllowed = maxAdvanceMs ? new Date(now.getTime() + maxAdvanceMs) : null;

    // 2. Load availability rules — service-specific first, then tenant-wide fallback
    const serviceRules = await this.prisma.availabilityRule.findMany({
      where: {
        tenantId,
        serviceId,
        isActive: true,
        ...(effectiveVenueId ? { venueId: effectiveVenueId } : {}),
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    const tenantWideRules = await this.prisma.availabilityRule.findMany({
      where: {
        tenantId,
        serviceId: null,
        isActive: true,
        ...(effectiveVenueId ? { OR: [{ venueId: effectiveVenueId }, { venueId: null }] } : {}),
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    // Group rules by day of week. Service-specific rules override tenant-wide for that day.
    const rulesByDay = this.buildRulesByDay(serviceRules, tenantWideRules);

    // 3. Load blocked dates in range
    const rangeStart = new Date(startDate);
    const rangeEnd = new Date(endDate);

    const blockedDates = await this.prisma.blockedDate.findMany({
      where: {
        tenantId,
        blockedDate: {
          gte: rangeStart,
          lte: rangeEnd,
        },
        OR: [
          { serviceId: null },
          { serviceId },
        ],
      },
    });

    const blockedDateSet = new Set(
      blockedDates.map((bd) => bd.blockedDate.toISOString().split('T')[0]),
    );

    // 4. Load existing bookings in range (that occupy time)
    const bookingRangeStart = new Date(startDate + 'T00:00:00.000Z');
    const bookingRangeEnd = new Date(endDate + 'T23:59:59.999Z');

    const existingBookings = await this.prisma.booking.findMany({
      where: {
        tenantId,
        serviceId,
        status: { in: ['CONFIRMED', 'IN_PROGRESS', 'PENDING'] },
        startTime: { lt: bookingRangeEnd },
        endTime: { gt: bookingRangeStart },
        ...(effectiveVenueId ? { venueId: effectiveVenueId } : {}),
      },
      select: { startTime: true, endTime: true },
    });

    // 5. Load HELD date reservations (not expired)
    const activeReservations = await this.prisma.dateReservation.findMany({
      where: {
        tenantId,
        serviceId,
        status: 'HELD',
        expiresAt: { gt: new Date() },
        startTime: { lt: bookingRangeEnd },
        endTime: { gt: bookingRangeStart },
        ...(effectiveVenueId ? { venueId: effectiveVenueId } : {}),
      },
      select: { startTime: true, endTime: true },
    });

    // 5b. Load INBOUND calendar events (Layer 4 — external calendar blocks)
    // Phase 1 simplification: INBOUND events block all services tenant-wide.
    // Phase 2 (FR-CRM-30): scope to providers assigned to the requested service
    // via service_providers join table + CalendarConnection.userId.
    const calendarBlocks = await this.prisma.calendarEvent.findMany({
      where: {
        tenantId,
        direction: 'INBOUND',
        startTime: { lt: bookingRangeEnd },
        endTime: { gt: bookingRangeStart },
      },
      select: { startTime: true, endTime: true },
    });

    // Combine bookings, reservations, and calendar blocks into a single conflict list
    const conflicts = [
      ...existingBookings.map((b) => ({
        start: b.startTime.getTime(),
        end: b.endTime.getTime(),
      })),
      ...activeReservations.map((r) => ({
        start: r.startTime.getTime(),
        end: r.endTime.getTime(),
      })),
      ...calendarBlocks.map((e) => ({
        start: e.startTime.getTime(),
        end: e.endTime.getTime(),
      })),
    ];

    // 6. Generate slots for each day
    const slots: AvailableSlot[] = [];
    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0] as string;

      // Skip blocked dates
      if (!blockedDateSet.has(dateStr)) {
        const dayOfWeek = current.getDay();
        const dayRules = rulesByDay.get(dayOfWeek);

        if (dayRules && dayRules.length > 0) {
          for (const rule of dayRules) {
            const windowSlots = this.generateSlotsForWindow(
              dateStr,
              rule.startTime,
              rule.endTime,
              durationMinutes,
              bufferBefore,
              bufferAfter,
              conflicts,
            );
            slots.push(...windowSlots);
          }
        }
      }

      // Move to next day
      current.setDate(current.getDate() + 1);
    }

    // 7. Filter slots by advance booking window
    const filteredSlots = slots.filter((slot) => {
      const slotStart = new Date(`${slot.date}T${slot.startTime}:00.000Z`);
      if (earliestAllowed && slotStart < earliestAllowed) return false;
      if (latestAllowed && slotStart > latestAllowed) return false;
      return true;
    });

    return filteredSlots;
  }

  /**
   * Build a map of day-of-week -> rules.
   * Service-specific rules take precedence: if there are service rules for a given day,
   * tenant-wide rules for that day are ignored.
   */
  private buildRulesByDay(
    serviceRules: Array<{ dayOfWeek: number; startTime: Date; endTime: Date }>,
    tenantWideRules: Array<{ dayOfWeek: number; startTime: Date; endTime: Date }>,
  ): Map<number, Array<{ startTime: Date; endTime: Date }>> {
    const rulesByDay = new Map<number, Array<{ startTime: Date; endTime: Date }>>();

    // Determine which days have service-specific rules
    const daysWithServiceRules = new Set(serviceRules.map((r) => r.dayOfWeek));

    // Add service-specific rules
    for (const rule of serviceRules) {
      if (!rulesByDay.has(rule.dayOfWeek)) {
        rulesByDay.set(rule.dayOfWeek, []);
      }
      rulesByDay.get(rule.dayOfWeek)!.push({
        startTime: rule.startTime,
        endTime: rule.endTime,
      });
    }

    // Add tenant-wide rules only for days without service-specific rules
    for (const rule of tenantWideRules) {
      if (!daysWithServiceRules.has(rule.dayOfWeek)) {
        if (!rulesByDay.has(rule.dayOfWeek)) {
          rulesByDay.set(rule.dayOfWeek, []);
        }
        rulesByDay.get(rule.dayOfWeek)!.push({
          startTime: rule.startTime,
          endTime: rule.endTime,
        });
      }
    }

    return rulesByDay;
  }

  /**
   * Generate available slots within a time window for a given date.
   * Slots are created at intervals of (duration + bufferBefore + bufferAfter).
   * The buffer does not extend the slot itself, just the gap between slots.
   */
  private generateSlotsForWindow(
    dateStr: string,
    windowStart: Date,
    windowEnd: Date,
    durationMinutes: number,
    bufferBefore: number,
    bufferAfter: number,
    conflicts: Array<{ start: number; end: number }>,
  ): AvailableSlot[] {
    const slots: AvailableSlot[] = [];

    // Extract hours/minutes from the Time fields (which are Date objects on 1970-01-01)
    const windowStartMinutes = windowStart.getHours() * 60 + windowStart.getMinutes();
    const windowEndMinutes = windowEnd.getHours() * 60 + windowEnd.getMinutes();

    // Step size: bufferBefore + duration + bufferAfter
    const stepMinutes = bufferBefore + durationMinutes + bufferAfter;

    let currentMinutes = windowStartMinutes;

    while (currentMinutes + durationMinutes <= windowEndMinutes) {
      // The actual slot starts after bufferBefore from the current position
      const slotStartMinutes = currentMinutes + bufferBefore;
      const slotEndMinutes = slotStartMinutes + durationMinutes;

      // Ensure the slot (plus buffers) fits within the window
      if (slotEndMinutes + bufferAfter > windowEndMinutes + bufferAfter) {
        // Slot itself must fit within the window
        if (slotEndMinutes > windowEndMinutes) {
          break;
        }
      }

      // Convert to actual datetime for conflict checking
      const slotStartTime = this.dateWithMinutes(dateStr, slotStartMinutes);
      const slotEndTime = this.dateWithMinutes(dateStr, slotEndMinutes);

      const slotStartMs = slotStartTime.getTime();
      const slotEndMs = slotEndTime.getTime();

      // Check for conflicts (overlap: slot.start < conflict.end && slot.end > conflict.start)
      const hasConflict = conflicts.some(
        (c) => slotStartMs < c.end && slotEndMs > c.start,
      );

      if (!hasConflict) {
        slots.push({
          date: dateStr,
          startTime: this.formatMinutesAsTime(slotStartMinutes),
          endTime: this.formatMinutesAsTime(slotEndMinutes),
        });
      }

      currentMinutes += stepMinutes;
    }

    return slots;
  }

  /**
   * Create a UTC Date from a date string and minutes-since-midnight.
   */
  private dateWithMinutes(dateStr: string, minutes: number): Date {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return new Date(`${dateStr}T${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00.000Z`);
  }

  /**
   * Format minutes-since-midnight as "HH:mm".
   */
  private formatMinutesAsTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }
}
