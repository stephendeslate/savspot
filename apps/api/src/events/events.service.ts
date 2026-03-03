import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
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
} from './event.types';

/**
 * Typed event publisher wrapping EventEmitter2.
 * All domain events flow through this service for consistency and logging.
 */
@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  emitBookingCreated(payload: BookingEventPayload): void {
    this.logger.log(`Event: ${BOOKING_CREATED} — booking=${payload.bookingId}`);
    this.eventEmitter.emit(BOOKING_CREATED, payload);
  }

  emitBookingConfirmed(payload: BookingEventPayload): void {
    this.logger.log(`Event: ${BOOKING_CONFIRMED} — booking=${payload.bookingId}`);
    this.eventEmitter.emit(BOOKING_CONFIRMED, payload);
  }

  emitBookingCancelled(payload: BookingCancelledPayload): void {
    this.logger.log(`Event: ${BOOKING_CANCELLED} — booking=${payload.bookingId}`);
    this.eventEmitter.emit(BOOKING_CANCELLED, payload);
  }

  emitBookingRescheduled(payload: BookingRescheduledPayload): void {
    this.logger.log(`Event: ${BOOKING_RESCHEDULED} — booking=${payload.bookingId}`);
    this.eventEmitter.emit(BOOKING_RESCHEDULED, payload);
  }

  emitBookingCompleted(payload: BookingEventPayload): void {
    this.logger.log(`Event: ${BOOKING_COMPLETED} — booking=${payload.bookingId}`);
    this.eventEmitter.emit(BOOKING_COMPLETED, payload);
  }

  emitBookingNoShow(payload: BookingEventPayload): void {
    this.logger.log(`Event: ${BOOKING_NO_SHOW} — booking=${payload.bookingId}`);
    this.eventEmitter.emit(BOOKING_NO_SHOW, payload);
  }

  emitBookingWalkIn(payload: BookingEventPayload): void {
    this.logger.log(`Event: ${BOOKING_WALK_IN} — booking=${payload.bookingId}`);
    this.eventEmitter.emit(BOOKING_WALK_IN, payload);
  }

  emitPaymentReceived(payload: PaymentEventPayload): void {
    this.logger.log(`Event: ${PAYMENT_RECEIVED} — payment=${payload.paymentId}`);
    this.eventEmitter.emit(PAYMENT_RECEIVED, payload);
  }

  emitPaymentFailed(payload: PaymentEventPayload): void {
    this.logger.log(`Event: ${PAYMENT_FAILED} — payment=${payload.paymentId}`);
    this.eventEmitter.emit(PAYMENT_FAILED, payload);
  }
}
