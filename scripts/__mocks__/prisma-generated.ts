export class PrismaClient {}

export const FeedbackType = {
  FEATURE_REQUEST: 'FEATURE_REQUEST',
  UX_FRICTION: 'UX_FRICTION',
  COMPARISON_NOTE: 'COMPARISON_NOTE',
  GENERAL: 'GENERAL',
} as const;

export const FeedbackStatus = {
  NEW: 'NEW',
  ACKNOWLEDGED: 'ACKNOWLEDGED',
  PLANNED: 'PLANNED',
  SHIPPED: 'SHIPPED',
  DECLINED: 'DECLINED',
} as const;
