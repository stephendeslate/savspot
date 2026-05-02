import type { AccountDeletionHandler } from '@/jobs/account-deletion.processor';
import { inngest } from '../../inngest.client';

/**
 * Daily Inngest cron: processes GDPR account deletion requests after
 * the 30-day grace period — anonymizes PII, cascade-deletes sessions,
 * marks the request COMPLETED. Mirrors the BullMQ
 * JOB_PROCESS_ACCOUNT_DELETION schedule (CRON_DAILY_5AM_UTC).
 *
 * Phase 4m port — replaces the JOB_PROCESS_ACCOUNT_DELETION branch in
 * `apps/api/src/jobs/gdpr.dispatcher.ts`.
 */
export const createAccountDeletionFunction = (
  handler: AccountDeletionHandler,
) =>
  inngest.createFunction(
    {
      id: 'gdpr-account-deletion',
      name: 'Process GDPR account deletions',
    },
    { cron: '0 5 * * *' },
    async () => {
      await handler.handle();
      return { ok: true };
    },
  );
