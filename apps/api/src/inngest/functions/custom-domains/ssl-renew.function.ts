import type { CustomDomainsService } from '@/custom-domains/custom-domains.service';
import { inngest } from '../../inngest.client';

/**
 * Daily Inngest cron: iterates ACTIVE custom domains with ACTIVE SSL and
 * triggers a renewal for each. Per-domain failures are logged and don't
 * abort the batch. Mirrors the BullMQ JOB_CUSTOM_DOMAIN_SSL_RENEW
 * schedule (CRON_DAILY_4AM_UTC).
 *
 * Phase 4g port — replaces the JOB_CUSTOM_DOMAIN_SSL_RENEW branch in
 * `apps/api/src/custom-domains/custom-domains.processor.ts`. The
 * iteration logic moved into `CustomDomainsService.renewExpiringSslCertificates()`
 * so this function stays a thin wrapper.
 */
export const createSslRenewFunction = (
  customDomainsService: CustomDomainsService,
) =>
  inngest.createFunction(
    {
      id: 'custom-domains-ssl-renew',
      name: 'Renew custom domain SSL certificates',
    },
    { cron: '0 4 * * *' },
    async () => {
      await customDomainsService.renewExpiringSslCertificates();
      return { ok: true };
    },
  );
