import { z } from 'zod';

export const NoShowRiskTier = z.enum(['LOW', 'MEDIUM', 'HIGH']);
export type NoShowRiskTier = z.infer<typeof NoShowRiskTier>;
