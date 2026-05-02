import { Injectable, Logger } from '@nestjs/common';
import { StageAutomationService } from '../services/stage-automation.service';
import { ExecutionService } from '../services/execution.service';
import { PrismaService } from '../../prisma/prisma.service';

export interface StageExecutionJobData {
  executionId: string;
  stageId: string;
  tenantId: string;
  bookingId: string | null;
  eventPayload: Record<string, unknown>;
}

@Injectable()
export class StageExecutionHandler {
  private readonly logger = new Logger(StageExecutionHandler.name);

  constructor(
    private readonly stageAutomationService: StageAutomationService,
    private readonly executionService: ExecutionService,
    private readonly prisma: PrismaService,
  ) {}

  async handle(data: StageExecutionJobData): Promise<void> {
    this.logger.log(
      `Processing delayed stage ${data.stageId} for execution=${data.executionId}`,
    );

    const stage = await this.prisma.workflowStage.findUnique({
      where: { id: data.stageId },
    });

    if (!stage) {
      this.logger.error(`Stage ${data.stageId} not found — skipping`);
      return;
    }

    const startTime = Date.now();
    const result = await this.stageAutomationService.executeStage(stage, {
      tenantId: data.tenantId,
      bookingId: data.bookingId,
      eventPayload: data.eventPayload,
    });
    const duration = Date.now() - startTime;

    await this.executionService.updateStageResult(
      data.executionId,
      data.stageId,
      {
        status: result.success ? 'SUCCEEDED' : 'FAILED',
        executedAt: new Date(),
        duration_ms: duration,
        error: result.error,
      },
    );

    this.logger.log(
      `Delayed stage ${data.stageId} completed: ${result.success ? 'success' : 'failed'}`,
    );
  }
}
