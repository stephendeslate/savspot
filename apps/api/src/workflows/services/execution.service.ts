import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  WorkflowTriggerEvent,
  AutomationExecutionStatus,
  Prisma,
} from '../../../../../prisma/generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';

interface StageResultEntry {
  stageId: string;
  status: string;
  executedAt: string;
  duration_ms: number;
  error?: string;
}

@Injectable()
export class ExecutionService {
  private readonly logger = new Logger(ExecutionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listByTemplate(
    templateId: string,
    query: { status?: string; page?: number; limit?: number },
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.AutomationExecutionWhereInput = { templateId };
    if (query.status) {
      where.status = query.status as AutomationExecutionStatus;
    }

    const [data, total] = await Promise.all([
      this.prisma.automationExecution.findMany({
        where,
        include: {
          template: { select: { id: true, name: true } },
          booking: { select: { id: true, status: true } },
          currentStage: { select: { id: true, name: true } },
        },
        orderBy: { startedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.automationExecution.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const execution = await this.prisma.automationExecution.findUnique({
      where: { id },
      include: {
        template: {
          include: {
            stages: { orderBy: { order: 'asc' } },
          },
        },
        booking: { select: { id: true, status: true } },
        currentStage: { select: { id: true, name: true } },
      },
    });

    if (!execution) {
      throw new NotFoundException('Automation execution not found');
    }

    return execution;
  }

  async retry(id: string) {
    const execution = await this.findOne(id);

    if (execution.status !== 'FAILED') {
      throw new BadRequestException('Only failed executions can be retried');
    }

    const updated = await this.prisma.automationExecution.update({
      where: { id },
      data: {
        status: 'PENDING',
        error: null,
        completedAt: null,
      },
    });

    this.logger.log(`Execution ${id} marked for retry`);
    return updated;
  }

  async bulkRetryFailed(tenantId: string) {
    const failedExecutions = await this.prisma.automationExecution.findMany({
      where: {
        tenantId,
        status: 'FAILED',
      },
      select: { id: true },
    });

    if (failedExecutions.length === 0) {
      return { retried: 0 };
    }

    const result = await this.prisma.automationExecution.updateMany({
      where: {
        tenantId,
        status: 'FAILED',
      },
      data: {
        status: 'PENDING',
        error: null,
        completedAt: null,
      },
    });

    this.logger.log(
      `Bulk retry: ${result.count} failed execution(s) marked for retry in tenant ${tenantId}`,
    );

    return { retried: result.count };
  }

  async createExecution(
    tenantId: string,
    templateId: string,
    bookingId: string | null,
    triggerEvent: string,
    eventData: unknown,
  ) {
    const execution = await this.prisma.automationExecution.create({
      data: {
        tenantId,
        templateId,
        bookingId,
        triggerEvent: triggerEvent as WorkflowTriggerEvent,
        triggerEventData: eventData as Prisma.InputJsonValue,
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
    });

    this.logger.log(
      `Execution ${execution.id} created for template ${templateId}`,
    );
    return execution;
  }

  async updateStageResult(
    executionId: string,
    stageId: string,
    result: {
      status: string;
      executedAt: Date;
      duration_ms: number;
      error?: string;
    },
  ) {
    const execution = await this.prisma.automationExecution.findUnique({
      where: { id: executionId },
    });

    if (!execution) {
      throw new NotFoundException('Automation execution not found');
    }

    const existingResults = (execution.stageResults as StageResultEntry[] | null) ?? [];
    const newEntry: StageResultEntry = {
      stageId,
      status: result.status,
      executedAt: result.executedAt.toISOString(),
      duration_ms: result.duration_ms,
      error: result.error,
    };

    return this.prisma.automationExecution.update({
      where: { id: executionId },
      data: {
        currentStageId: stageId,
        stageResults: [...existingResults, newEntry] as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async completeExecution(
    id: string,
    status: 'SUCCEEDED' | 'FAILED',
    error?: string,
  ) {
    return this.prisma.automationExecution.update({
      where: { id },
      data: {
        status,
        error: error ?? null,
        completedAt: new Date(),
      },
    });
  }
}
