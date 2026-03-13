import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { ExecutionService } from './execution.service';
import { StageAutomationService } from './stage-automation.service';
import { QUEUE_WEBHOOKS, JOB_EXECUTE_STAGE } from '../../bullmq/queue.constants';

@Injectable()
export class StageOrchestratorService {
  private readonly logger = new Logger(StageOrchestratorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly executionService: ExecutionService,
    private readonly stageAutomationService: StageAutomationService,
    @InjectQueue(QUEUE_WEBHOOKS) private readonly webhooksQueue: Queue,
  ) {}

  async runWorkflow(
    tenantId: string,
    templateId: string,
    bookingId: string | null,
    triggerEvent: string,
    eventPayload: Record<string, unknown>,
  ): Promise<void> {
    this.logger.log(
      `Running workflow template=${templateId} trigger=${triggerEvent} booking=${bookingId}`,
    );

    const execution = await this.executionService.createExecution(
      tenantId,
      templateId,
      bookingId,
      triggerEvent,
      eventPayload,
    );

    const stages = await this.prisma.workflowStage.findMany({
      where: { templateId },
      orderBy: { order: 'asc' },
    });

    if (stages.length === 0) {
      await this.executionService.completeExecution(execution.id, 'SUCCEEDED');
      return;
    }

    let hasFailure = false;

    for (const stage of stages) {
      const triggerTime = stage.triggerTime;

      if (triggerTime === 'X_DAYS_BEFORE_BOOKING' || triggerTime === 'AFTER_X_DAYS') {
        const delayDays = stage.triggerDays ?? 0;
        const delayMs = delayDays * 24 * 60 * 60 * 1000;

        await this.webhooksQueue.add(
          JOB_EXECUTE_STAGE,
          {
            executionId: execution.id,
            stageId: stage.id,
            tenantId,
            bookingId,
            eventPayload,
          },
          {
            delay: delayMs,
            removeOnComplete: { count: 100 },
            removeOnFail: { count: 50 },
          },
        );

        this.logger.log(
          `Stage ${stage.id} scheduled with ${delayDays}d delay for execution=${execution.id}`,
        );

        await this.executionService.updateStageResult(execution.id, stage.id, {
          status: 'SCHEDULED',
          executedAt: new Date(),
          duration_ms: 0,
        });

        continue;
      }

      // IMMEDIATE — execute now
      const startTime = Date.now();
      const result = await this.stageAutomationService.executeStage(stage, {
        tenantId,
        bookingId,
        eventPayload,
      });
      const duration = Date.now() - startTime;

      await this.executionService.updateStageResult(execution.id, stage.id, {
        status: result.success ? 'SUCCEEDED' : 'FAILED',
        executedAt: new Date(),
        duration_ms: duration,
        error: result.error,
      });

      if (!result.success && !stage.isOptional) {
        hasFailure = true;
        this.logger.error(
          `Required stage ${stage.id} failed, marking execution as failed`,
        );
        break;
      }
    }

    // If all stages were delayed, keep execution as IN_PROGRESS
    const allDelayed = stages.every(
      (s) => s.triggerTime === 'X_DAYS_BEFORE_BOOKING' || s.triggerTime === 'AFTER_X_DAYS',
    );

    if (!allDelayed) {
      await this.executionService.completeExecution(
        execution.id,
        hasFailure ? 'FAILED' : 'SUCCEEDED',
        hasFailure ? 'One or more required stages failed' : undefined,
      );
    }
  }
}
