import { z } from 'zod';

export const WorkflowTriggerEvent = z.enum([
  'BOOKING_CREATED',
  'BOOKING_CONFIRMED',
  'BOOKING_CANCELLED',
  'BOOKING_RESCHEDULED',
  'BOOKING_COMPLETED',
  'PAYMENT_RECEIVED',
  'REMINDER_DUE',
  'PAYMENT_OVERDUE',
  'CONTRACT_SIGNED',
  'CONTRACT_EXPIRED',
  'QUOTE_ACCEPTED',
  'QUOTE_REJECTED',
  'QUOTE_EXPIRED',
  'REVIEW_SUBMITTED',
  'CLIENT_REGISTERED',
  'BOOKING_NO_SHOW',
  'BOOKING_WALK_IN',
  'INVOICE_OVERDUE',
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

export const WorkflowStageAutomationType = z.enum([
  'EMAIL',
  'TASK',
  'QUOTE',
  'CONTRACT',
  'QUESTIONNAIRE',
  'REMINDER',
  'NOTIFICATION',
]);
export type WorkflowStageAutomationType = z.infer<typeof WorkflowStageAutomationType>;

export const WorkflowStageTriggerTime = z.enum([
  'ON_CREATION',
  'AFTER_X_DAYS',
  'X_DAYS_BEFORE_BOOKING',
]);
export type WorkflowStageTriggerTime = z.infer<typeof WorkflowStageTriggerTime>;

export const WorkflowStageProgressionCondition = z.enum([
  'QUOTE_ACCEPTED',
  'PAYMENT_RECEIVED',
  'CONTRACT_SIGNED',
  'TASKS_COMPLETED',
]);
export type WorkflowStageProgressionCondition = z.infer<typeof WorkflowStageProgressionCondition>;
