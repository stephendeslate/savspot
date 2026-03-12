import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  QUEUE_ACCOUNTING,
  JOB_ACCOUNTING_SYNC_INVOICES,
  JOB_ACCOUNTING_SYNC_PAYMENTS,
  JOB_ACCOUNTING_SYNC_CLIENTS,
  JOB_ACCOUNTING_SYNC_SINGLE_INVOICE,
} from '../bullmq/queue.constants';
import {
  AccountingSyncInvoicesHandler,
  AccountingSyncPaymentsHandler,
  AccountingSyncClientsHandler,
  AccountingSyncSingleInvoiceHandler,
} from './accounting-sync.processor';

@Processor(QUEUE_ACCOUNTING)
export class AccountingSyncDispatcher extends WorkerHost {
  private readonly logger = new Logger(AccountingSyncDispatcher.name);

  constructor(
    private readonly invoicesHandler: AccountingSyncInvoicesHandler,
    private readonly paymentsHandler: AccountingSyncPaymentsHandler,
    private readonly clientsHandler: AccountingSyncClientsHandler,
    private readonly singleInvoiceHandler: AccountingSyncSingleInvoiceHandler,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case JOB_ACCOUNTING_SYNC_INVOICES:
        return this.invoicesHandler.handle(job);
      case JOB_ACCOUNTING_SYNC_PAYMENTS:
        return this.paymentsHandler.handle(job);
      case JOB_ACCOUNTING_SYNC_CLIENTS:
        return this.clientsHandler.handle(job);
      case JOB_ACCOUNTING_SYNC_SINGLE_INVOICE:
        return this.singleInvoiceHandler.handle(job);
      default:
        this.logger.warn(`Unknown accounting sync job name: ${job.name}`);
    }
  }
}
