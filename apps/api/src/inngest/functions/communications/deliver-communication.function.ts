import type {
  CommunicationsHandler,
  DeliverCommunicationPayload,
} from '@/communications/communications.processor';
import { inngest } from '../../inngest.client';

/**
 * Event-triggered Inngest function: per-message email delivery via Resend.
 * Loads the Communication row inside the tenant context, renders + sends
 * the email, and updates the row with SENT or FAILED status.
 *
 * Triggered by `communications/deliverCommunication` events from
 * `CommunicationsService.createAndSend()` and the digest/digest-fanout
 * sites in `ProcessNotificationDigestsHandler` + `WeeklyDigestHandler`.
 *
 * Phase 4r port — replaces the JOB_DELIVER_COMMUNICATION branch in
 * `apps/api/src/communications/communications.dispatcher.ts`.
 */
export const createDeliverCommunicationFunction = (
  handler: CommunicationsHandler,
) =>
  inngest.createFunction(
    {
      id: 'communications-deliver-communication',
      name: 'Deliver communication (email)',
    },
    { event: 'communications/deliverCommunication' },
    async ({ event }) => {
      await handler.handleDeliverCommunication(
        event.data as unknown as DeliverCommunicationPayload,
      );
      return { ok: true };
    },
  );
