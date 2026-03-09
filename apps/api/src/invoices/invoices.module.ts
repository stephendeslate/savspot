import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { QUEUE_INVOICES } from '../bullmq/queue.constants';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_INVOICES })],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
