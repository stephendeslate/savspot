import { z } from 'zod';

export const WorkflowTriggerEvent = z.enum([
  'BOOKING_CREATED',
  'BOOKING_CONFIRMED',
  'BOOKING_CANCELLED',
  'BOOKING_RESCHEDULED',
  'BOOKING_COMPLETED',
  'PAYMENT_RECEIVED',
  'REMINDER_DUE',
]);
export type WorkflowTriggerEvent = z.infer<typeof WorkflowTriggerEvent>;

export const WorkflowActionType = z.enum([
  'SEND_EMAIL',
  'SEND_SMS',
  'SEND_PUSH',
  'SEND_NOTIFICATION',
]);
export type WorkflowActionType = z.infer<typeof WorkflowActionType>;

export const ReminderType = z.enum(['BOOKING', 'PAYMENT', 'QUESTIONNAIRE_REMINDER']);
export type ReminderType = z.infer<typeof ReminderType>;

export const ReminderStatus = z.enum(['PENDING', 'SENT', 'SKIPPED', 'FAILED']);
export type ReminderStatus = z.infer<typeof ReminderStatus>;
