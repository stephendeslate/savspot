import { z } from 'zod';

export const BookingStatus = z.enum([
  'PENDING',
  'CONFIRMED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
]);
export type BookingStatus = z.infer<typeof BookingStatus>;

export const BookingSource = z.enum([
  'DIRECT',
  'DIRECTORY',
  'API',
  'WIDGET',
  'REFERRAL',
  'WALK_IN',
  'IMPORT',
]);
export type BookingSource = z.infer<typeof BookingSource>;

export const BookingSessionStatus = z.enum([
  'IN_PROGRESS',
  'COMPLETED',
  'ABANDONED',
  'EXPIRED',
]);
export type BookingSessionStatus = z.infer<typeof BookingSessionStatus>;

export const CheckInStatus = z.enum(['PENDING', 'CHECKED_IN', 'CHECKED_OUT', 'NO_SHOW']);
export type CheckInStatus = z.infer<typeof CheckInStatus>;

export const CancellationReason = z.enum([
  'CLIENT_REQUEST',
  'PAYMENT_TIMEOUT',
  'APPROVAL_TIMEOUT',
  'DATE_TAKEN',
  'ADMIN',
]);
export type CancellationReason = z.infer<typeof CancellationReason>;

export const DateReservationStatus = z.enum(['HELD', 'CONFIRMED', 'RELEASED', 'EXPIRED']);
export type DateReservationStatus = z.infer<typeof DateReservationStatus>;

export const StateTransitionTrigger = z.enum(['SYSTEM', 'ADMIN', 'CLIENT', 'WEBHOOK']);
export type StateTransitionTrigger = z.infer<typeof StateTransitionTrigger>;

export const BookingWorkflowOverrideType = z.enum([
  'SKIP',
  'DISABLE_AUTOMATION',
  'CUSTOM_TIMING',
  'ADD_STAGE',
]);
export type BookingWorkflowOverrideType = z.infer<typeof BookingWorkflowOverrideType>;
