import type {
  BrowserPushHandler,
  DeliverBrowserPushPayload,
} from '@/browser-push/browser-push.processor';
import { inngest } from '../../inngest.client';

/**
 * Event-triggered Inngest function: delivers a Web Push notification
 * to all OWNER + ADMIN members of a tenant. Quiet-hours-aware — if the
 * tenant timezone is in the 21:00–08:00 window, the handler re-enqueues
 * itself with a delay via the JobDispatcher.
 *
 * Triggered by `communications/deliverBrowserPush` events from
 * `BrowserPushEventListener` on booking lifecycle events.
 *
 * Phase 4r port — replaces the JOB_DELIVER_BROWSER_PUSH branch in
 * `apps/api/src/communications/communications.dispatcher.ts`.
 */
export const createDeliverBrowserPushFunction = (
  handler: BrowserPushHandler,
) =>
  inngest.createFunction(
    {
      id: 'communications-deliver-browser-push',
      name: 'Deliver browser push notification',
    },
    { event: 'communications/deliverBrowserPush' },
    async ({ event }) => {
      await handler.handle(event.data as DeliverBrowserPushPayload);
      return { ok: true };
    },
  );
