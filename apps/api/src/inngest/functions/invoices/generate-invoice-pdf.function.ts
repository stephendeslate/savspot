import type { InvoicePdfService } from '@/jobs/invoice-pdf.service';
import { inngest } from '../../inngest.client';

/**
 * Event-triggered Inngest function: renders an invoice into HTML,
 * uploads to storage, and updates the Invoice row with the URL.
 *
 * Triggered by `invoices/generateInvoicePdf` events from the dispatcher.
 *
 * Phase 4n port — replaces the BullMQ GenerateInvoicePdfProcessor.
 * Logic lives in InvoicePdfService.generateAndUpload() so this function
 * is a thin wrapper.
 */
export const createGenerateInvoicePdfFunction = (
  service: InvoicePdfService,
) =>
  inngest.createFunction(
    {
      id: 'invoices-generate-invoice-pdf',
      name: 'Generate invoice PDF',
    },
    { event: 'invoices/generateInvoicePdf' },
    async ({ event }) => {
      await service.generateAndUpload(event.data);
      return { ok: true, invoiceId: event.data.invoiceId };
    },
  );
