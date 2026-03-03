/**
 * Typed domain events for the event bus (SRS-4 §21).
 * Events are fired by domain services and consumed by WorkflowEngine,
 * CalendarModule, SmsModule, and NotificationsModule.
 */

// ---- Event Names ----
export const BOOKING_CREATED = 'booking.created';
export const BOOKING_CONFIRMED = 'booking.confirmed';
export const BOOKING_CANCELLED = 'booking.cancelled';
export const BOOKING_RESCHEDULED = 'booking.rescheduled';
export const BOOKING_COMPLETED = 'booking.completed';
export const BOOKING_NO_SHOW = 'booking.noShow';
export const BOOKING_WALK_IN = 'booking.walkIn';
export const PAYMENT_RECEIVED = 'payment.received';
export const PAYMENT_FAILED = 'payment.failed';
export const REMINDER_DUE = 'reminder.due';

// ---- Event Payloads ----

export interface BookingEventPayload {
  tenantId: string;
  bookingId: string;
  serviceId: string;
  clientId: string;
  clientEmail: string;
  clientName: string;
  serviceName: string;
  providerId?: string;
  startTime: Date;
  endTime: Date;
  source: string;
}

export interface BookingCancelledPayload extends BookingEventPayload {
  cancellationReason: string;
  refundAmount?: number;
}

export interface BookingRescheduledPayload extends BookingEventPayload {
  previousStartTime: Date;
  previousEndTime: Date;
  newStartTime: Date;
  newEndTime: Date;
}

export interface PaymentEventPayload {
  tenantId: string;
  bookingId: string;
  paymentId: string;
  amount: number;
  currency: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  serviceName: string;
}

export interface ReminderDuePayload {
  tenantId: string;
  bookingId: string;
  clientId: string;
  clientEmail: string;
  clientName: string;
  serviceName: string;
  startTime: Date;
  reminderType: 'BOOKING' | 'PAYMENT';
  intervalDays: number;
}
