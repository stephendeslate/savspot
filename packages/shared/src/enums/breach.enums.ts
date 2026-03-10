import { z } from 'zod';

export const BreachType = z.enum([
  'UNAUTHORIZED_ACCESS',
  'DATA_LEAK',
  'CREDENTIAL_COMPROMISE',
  'BRUTE_FORCE',
  'OTHER',
]);
export type BreachType = z.infer<typeof BreachType>;

export const BreachSeverity = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export type BreachSeverity = z.infer<typeof BreachSeverity>;

export const BreachStatus = z.enum([
  'DETECTED',
  'INVESTIGATING',
  'CONFIRMED',
  'CONTAINED',
  'NOTIFYING',
  'RESOLVED',
]);
export type BreachStatus = z.infer<typeof BreachStatus>;

export const BreachNotificationRecipientType = z.enum([
  'DPA',
  'TENANT_ADMIN',
  'AFFECTED_USER',
]);
export type BreachNotificationRecipientType = z.infer<typeof BreachNotificationRecipientType>;

export const BreachNotificationChannel = z.enum(['EMAIL', 'IN_APP', 'POSTAL']);
export type BreachNotificationChannel = z.infer<typeof BreachNotificationChannel>;
