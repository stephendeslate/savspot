import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_IMPORTS, JOB_PROCESS_IMPORT } from '../bullmq/queue.constants';
import { ImportsService } from './imports.service';

interface ProcessImportJobData {
  importJobId: string;
  tenantId: string;
}

@Processor(QUEUE_IMPORTS)
export class ImportsProcessor extends WorkerHost {
  private readonly logger = new Logger(ImportsProcessor.name);

  constructor(private readonly importsService: ImportsService) {
    super();
  }

  async process(job: Job<ProcessImportJobData>): Promise<void> {
    switch (job.name) {
      case JOB_PROCESS_IMPORT:
        return this.importsService.processImport(
          job.data.importJobId,
          job.data.tenantId,
        );
      default:
        this.logger.warn(`Unknown import job name: ${job.name}`);
    }
  }
}
