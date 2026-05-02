import { Module } from '@nestjs/common';
import { AccountingController } from './accounting.controller';
import { AccountingService } from './accounting.service';
import { QuickBooksProvider } from './providers/quickbooks.provider';
import { XeroProvider } from './providers/xero.provider';
import {
  AccountingSyncInvoicesHandler,
  AccountingSyncPaymentsHandler,
  AccountingSyncClientsHandler,
  AccountingSyncSingleInvoiceHandler,
} from './accounting-sync.processor';

@Module({
  controllers: [AccountingController],
  providers: [
    AccountingService,
    QuickBooksProvider,
    XeroProvider,
    AccountingSyncInvoicesHandler,
    AccountingSyncPaymentsHandler,
    AccountingSyncClientsHandler,
    AccountingSyncSingleInvoiceHandler,
  ],
  exports: [
    AccountingService,
    AccountingSyncInvoicesHandler,
    AccountingSyncPaymentsHandler,
    AccountingSyncClientsHandler,
    AccountingSyncSingleInvoiceHandler,
  ],
})
export class AccountingModule {}
