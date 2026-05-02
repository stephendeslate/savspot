import type { SendBookingRemindersHandler } from '@/jobs/send-booking-reminders.processor';
import { inngest } from '../../inngest.client';

/**
 * Every-15-min Inngest cron: sweeps CONFIRMED bookings starting within
 * the next 8 days and sends 7/3/1-day reminder emails (deduplicated via
 * the BookingReminder unique constraint).
 *
 * Phase 4r port — replaces the JOB_SEND_BOOKING_REMINDERS branch in
 * `apps/api/src/communications/communications.dispatcher.ts` and the
 * matching CRON_EVERY_15_MIN entry in JobSchedulerService.
 */
export const createSendBookingRemindersFunction = (
  handler: SendBookingRemindersHandler,
) =>
  inngest.createFunction(
    {
      id: 'communications-send-booking-reminders',
      name: 'Send upcoming booking reminders',
    },
    { cron: '*/15 * * * *' },
    async () => {
      await handler.handle();
      return { ok: true };
    },
  );
