import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_ACCOUNTING } from '../bullmq/queue.constants';
import { AccountingController } from './accounting.controller';
import { AccountingService } from './accounting.service';
import { QuickBooksProvider } from './providers/quickbooks.provider';
import { XeroProvider } from './providers/xero.provider';
import { AccountingSyncDispatcher } from './accounting-sync.dispatcher';
import {
  AccountingSyncInvoicesHandler,
  AccountingSyncPaymentsHandler,
  AccountingSyncClientsHandler,
  AccountingSyncSingleInvoiceHandler,
} from './accounting-sync.processor';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_ACCOUNTING })],
  controllers: [AccountingController],
  providers: [
    AccountingService,
    QuickBooksProvider,
    XeroProvider,
    AccountingSyncDispatcher,
    AccountingSyncInvoicesHandler,
    AccountingSyncPaymentsHandler,
    AccountingSyncClientsHandler,
    AccountingSyncSingleInvoiceHandler,
  ],
  exports: [AccountingService],
})
export class AccountingModule {}
