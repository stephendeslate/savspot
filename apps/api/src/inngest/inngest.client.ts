import { Inngest, EventSchemas } from 'inngest';

/**
 * Event schema for the Inngest client.
 *
 * Each event name maps to its payload type. Events are organized by domain
 * with a `.` separator: `payments/refund.requested`, `bookings/expired`, etc.
 *
 * As BullMQ queues are migrated (Phase 4c onward), each queue's job names
 * become event names here, and the processor body becomes an Inngest
 * function defined in `apps/api/src/inngest/functions/`.
 */
type Events = {
  // Phase 4a — sample event for the ping function (used by health checks
  // against Inngest connectivity; no business meaning).
  'system/ping': { data: { source: string } };
};

export const inngest = new Inngest({
  id: 'savspot-api',
  schemas: new EventSchemas().fromRecord<Events>(),
  // eventKey + signingKey are read from process.env automatically
  // (INNGEST_EVENT_KEY, INNGEST_SIGNING_KEY). When absent in dev, the SDK
  // talks to the local Inngest dev server.
});

export type { Events };
