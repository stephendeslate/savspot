import { z } from 'zod';

export const AutomationExecutionStatus = z.enum([
  'PENDING',
  'IN_PROGRESS',
  'AWAITING_APPROVAL',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED',
]);
export type AutomationExecutionStatus = z.infer<typeof AutomationExecutionStatus>;

export const WebhookDeliveryStatus = z.enum([
  'PENDING',
  'SUCCEEDED',
  'FAILED',
  'RETRYING',
]);
export type WebhookDeliveryStatus = z.infer<typeof WebhookDeliveryStatus>;
