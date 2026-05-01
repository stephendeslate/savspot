import type { ImportsService } from '@/imports/imports.service';
import { inngest } from '../../inngest.client';

/**
 * Event-triggered Inngest function: processes a tenant import job
 * (CSV/JSON of clients, services, or appointments) end-to-end.
 *
 * Triggered by `imports/processImport` events dispatched from
 * `ImportsService.create()` via `JobDispatcher.dispatch(QUEUE_IMPORTS,
 * JOB_PROCESS_IMPORT, { importJobId, tenantId })`. Per Phase 4b
 * convention, the dispatcher's event-name format is
 * `${queueName}/${jobName}`, and `event.data` is the dispatched payload
 * verbatim.
 *
 * Phase 4h port — replaces `apps/api/src/imports/imports.processor.ts`
 * (BullMQ). First event-triggered Inngest function in the migration;
 * all prior queues were cron-only.
 */
export const createProcessImportFunction = (importsService: ImportsService) =>
  inngest.createFunction(
    {
      id: 'imports-process-import',
      name: 'Process tenant import job',
    },
    { event: 'imports/processImport' },
    async ({ event }) => {
      await importsService.processImport(
        event.data.importJobId,
        event.data.tenantId,
      );
      return { ok: true, importJobId: event.data.importJobId };
    },
  );
