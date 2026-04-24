import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import {
  WorkflowTriggerEvent,
  Prisma,
} from '../../../../../prisma/generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWorkflowTemplateDto } from '../dto/create-template.dto';
import { UpdateWorkflowTemplateDto } from '../dto/update-template.dto';

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);

  constructor(private readonly prisma: PrismaService) {}

  async list(
    tenantId: string,
    query: { page?: number; limit?: number },
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.WorkflowTemplateWhereInput = { tenantId };

    const [data, total] = await Promise.all([
      this.prisma.workflowTemplate.findMany({
        where,
        include: {
          stages: {
            orderBy: { order: 'asc' },
          },
          _count: {
            select: { automationExecutions: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.workflowTemplate.count({ where }),
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

  async create(tenantId: string, dto: CreateWorkflowTemplateDto) {
    const template = await this.prisma.workflowTemplate.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description ?? null,
        triggerEvent: dto.triggerEvent as WorkflowTriggerEvent,
        isActive: dto.isActive ?? true,
      },
      include: { stages: true },
    });

    this.logger.log(`Template ${template.id} created for tenant ${tenantId}`);
    return template;
  }

  async findOne(id: string) {
    const template = await this.prisma.workflowTemplate.findUnique({
      where: { id },
      include: {
        stages: {
          orderBy: { order: 'asc' },
        },
        _count: {
          select: { automationExecutions: true },
        },
      },
    });

    if (!template) {
      throw new NotFoundException('Workflow template not found');
    }

    return template;
  }

  async update(id: string, dto: UpdateWorkflowTemplateDto) {
    await this.findOne(id);

    const data: Prisma.WorkflowTemplateUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    return this.prisma.workflowTemplate.update({
      where: { id },
      data,
      include: { stages: { orderBy: { order: 'asc' } } },
    });
  }

  async softDelete(id: string) {
    await this.findOne(id);

    return this.prisma.workflowTemplate.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async duplicate(id: string) {
    const original = await this.findOne(id);

    const copy = await this.prisma.workflowTemplate.create({
      data: {
        tenantId: original.tenantId,
        name: `${original.name} (Copy)`,
        description: original.description,
        triggerEvent: original.triggerEvent,
        isActive: false,
        stages: {
          create: original.stages.map((stage) => ({
            name: stage.name,
            order: stage.order,
            automationType: stage.automationType,
            automationConfig: stage.automationConfig as Prisma.InputJsonValue,
            triggerTime: stage.triggerTime,
            triggerDays: stage.triggerDays,
            progressionCondition: stage.progressionCondition,
            isOptional: stage.isOptional,
          })),
        },
      },
      include: { stages: { orderBy: { order: 'asc' } } },
    });

    this.logger.log(`Template ${id} duplicated as ${copy.id}`);
    return copy;
  }
}
