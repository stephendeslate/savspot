import type { CommunicationsHandler } from '@/communications/communications.processor';
import { inngest } from '../../inngest.client';

/**
 * Every-15-min Inngest cron: scans for bookings completed in the last
 * 15 minutes (cross-tenant raw query) and enqueues post-appointment
 * follow-up emails with a 24-hour delay. Uses the BookingReminder
 * table for deduplication.
 *
 * Phase 4r port — replaces the JOB_PROCESS_POST_APPOINTMENT branch in
 * `apps/api/src/communications/communications.dispatcher.ts` and the
 * matching CRON_EVERY_15_MIN entry in JobSchedulerService.
 */
export const createProcessPostAppointmentFunction = (
  handler: CommunicationsHandler,
) =>
  inngest.createFunction(
    {
      id: 'communications-process-post-appointment',
      name: 'Process post-appointment triggers',
    },
    { cron: '*/15 * * * *' },
    async () => {
      await handler.handleProcessPostAppointment();
      return { ok: true };
    },
  );
