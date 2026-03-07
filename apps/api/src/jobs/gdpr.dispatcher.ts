import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  QUEUE_GDPR,
  JOB_CLEANUP_RETENTION,
  JOB_PROCESS_DATA_EXPORT,
  JOB_PROCESS_ACCOUNT_DELETION,
} from '../bullmq/queue.constants';
import { CleanupRetentionHandler } from './cleanup-retention.processor';
import { DataExportHandler } from './data-export.processor';
import { AccountDeletionHandler } from './account-deletion.processor';

@Processor(QUEUE_GDPR)
export class GdprDispatcher extends WorkerHost {
  private readonly logger = new Logger(GdprDispatcher.name);

  constructor(
    private readonly cleanupRetention: CleanupRetentionHandler,
    private readonly dataExport: DataExportHandler,
    private readonly accountDeletion: AccountDeletionHandler,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case JOB_CLEANUP_RETENTION:
        return this.cleanupRetention.handle(job);
      case JOB_PROCESS_DATA_EXPORT:
        return this.dataExport.handle(job);
      case JOB_PROCESS_ACCOUNT_DELETION:
        return this.accountDeletion.handle(job);
      default:
        this.logger.warn(`Unknown GDPR job: ${job.name}`);
    }
  }
}
