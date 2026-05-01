import { inngest } from '../../inngest.client';

/**
 * Daily Inngest cron: generates the public directory sitemap. Currently a
 * stub on the BullMQ side (logs and returns) — preserved as a stub here so
 * the cron schedule is in place when the real implementation lands. Mirrors
 * the BullMQ `JOB_DIRECTORY_SITEMAP_GENERATE` schedule (CRON_DAILY_6AM_UTC).
 *
 * Phase 4e port — replaces the JOB_DIRECTORY_SITEMAP_GENERATE branch in
 * `apps/api/src/directory/directory.processor.ts`.
 */
export const directorySitemapGenerate = inngest.createFunction(
  {
    id: 'directory-sitemap-generate',
    name: 'Generate directory sitemap',
  },
  { cron: '0 6 * * *' },
  async ({ logger }) => {
    logger.info('[STUB] Sitemap generation not yet implemented');
    return { ok: true, stub: true };
  },
);
