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

  // Phase 4h — imports queue. Event name follows the JobDispatcher convention
  // `${queueName}/${jobName}`. Dispatched by ImportsService.create() when a
  // tenant uploads a new import job.
  'imports/processImport': { data: { importJobId: string; tenantId: string } };

  // Phase 4j — voice-calls queue. processTranscript stores a transcript row
  // after a call ends; postCallActions runs the follow-up workflow when a
  // voice call resulted in a booking.
  'voice-calls/processTranscript': {
    data: {
      callLogId: string;
      tenantId: string;
      transcript: Array<{ role: string; text: string }>;
    };
  };
  'voice-calls/postCallActions': {
    data: { callLogId: string; tenantId: string; bookingId?: string };
  };

  // Phase 4k — accounting queue. One event per BullMQ job:
  // - accountingSyncInvoices/Payments/Clients: connection-wide bulk sync
  //   (last 50 records each), tenant + connectionId in the payload.
  // - accountingSyncSingleInvoice: targeted sync for one invoice.
  'accounting/accountingSyncInvoices': {
    data: { connectionId: string; tenantId: string; fullSync?: boolean };
  };
  'accounting/accountingSyncPayments': {
    data: { connectionId: string; tenantId: string; fullSync?: boolean };
  };
  'accounting/accountingSyncClients': {
    data: { connectionId: string; tenantId: string; fullSync?: boolean };
  };
  'accounting/accountingSyncSingleInvoice': {
    data: { connectionId: string; tenantId: string; invoiceId: string };
  };

  // Phase 4l — webhooks queue (workflows EE module).
  // dispatchWebhook: HMAC-sign + POST a WebhookDelivery row.
  // executeStage: run a delayed workflow stage.
  'webhooks/dispatchWebhook': {
    data: { deliveryId: string };
  };
  'webhooks/executeStage': {
    data: {
      executionId: string;
      stageId: string;
      tenantId: string;
      bookingId: string | null;
      eventPayload: Record<string, unknown>;
    };
  };

  // Phase 4m — gdpr queue. Only the data-export job carries a payload;
  // the other three are cron-triggered and have no event payload.
  'gdpr/processDataExportRequest': {
    data: {
      dataRequestId: string;
      userId: string;
      tenantId?: string;
      requestType?: 'USER_EXPORT' | 'TENANT_EXPORT';
    };
  };

  // Phase 4n — invoices queue. Triggered by InvoicesService when a new
  // invoice row is created.
  'invoices/generateInvoicePdf': {
    data: { tenantId: string; invoiceId: string };
  };

  // Phase 4q — calendar queue. Two event-triggered jobs:
  // - calendarEventPush: per-connection booking lifecycle push (confirm /
  //   reschedule / cancel). Fanned out by CalendarEventListener.
  // - calendarTwoWaySync: per-connection inbound sync. Dispatched by
  //   manualSync, Google + Outlook webhook controllers, and the
  //   sync-fallback cron sweep.
  'calendar/calendarEventPush': {
    data: {
      eventType: string;
      tenantId: string;
      connectionId?: string;
      bookingId: string;
      serviceName: string;
      clientName: string;
      startTime: string;
      endTime: string;
      previousStartTime?: string;
      previousEndTime?: string;
      newStartTime?: string;
      newEndTime?: string;
    };
  };
  'calendar/calendarTwoWaySync': {
    data: {
      connectionId: string;
      tenantId: string;
      manual?: boolean;
      triggeredBy?: string;
      channelId?: string;
      resourceId?: string;
      subscriptionId?: string;
    };
  };
};

export const inngest = new Inngest({
  id: 'savspot-api',
  schemas: new EventSchemas().fromRecord<Events>(),
  // eventKey + signingKey are read from process.env automatically
  // (INNGEST_EVENT_KEY, INNGEST_SIGNING_KEY). When absent in dev, the SDK
  // talks to the local Inngest dev server.
});

export type { Events };
