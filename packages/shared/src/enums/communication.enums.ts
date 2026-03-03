import { z } from 'zod';

export const CommunicationChannel = z.enum(['EMAIL', 'SMS', 'IN_APP']);
export type CommunicationChannel = z.infer<typeof CommunicationChannel>;

export const CommunicationStatus = z.enum([
  'QUEUED',
  'SENDING',
  'SENT',
  'DELIVERED',
  'OPENED',
  'BOUNCED',
  'FAILED',
]);
export type CommunicationStatus = z.infer<typeof CommunicationStatus>;

export const NotificationCategory = z.enum([
  'SYSTEM',
  'BOOKING',
  'PAYMENT',
  'CONTRACT',
  'COMMUNICATION',
  'MARKETING',
  'REVIEW',
  'CALENDAR',
]);
export type NotificationCategory = z.infer<typeof NotificationCategory>;

export const NotificationPriority = z.enum(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']);
export type NotificationPriority = z.infer<typeof NotificationPriority>;

export const DigestFrequency = z.enum(['IMMEDIATE', 'HOURLY', 'DAILY', 'WEEKLY']);
export type DigestFrequency = z.infer<typeof DigestFrequency>;

export const DeviceType = z.enum(['IOS', 'ANDROID']);
export type DeviceType = z.infer<typeof DeviceType>;
