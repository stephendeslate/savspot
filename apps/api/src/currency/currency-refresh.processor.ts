import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_CURRENCY_REFRESH, JOB_REFRESH_RATES } from '../bullmq/queue.constants';
import { CurrencyService } from './currency.service';

@Processor(QUEUE_CURRENCY_REFRESH)
export class CurrencyRefreshProcessor extends WorkerHost {
  private readonly logger = new Logger(CurrencyRefreshProcessor.name);

  constructor(private readonly currencyService: CurrencyService) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== JOB_REFRESH_RATES) {
      return;
    }

    this.logger.log('Refreshing exchange rates...');

    try {
      await this.currencyService.refreshRates();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Exchange rate refresh failed: ${message}`);
      // Do not rethrow — stale rates are acceptable
    }
  }
}
