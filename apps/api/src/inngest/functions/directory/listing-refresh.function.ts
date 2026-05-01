import type { DirectoryListingService } from '@/directory/directory-listing.service';
import { inngest } from '../../inngest.client';

/**
 * Daily Inngest cron: rebuilds the public directory listing snapshot for
 * every published, ACTIVE tenant. Read-then-upsert pattern in
 * `DirectoryListingService.refreshAllListings()` is fully idempotent — safe
 * to dual-fire during the BullMQ → Inngest soak window. Mirrors the BullMQ
 * `JOB_DIRECTORY_LISTING_REFRESH` schedule (CRON_DAILY_5AM_UTC).
 *
 * Phase 4e port — replaces the JOB_DIRECTORY_LISTING_REFRESH branch in
 * `apps/api/src/directory/directory.processor.ts`. The BullMQ-side schedule
 * + processor are retired in a follow-up commit after one Inngest run is
 * verified.
 */
export const createDirectoryListingRefreshFunction = (
  directoryListingService: DirectoryListingService,
) =>
  inngest.createFunction(
    {
      id: 'directory-listing-refresh',
      name: 'Refresh directory listings',
    },
    { cron: '0 5 * * *' },
    async () => {
      await directoryListingService.refreshAllListings();
      return { ok: true };
    },
  );
