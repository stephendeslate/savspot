import type { CustomDomainsService } from '@/custom-domains/custom-domains.service';
import { inngest } from '../../inngest.client';

/**
 * 6-hour Inngest cron: stamps `lastCheckedAt` on every ACTIVE custom
 * domain. Mirrors the BullMQ JOB_CUSTOM_DOMAIN_HEALTH_CHECK schedule
 * (CRON_EVERY_6_HOURS).
 *
 * Phase 4g port — replaces the JOB_CUSTOM_DOMAIN_HEALTH_CHECK branch
 * in `apps/api/src/custom-domains/custom-domains.processor.ts`. The
 * iteration logic moved into `CustomDomainsService.runHealthChecks()`.
 */
export const createCustomDomainsHealthCheckFunction = (
  customDomainsService: CustomDomainsService,
) =>
  inngest.createFunction(
    {
      id: 'custom-domains-health-check',
      name: 'Custom domains health check',
    },
    { cron: '0 */6 * * *' },
    async () => {
      await customDomainsService.runHealthChecks();
      return { ok: true };
    },
  );
