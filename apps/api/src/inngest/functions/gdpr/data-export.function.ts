import type { DataExportHandler } from '@/jobs/data-export.processor';
import { inngest } from '../../inngest.client';

/**
 * Event-triggered Inngest function: gathers all data for a tenant's
 * user (GDPR data subject access request), uploads to storage,
 * marks the DataRequest COMPLETED with the export URL.
 *
 * Triggered by `gdpr/processDataExportRequest` events from the
 * dispatcher.
 *
 * Phase 4m port — replaces the JOB_PROCESS_DATA_EXPORT branch in
 * `apps/api/src/jobs/gdpr.dispatcher.ts`.
 */
export const createDataExportFunction = (handler: DataExportHandler) =>
  inngest.createFunction(
    {
      id: 'gdpr-data-export',
      name: 'Process GDPR data export request',
    },
    { event: 'gdpr/processDataExportRequest' },
    async ({ event }) => {
      await handler.handle(event.data);
      return { ok: true, dataRequestId: event.data.dataRequestId };
    },
  );
