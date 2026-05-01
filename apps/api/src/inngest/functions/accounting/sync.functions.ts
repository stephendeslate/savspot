import type {
  AccountingSyncInvoicesHandler,
  AccountingSyncPaymentsHandler,
  AccountingSyncClientsHandler,
  AccountingSyncSingleInvoiceHandler,
} from '@/accounting/accounting-sync.processor';
import { inngest } from '../../inngest.client';

/**
 * Phase 4k port — replaces the BullMQ AccountingSyncDispatcher with four
 * Inngest event-triggered functions. The handler classes
 * (`AccountingSync*Handler`) keep all of the actual sync logic so both
 * the BullMQ-side dispatcher (during the soak window) and the Inngest
 * functions delegate to the same implementation.
 *
 * Event name convention: `${queueName}/${jobName}` per JobDispatcher
 * (Phase 4b).
 */

export const createAccountingSyncInvoicesFunction = (
  handler: AccountingSyncInvoicesHandler,
) =>
  inngest.createFunction(
    {
      id: 'accounting-sync-invoices',
      name: 'Sync invoices to accounting provider',
    },
    { event: 'accounting/accountingSyncInvoices' },
    async ({ event }) => {
      await handler.handle(event.data);
      return { ok: true, connectionId: event.data.connectionId };
    },
  );

export const createAccountingSyncPaymentsFunction = (
  handler: AccountingSyncPaymentsHandler,
) =>
  inngest.createFunction(
    {
      id: 'accounting-sync-payments',
      name: 'Sync payments to accounting provider',
    },
    { event: 'accounting/accountingSyncPayments' },
    async ({ event }) => {
      await handler.handle(event.data);
      return { ok: true, connectionId: event.data.connectionId };
    },
  );

export const createAccountingSyncClientsFunction = (
  handler: AccountingSyncClientsHandler,
) =>
  inngest.createFunction(
    {
      id: 'accounting-sync-clients',
      name: 'Sync clients to accounting provider',
    },
    { event: 'accounting/accountingSyncClients' },
    async ({ event }) => {
      await handler.handle(event.data);
      return { ok: true, connectionId: event.data.connectionId };
    },
  );

export const createAccountingSyncSingleInvoiceFunction = (
  handler: AccountingSyncSingleInvoiceHandler,
) =>
  inngest.createFunction(
    {
      id: 'accounting-sync-single-invoice',
      name: 'Sync a single invoice to accounting provider',
    },
    { event: 'accounting/accountingSyncSingleInvoice' },
    async ({ event }) => {
      await handler.handle(event.data);
      return { ok: true, invoiceId: event.data.invoiceId };
    },
  );
