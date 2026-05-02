import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CalendarEventListener } from '../src/calendar/calendar-event.listener';
import {
  BOOKING_CONFIRMED,
  BOOKING_RESCHEDULED,
  BOOKING_CANCELLED,
  BookingEventPayload,
  BookingRescheduledPayload,
  BookingCancelledPayload,
} from '../src/events/event.types';
import {
  QUEUE_CALENDAR,
  JOB_CALENDAR_EVENT_PUSH,
} from '../src/bullmq/queue.constants';

function makePrisma() {
  return {
    calendarConnection: {
      findMany: vi.fn(),
    },
  };
}

function makeDispatcher() {
  return {
    dispatch: vi.fn().mockResolvedValue(undefined),
  };
}

function basePayload(overrides: Partial<BookingEventPayload> = {}): BookingEventPayload {
  return {
    tenantId: 'tenant-1',
    bookingId: 'booking-1',
    serviceId: 'service-1',
    clientId: 'client-1',
    clientEmail: 'client@test.com',
    clientName: 'Jane Doe',
    serviceName: 'Haircut',
    startTime: new Date('2026-04-01T10:00:00Z'),
    endTime: new Date('2026-04-01T11:00:00Z'),
    source: 'DIRECT',
    ...overrides,
  };
}

describe('CalendarEventListener', () => {
  let listener: CalendarEventListener;
  let prisma: ReturnType<typeof makePrisma>;
  let dispatcher: ReturnType<typeof makeDispatcher>;

  beforeEach(() => {
    prisma = makePrisma();
    dispatcher = makeDispatcher();
    listener = new CalendarEventListener(dispatcher as never, prisma as never);
  });

  describe('onBookingConfirmed', () => {
    it('enqueues push job for each active connection', async () => {
      prisma.calendarConnection.findMany.mockResolvedValue([
        { id: 'conn-1' },
        { id: 'conn-2' },
      ]);

      await listener.onBookingConfirmed(basePayload());

      expect(dispatcher.dispatch).toHaveBeenCalledTimes(2);
      expect(dispatcher.dispatch).toHaveBeenCalledWith(
        QUEUE_CALENDAR,
        JOB_CALENDAR_EVENT_PUSH,
        expect.objectContaining({
          eventType: BOOKING_CONFIRMED,
          connectionId: 'conn-1',
          bookingId: 'booking-1',
          serviceName: 'Haircut',
          clientName: 'Jane Doe',
        }),
      );
      expect(dispatcher.dispatch).toHaveBeenCalledWith(
        QUEUE_CALENDAR,
        JOB_CALENDAR_EVENT_PUSH,
        expect.objectContaining({
          connectionId: 'conn-2',
        }),
      );
    });

    it('enqueues no jobs when tenant has no active connections', async () => {
      prisma.calendarConnection.findMany.mockResolvedValue([]);

      await listener.onBookingConfirmed(basePayload());

      expect(dispatcher.dispatch).not.toHaveBeenCalled();
    });

    it('serializes Date objects to ISO strings', async () => {
      prisma.calendarConnection.findMany.mockResolvedValue([{ id: 'conn-1' }]);

      await listener.onBookingConfirmed(basePayload());

      const jobData = dispatcher.dispatch.mock.calls[0]![2] as Record<
        string,
        unknown
      >;
      expect(jobData['startTime']).toBe('2026-04-01T10:00:00.000Z');
      expect(jobData['endTime']).toBe('2026-04-01T11:00:00.000Z');
      expect(typeof jobData['startTime']).toBe('string');
    });

    it('only queries ACTIVE connections', async () => {
      prisma.calendarConnection.findMany.mockResolvedValue([]);

      await listener.onBookingConfirmed(basePayload());

      expect(prisma.calendarConnection.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1', status: 'ACTIVE' },
        select: { id: true },
      });
    });
  });

  describe('onBookingRescheduled', () => {
    it('includes previous and new times in job data', async () => {
      prisma.calendarConnection.findMany.mockResolvedValue([{ id: 'conn-1' }]);

      const payload: BookingRescheduledPayload = {
        ...basePayload(),
        previousStartTime: new Date('2026-04-01T10:00:00Z'),
        previousEndTime: new Date('2026-04-01T11:00:00Z'),
        newStartTime: new Date('2026-04-02T14:00:00Z'),
        newEndTime: new Date('2026-04-02T15:00:00Z'),
      };

      await listener.onBookingRescheduled(payload);

      expect(dispatcher.dispatch).toHaveBeenCalledWith(
        QUEUE_CALENDAR,
        JOB_CALENDAR_EVENT_PUSH,
        expect.objectContaining({
          eventType: BOOKING_RESCHEDULED,
          previousStartTime: '2026-04-01T10:00:00.000Z',
          previousEndTime: '2026-04-01T11:00:00.000Z',
          newStartTime: '2026-04-02T14:00:00.000Z',
          newEndTime: '2026-04-02T15:00:00.000Z',
        }),
      );
    });
  });

  describe('onBookingCancelled', () => {
    it('enqueues push job with BOOKING_CANCELLED event type', async () => {
      prisma.calendarConnection.findMany.mockResolvedValue([{ id: 'conn-1' }]);

      const payload: BookingCancelledPayload = {
        ...basePayload(),
        cancellationReason: 'Client requested',
      };

      await listener.onBookingCancelled(payload);

      expect(dispatcher.dispatch).toHaveBeenCalledWith(
        QUEUE_CALENDAR,
        JOB_CALENDAR_EVENT_PUSH,
        expect.objectContaining({
          eventType: BOOKING_CANCELLED,
          bookingId: 'booking-1',
          tenantId: 'tenant-1',
        }),
      );
    });
  });
});
