import { z } from 'zod';

export const AuditAction = z.enum([
  'CREATE',
  'UPDATE',
  'DELETE',
  'READ',
  'LOGIN',
  'LOGOUT',
  'EXPORT',
  'IMPORT',
  'SIGN',
  'VOID',
  'SEND',
  'ACCEPT',
  'REJECT',
  'PASSWORD_CHANGE',
  'MFA_ENABLE',
  'MFA_DISABLE',
]);
export type AuditAction = z.infer<typeof AuditAction>;

export const ActorType = z.enum(['USER', 'SYSTEM', 'API_KEY', 'WEBHOOK']);
export type ActorType = z.infer<typeof ActorType>;

export const DataRequestType = z.enum(['EXPORT', 'DELETION', 'TENANT_EXPORT']);
export type DataRequestType = z.infer<typeof DataRequestType>;

export const DataRequestStatus = z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']);
export type DataRequestStatus = z.infer<typeof DataRequestStatus>;

export const ConsentPurpose = z.enum([
  'DATA_PROCESSING',
  'MARKETING',
  'ANALYTICS',
  'THIRD_PARTY_SHARING',
  'FOLLOW_UP_EMAILS',
]);
export type ConsentPurpose = z.infer<typeof ConsentPurpose>;

export const CalendarProvider = z.enum(['GOOGLE', 'MICROSOFT']);
export type CalendarProvider = z.infer<typeof CalendarProvider>;

export const SyncDirection = z.enum(['ONE_WAY', 'TWO_WAY']);
export type SyncDirection = z.infer<typeof SyncDirection>;

export const CalendarConnectionStatus = z.enum(['ACTIVE', 'DISCONNECTED', 'ERROR']);
export type CalendarConnectionStatus = z.infer<typeof CalendarConnectionStatus>;

export const CalendarEventDirection = z.enum(['OUTBOUND', 'INBOUND']);
export type CalendarEventDirection = z.infer<typeof CalendarEventDirection>;

export const MessageThreadStatus = z.enum(['OPEN', 'CLOSED', 'ARCHIVED']);
export type MessageThreadStatus = z.infer<typeof MessageThreadStatus>;

export const MessageThreadPriority = z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']);
export type MessageThreadPriority = z.infer<typeof MessageThreadPriority>;
