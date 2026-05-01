import type { CustomDomainsService } from '@/custom-domains/custom-domains.service';
import { inngest } from '../../inngest.client';

/**
 * 15-minute Inngest cron: walks domains in PENDING_VERIFICATION,
 * re-checks DNS records, and promotes verified ones to DNS_VERIFIED →
 * SSL_PROVISIONING. Domains older than 72 hours flip to
 * VERIFICATION_FAILED. Mirrors the BullMQ JOB_CUSTOM_DOMAIN_DNS_VERIFY
 * schedule (CRON_EVERY_15_MIN).
 *
 * Phase 4g port — replaces the JOB_CUSTOM_DOMAIN_DNS_VERIFY branch in
 * `apps/api/src/custom-domains/custom-domains.processor.ts`.
 */
export const createDnsVerifyFunction = (
  customDomainsService: CustomDomainsService,
) =>
  inngest.createFunction(
    {
      id: 'custom-domains-dns-verify',
      name: 'Verify pending custom domains',
    },
    { cron: '*/15 * * * *' },
    async () => {
      await customDomainsService.verifyPendingDomains();
      return { ok: true };
    },
  );
