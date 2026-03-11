import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_CURRENCY_REFRESH } from '../bullmq/queue.constants';
import { CurrencyController } from './currency.controller';
import { CurrencyService } from './currency.service';
import { CurrencyRefreshProcessor } from './currency-refresh.processor';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_CURRENCY_REFRESH }),
  ],
  controllers: [CurrencyController],
  providers: [CurrencyService, CurrencyRefreshProcessor],
  exports: [CurrencyService],
})
export class CurrencyModule {}
