import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  WorkflowStageAutomationType,
  WorkflowStageTriggerTime,
  WorkflowStageProgressionCondition,
  Prisma,
} from '../../../../../prisma/generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStageDto } from '../dto/create-stage.dto';
import { UpdateStageDto } from '../dto/update-stage.dto';

@Injectable()
export class StageService {
  private readonly logger = new Logger(StageService.name);

  constructor(private readonly prisma: PrismaService) {}

  async list(templateId: string) {
    return this.prisma.workflowStage.findMany({
      where: { templateId },
      orderBy: { order: 'asc' },
    });
  }

  async create(templateId: string, dto: CreateStageDto) {
    const template = await this.prisma.workflowTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new NotFoundException('Workflow template not found');
    }

    const maxOrder = await this.prisma.workflowStage.aggregate({
      where: { templateId },
      _max: { order: true },
    });

    const nextOrder = (maxOrder._max.order ?? -1) + 1;

    const stage = await this.prisma.workflowStage.create({
      data: {
        templateId,
        name: dto.name,
        order: nextOrder,
        automationType: dto.automationType as WorkflowStageAutomationType,
        automationConfig: dto.automationConfig as Prisma.InputJsonValue,
        triggerTime: dto.triggerTime as WorkflowStageTriggerTime,
        triggerDays: dto.triggerDays ?? null,
        progressionCondition: dto.progressionCondition
          ? (dto.progressionCondition as WorkflowStageProgressionCondition)
          : null,
        isOptional: dto.isOptional ?? false,
      },
    });

    this.logger.log(
      `Stage ${stage.id} created for template ${templateId} at order ${nextOrder}`,
    );
    return stage;
  }

  async update(id: string, dto: UpdateStageDto) {
    const existing = await this.prisma.workflowStage.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Workflow stage not found');
    }

    const data: Prisma.WorkflowStageUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.automationType !== undefined)
      data.automationType =
        dto.automationType as WorkflowStageAutomationType;
    if (dto.automationConfig !== undefined)
      data.automationConfig =
        dto.automationConfig as Prisma.InputJsonValue;
    if (dto.triggerTime !== undefined)
      data.triggerTime = dto.triggerTime as WorkflowStageTriggerTime;
    if (dto.triggerDays !== undefined) data.triggerDays = dto.triggerDays;
    if (dto.progressionCondition !== undefined)
      data.progressionCondition =
        dto.progressionCondition as WorkflowStageProgressionCondition;
    if (dto.isOptional !== undefined) data.isOptional = dto.isOptional;

    return this.prisma.workflowStage.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    const stage = await this.prisma.workflowStage.findUnique({
      where: { id },
    });

    if (!stage) {
      throw new NotFoundException('Workflow stage not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.workflowStage.delete({ where: { id } });

      // Reorder remaining stages to fill the gap
      const remaining = await tx.workflowStage.findMany({
        where: { templateId: stage.templateId },
        orderBy: { order: 'asc' },
      });

      for (let i = 0; i < remaining.length; i++) {
        if (remaining[i]!.order !== i) {
          await tx.workflowStage.update({
            where: { id: remaining[i]!.id },
            data: { order: i },
          });
        }
      }
    });

    this.logger.log(
      `Stage ${id} removed from template ${stage.templateId}`,
    );
  }

  async reorder(templateId: string, stageIds: string[]) {
    const stages = await this.prisma.workflowStage.findMany({
      where: { templateId },
    });

    if (stages.length !== stageIds.length) {
      throw new BadRequestException(
        'stageIds must contain all stage IDs for the template',
      );
    }

    const stageIdSet = new Set(stages.map((s) => s.id));
    for (const id of stageIds) {
      if (!stageIdSet.has(id)) {
        throw new BadRequestException(`Stage ${id} does not belong to this template`);
      }
    }

    await this.prisma.$transaction(
      stageIds.map((id, index) =>
        this.prisma.workflowStage.update({
          where: { id },
          data: { order: index },
        }),
      ),
    );

    this.logger.log(`Stages reordered for template ${templateId}`);

    return this.list(templateId);
  }
}
