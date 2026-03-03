import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventsService } from '@/events/events.service';
import {
  BOOKING_CREATED,
  BOOKING_CONFIRMED,
  BOOKING_CANCELLED,
  BOOKING_RESCHEDULED,
  BOOKING_COMPLETED,
  BOOKING_NO_SHOW,
  BOOKING_WALK_IN,
  PAYMENT_RECEIVED,
  PAYMENT_FAILED,
  BookingEventPayload,
  BookingCancelledPayload,
  BookingRescheduledPayload,
  PaymentEventPayload,
} from '@/events/event.types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEventEmitter() {
  return { emit: vi.fn() };
}

function makeBookingPayload(overrides: Partial<BookingEventPayload> = {}): BookingEventPayload {
  return {
    tenantId: 'tenant-001',
    bookingId: 'booking-001',
    serviceId: 'service-001',
    clientId: 'client-001',
    clientEmail: 'client@test.com',
    clientName: 'Jane Doe',
    serviceName: 'Haircut',
    startTime: new Date('2026-03-15T10:00:00Z'),
    endTime: new Date('2026-03-15T11:00:00Z'),
    source: 'ONLINE',
    ...overrides,
  };
}

function makeCancelledPayload(
  overrides: Partial<BookingCancelledPayload> = {},
): BookingCancelledPayload {
  return {
    ...makeBookingPayload(),
    cancellationReason: 'CLIENT_REQUEST',
    ...overrides,
  };
}

function makeRescheduledPayload(
  overrides: Partial<BookingRescheduledPayload> = {},
): BookingRescheduledPayload {
  return {
    ...makeBookingPayload(),
    previousStartTime: new Date('2026-03-15T10:00:00Z'),
    previousEndTime: new Date('2026-03-15T11:00:00Z'),
    newStartTime: new Date('2026-03-20T14:00:00Z'),
    newEndTime: new Date('2026-03-20T15:00:00Z'),
    ...overrides,
  };
}

function makePaymentPayload(
  overrides: Partial<PaymentEventPayload> = {},
): PaymentEventPayload {
  return {
    tenantId: 'tenant-001',
    bookingId: 'booking-001',
    paymentId: 'payment-001',
    amount: 5000,
    currency: 'USD',
    clientId: 'client-001',
    clientName: 'Jane Doe',
    clientEmail: 'client@test.com',
    serviceName: 'Haircut',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('EventsService', () => {
  let service: EventsService;
  let emitter: ReturnType<typeof makeEventEmitter>;

  beforeEach(() => {
    emitter = makeEventEmitter();
    service = new EventsService(emitter as never);
  });

  // -----------------------------------------------------------------------
  // Booking events — standard BookingEventPayload
  // -----------------------------------------------------------------------

  describe('emitBookingCreated', () => {
    it('should emit booking.created with the correct event name', () => {
      const payload = makeBookingPayload();
      service.emitBookingCreated(payload);
      expect(emitter.emit).toHaveBeenCalledWith(BOOKING_CREATED, payload);
    });

    it('should pass the full payload through unchanged', () => {
      const payload = makeBookingPayload({ providerId: 'provider-99' });
      service.emitBookingCreated(payload);
      expect(emitter.emit.mock.calls[0]![1]).toBe(payload);
    });
  });

  describe('emitBookingConfirmed', () => {
    it('should emit booking.confirmed with the correct event name', () => {
      const payload = makeBookingPayload();
      service.emitBookingConfirmed(payload);
      expect(emitter.emit).toHaveBeenCalledWith(BOOKING_CONFIRMED, payload);
    });

    it('should pass the payload through unchanged', () => {
      const payload = makeBookingPayload();
      service.emitBookingConfirmed(payload);
      expect(emitter.emit.mock.calls[0]![1]).toBe(payload);
    });
  });

  describe('emitBookingCompleted', () => {
    it('should emit booking.completed with the correct event name', () => {
      const payload = makeBookingPayload();
      service.emitBookingCompleted(payload);
      expect(emitter.emit).toHaveBeenCalledWith(BOOKING_COMPLETED, payload);
    });
  });

  describe('emitBookingNoShow', () => {
    it('should emit booking.noShow with the correct event name', () => {
      const payload = makeBookingPayload();
      service.emitBookingNoShow(payload);
      expect(emitter.emit).toHaveBeenCalledWith(BOOKING_NO_SHOW, payload);
    });
  });

  describe('emitBookingWalkIn', () => {
    it('should emit booking.walkIn with the correct event name', () => {
      const payload = makeBookingPayload({ source: 'WALK_IN' });
      service.emitBookingWalkIn(payload);
      expect(emitter.emit).toHaveBeenCalledWith(BOOKING_WALK_IN, payload);
    });
  });

  // -----------------------------------------------------------------------
  // emitBookingCancelled — BookingCancelledPayload
  // -----------------------------------------------------------------------

  describe('emitBookingCancelled', () => {
    it('should emit booking.cancelled with the correct event name', () => {
      const payload = makeCancelledPayload();
      service.emitBookingCancelled(payload);
      expect(emitter.emit).toHaveBeenCalledWith(BOOKING_CANCELLED, payload);
    });

    it('should carry cancellationReason in the payload', () => {
      const payload = makeCancelledPayload({ cancellationReason: 'DUPLICATE' });
      service.emitBookingCancelled(payload);

      const emittedPayload = emitter.emit.mock.calls[0]![1] as BookingCancelledPayload;
      expect(emittedPayload.cancellationReason).toBe('DUPLICATE');
    });

    it('should carry optional refundAmount in the payload', () => {
      const payload = makeCancelledPayload({ refundAmount: 2500 });
      service.emitBookingCancelled(payload);

      const emittedPayload = emitter.emit.mock.calls[0]![1] as BookingCancelledPayload;
      expect(emittedPayload.refundAmount).toBe(2500);
    });
  });

  // -----------------------------------------------------------------------
  // emitBookingRescheduled — BookingRescheduledPayload
  // -----------------------------------------------------------------------

  describe('emitBookingRescheduled', () => {
    it('should emit booking.rescheduled with the correct event name', () => {
      const payload = makeRescheduledPayload();
      service.emitBookingRescheduled(payload);
      expect(emitter.emit).toHaveBeenCalledWith(BOOKING_RESCHEDULED, payload);
    });

    it('should carry previousStartTime and newStartTime in the payload', () => {
      const prev = new Date('2026-03-10T09:00:00Z');
      const next = new Date('2026-03-22T16:00:00Z');
      const payload = makeRescheduledPayload({
        previousStartTime: prev,
        newStartTime: next,
      });
      service.emitBookingRescheduled(payload);

      const emittedPayload = emitter.emit.mock.calls[0]![1] as BookingRescheduledPayload;
      expect(emittedPayload.previousStartTime).toBe(prev);
      expect(emittedPayload.newStartTime).toBe(next);
    });

    it('should carry previousEndTime and newEndTime in the payload', () => {
      const prevEnd = new Date('2026-03-10T10:00:00Z');
      const newEnd = new Date('2026-03-22T17:00:00Z');
      const payload = makeRescheduledPayload({
        previousEndTime: prevEnd,
        newEndTime: newEnd,
      });
      service.emitBookingRescheduled(payload);

      const emittedPayload = emitter.emit.mock.calls[0]![1] as BookingRescheduledPayload;
      expect(emittedPayload.previousEndTime).toBe(prevEnd);
      expect(emittedPayload.newEndTime).toBe(newEnd);
    });
  });

  // -----------------------------------------------------------------------
  // Payment events — PaymentEventPayload
  // -----------------------------------------------------------------------

  describe('emitPaymentReceived', () => {
    it('should emit payment.received with the correct event name', () => {
      const payload = makePaymentPayload();
      service.emitPaymentReceived(payload);
      expect(emitter.emit).toHaveBeenCalledWith(PAYMENT_RECEIVED, payload);
    });

    it('should carry paymentId, amount, and currency in the payload', () => {
      const payload = makePaymentPayload({
        paymentId: 'pay-42',
        amount: 9999,
        currency: 'EUR',
      });
      service.emitPaymentReceived(payload);

      const emittedPayload = emitter.emit.mock.calls[0]![1] as PaymentEventPayload;
      expect(emittedPayload.paymentId).toBe('pay-42');
      expect(emittedPayload.amount).toBe(9999);
      expect(emittedPayload.currency).toBe('EUR');
    });
  });

  describe('emitPaymentFailed', () => {
    it('should emit payment.failed with the correct event name', () => {
      const payload = makePaymentPayload();
      service.emitPaymentFailed(payload);
      expect(emitter.emit).toHaveBeenCalledWith(PAYMENT_FAILED, payload);
    });

    it('should carry paymentId, amount, and currency in the payload', () => {
      const payload = makePaymentPayload({
        paymentId: 'pay-fail-1',
        amount: 3000,
        currency: 'GBP',
      });
      service.emitPaymentFailed(payload);

      const emittedPayload = emitter.emit.mock.calls[0]![1] as PaymentEventPayload;
      expect(emittedPayload.paymentId).toBe('pay-fail-1');
      expect(emittedPayload.amount).toBe(3000);
      expect(emittedPayload.currency).toBe('GBP');
    });
  });

  // -----------------------------------------------------------------------
  // Cross-cutting: every emit method calls eventEmitter.emit exactly once
  // -----------------------------------------------------------------------

  describe('all emit methods call eventEmitter.emit exactly once', () => {
    it.each([
      ['emitBookingCreated', () => makeBookingPayload()],
      ['emitBookingConfirmed', () => makeBookingPayload()],
      ['emitBookingCancelled', () => makeCancelledPayload()],
      ['emitBookingRescheduled', () => makeRescheduledPayload()],
      ['emitBookingCompleted', () => makeBookingPayload()],
      ['emitBookingNoShow', () => makeBookingPayload()],
      ['emitBookingWalkIn', () => makeBookingPayload()],
      ['emitPaymentReceived', () => makePaymentPayload()],
      ['emitPaymentFailed', () => makePaymentPayload()],
    ] as const)('%s calls emit exactly once', (method, payloadFn) => {
      const payload = payloadFn();
      (service as never as Record<string, (p: unknown) => void>)[method]!(payload);
      expect(emitter.emit).toHaveBeenCalledTimes(1);
    });
  });
});
