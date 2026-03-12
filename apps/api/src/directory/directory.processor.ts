import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  QUEUE_DIRECTORY,
  JOB_DIRECTORY_LISTING_REFRESH,
  JOB_DIRECTORY_SITEMAP_GENERATE,
} from '../bullmq/queue.constants';
import { DirectoryListingService } from './directory-listing.service';

@Processor(QUEUE_DIRECTORY)
export class DirectoryProcessor extends WorkerHost {
  private readonly logger = new Logger(DirectoryProcessor.name);

  constructor(
    private readonly directoryListingService: DirectoryListingService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing job ${job.name} (${job.id})`);

    switch (job.name) {
      case JOB_DIRECTORY_LISTING_REFRESH:
        await this.directoryListingService.refreshAllListings();
        break;
      case JOB_DIRECTORY_SITEMAP_GENERATE:
        this.logger.log('[STUB] Sitemap generation not yet implemented');
        break;
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }
}
