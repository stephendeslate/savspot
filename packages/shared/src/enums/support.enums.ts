import { z } from 'zod';

export const TicketCategory = z.enum([
  'BUG',
  'FEATURE_REQUEST',
  'QUESTION',
  'ACCOUNT_ISSUE',
  'PAYMENT_ISSUE',
  'OTHER',
]);
export type TicketCategory = z.infer<typeof TicketCategory>;

export const TicketSeverity = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export type TicketSeverity = z.infer<typeof TicketSeverity>;

export const TicketStatus = z.enum([
  'NEW',
  'AI_INVESTIGATING',
  'AI_RESOLVED',
  'NEEDS_MANUAL_REVIEW',
  'RESOLVED',
  'CLOSED',
]);
export type TicketStatus = z.infer<typeof TicketStatus>;

export const AIResolutionType = z.enum([
  'FAQ_MATCH',
  'CONFIGURATION_GUIDANCE',
  'KNOWN_WORKAROUND',
  'CODE_FIX_PREPARED',
]);
export type AIResolutionType = z.infer<typeof AIResolutionType>;

export const ResolvedBy = z.enum(['AI', 'DEVELOPER']);
export type ResolvedBy = z.infer<typeof ResolvedBy>;

export const FeedbackType = z.enum([
  'FEATURE_REQUEST',
  'UX_FRICTION',
  'COMPARISON_NOTE',
  'GENERAL',
]);
export type FeedbackType = z.infer<typeof FeedbackType>;

export const FeedbackStatus = z.enum(['NEW', 'ACKNOWLEDGED', 'PLANNED', 'SHIPPED', 'DECLINED']);
export type FeedbackStatus = z.infer<typeof FeedbackStatus>;
