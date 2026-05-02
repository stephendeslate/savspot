import type { SmsHandler, DeliverProviderSmsJobData } from '@/sms/sms.processor';
import { inngest } from '../../inngest.client';

/**
 * Event-triggered Inngest function: sends an SMS to the tenant OWNER's
 * phone number for booking lifecycle events. Quiet-hours-aware — if the
 * tenant timezone is in the 21:00–08:00 window, the handler re-enqueues
 * itself with a delay (routed through JobDispatcher → Inngest `ts` for
 * a delayed event, BullMQ delay otherwise).
 *
 * Triggered by `communications/deliverProviderSMS` events from
 * `SmsEventListener` (booking confirmed/cancelled/rescheduled/
 * completed/no-show).
 *
 * Phase 4r port — replaces the JOB_DELIVER_PROVIDER_SMS branch in
 * `apps/api/src/communications/communications.dispatcher.ts`.
 */
export const createDeliverProviderSmsFunction = (handler: SmsHandler) =>
  inngest.createFunction(
    {
      id: 'communications-deliver-provider-sms',
      name: 'Deliver provider SMS',
    },
    { event: 'communications/deliverProviderSMS' },
    async ({ event }) => {
      await handler.handle(event.data as DeliverProviderSmsJobData);
      return { ok: true };
    },
  );
