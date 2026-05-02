import type { WebhookDispatchHandler } from '@/workflows/processors/webhook-dispatch.processor';
import { inngest } from '../../inngest.client';

/**
 * Event-triggered Inngest function: HMAC-signs and POSTs a
 * `WebhookDelivery` row to the configured endpoint URL with retry
 * + circuit-breaker semantics. Triggered by
 * `webhooks/dispatchWebhook` events from the dispatcher.
 *
 * Phase 4l port — replaces the JOB_DISPATCH_WEBHOOK branch in
 * `apps/api/src/workflows/webhooks.dispatcher.ts`. Retry semantics
 * are owned by the handler (`nextRetryAt` written to DB; the existing
 * `processWebhookRetries` cron picks them up); Inngest does not retry
 * here.
 */
export const createDispatchWebhookFunction = (
  handler: WebhookDispatchHandler,
) =>
  inngest.createFunction(
    {
      id: 'webhooks-dispatch-webhook',
      name: 'Dispatch outgoing webhook',
    },
    { event: 'webhooks/dispatchWebhook' },
    async ({ event }) => {
      await handler.handle(event.data);
      return { ok: true, deliveryId: event.data.deliveryId };
    },
  );
