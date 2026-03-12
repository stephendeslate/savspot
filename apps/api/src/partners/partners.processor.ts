import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  QUEUE_PARTNERS,
  JOB_PARTNER_PAYOUT_BATCH,
} from '../bullmq/queue.constants';
import { PartnerPayoutService } from './partner-payout.service';

@Processor(QUEUE_PARTNERS)
export class PartnersProcessor extends WorkerHost {
  private readonly logger = new Logger(PartnersProcessor.name);

  constructor(
    private readonly partnerPayoutService: PartnerPayoutService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing job ${job.name} (${job.id})`);

    switch (job.name) {
      case JOB_PARTNER_PAYOUT_BATCH:
        await this.partnerPayoutService.processPayoutBatch();
        break;
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }
}
