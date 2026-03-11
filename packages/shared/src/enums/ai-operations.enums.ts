import { z } from 'zod';

export const InsightType = z.enum([
  'HIGH_DEMAND_SLOT',
  'LOW_FILL_SLOT',
  'CANCELLATION_PATTERN',
]);
export type InsightType = z.infer<typeof InsightType>;

export const NoShowRiskTier = z.enum(['LOW', 'MEDIUM', 'HIGH']);
export type NoShowRiskTier = z.infer<typeof NoShowRiskTier>;
