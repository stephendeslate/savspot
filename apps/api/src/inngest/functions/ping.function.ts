import { inngest } from '../inngest.client';

/**
 * Sample no-op function used as a connectivity probe between Inngest cloud
 * and the api's serve endpoint. Send a `system/ping` event and observe the
 * function executing in the Inngest dashboard.
 *
 * Phase 4a — proves the wiring is end-to-end functional without porting any
 * real BullMQ work. Will be retained as a connectivity probe even after the
 * full migration; remove only if/when an alternative health check exists.
 */
export const ping = inngest.createFunction(
  { id: 'system-ping' },
  { event: 'system/ping' },
  async ({ event, step }) => {
    await step.run('record', () => ({
      source: event.data.source,
      receivedAt: new Date().toISOString(),
    }));
    return { ok: true };
  },
);
