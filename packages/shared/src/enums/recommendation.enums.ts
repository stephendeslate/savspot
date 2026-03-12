import { z } from 'zod';

export const RecommendationType = z.enum([
  'SERVICE_AFFINITY',
  'CLIENT_PREFERENCE',
  'CHURN_RISK',
]);
export type RecommendationType = z.infer<typeof RecommendationType>;

export const RiskLevel = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export type RiskLevel = z.infer<typeof RiskLevel>;
