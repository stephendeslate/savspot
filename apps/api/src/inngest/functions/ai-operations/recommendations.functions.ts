import type { ChurnRiskService } from '@/recommendations/churn-risk.service';
import type { RecommendationsService } from '@/recommendations/recommendations.service';
import { inngest } from '../../inngest.client';

/**
 * Phase 4o port — replaces RecommendationsProcessor (BullMQ
 * QUEUE_AI_OPERATIONS) with four Inngest cron functions:
 *  - service-affinity (daily 4am): computeServiceAffinity()
 *  - client-preference (daily 4am): computeClientPreferences()
 *  - churn-risk (daily 5am): computeChurnRisk()
 *  - cleanup (Sunday 2am): cleanupExpired()
 *
 * The BullMQ-side schedule passed empty data ({}), so tenantId in the
 * service signatures is always undefined when invoked from the cron.
 */

export const createRecommendationServiceAffinityFunction = (
  service: RecommendationsService,
) =>
  inngest.createFunction(
    {
      id: 'ai-operations-recommendation-service-affinity',
      name: 'Compute service affinity recommendations',
    },
    { cron: '0 4 * * *' },
    async () => {
      await service.computeServiceAffinity(undefined);
      return { ok: true };
    },
  );

export const createRecommendationClientPreferenceFunction = (
  service: RecommendationsService,
) =>
  inngest.createFunction(
    {
      id: 'ai-operations-recommendation-client-preference',
      name: 'Compute client preference recommendations',
    },
    { cron: '0 4 * * *' },
    async () => {
      await service.computeClientPreferences(undefined);
      return { ok: true };
    },
  );

export const createChurnRiskComputeFunction = (service: ChurnRiskService) =>
  inngest.createFunction(
    {
      id: 'ai-operations-churn-risk-compute',
      name: 'Compute churn risk',
    },
    { cron: '0 5 * * *' },
    async () => {
      await service.computeChurnRisk();
      return { ok: true };
    },
  );

export const createRecommendationCleanupFunction = (
  service: RecommendationsService,
) =>
  inngest.createFunction(
    {
      id: 'ai-operations-recommendation-cleanup',
      name: 'Clean up expired recommendations',
    },
    { cron: '0 2 * * 0' },
    async () => {
      await service.cleanupExpired();
      return { ok: true };
    },
  );
