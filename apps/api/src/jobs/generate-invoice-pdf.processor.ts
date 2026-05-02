import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import {
  QUEUE_INVOICES,
  JOB_GENERATE_INVOICE_PDF,
} from '../bullmq/queue.constants';
import {
  InvoicePdfService,
  GenerateInvoicePdfPayload,
} from './invoice-pdf.service';

@Processor(QUEUE_INVOICES)
export class GenerateInvoicePdfProcessor extends WorkerHost {
  constructor(private readonly invoicePdfService: InvoicePdfService) {
    super();
  }

  async process(job: Job<GenerateInvoicePdfPayload>): Promise<void> {
    if (job.name !== JOB_GENERATE_INVOICE_PDF) {
      return;
    }
    await this.invoicePdfService.generateAndUpload(job.data);
  }
}
